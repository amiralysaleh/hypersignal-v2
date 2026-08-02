'use client';

import { useEffect, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { api, cn, formatTimeAgo, formatUsd } from '@/lib/utils';
import { CoinSprite } from '@/components/pixel/coin-sprite';
import {
  BlinkCursor,
  PixelCard,
  PixelLoader,
  PixelProgress,
  PixelTitle,
  shortAddr,
  StatBox,
} from '@/components/pixel/retro-widgets';

const OUTCOME_COLORS: Record<string, string> = {
  TP: 'bg-px-green',
  SL: 'bg-px-red',
  OPEN: 'bg-px-cyan',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const d = await api<DashboardData>('/api/dashboard');
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (loading && !data) {
    return <PixelLoader label="BOOTING DASHBOARD" />;
  }
  if (error && !data) {
    return (
      <PixelCard className="p-8 text-center">
        <p className="font-pixel text-[10px] text-px-red text-glow-red">SIGNAL LOST</p>
        <p className="mt-3 text-[12px] text-px-gray">{error}</p>
      </PixelCard>
    );
  }

  const outcomes = data?.signalOutcomes ?? { TP: 0, SL: 0, OPEN: 0 };
  const outcomeTotal = Math.max(1, outcomes.TP + outcomes.SL + outcomes.OPEN);
  const closedTotal = Math.max(1, outcomes.TP + outcomes.SL);
  const chartData = data?.performanceChartData ?? [];
  const maxWinrate = Math.max(100, ...chartData.map((d) => d.winrate));
  const topPairs = data?.topPairs ?? [];
  const maxPairSignals = Math.max(1, ...topPairs.map((p) => p.signals));

  return (
    <div className="flex flex-col gap-5">
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="UNREALIZED ROI" value={`${(data?.totalRoi ?? 0).toFixed(2)}%`} sub={`${formatUsd(data?.totalPnl ?? 0)} open pnl`} loading={loading} color="cyan" />
        <StatBox label="WIN RATE" value={data && data.totalClosedSignals === 0 ? 'N/A' : `${(data?.winRate ?? 0).toFixed(1)}%`} sub={`${data?.totalClosedSignals ?? 0} closed`} loading={loading} color="green" />
        <StatBox label="ACTIVE SIGNALS" value={String(data?.activeSignals ?? 0)} sub="open positions" loading={loading} color="yellow" />
        <StatBox label="TRACKED WALLETS" value={String(data?.trackedWallets ?? 0)} sub="monitored" loading={loading} color="purple" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Winrate Animated Pixel Chart */}
        <PixelCard>
          <PixelTitle icon="▚">MONTHLY WIN RATE (%)</PixelTitle>
          <div className="relative mt-6 flex h-48 items-end gap-3 border-b-2 border-px-cyan/40 px-3 pb-2 pt-8">
            {(() => {
              const bestIndex = chartData.reduce(
                (maxI, item, i, arr) => (item.winrate > (arr[maxI]?.winrate ?? 0) ? i : maxI),
                0
              );

              return chartData.map((d, i) => {
                const isBest = i === bestIndex && d.winrate > 0;
                // Scale height: 0% gets a subtle base, higher winrates scale dynamically up to 100%
                const heightPct = d.winrate > 0 ? Math.max(15, (d.winrate / 100) * 100) : 6;

                return (
                  <div key={d.month} className="group relative flex flex-1 flex-col items-center justify-end">
                    {/* Top Month Badge */}
                    {isBest && (
                      <span className="chip chip--cyan absolute -top-7 animate-bounce text-[7px]">
                        ★ TOP
                      </span>
                    )}

                    <span className={cn('mb-1.5 font-mono text-[10px] font-bold', d.winrate > 0 ? 'text-px-cyan text-glow' : 'text-px-gray')}>
                      {d.winrate > 0 ? `${d.winrate.toFixed(0)}%` : '0%'}
                    </span>

                    {/* Animated Pixel Bar */}
                    <div
                      className={cn(
                        'relative w-full border border-px-cyan/30 bg-base-950 p-0.5 transition-all duration-500',
                        isBest && 'border-px-cyan shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                      )}
                      style={{ height: `${heightPct}%` }}
                    >
                      <div
                        className={cn(
                          'h-full w-full transition-all duration-500',
                          d.winrate === 0
                            ? 'bg-base-800/40'
                            : isBest
                            ? 'bg-gradient-to-t from-px-cyan-dim to-px-cyan shadow-[0_0_8px_#22d3ee]'
                            : d.winrate >= 50
                            ? 'bg-gradient-to-t from-emerald-950 to-px-green'
                            : 'bg-gradient-to-t from-amber-950 to-px-yellow'
                        )}
                      />
                    </div>

                    <span className="mt-2 font-pixel text-[8px] uppercase text-px-gray group-hover:text-px-cyan transition-colors">
                      {d.month}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          {chartData.length === 0 && <p className="mt-6 text-center text-[12px] text-px-gray">No closed signals yet</p>}
        </PixelCard>

        {/* Outcomes */}
        <PixelCard>
          <PixelTitle icon="◉">SIGNAL OUTCOMES</PixelTitle>
          <div className="mt-4 flex items-center gap-6">
            <div className="grid shrink-0 grid-cols-4 gap-1" aria-hidden>
              {Array.from({ length: 16 }).map((_, i) => {
                const tp = Math.round((outcomes.TP / outcomeTotal) * 8);
                const sl = Math.round((outcomes.SL / outcomeTotal) * 4);
                const color =
                  i < 8 ? (i < tp ? 'bg-px-green' : 'bg-base-600') : i < 12 ? (i - 8 < sl ? 'bg-px-red' : 'bg-base-600') : 'bg-px-cyan/70';
                return <span key={i} className={cn('h-4 w-4 border border-px-blue/20 transition-colors', color)} />;
              })}
            </div>
            <div className="flex flex-col gap-2 text-[12px]">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-px-green" /> TP {outcomes.TP} <span className="text-px-gray">({((outcomes.TP / closedTotal) * 100).toFixed(0)}% of closed)</span></span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-px-red" /> SL {outcomes.SL}</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-px-cyan" /> OPEN {outcomes.OPEN}</span>
            </div>
          </div>
        </PixelCard>
      </div>

      {/* Top pairs + clusters */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PixelCard>
          <PixelTitle icon="▦">TOP PAIRS</PixelTitle>
          <div className="mt-3 flex flex-col gap-3">
            {topPairs.length === 0 && <p className="text-[12px] text-px-gray">No pair activity yet.</p>}
            {topPairs.map((p) => (
              <div key={p.pair} className="flex items-center gap-3">
                <CoinSprite symbol={p.pair} size={28} />
                <span className="w-14 font-pixel text-[9px] text-slate-200">{p.pair}</span>
                <div className="flex flex-1 items-center gap-2">
                  <PixelProgress value={p.signals} max={maxPairSignals} className="flex-1" />
                  <span className="w-16 text-right font-mono text-[10px] text-px-gray">{p.signals} SIG</span>
                </div>
                <span className={cn('w-20 text-right font-mono text-[10px]', p.winRate === null ? 'text-px-gray' : p.winRate >= 50 ? 'text-px-green' : 'text-px-red')}>
                  {p.winRate === null ? '—' : `${p.winRate}%`}
                </span>
              </div>
            ))}
          </div>
        </PixelCard>

        <PixelCard>
          <PixelTitle icon="◈" accent="purple">WALLET CLUSTERS</PixelTitle>
          <p className="mt-1 text-[10px] text-px-gray">Wallets that move together (deterministic, no AI)</p>
          <div className="mt-3 flex flex-col gap-3">
            {(data?.walletClusters ?? []).length === 0 && (
              <p className="text-[12px] text-px-gray">No correlated clusters yet. Cluster forms after 2+ co-signals.</p>
            )}
            {(data?.walletClusters ?? []).map((c, i) => (
              <div key={i} className="crt-panel--flat p-2 hover:border-px-purple/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[8px] text-px-purple">CLUSTER {String(i + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-[10px] text-px-cyan">{c.trades} TOGETHER</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.wallets.map((w) => (
                    <span key={w} className="border border-px-blue/20 px-1.5 py-0.5 font-mono text-[9px] text-px-gray-light">
                      {shortAddr(w)}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex gap-1.5">
                  {c.coins.map((coin) => (
                    <span key={coin} className="font-mono text-[9px] text-px-cyan">{coin}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PixelCard>
      </div>

      {/* Standout / attention */}
      <div className="grid gap-5 md:grid-cols-2">
        <PixelCard>
          <PixelTitle icon="★" accent="green">STANDOUT SIGNALS</PixelTitle>
          <div className="mt-3 flex flex-col gap-2">
            {(data?.standoutSignals ?? []).length === 0 && <p className="text-[12px] text-px-gray">No winners right now.</p>}
            {(data?.standoutSignals ?? []).map((s) => (
              <SignalInsightRow key={`${s.pair}-${s.timestamp}`} {...s} positive />
            ))}
          </div>
        </PixelCard>
        <PixelCard>
          <PixelTitle icon="⚠" accent="yellow">NEEDS ATTENTION</PixelTitle>
          <div className="mt-3 flex flex-col gap-2">
            {(data?.attentionSignals ?? []).length === 0 && <p className="text-[12px] text-px-gray">All open signals holding.</p>}
            {(data?.attentionSignals ?? []).map((s) => (
              <SignalInsightRow key={`${s.pair}-${s.timestamp}`} {...s} positive={false} />
            ))}
          </div>
        </PixelCard>
      </div>

      {/* Recent signals */}
      <PixelCard>
        <PixelTitle icon="▸">RECENT SIGNALS</PixelTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-px-blue/20 font-pixel text-[8px] text-px-gray">
                <th className="py-2 text-left">PAIR</th>
                <th className="py-2 text-left">TYPE</th>
                <th className="py-2 text-left">WALLETS</th>
                <th className="py-2 text-right">PNL</th>
                <th className="py-2 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentSignals ?? []).map((s, i) => (
                <tr key={i} className="border-b border-dashed border-px-blue/10 text-[12px] hover:bg-base-700/30 transition-colors">
                  <td className="flex items-center gap-2 py-2">
                    <CoinSprite symbol={s.pair} size={20} animate={false} />
                    <span className="font-pixel text-[9px] text-slate-200">{s.pair}</span>
                  </td>
                  <td className={cn('font-pixel text-[8px]', s.type === 'LONG' ? 'text-px-green' : 'text-px-red')}>
                    {s.type}
                  </td>
                  <td className="text-px-gray">{s.contributingWallets}</td>
                  <td className={cn('text-right font-mono', s.pnl >= 0 ? 'text-px-green' : 'text-px-red')}>
                    {formatUsd(s.pnl)}
                  </td>
                  <td className="text-right">
                    <StatusChip status={s.status} />
                  </td>
                </tr>
              ))}
              {(data?.recentSignals ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[12px] text-px-gray">
                    No signals yet — the bot scans every 10 min.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PixelCard>

      {data && data.activeSignals > 0 && (
        <p className="text-center text-[10px] text-px-gray">
          LAST SYNC {formatTimeAgo(new Date().toISOString())} <BlinkCursor />
        </p>
      )}
    </div>
  );
}

function SignalInsightRow({
  pair,
  type,
  roi,
  pnl,
  timestamp,
  positive,
}: {
  pair: string;
  type: 'LONG' | 'SHORT';
  roi: number;
  pnl: number;
  status: 'OPEN' | 'TP' | 'SL';
  timestamp: string;
  positive: boolean;
}) {
  return (
    <div className="crt-panel--flat flex items-center gap-3 p-2 transition-colors">
      <CoinSprite symbol={pair} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[8px] text-slate-200">{pair}</span>
          <span className={cn('font-pixel text-[7px]', type === 'LONG' ? 'text-px-green' : 'text-px-red')}>{type}</span>
        </div>
        <p className="text-[10px] text-px-gray">{formatTimeAgo(timestamp)}</p>
      </div>
      <div className={cn('text-right font-mono text-[11px]', positive ? 'text-px-green' : 'text-px-red')}>
        {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%<br />
        <span className="text-[9px] opacity-80">{formatUsd(pnl)}</span>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: 'OPEN' | 'TP' | 'SL' }) {
  return (
    <span
      className={cn(
        'chip',
        status === 'OPEN' && 'chip--cyan',
        status === 'TP' && 'chip--green',
        status === 'SL' && 'chip--red'
      )}
    >
      {status === 'OPEN' ? '● OPEN' : status === 'TP' ? '★ TP' : '✕ SL'}
    </span>
  );
}
