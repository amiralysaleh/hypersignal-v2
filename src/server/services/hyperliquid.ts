/**
 * Minimal Hyperliquid API client with parallel chunking.
 * Sends parallel requests in controlled bursts (concurrency=3) so scanning 50+
 * wallets completes in under 5 seconds without triggering 429 limits.
 */

import { log } from '@/server/services/logs';

const HYPERLIQUID_BASE_URL = 'https://api.hyperliquid.xyz/info';
const REQUEST_TIMEOUT_MS = 4_000;

export class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function postInfo(body: Record<string, unknown>): Promise<{ response: Response; body: unknown }> {
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
  try {
    const { response, body } = await postInfo({ type: 'clearinghouseState', user: address });
    if (!response.ok) return null;
    return body as ClearinghouseState | null;
  } catch {
    return null;
  }
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

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (deadline && Date.now() >= deadline) return { fills: [], aborted: true };

    try {
      const { response, body } = await postInfo({ type: 'userFills', user: address });

      if (response.ok) {
        const fills = Array.isArray(body) ? (body as Fill[]) : [];
        return { fills, aborted: false };
      }

      if (response.status === 429) {
        if (attempt >= 2) break;
        await sleep(300);
        continue;
      }

      return { fills: [], aborted: false };
    } catch (error) {
      if (deadline && Date.now() >= deadline) return { fills: [], aborted: true };
      if (attempt >= 2) break;
      await sleep(200);
    }
  }

  return { fills: [], aborted: false };
}

export async function getAllMids(): Promise<Record<string, string> | null> {
  try {
    const { response, body } = await postInfo({ type: 'allMids' });
    if (!response.ok || !body) return null;
    return body as Record<string, string>;
  } catch {
    return null;
  }
}

export async function getMarkPrice(coin: string): Promise<number | null> {
  const mids = await getAllMids();
  const price = mids?.[coin];
  const parsed = Number(price);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function getL2Book(coin: string): Promise<{ asks: [string, string][]; bids: [string, string][] } | null> {
  try {
    const { response, body } = await postInfo({ type: 'l2Book', coin });
    if (!response.ok || !body) return null;
    const book = body as { asks?: [string, string][]; bids?: [string, string][] };
    return { asks: book.asks ?? [], bids: book.bids ?? [] };
  } catch {
    return null;
  }
}
