'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WalletPerformance } from '@/lib/types';
import { api, cn, formatUsd } from '@/lib/utils';
import { PixelCard, PixelLoader, PixelTitle, CopyButton, shortAddr } from '@/components/pixel/retro-widgets';
import { usePixelToast } from '@/components/pixel/toast';

const TIMEFRAMES = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'ALL' },
];

export default function PerformancePage() {
  const toast = usePixelToast();
  const [timeframe, setTimeframe] = useState('30d');
  const [data, setData] = useState<WalletPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<WalletPerformance[]>(`/api/performance?timeframe=${timeframe}`);
      setData(d);
    } catch (e) {
      toast('err', 'LOAD FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [timeframe, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const maxPnl = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));
  const totalPnl = data.reduce((acc, d) => acc + d.pnl, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTimeframe(t.key)}
              className={
                timeframe === t.key
                  ? 'border-2 border-px-cyan bg-px-dark px-2 py-1 font-pixel text-[8px] text-px-cyan'
                  : 'border-2 border-px-dim/40 px-2 py-1 font-pixel text-[8px] text-px-gray hover:text-px-green'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className={cn('font-mono text-[12px]', totalPnl >= 0 ? 'text-px-green' : 'text-px-red')}>
          NET {formatUsd(totalPnl)}
        </span>
      </div>

      {loading && data.length === 0 ? (
        <PixelLoader label="CALCULATING" />
      ) : data.length === 0 ? (
        <PixelCard className="p-8 text-center">
          <p className="font-pixel text-[9px] text-px-green">NO CLOSED SIGNALS IN THIS WINDOW</p>
          <p className="mt-2 text-[12px] text-px-gray">
            Wallet performance is built from signals that hit TP or SL. Open signals don&apos;t count yet.
          </p>
        </PixelCard>
      ) : (
        <PixelCard className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b-2 border-px-dim/40 font-pixel text-[8px] text-px-dim">
                  <th className="py-2 pl-3 text-left">#</th>
                  <th className="py-2 text-left">WALLET</th>
                  <th className="py-2 text-left w-1/3">PNL BAR</th>
                  <th className="py-2 text-right">SUCCESS</th>
                  <th className="py-2 text-right">PNL</th>
                  <th className="py-2 pr-3 text-right">TRADES</th>
                </tr>
              </thead>
              <tbody>
                {data.map((w) => (
                  <tr key={w.address} className="border-b border-dashed border-px-dim/20 text-[12px] hover:bg-base-700/40">
                    <td className={cn('py-2 pl-3 font-pixel text-[8px]', w.rank <= 3 ? 'text-px-yellow' : 'text-px-gray')}>
                      {String(w.rank).padStart(2, '0')}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-px-gray">{shortAddr(w.address, 8)}</span>
                        <CopyButton text={w.address} />
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex h-3 items-center gap-1">
                        <div className="flex-1 border border-px-dim/40 bg-base-900">
                          <div
                            className={cn('h-full', w.pnl >= 0 ? 'bg-px-green' : 'bg-px-red')}
                            style={{ width: `${Math.min(100, (Math.abs(w.pnl) / maxPnl) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={cn('py-2 text-right font-mono', w.successRate >= 50 ? 'text-px-cyan' : 'text-px-gray')}>
                      {w.successRate.toFixed(1)}%
                    </td>
                    <td className={cn('py-2 text-right font-mono', w.pnl >= 0 ? 'text-px-green' : 'text-px-red')}>
                      {formatUsd(w.pnl)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-px-gray">{w.trades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PixelCard>
      )}
    </div>
  );
}
