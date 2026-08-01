import type { Signal, WalletPerformance } from '@/lib/types';
import { getSignals } from './signals';

function resolveTimeframe(timeframe: string): number | null {
  const now = Date.now();
  switch (timeframe) {
    case '24h':
      return now - 24 * 60 * 60 * 1000;
    case '7d':
      return now - 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return now - 30 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export async function getPerformanceData(timeframe: string): Promise<WalletPerformance[]> {
  const signals = await getSignals();
  const cutoff = resolveTimeframe(timeframe);
  const walletStats = new Map<string, { pnl: number; trades: number; wins: number }>();

  for (const signal of signals) {
    if (signal.status === 'OPEN') continue;
    if (cutoff && new Date(signal.timestamp).getTime() < cutoff) continue;

    const pnl = Number.parseFloat(signal.pnl) || 0;
    const isWin = signal.status === 'TP';

    const totalSignalSize = signal.clusterFills?.reduce((acc, fill) => acc + Math.abs(Number.parseFloat(fill.sz)), 0) ?? 0;

    const allocate = (address: string, share: number) => {
      if (!address) return;
      const stats = walletStats.get(address) ?? { pnl: 0, trades: 0, wins: 0 };
      stats.pnl += share;
      stats.trades += 1;
      if (isWin) stats.wins += 1;
      walletStats.set(address, stats);
    };

    if (signal.clusterFills && totalSignalSize > 0) {
      for (const fill of signal.clusterFills) {
        const fillSize = Math.abs(Number.parseFloat(fill.sz));
        if (fillSize <= 0) continue;
        allocate(fill.walletAddress, pnl * (fillSize / totalSignalSize));
      }
    } else if ((signal.contributingWalletAddresses ?? []).length > 0) {
      const share = pnl / signal.contributingWalletAddresses.length;
      for (const address of signal.contributingWalletAddresses) allocate(address, share);
    }
  }

  return [...walletStats.entries()]
    .map(([address, stats]) => ({
      address,
      pnl: Number(stats.pnl.toFixed(2)),
      trades: stats.trades,
      successRate: stats.trades > 0 ? Number(((stats.wins / stats.trades) * 100).toFixed(2)) : 0,
      rank: 0,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
