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
        <StatBox label="UNREALIZED ROI" value={`${(data?.totalRoi ?? 0).toFixed(2)}%`} sub={`$${formatUsd(data?.totalPnl ?? 0)} open pnl`} loading={loading} />
        <StatBox label="WIN RATE" value={data && data.totalClosedSignals === 0 ? 'N/A' : `${(data?.winRate ?? 0).toFixed(1)}%`} sub={`${data?.totalClosedSignals ?? 0} closed`} loading={loading} color="cyan" />
        <StatBox label="ACTIVE SIGNALS" value={String(data?.activeSignals ?? 0)} sub="open positions" loading={loading} color="yellow" />
        <StatBox label="TRACKED WALLETS" value={String(data?.trackedWallets ?? 0)} sub="monitored" loading={loading} color="purple" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Winrate chart (pixel bar) */}
        <PixelCard>
          <PixelTitle icon="▚">MONTHLY WIN RATE</PixelTitle>
          <div className="mt-4 flex h-40 items-end gap-2">
            {chartData.map((d) => (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-[10px] text-px-cyan">{d.winrate.toFixed(0)}%</span>
                <div
                  className={cn('w-full border-2 border-px-dim/50', d.winrate >= 50 ? 'bg-px-green' : 'bg-px-yellow')}
                  style={{ height: `${Math.max(4, (d.winrate / maxWinrate) * 100)}%` }}
                />
                <span className="font-pixel text-[7px] text-px-gray">{d.month}</span>
              </div>
            ))}
          </div>
          {chartData.length === 0 && <p className="mt-6 text-center text-[12px] text-px-gray">No closed signals yet</p>}
        </PixelCard>

        {/* Outcomes pie-ish */}
        <PixelCard>
          <PixelTitle icon="◉">SIGNAL OUTCOMES</PixelTitle>
          <div className="mt-4 flex items-center gap-6">
            <div className="grid shrink-0 grid-cols-4 gap-1" aria-hidden>
              {Array.from({ length: 16 }).map((_, i) => {
                const ratio = outcomes.TP / outcomeTotal;
                const idx = i % 4 + Math.floor(i / 4) * 4;
                const color =
                  idx < 8 ? (idx < 8 * ratio ? 'bg-px-green' : 'bg-base-700') : idx < 12 ? 'bg-px-yellow' : 'bg-px-red';
                return <span key={i} className={cn('h-4 w-4 border border-px-dim/40', color)} />;
              })}
            </div>
            <div className="flex flex-col gap-2 text-[12px]">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-px-green" /> TP {outcomes.TP} <span className="text-px-gray">({((outcomes.TP / closedTotal) * 100).toFixed(0)}% of closed)</span></span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-px-red" /> SL {outcomes.SL}</span>
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-px-yellow" /> OPEN {outcomes.OPEN}</span>
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
                <span className="w-14 font-pixel text-[9px] text-px-green">{p.pair}</span>
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
          <PixelTitle icon="◈">WALLET CLUSTERS</PixelTitle>
          <p className="mt-1 text-[10px] text-px-gray">Wallets that move together (deterministic, no AI)</p>
          <div className="mt-3 flex flex-col gap-3">
            {(data?.walletClusters ?? []).length === 0 && (
              <p className="text-[12px] text-px-gray">No correlated clusters yet. Cluster forms after 2+ co-signals.</p>
            )}
            {(data?.walletClusters ?? []).map((c, i) => (
              <div key={i} className="border border-px-dim/40 bg-base-700/40 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-[8px] text-px-purple">CLUSTER {String(i + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-[10px] text-px-cyan">{c.trades} TOGETHER</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.wallets.map((w) => (
                    <span key={w} className="border border-px-dim/40 px-1.5 py-0.5 font-mono text-[9px] text-px-gray">
                      {shortAddr(w)}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex gap-1.5">
                  {c.coins.map((coin) => (
                    <span key={coin} className="font-mono text-[9px] text-px-green">{coin}</span>
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
          <PixelTitle icon="★" className="text-px-green">STANDOUT SIGNALS</PixelTitle>
          <div className="mt-3 flex flex-col gap-2">
            {(data?.standoutSignals ?? []).length === 0 && <p className="text-[12px] text-px-gray">No winners right now.</p>}
            {(data?.standoutSignals ?? []).map((s) => (
              <SignalInsightRow key={`${s.pair}-${s.timestamp}`} {...s} positive />
            ))}
          </div>
        </PixelCard>
        <PixelCard>
          <PixelTitle icon="⚠" className="text-px-yellow">NEEDS ATTENTION</PixelTitle>
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
              <tr className="border-b-2 border-px-dim/40 font-pixel text-[8px] text-px-dim">
                <th className="py-2 text-left">PAIR</th>
                <th className="py-2 text-left">TYPE</th>
                <th className="py-2 text-left">WALLETS</th>
                <th className="py-2 text-right">PNL</th>
                <th className="py-2 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentSignals ?? []).map((s, i) => (
                <tr key={i} className="border-b border-dashed border-px-dim/20 text-[12px]">
                  <td className="flex items-center gap-2 py-2">
                    <CoinSprite symbol={s.pair} size={20} animate={false} />
                    <span className="font-pixel text-[9px] text-px-green">{s.pair}</span>
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
    <div className="flex items-center gap-3 border border-px-dim/30 bg-base-700/30 p-2">
      <CoinSprite symbol={pair} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[8px] text-px-green">{pair}</span>
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
        'inline-block border-2 px-1.5 py-0.5 font-pixel text-[7px]',
        status === 'OPEN' && 'border-px-cyan text-px-cyan',
        status === 'TP' && 'border-px-green text-px-green',
        status === 'SL' && 'border-px-red text-px-red'
      )}
    >
      {status === 'OPEN' ? '■ OPEN' : status === 'TP' ? '★ TP' : '✕ SL'}
    </span>
  );
}
