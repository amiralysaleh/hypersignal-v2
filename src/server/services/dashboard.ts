import type { DashboardData, Signal, SignalDirection, SignalInsight, SignalStatus } from '@/lib/types';
import { getSignals } from './signals';
import { getTrackedAddresses } from './wallets';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Deterministic wallet-cluster detection: wallets that repeatedly appear in
 * the same signals (same pair + direction within the cluster window) are
 * grouped. No LLM calls, no external cost.
 */
export function findWalletClusters(signals: Signal[]): { wallets: string[]; trades: number; coins: string[]; score: number }[] {
  const pairs = new Map<string, { count: number; coins: Set<string> }>();

  for (const signal of signals) {
    const addrs = signal.contributingWalletAddresses ?? [];
    for (let i = 0; i < addrs.length; i++) {
      for (let j = i + 1; j < addrs.length; j++) {
        const key = [addrs[i].toLowerCase(), addrs[j].toLowerCase()].sort().join('|');
        const entry = pairs.get(key) ?? { count: 0, coins: new Set<string>() };
        entry.count += 1;
        entry.coins.add(signal.pair);
        pairs.set(key, entry);
      }
    }
  }

  // Union-find over pairs appearing together 2+ times
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const root = parent.get(x) ?? x;
    if (root !== x) {
      parent.set(x, find(root));
    }
    return parent.get(x) ?? x;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const [key, { count }] of pairs) {
    if (count >= 2) {
      const [a, b] = key.split('|');
      union(a, b);
    }
  }

  const groups = new Map<string, { wallets: Set<string>; trades: number; coins: Set<string> }>();
  for (const [key, { count, coins }] of pairs) {
    if (count < 2) continue;
    const [a, b] = key.split('|');
    const root = find(a);
    const entry = groups.get(root) ?? { wallets: new Set<string>(), trades: 0, coins: new Set<string>() };
    entry.wallets.add(a);
    entry.wallets.add(b);
    entry.trades = Math.max(entry.trades, count);
    for (const c of coins) entry.coins.add(c);
    groups.set(root, entry);
  }

  return [...groups.values()]
    .filter((g) => g.wallets.size >= 2)
    .map((g) => ({
      wallets: [...g.wallets],
      trades: g.trades,
      coins: [...g.coins].slice(0, 3),
      score: g.wallets.size * g.trades,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export async function getDashboardData(): Promise<DashboardData> {
  const trackedWallets = await getTrackedAddresses();
  const signals = await getSignals();

  let totalOpenPnl = 0;
  let totalOpenMargin = 0;
  let activeSignalsCount = 0;
  let tpCount = 0;
  let slCount = 0;
  const monthlyStats: Record<string, { tp: number; sl: number }> = {};
  const pairStats = new Map<string, { total: number; wins: number; losses: number }>();
  const openSignalInsights: SignalInsight[] = [];

  for (const signal of signals) {
    const stats = pairStats.get(signal.pair) ?? { total: 0, wins: 0, losses: 0 };
    stats.total += 1;
    if (signal.status === 'TP') stats.wins += 1;
    else if (signal.status === 'SL') stats.losses += 1;
    pairStats.set(signal.pair, stats);

    if (signal.status === 'OPEN') {
      activeSignalsCount += 1;
      totalOpenPnl += Number.parseFloat(signal.pnl) || 0;
      totalOpenMargin += Number.parseFloat(signal.margin) || 0;
      const roi = Number.parseFloat(signal.roi);
      const pnl = Number.parseFloat(signal.pnl);
      openSignalInsights.push({
        pair: signal.pair,
        type: signal.type,
        roi: Number.isFinite(roi) ? roi : 0,
        pnl: Number.isFinite(pnl) ? pnl : 0,
        status: signal.status,
        timestamp: signal.timestamp,
      });
    } else {
      const date = new Date(signal.timestamp);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyStats[monthKey] = monthlyStats[monthKey] ?? { tp: 0, sl: 0 };
      if (signal.status === 'TP') {
        tpCount += 1;
        monthlyStats[monthKey].tp += 1;
      } else if (signal.status === 'SL') {
        slCount += 1;
        monthlyStats[monthKey].sl += 1;
      }
    }
  }

  const totalClosedSignals = tpCount + slCount;
  const winRate = totalClosedSignals > 0 ? (tpCount / totalClosedSignals) * 100 : 0;
  const totalRoi = totalOpenMargin > 0 ? (totalOpenPnl / totalOpenMargin) * 100 : 0;

  const performanceChartData: { month: string; winrate: number }[] = [];
  const today = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    const stats = monthlyStats[monthKey] ?? { tp: 0, sl: 0 };
    const totalTrades = stats.tp + stats.sl;
    const monthlyWinrate = totalTrades > 0 ? (stats.tp / totalTrades) * 100 : 0;
    performanceChartData.push({ month: MONTH_NAMES[d.getMonth()], winrate: Number(monthlyWinrate.toFixed(1)) });
  }

  const toInsight = (signal: Signal): SignalInsight => ({
    pair: signal.pair,
    type: signal.type,
    roi: Number.parseFloat(signal.roi) || 0,
    pnl: Number.parseFloat(signal.pnl) || 0,
    status: signal.status,
    timestamp: signal.timestamp,
  });

  return {
    totalPnl: totalOpenPnl,
    totalRoi,
    winRate,
    totalClosedSignals,
    activeSignals: activeSignalsCount,
    trackedWallets: trackedWallets.length,
    recentSignals: signals.slice(0, 5).map((signal) => ({
      pair: signal.pair,
      type: signal.type,
      pnl: Number.parseFloat(signal.pnl) || 0,
      status: signal.status,
      contributingWallets: signal.contributingWallets,
    })),
    performanceChartData,
    signalOutcomes: { TP: tpCount, SL: slCount, OPEN: activeSignalsCount },
    topPairs: [...pairStats.entries()]
      .map(([pair, { total, wins, losses }]) => {
        const closed = wins + losses;
        const winRateValue = closed > 0 ? (wins / closed) * 100 : null;
        return { pair, signals: total, winRate: winRateValue === null ? null : Number(winRateValue.toFixed(1)) };
      })
      .sort((a, b) => b.signals - a.signals)
      .slice(0, 5),
    standoutSignals: openSignalInsights
      .filter((s) => s.roi > 0)
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 3),
    attentionSignals: openSignalInsights
      .filter((s) => s.roi <= 0)
      .sort((a, b) => a.roi - b.roi)
      .slice(0, 3),
    walletClusters: findWalletClusters(signals),
  };
}

export type { SignalDirection, SignalStatus };
