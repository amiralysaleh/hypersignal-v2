/**
 * Minimal Hyperliquid API client with a global rate limiter.
 * All calls go through a serialized queue with a minimum interval so we stay
 * well under Hyperliquid's free-tier limits (no API key needed for reads).
 */

import { log } from '@/server/services/logs';

const HYPERLIQUID_BASE_URL = 'https://api.hyperliquid.xyz/info';
// Hyperliquid public API rate limiter setting
const MIN_REQUEST_INTERVAL_MS = Math.max(50, Number(process.env.HL_MIN_REQUEST_INTERVAL_MS ?? 200));
const REQUEST_TIMEOUT_MS = Math.max(2_000, Number(process.env.HL_REQUEST_TIMEOUT_MS ?? 8_000));

export class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let queue: Promise<void> = Promise.resolve();
let lastRequestTimestamp = 0;
let nextAvailableAt = 0;

export function registerHyperliquidPenalty(delayMs: number) {
  if (!Number.isFinite(delayMs) || delayMs <= 0) return;
  nextAvailableAt = Math.max(nextAvailableAt, Date.now() + delayMs);
}

export function parseRetryAfterMs(headerValue: string | null | undefined): number | null {
  if (!headerValue) return null;
  const numeric = Number(headerValue);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric * 1000;
  const parsedDate = Date.parse(headerValue);
  if (Number.isFinite(parsedDate)) return Math.max(0, parsedDate - Date.now());
  return null;
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RequestTimeoutError(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function scheduleRequest<T>(label: string, task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const earliestAllowed = Math.max(nextAvailableAt, lastRequestTimestamp + MIN_REQUEST_INTERVAL_MS);
    const wait = Math.max(0, earliestAllowed - Date.now());
    if (wait > 0) await sleep(wait);
    try {
      return await task();
    } finally {
      lastRequestTimestamp = Date.now();
      nextAvailableAt = Math.max(nextAvailableAt, lastRequestTimestamp + MIN_REQUEST_INTERVAL_MS);
    }
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function postInfo(body: Record<string, unknown>, label: string): Promise<{ response: Response; body: unknown }> {
  return scheduleRequest(label, async () => {
    const response = await fetchWithTimeout(
      HYPERLIQUID_BASE_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      REQUEST_TIMEOUT_MS
    );
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { response, body: json };
  });
}

export interface ClearedPosition {
  coin: string;
  szi: string;
  entryPx: string;
  markPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationPx: string;
  leverage: { type: 'isolated' | 'cross'; value: number; rawUsd?: number };
  marginUsed: string;
}

export interface ClearinghouseState {
  assetPositions: { position: ClearedPosition }[];
  marginSummary: { accountValue: string; totalMarginUsed: string; totalMmfUsed: string };
}

export async function getClearinghouseState(address: string): Promise<ClearinghouseState | null> {
  const { response, body } = await postInfo({ type: 'clearinghouseState', user: address }, `clearinghouseState:${address.slice(0, 6)}`);
  if (!response.ok) {
    const retryAfter = response.status === 429 ? parseRetryAfterMs(response.headers.get('retry-after')) : null;
    if (response.status === 429) registerHyperliquidPenalty(Math.max(retryAfter ?? 1_000, 5_000));
    await log({
      level: 'WARN',
      message: `clearinghouseState failed for ${address.slice(0, 6)}...`,
      context: { status: response.status, retryAfterMs: retryAfter },
    });
    return null;
  }
  return body as ClearinghouseState | null;
}

export interface Fill {
  time: number;
  hash: string;
  coin: string;
  side: 'A' | 'B';
  dir: string;
  px: string;
  sz: string;
  startPosition: string;
  closedPnl: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
  leverage?: { type: 'isolated' | 'cross'; value: number };
}

export async function getUserFills(address: string, options: { deadline?: number } = {}): Promise<{ fills: Fill[]; aborted: boolean }> {
  const { deadline } = options;
  let backoff = 300;

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (deadline && Date.now() >= deadline) return { fills: [], aborted: true };

    try {
      const { response, body } = await postInfo({ type: 'userFills', user: address }, `userFills:${address.slice(0, 6)}`);

      if (response.ok) {
        const fills = Array.isArray(body) ? (body as Fill[]) : [];
        if (fills.length > 0 && fills[0].time < Date.now() - 30 * 60 * 1000) {
          await log({
            level: 'INFO',
            message: `Skipping fills fetch for ${address.slice(0, 6)}... (oldest active window)`,
            context: { newestFillTime: new Date(fills[0].time).toISOString() },
          });
          return { fills: [], aborted: false };
        }
        return { fills, aborted: false };
      }

      if (response.status === 429) {
        const retryAfter = parseRetryAfterMs(response.headers.get('retry-after'));
        const delay = Math.min(Math.max(backoff, retryAfter ?? 0), 1_000);
        registerHyperliquidPenalty(delay);
        await log({
          level: 'WARN',
          message: `userFills rate limited for ${address.slice(0, 6)}...`,
          context: { attempt, delayMs: delay },
        });
        if (attempt >= 2) break;
        const waitMs = deadline ? Math.min(delay, Math.max(0, deadline - Date.now())) : delay;
        if (waitMs > 0) await sleep(waitMs);
        backoff = Math.min(backoff * 2, 1_000);
        continue;
      }

      await log({
        level: 'WARN',
        message: `userFills failed for ${address.slice(0, 6)}...`,
        context: { status: response.status, attempt },
      });
      return { fills: [], aborted: false };
    } catch (error) {
      const isTimeout = error instanceof RequestTimeoutError;
      if (attempt >= 2) {
        await log({
          level: 'ERROR',
          message: `Failed to fetch user fills for ${address.slice(0, 6)}...`,
          context: { error: error instanceof Error ? error.message : String(error), attempt, timeout: isTimeout },
        });
        break;
      }
      if (isTimeout) {
        await log({
          level: 'WARN',
          message: `userFills timed out for ${address.slice(0, 6)}...`,
          context: { attempt, timeoutMs: REQUEST_TIMEOUT_MS },
        });
        registerHyperliquidPenalty(1_000);
      }
      if (deadline && Date.now() >= deadline) return { fills: [], aborted: true };
      const waitMs = deadline ? Math.min(backoff, Math.max(0, deadline - Date.now())) : backoff;
      if (waitMs > 0) await sleep(waitMs);
      backoff = Math.min(backoff * 2, 1_000);
    }
  }

  return { fills: [], aborted: false };
}

export async function getAllMids(): Promise<Record<string, string> | null> {
  const { response, body } = await postInfo({ type: 'allMids' }, 'allMids');
  if (!response.ok || !body) {
    if (response.status === 429) registerHyperliquidPenalty(5_000);
    await log({
      level: 'WARN',
      message: 'allMids fetch failed',
      context: { status: response.status },
    });
    return null;
  }
  return body as Record<string, string>;
}

export async function getMarkPrice(coin: string): Promise<number | null> {
  const mids = await getAllMids();
  const price = mids?.[coin];
  const parsed = Number(price);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function getL2Book(coin: string): Promise<{ asks: [string, string][]; bids: [string, string][] } | null> {
  const { response, body } = await postInfo({ type: 'l2Book', coin }, `l2Book:${coin}`);
  if (!response.ok || !body) return null;
  const book = body as { asks?: [string, string][]; bids?: [string, string][] };
  return { asks: book.asks ?? [], bids: book.bids ?? [] };
}
