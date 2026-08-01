import type { ClusterFill, Settings, Signal, SignalDirection } from '@/lib/types';
import { readJsonFile, writeJsonFile } from '../storage/jsonStore';
import { isDemoMode, readMemoryJson, writeMemoryJson } from '../storage/memoryStore';
import { log } from './logs';
import { getAllMids, getClearinghouseState, getUserFills, registerHyperliquidPenalty, type ClearedPosition, type Fill } from './hyperliquid';
import { getSettings } from './settings';
import { getWallets, isOnCooldown, readWallets, updateWalletCooldowns, writeWallets } from './wallets';
import { advanceWorkerWalletCursor, readWorkerState, writeWorkerState } from './workerState';
import { sendTelegramMessage } from './telegram';

const SIGNALS_FILE_PATH = 'signals.json';
const MAX_STORED_SIGNALS = 200;
const DETECTION_MAX_WALLETS_PER_RUN = 5;
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

const reader = <T,>(path: string, fallback: T) =>
  isDemoMode() ? readMemoryJson(path, fallback) : readJsonFile(path, fallback);
const writer = <T,>(path: string, data: T) =>
  isDemoMode() ? writeMemoryJson(path, data) : writeJsonFile(path, data);

export type DetectionPhase = 'fetch' | 'aggregate' | 'complete';

export interface DetectProgress {
  processedWallets: number;
  totalWallets: number;
  durationMs: number;
  phase: DetectionPhase;
  aborted: boolean;
}

export interface DetectOptions {
  onProgress?: (progress: DetectProgress) => void | Promise<void>;
  deadlineMs?: number;
}

export interface UpdatePricesProgress {
  stage: 'start' | 'coin' | 'complete';
  durationMs: number;
  coin?: string;
  index?: number;
  total?: number;
  skipped?: boolean;
}

export interface UpdatePricesOptions {
  deadlineMs?: number;
  onProgress?: (progress: UpdatePricesProgress) => void | Promise<void>;
}

function parseRetryAfterMs(headerValue: string | null | undefined): number | null {
  if (!headerValue) return null;
  const numeric = Number(headerValue);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric * 1000;
  const parsedDate = Date.parse(headerValue);
  if (Number.isFinite(parsedDate)) return Math.max(0, parsedDate - Date.now());
  return null;
}

/* ---------------- storage ---------------- */

export function normalizeSignal(signal: Partial<Signal>): Signal | null {
  if (!signal?.id || !signal.pair) return null;

  const contributingWalletAddresses = Array.isArray(signal.contributingWalletAddresses)
    ? signal.contributingWalletAddresses.filter((a) => typeof a === 'string' && a.trim().length > 0)
    : [];

  let clusterFills: ClusterFill[] | undefined;
  if (Array.isArray(signal.clusterFills)) {
    const contributions = new Map<string, number>();
    for (const raw of signal.clusterFills) {
      const fill = raw as unknown as Record<string, unknown>;
      const wallet = typeof fill.walletAddress === 'string' && fill.walletAddress.trim()
        ? fill.walletAddress.trim()
        : undefined;
      if (!wallet) continue;
      const sizeSource = fill.sz ?? fill.size;
      const parsed =
        typeof sizeSource === 'number'
          ? sizeSource
          : typeof sizeSource === 'string'
            ? Number.parseFloat(sizeSource)
            : NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) continue;
      contributions.set(wallet, (contributions.get(wallet) ?? 0) + parsed);
    }
    if (contributions.size > 0) {
      clusterFills = [...contributions.entries()].map(([walletAddress, totalSize]) => ({
        walletAddress,
        sz: totalSize.toFixed(6),
      }));
    }
  }

  return {
    id: signal.id,
    pair: signal.pair,
    type: signal.type === 'SHORT' ? 'SHORT' : 'LONG',
    entryPrice: signal.entryPrice ?? '0',
    currentPrice: signal.currentPrice ?? '0',
    pnl: signal.pnl ?? '0',
    roi: signal.roi ?? '0',
    status: signal.status === 'TP' ? 'TP' : signal.status === 'SL' ? 'SL' : 'OPEN',
    timestamp: signal.timestamp ?? new Date().toISOString(),
    leverage: signal.leverage ?? '0',
    liquidationPrice: signal.liquidationPrice ?? '0',
    margin: signal.margin ?? '0',
    size: signal.size ?? '0',
    contributingWallets:
      typeof signal.contributingWallets === 'number' ? signal.contributingWallets : contributingWalletAddresses.length,
    contributingWalletAddresses,
    takeProfitTargets: Array.isArray(signal.takeProfitTargets) ? signal.takeProfitTargets : [],
    stopLoss: signal.stopLoss ?? '0',
    clusterFills,
  };
}

export async function readSignals(): Promise<Signal[]> {
  const signals = await reader<Signal[]>(SIGNALS_FILE_PATH, []);
  if (!Array.isArray(signals)) return [];
  return signals
    .map((s) => normalizeSignal(s))
    .filter((s): s is Signal => s !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_STORED_SIGNALS);
}

async function writeSignals(signals: Signal[]): Promise<void> {
  const normalized = signals
    .map((s) => normalizeSignal(s))
    .filter((s): s is Signal => s !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_STORED_SIGNALS);
  await writer(SIGNALS_FILE_PATH, normalized);
}

/* ---------------- fill classification ---------------- */

function classifyFillForSignal(fill: Fill): SignalDirection | null {
  const tradeSize = Number.parseFloat(fill.sz);
  if (!Number.isFinite(tradeSize) || tradeSize <= 0) return null;

  const dir = typeof fill.dir === 'string' ? fill.dir.toLowerCase() : '';

  if (dir.includes('close')) return null;
  if (dir.includes('open')) {
    if (dir.includes('long')) return 'LONG';
    if (dir.includes('short')) return 'SHORT';
  }

  const startPosition = Number.parseFloat(fill.startPosition);
  if (!Number.isFinite(startPosition)) return null;

  if (fill.side === 'B' && startPosition >= 0) return 'LONG';
  if (fill.side === 'A' && startPosition <= 0) return 'SHORT';
  return null;
}

/* ---------------- position reconstruction ---------------- */

interface PositionSnapshot {
  size: number;
  entryPx: number;
  openTime: number;
}

/**
 * Rebuild the open position from fills, newest-first, until we reconstruct
 * the current position size. All the intermediate states must agree in sign
 * (no flips) — if we hit a flip or a closing fill we bail: the snapshot
 * could not be reconstructed reliably from the available fills.
 */
function reconstructPosition(fills: Fill[], currentSize: number, maxAgeMs: number): PositionSnapshot | null {
  if (currentSize === 0 || fills.length === 0) return null;

  let remaining = currentSize;
  let totalCost = 0;
  let openTime: number | null = null;
  const now = Date.now();

  for (const fill of fills) {
    const dir = typeof fill.dir === 'string' ? fill.dir.toLowerCase() : '';
    const size = Math.abs(Number.parseFloat(fill.sz));
    if (!Number.isFinite(size) || size === 0) continue;

    const isOpening =
      dir.includes('open') ||
      (fill.side === 'B' && Number.parseFloat(fill.startPosition) >= 0) ||
      (fill.side === 'A' && Number.parseFloat(fill.startPosition) <= 0);
    if (!isOpening) continue; // skip closing / reducing fills

    const newSize = remaining - size;
    const flipped = newSize < -1e-9; // passing through zero or flipping sign
    if (flipped) return null;

    const signed = fill.side === 'B' ? size : -size;
    const newSigned = currentSize > 0 ? Math.max(0, remaining - size) : -Math.max(0, -remaining - size);
    const prevSigned = currentSize > 0 ? remaining : -remaining;
    if (prevSigned !== 0 && newSigned !== 0 && Math.sign(prevSigned) !== Math.sign(newSigned)) return null;

    const price = Number.parseFloat(fill.px);
    if (Number.isFinite(price)) totalCost += size * price;

    openTime = fill.time;
    remaining = newSize;

    if (remaining < 1e-9) break;
  }

  if (remaining > 1e-9) return null; // could not reconstruct: some fills are missing
  if (openTime === null || now - openTime > maxAgeMs) return null;
  const avgEntry = totalCost > 0 ? totalCost / currentSize : 0;
  if (avgEntry <= 0) return null;

  return { size: currentSize, entryPx: avgEntry, openTime };
}

/* ---------------- detection ---------------- */

export async function detectAndSaveSignals(options: DetectOptions = {}): Promise<void> {
  const startedAt = Date.now();
  const walletsWithCooldown = await getWallets();
  const trackedAddresses = walletsWithCooldown.map((w) => w.address);
  const settings = await getSettings();
  const { minWalletCount, timeWindow, minVolume } = settings;

  if (trackedAddresses.length === 0 || minWalletCount <= 0 || timeWindow <= 0) {
    await log({ level: 'INFO', message: 'Detection skipped: no tracked wallets or invalid settings.' });
    await writeWorkerState({ nextWalletIndex: 0, lastDetectionRunAt: new Date().toISOString(), lastDetectionRunDurationMs: 0 });
    return;
  }

  const overallDeadline = options.deadlineMs ?? Number.POSITIVE_INFINITY;
  const workerState = await readWorkerState();
  const startIndex = workerState.nextWalletIndex % trackedAddresses.length;
  const rotated = [...trackedAddresses.slice(startIndex), ...trackedAddresses.slice(0, startIndex)];
  // Only scan one batch per tick — the cursor advances so the next tick
  // continues where this one left off. This keeps every tick inside the
  // time cap no matter how many wallets are tracked.
  const batches: string[][] = [rotated.slice(0, DETECTION_MAX_WALLETS_PER_RUN)];

  const timeWindowMs = timeWindow * 60 * 1000;
  const now = Date.now();
  let detectionAborted = false;

  const report = async (phase: DetectionPhase, processedWallets: number) => {
    if (!options.onProgress) return;
    await options.onProgress({
      processedWallets,
      totalWallets: trackedAddresses.length,
      durationMs: Date.now() - startedAt,
      phase,
      aborted: detectionAborted,
    });
  };

  await log({
    level: 'INFO',
    message: `Detection run: scanning ${trackedAddresses.length} wallets (batch of ${batches[0]?.length ?? 0})`,
    context: { startIndex, timeWindow, minWalletCount, minVolume },
  });

  /* Phase 1: fetch fills for this batch */
  const fillsByWallet: { address: string; fills: Fill[] }[] = [];
  walletLoop: for (const batch of batches) {
    for (const address of batch) {
      const deadlineExceeded = Number.isFinite(overallDeadline) && Date.now() >= overallDeadline;
      if (deadlineExceeded) {
        detectionAborted = true;
        await report('fetch', fillsByWallet.length);
        break walletLoop;
      }
      const result = await getUserFills(address, { deadline: Number.isFinite(overallDeadline) ? overallDeadline : undefined });
      if (result.aborted) {
        detectionAborted = true;
        await report('fetch', fillsByWallet.length);
        break walletLoop;
      }
      fillsByWallet.push({ address, fills: result.fills });
      await report('fetch', fillsByWallet.length);
    }
  }

  if (detectionAborted) {
    await advanceWorkerWalletCursor({ processedWallets: fillsByWallet.length, totalWallets: trackedAddresses.length });
    await writeWorkerState({ lastDetectionRunAt: new Date().toISOString(), lastDetectionRunDurationMs: Date.now() - startedAt });
    await log({ level: 'WARN', message: 'Detection aborted early (runtime limit).', context: { processedWallets: fillsByWallet.length, totalWallets: trackedAddresses.length } });
    await report('complete', fillsByWallet.length);
    return;
  }

  await advanceWorkerWalletCursor({ processedWallets: fillsByWallet.length, totalWallets: trackedAddresses.length });
  await writeWorkerState({ lastDetectionRunAt: new Date().toISOString(), lastDetectionRunDurationMs: Date.now() - startedAt });

  /* Phase 2: cluster opening fills */
  const recentOpeningFills: { address: string; fill: Fill; signalType: SignalDirection }[] = [];
  for (const { address, fills } of fillsByWallet) {
    for (const fill of fills) {
      const isRecent = now - fill.time < timeWindowMs;
      const classification = classifyFillForSignal(fill);
      if (!isRecent || !classification) continue;

      const wallet = walletsWithCooldown.find((w: { address: string }) => w.address.toLowerCase() === address.toLowerCase());
      if (!wallet) continue;
      if (isOnCooldown(wallet, fill.coin, now)) continue;

      recentOpeningFills.push({ address, fill, signalType: classification });
    }
  }
  await report('aggregate', fillsByWallet.length);

  if (recentOpeningFills.length === 0) {
    await log({ level: 'INFO', message: 'No recent opening fills within the detection window.' });
    await report('complete', fillsByWallet.length);
    return;
  }

  /* Group by coin-direction, then find the max window cluster per group */
  const groups = new Map<string, { type: SignalDirection; fills: { address: string; fill: Fill }[] }>();
  for (const entry of recentOpeningFills) {
    const key = `${entry.fill.coin}-${entry.signalType}`;
    const existing = groups.get(key);
    if (existing) existing.fills.push({ address: entry.address, fill: entry.fill });
    else groups.set(key, { type: entry.signalType, fills: [{ address: entry.address, fill: entry.fill }] });
  }

  const existingSignals = await readSignals();
  let newSignalsWereAdded = false;

  for (const { type, fills } of groups.values()) {
    const sorted = fills.sort((a, b) => a.fill.time - b.fill.time);
    const coin = sorted[0].fill.coin;

    let best: { start: number; end: number; wallets: number } | null = null;
    const walletCounts = new Map<string, number>();
    let startIdx = 0;
    for (let endIdx = 0; endIdx < sorted.length; endIdx++) {
      const w = sorted[endIdx].address;
      walletCounts.set(w, (walletCounts.get(w) ?? 0) + 1);
      while (startIdx <= endIdx && sorted[endIdx].fill.time - sorted[startIdx].fill.time >= timeWindowMs) {
        const sw = sorted[startIdx].address;
        const remaining = (walletCounts.get(sw) ?? 0) - 1;
        if (remaining > 0) walletCounts.set(sw, remaining);
        else walletCounts.delete(sw);
        startIdx += 1;
      }
      const uniqueWallets = walletCounts.size;
      if (uniqueWallets >= minWalletCount && (!best || uniqueWallets > best.wallets)) {
        best = { start: startIdx, end: endIdx, wallets: uniqueWallets };
      }
    }

    if (!best) continue;

    const cluster = sorted.slice(best.start, best.end + 1);
    const totalVolume = cluster.reduce((acc, { fill }) => acc + Number.parseFloat(fill.px) * Math.abs(Number.parseFloat(fill.sz)), 0);
    if (totalVolume < minVolume) continue;

    const signalTimestamp = Math.max(...cluster.map(({ fill }) => fill.time));
    const signalId = `${coin}-${type}-${signalTimestamp}`;
    if (existingSignals.some((s) => s.id === signalId)) continue;

    const participatingWallets = [...new Set(cluster.map(({ address }) => address))];
    const totalSize = cluster.reduce((acc, { fill }) => acc + Math.abs(Number.parseFloat(fill.sz)), 0);
    const totalCost = cluster.reduce((acc, { fill }) => acc + Number.parseFloat(fill.px) * Math.abs(Number.parseFloat(fill.sz)), 0);
    const avgEntryPrice = totalSize > 0 ? totalCost / totalSize : 0;

    const mids = await getAllMids();
    const currentPrice = Number(mids?.[coin]);
    const pnl = Number.isFinite(currentPrice)
      ? (currentPrice - avgEntryPrice) * totalSize * (type === 'LONG' ? 1 : -1)
      : 0;

    const { totalMargin, totalLeverageValue, leverageCount } = cluster.reduce(
      (acc, { fill }) => {
        const leverage = fill.leverage?.value ? Number.parseFloat(String(fill.leverage.value)) : 10;
        const fillSize = Math.abs(Number.parseFloat(fill.sz));
        const fillPrice = Number.parseFloat(fill.px);
        acc.totalMargin += (fillPrice * fillSize) / leverage;
        acc.totalLeverageValue += leverage;
        acc.leverageCount += 1;
        return acc;
      },
      { totalMargin: 0, totalLeverageValue: 0, leverageCount: 0 }
    );

    const avgLeverage = leverageCount > 0 ? totalLeverageValue / leverageCount : 10;
    const roi = totalMargin > 0 ? (pnl / totalMargin) * 100 : 0;

    const tpTargets = settings.takeProfitTargets
      .split(',')
      .map((t) => Number.parseFloat(t.trim()))
      .filter(Number.isFinite);

    const takeProfitLevels = tpTargets.map((target) =>
      (type === 'LONG' ? avgEntryPrice * (1 + target / 100) : avgEntryPrice * (1 - target / 100)).toFixed(4)
    );

    const stopLossLevel = (
      type === 'LONG'
        ? avgEntryPrice * (1 - settings.defaultStopLoss / 100)
        : avgEntryPrice * (1 + settings.defaultStopLoss / 100)
    ).toFixed(4);

    const newSignal: Signal = {
      id: signalId,
      pair: coin,
      type,
      entryPrice: avgEntryPrice.toFixed(4),
      currentPrice: Number.isFinite(currentPrice) ? currentPrice.toFixed(4) : '0',
      pnl: pnl.toFixed(2),
      roi: roi.toFixed(2),
      status: 'OPEN',
      timestamp: new Date(signalTimestamp).toISOString(),
      leverage: avgLeverage.toFixed(2),
      liquidationPrice: 'n/a',
      margin: totalMargin.toFixed(2),
      size: totalSize.toFixed(4),
      contributingWallets: participatingWallets.length,
      contributingWalletAddresses: participatingWallets.sort(),
      takeProfitTargets: takeProfitLevels,
      stopLoss: stopLossLevel,
      clusterFills: cluster.map(({ address, fill }) => ({ walletAddress: address, sz: Math.abs(Number.parseFloat(fill.sz)).toFixed(6) })),
    };

    existingSignals.push(newSignal);
    await updateWalletCooldowns(participatingWallets, coin);
    await sendTelegramMessage(newSignal, settings);
    newSignalsWereAdded = true;
    await log({
      level: 'INFO',
      message: `NEW SIGNAL: ${coin} ${type} by ${participatingWallets.length} wallets`,
      context: { entry: newSignal.entryPrice, margin: newSignal.margin, volume: totalVolume.toFixed(2) },
    });
  }

  if (newSignalsWereAdded) {
    await writeSignals(existingSignals);
    await log({ level: 'INFO', message: 'New signal(s) detected and saved.' });
  } else {
    await log({ level: 'INFO', message: 'No new signals detected in this run.' });
  }
  await report('complete', fillsByWallet.length);
}

/* ---------------- price updates ---------------- */

export async function updateSignalPrices(options: UpdatePricesOptions = {}): Promise<Signal[]> {
  const { deadlineMs, onProgress } = options;
  const startedAt = Date.now();
  const report = (progress: Omit<UpdatePricesProgress, 'durationMs'>) =>
    onProgress?.({ ...progress, durationMs: Date.now() - startedAt });

  const signals = await readSignals();
  const openSignals = signals.filter((s) => s.status === 'OPEN');
  if (openSignals.length === 0) {
    await report({ stage: 'complete', skipped: true, total: 0 });
    return signals;
  }

  const uniqueCoins = [...new Set(openSignals.map((s) => s.pair))];
  await report({ stage: 'start', total: uniqueCoins.length });

  const mids = await getAllMids();
  if (!mids) {
    await report({ stage: 'complete', skipped: true, total: uniqueCoins.length });
    return signals;
  }

  const updated = signals.map((signal) => {
    if (signal.status !== 'OPEN') return signal;
    const price = Number(mids[signal.pair]);
    if (!Number.isFinite(price) || price <= 0) return signal;

    const entry = Number.parseFloat(signal.entryPrice);
    const size = Number.parseFloat(signal.size);
    const margin = Number.parseFloat(signal.margin);
    const stopLoss = Number.parseFloat(signal.stopLoss);
    const tpTargets = signal.takeProfitTargets.map(Number.parseFloat);

    let status: Signal['status'] = signal.status;
    if (signal.type === 'LONG') {
      if (price <= stopLoss) status = 'SL';
      else if (tpTargets.some((tp) => price >= tp)) status = 'TP';
    } else {
      if (price >= stopLoss) status = 'SL';
      else if (tpTargets.some((tp) => price <= tp)) status = 'TP';
    }

    const pnl = (price - entry) * size * (signal.type === 'LONG' ? 1 : -1);
    const roi = margin > 0 ? (pnl / margin) * 100 : 0;

    return {
      ...signal,
      status,
      currentPrice: price.toFixed(4),
      pnl: pnl.toFixed(2),
      roi: roi.toFixed(2),
    };
  });

  const statusChanged = updated.some((s, i) => s.status !== signals[i].status);
  await writeSignals(updated);

  if (statusChanged) {
    await updateWalletStats(updated);
  }

  await report({ stage: 'complete', skipped: false, total: uniqueCoins.length });
  await log({
    level: 'INFO',
    message: `Price update finished: ${uniqueCoins.length} coins, ${statusChanged ? 'status changes detected' : 'no changes'}`,
    context: { elapsedMs: Date.now() - startedAt },
  });
  return updated;
}

/** Distribute realized PnL of closed signals to the wallets that took part. */
async function updateWalletStats(updatedSignals: Signal[]): Promise<void> {
  const wallets = await readWallets();
  let dirty = false;

  for (const signal of updatedSignals) {
    if (signal.status === 'OPEN') continue;
    const pnl = Number.parseFloat(signal.pnl);
    if (!Number.isFinite(pnl)) continue;

    const totalSignalSize = signal.clusterFills?.reduce((acc, f) => acc + Math.abs(Number.parseFloat(f.sz)), 0) ?? 0;

    const allocate = (address: string, share: number) => {
      const idx = wallets.findIndex((w: { address: string }) => w.address.toLowerCase() === address.toLowerCase());
      if (idx === -1) return;
      wallets[idx].totalPnl += share;
      wallets[idx].totalTrades += 1;
      if (signal.status === 'TP') wallets[idx].winningTrades += 1;
      dirty = true;
    };

    if (signal.clusterFills && totalSignalSize > 0) {
      for (const fill of signal.clusterFills) {
        const fillSize = Math.abs(Number.parseFloat(fill.sz));
        if (fillSize <= 0) continue;
        allocate(fill.walletAddress, pnl * (fillSize / totalSignalSize));
      }
    } else if (signal.contributingWalletAddresses.length > 0) {
      const share = pnl / signal.contributingWalletAddresses.length;
      for (const address of signal.contributingWalletAddresses) allocate(address, share);
    }
  }

  if (dirty) await writeWallets(wallets);
}

/* ---------------- public helpers ---------------- */

export async function getSignals(): Promise<Signal[]> {
  return readSignals();
}

export async function deleteSignal(signalId: string): Promise<void> {
  const signals = await readSignals();
  await writeSignals(signals.filter((s) => s.id !== signalId));
}

export interface WalletPositionView {
  address: string;
  coin: string;
  direction: SignalDirection;
  positionSize: string;
  entryPrice: string;
  positionValue: string;
  timestamp: string;
  leverage: number;
  liquidationPx: string;
  unrealizedPnl: string;
  markPx: string;
  openedAt: string | null;
}

/** Rich per-wallet position info (Explorer "find wallets by coin"). */
export async function findWalletsByCoin(coin: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<{ positions: WalletPositionView[]; trackedWalletCount: number }> {
  const coinUpperCase = coin.trim().toUpperCase();
  const wallets = await getWallets();
  if (wallets.length === 0) return { positions: [], trackedWalletCount: 0 };

  const states = await Promise.all(
    wallets.map(async (w: { address: string }) => {
      const state = await getClearinghouseState(w.address);
      return { address: w.address, state };
    })
  );

  const positions: WalletPositionView[] = [];
  for (const { address, state } of states) {
    if (!state) continue;
    for (const { position } of state.assetPositions ?? []) {
      if (position.coin.toUpperCase() !== coinUpperCase) continue;
      const size = Number.parseFloat(position.szi);
      if (size === 0) continue;

      const fills = await getUserFills(address);
      const snapshot = reconstructPosition(fills.fills, size, maxAgeMs);

      positions.push({
        address,
        coin: position.coin,
        direction: size > 0 ? 'LONG' : 'SHORT',
        positionSize: position.szi,
        entryPrice: snapshot?.entryPx.toFixed(4) ?? position.entryPx,
        positionValue: position.positionValue,
        timestamp: new Date(snapshot?.openTime ?? Date.now()).toISOString(),
        leverage: position.leverage?.value ?? 10,
        liquidationPx: position.liquidationPx,
        unrealizedPnl: position.unrealizedPnl,
        markPx: position.markPx,
        openedAt: snapshot ? new Date(snapshot.openTime).toISOString() : null,
      });
    }
  }

  return {
    positions: positions.sort((a, b) => Number.parseFloat(b.positionValue) - Number.parseFloat(a.positionValue)),
    trackedWalletCount: wallets.length,
  };
}

/** Per-wallet summary (Explorer "wallet lookup"). */
export async function getWalletData(address: string): Promise<{
  pnl: string;
  roi: string;
  accountValue: string;
  marginUsed: string;
  positions: {
    coin: string;
    side: SignalDirection;
    size: number;
    entryPx: number;
    markPx: number;
    positionValue: number;
    unrealizedPnl: number;
    leverage: number;
    liquidationPrice: number;
    margin: number;
    openedAt: string | null;
  }[];
}> {
  const state = await getClearinghouseState(address);
  if (!state) throw new Error('Failed to fetch wallet data from Hyperliquid.');

  const positions = (state.assetPositions ?? []).map(({ position }) => position);
  let totalPnl = 0;
  let totalMargin = 0;

  const detailPromises = positions.map(async (position: ClearedPosition) => {
    const size = Number.parseFloat(position.szi);
    const entryPx = Number.parseFloat(position.entryPx);
    const markPx = Number.parseFloat(position.markPx);
    const unrealizedPnl = Number.parseFloat(position.unrealizedPnl);
    const leverage = position.leverage?.value ?? 10;
    const margin = Number.parseFloat(position.marginUsed);

    if (Number.isFinite(unrealizedPnl)) totalPnl += unrealizedPnl;
    if (Number.isFinite(size) && Number.isFinite(entryPx) && Number.isFinite(leverage) && leverage > 0) {
      totalMargin += (Math.abs(size) * entryPx) / leverage;
    }

    let openedAt: string | null = null;
    if (size !== 0) {
      const fills = await getUserFills(address);
      const snapshot = reconstructPosition(fills.fills, size, 7 * 24 * 60 * 60 * 1000);
      openedAt = snapshot ? new Date(snapshot.openTime).toISOString() : null;
    }

    return {
      coin: position.coin,
      side: (size > 0 ? 'LONG' : 'SHORT') as SignalDirection,
      size,
      entryPx,
      markPx,
      positionValue: Number.parseFloat(position.positionValue),
      unrealizedPnl,
      leverage,
      liquidationPrice: Number.parseFloat(position.liquidationPx),
      margin,
      openedAt,
    };
  });

  const detailed = await Promise.all(detailPromises);
  const totalRoi = totalMargin > 0 ? (totalPnl / totalMargin) * 100 : 0;

  return {
    pnl: totalPnl.toFixed(2),
    roi: totalRoi.toFixed(2),
    accountValue: state.marginSummary?.accountValue ?? '0',
    marginUsed: state.marginSummary?.totalMarginUsed ?? '0',
    positions: detailed,
  };
}

/* Re-export for compatibility with dashboard/perf services */
export { readWallets, writeWallets, isOnCooldown, COOLDOWN_MS };

/** Silence unused import warnings for registerHyperliquidPenalty/parseRetryAfterMs in some build paths */
void registerHyperliquidPenalty;
void parseRetryAfterMs;
