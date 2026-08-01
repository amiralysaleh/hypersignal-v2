import type { Signal, Wallet } from '@/lib/types';
import { writeMemoryJson } from './memoryStore';

/**
 * Seeds the in-memory store with realistic data when DEMO=1 so the whole UI
 * works without Cloudflare/D1. Only runs once per process.
 */

const COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'LINK', 'SUI', 'ARB', 'AVAX', 'OP'];

function pseudoAddress(seed: number): string {
  const hex = '0123456789abcdef';
  let out = '0x';
  let x = seed;
  for (let i = 0; i < 40; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out += hex[x % 16];
  }
  return out;
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

let seeded = false;

export function ensureDemoSeed() {
  if (seeded) return;
  seeded = true;

  const WALLET_COUNT = 12;
  const wallets: Wallet[] = Array.from({ length: WALLET_COUNT }).map((_, i) => ({
    address: pseudoAddress(i + 7),
    addedOn: hoursAgo(24 * (i + 2)),
    totalPnl: 0,
    totalTrades: 0,
    winningTrades: 0,
    cooldowns: {},
    favorite: i < 2,
  }));

  const signals: Signal[] = [];
  let seed = 1000;

  const push = (
    hours: number,
    pair: string,
    type: 'LONG' | 'SHORT',
    status: 'OPEN' | 'TP' | 'SL',
    walletsCount: number,
    entryPx: number,
    leverage: number
  ) => {
    seed += 3;
    const timestamp = hoursAgo(hours);
    const participating = wallets.slice(0, walletsCount).map((w) => w.address);
    const wSize = 0.4 + ((seed * 13) % 100) / 100;
    const totalSize = wSize * walletsCount;
    const margin = (entryPx * totalSize) / leverage;
    const drift =
      status === 'TP' ? entryPx * 0.03 : status === 'SL' ? -entryPx * 0.03 : entryPx * 0.012 * (type === 'LONG' ? 1 : -1);
    const current = entryPx + drift;
    const pnl = (current - entryPx) * totalSize * (type === 'LONG' ? 1 : -1);
    const roi = (pnl / margin) * 100;
    const isLong = type === 'LONG';

    signals.push({
      id: `${pair}-${type}-${new Date(timestamp).getTime()}`,
      pair,
      type,
      entryPrice: entryPx.toFixed(4),
      currentPrice: current.toFixed(4),
      pnl: pnl.toFixed(2),
      roi: roi.toFixed(2),
      status,
      timestamp,
      leverage: leverage.toFixed(1),
      liquidationPrice: 'n/a',
      margin: margin.toFixed(2),
      size: totalSize.toFixed(4),
      contributingWallets: walletsCount,
      contributingWalletAddresses: participating,
      takeProfitTargets: [
        (entryPx * (isLong ? 1.02 : 0.98)).toFixed(4),
        (entryPx * (isLong ? 1.035 : 0.965)).toFixed(4),
        (entryPx * (isLong ? 1.05 : 0.95)).toFixed(4),
      ],
      stopLoss: (entryPx * (isLong ? 0.975 : 1.025)).toFixed(4),
      clusterFills: participating.map((addr, i) => ({
        walletAddress: addr,
        sz: (wSize + i * 0.02).toFixed(4),
      })),
    });
  };

  const seedSignal = (
    h: number,
    pair: string,
    type: 'LONG' | 'SHORT',
    status: 'OPEN' | 'TP' | 'SL',
    n: number,
    base: number,
    lev: number
  ) => push(h, pair, type, status, n, base, lev);

  // Closed history
  seedSignal(480, 'BTC', 'LONG', 'TP', 4, 61000, 5);
  seedSignal(440, 'ETH', 'SHORT', 'SL', 3, 3350, 8);
  seedSignal(380, 'SOL', 'LONG', 'TP', 5, 152, 6);
  seedSignal(320, 'XRP', 'LONG', 'SL', 3, 2.41, 10);
  seedSignal(260, 'DOGE', 'SHORT', 'TP', 6, 0.182, 12);
  seedSignal(200, 'BTC', 'SHORT', 'SL', 4, 64800, 5);
  seedSignal(140, 'SUI', 'LONG', 'TP', 5, 3.28, 7);
  seedSignal(96, 'ETH', 'LONG', 'TP', 7, 3510, 6);
  seedSignal(48, 'LINK', 'SHORT', 'SL', 3, 21.4, 9);

  // Open signals
  seedSignal(7, 'SOL', 'LONG', 'OPEN', 5, 168.4, 7);
  seedSignal(4, 'BTC', 'LONG', 'OPEN', 8, 67800, 4);
  seedSignal(2, 'AVAX', 'SHORT', 'OPEN', 3, 44.2, 10);
  seedSignal(0.6, 'ARB', 'LONG', 'OPEN', 4, 1.02, 12);
  seedSignal(0.2, 'OP', 'LONG', 'OPEN', 2, 2.87, 10);
  seedSignal(0.1, 'DOGE', 'SHORT', 'OPEN', 3, 0.194, 14);

  // Compute wallet lifetime stats from closed signals
  for (const s of signals) {
    if (s.status === 'OPEN') continue;
    const pnl = Number.parseFloat(s.pnl);
    for (const addr of s.contributingWalletAddresses) {
      const w = wallets.find((x) => x.address === addr);
      if (!w) continue;
      w.totalPnl += pnl / s.contributingWallets;
      w.totalTrades += 1;
      if (s.status === 'TP') w.winningTrades += 1;
    }
  }

  void writeMemoryJson('wallets.json', wallets);
  void writeMemoryJson('signals.json', signals);

  const now = new Date().toISOString();
  void writeMemoryJson('worker-runs.json', [
    { runId: 'demo-3', status: 'success', startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), updatedAt: now, durationMs: 4200, reason: 'cron' },
    { runId: 'demo-2', status: 'success', startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), updatedAt: now, durationMs: 3900, reason: 'cron' },
    { runId: 'demo-1', status: 'success', startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), updatedAt: now, durationMs: 4100, reason: 'cron' },
  ]);
  void writeMemoryJson('worker-state.json', { nextWalletIndex: 4, lastDetectionRunAt: now, lastDetectionRunDurationMs: 4100 });
  void writeMemoryJson('logs.json', [
    { timestamp: now, level: 'INFO' as const, message: 'Demo mode: seeded in-memory data. Start the real bot by deploying to Cloudflare.' },
    { timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), level: 'INFO' as const, message: 'Detection run completed. No new signals.', context: { walletsScanned: 8 } },
    { timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), level: 'WARN' as const, message: 'userFills rate limited, backed off 1.5s' },
    { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), level: 'INFO' as const, message: 'NEW SIGNAL: SOL LONG by 5 wallets', context: { entry: '168.4', margin: '2400' } },
  ]);
}

export { COINS };
