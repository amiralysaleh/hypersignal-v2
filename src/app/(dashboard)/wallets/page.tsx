'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Wallet, WalletPerformance } from '@/lib/types';
import { api, cn, formatUsd } from '@/lib/utils';
import { PixelCard, PixelLoader, PixelTitle, CopyButton, shortAddr } from '@/components/pixel/retro-widgets';
import { usePixelToast } from '@/components/pixel/toast';

type Tab = 'wallets' | 'leaderboard';

const TIMEFRAMES = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'ALL' },
];

export default function WalletsPage() {
  const toast = usePixelToast();
  const [tab, setTab] = useState<Tab>('wallets');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [query, setQuery] = useState('');

  // leaderboard state
  const [timeframe, setTimeframe] = useState('30d');
  const [leaderboard, setLeaderboard] = useState<WalletPerformance[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const fetchWallets = useCallback(async () => {
    try {
      const data = await api<Wallet[]>('/api/wallets');
      setWallets(data);
    } catch (e) {
      toast('err', 'FAILED TO LOAD WALLETS', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const data = await api<WalletPerformance[]>(`/api/performance?timeframe=${timeframe}`);
      setLeaderboard(data);
    } catch (e) {
      toast('err', 'LEADERBOARD FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setLbLoading(false);
    }
  }, [timeframe, toast]);

  useEffect(() => {
    fetchWallets();
    const t = setInterval(fetchWallets, 30000);
    return () => clearInterval(t);
  }, [fetchWallets]);

  useEffect(() => {
    if (tab === 'leaderboard') fetchLeaderboard();
  }, [tab, fetchLeaderboard]);

  const addWallet = async () => {
    if (!newAddress.trim()) {
      toast('err', 'EMPTY ADDRESS');
      return;
    }
    try {
      await api<Wallet>('/api/wallets', { method: 'POST', body: JSON.stringify({ address: newAddress.trim() }) });
      setNewAddress('');
      setShowAdd(false);
      toast('ok', 'WALLET ADDED');
      fetchWallets();
    } catch (e) {
      toast('err', 'ADD FAILED', e instanceof Error ? e.message : undefined);
    }
  };

  const removeWallet = async (address: string) => {
    if (!confirm(`Delete wallet ${shortAddr(address)}?`)) return;
    try {
      await api(`/api/wallets/${encodeURIComponent(address)}`, { method: 'DELETE' });
      toast('ok', 'WALLET REMOVED');
      fetchWallets();
    } catch (e) {
      toast('err', 'DELETE FAILED', e instanceof Error ? e.message : undefined);
    }
  };

  const toggleFavorite = async (address: string) => {
    try {
      const updated = await api<Wallet>(`/api/wallets/${encodeURIComponent(address)}/favorite`, { method: 'POST' });
      setWallets((prev) => prev.map((w) => (w.address === address ? updated : w)));
    } catch (e) {
      toast('err', 'FAVORITE FAILED', e instanceof Error ? e.message : undefined);
    }
  };

  const filtered = useMemo(
    () =>
      wallets
        .filter((w) => w.address.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
          return new Date(b.addedOn).getTime() - new Date(a.addedOn).getTime();
        }),
    [wallets, query]
  );

  const totalPnl = wallets.reduce((acc, w) => acc + (w.totalPnl ?? 0), 0);
  const totalTrades = wallets.reduce((acc, w) => acc + (w.totalTrades ?? 0), 0);
  const favorites = wallets.filter((w) => w.favorite).length;
  const maxPnl = Math.max(1, ...leaderboard.map((d) => Math.abs(d.pnl)));

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-px-blue/20">
        {(
          [
            { key: 'wallets', label: `▣ WALLETS (${wallets.length})` },
            { key: 'leaderboard', label: '◈ LEADERBOARD' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 font-pixel text-[9px] transition-colors',
              tab === t.key
                ? 'border-b-2 border-px-cyan text-px-cyan text-glow'
                : 'text-px-gray hover:text-slate-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'wallets' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="chip chip--cyan">{wallets.length} TRACKED</span>
              <span className="chip chip--purple">{favorites} FAVORITES</span>
              <span className="chip chip--yellow">{totalTrades} TRADES</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="pixel-input max-w-[200px]"
                placeholder="SEARCH ADDRESS..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" className="pixel-btn px-3 py-2 text-[8px]" onClick={() => setShowAdd((v) => !v)}>
                {showAdd ? '✕ CLOSE' : '+ ADD WALLET'}
              </button>
            </div>
          </div>

          {showAdd && (
            <PixelCard className="p-3" glow>
              <PixelTitle icon="+" accent="purple">ADD WALLET</PixelTitle>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="pixel-input flex-1 font-mono"
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWallet()}
                />
                <button type="button" className="pixel-btn px-3 py-2 text-[8px]" onClick={addWallet}>
                  ADD
                </button>
              </div>
            </PixelCard>
          )}

          {loading && wallets.length === 0 ? (
            <PixelLoader label="LOADING WALLETS" />
          ) : filtered.length === 0 ? (
            <PixelCard className="p-8 text-center">
              <p className="font-pixel text-[10px] text-px-blue">[▯▯]</p>
              <p className="mt-3 font-pixel text-[9px] text-px-cyan">
                {wallets.length === 0 ? 'NO WALLETS TRACKED YET' : 'NO MATCHING WALLETS'}
              </p>
              <p className="mt-2 text-[12px] text-px-gray">
                {wallets.length === 0
                  ? 'Add Hyperliquid wallet addresses to start watching their perp activity.'
                  : 'Try a different search.'}
              </p>
            </PixelCard>
          ) : (
            <PixelCard className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse">
                  <thead>
                    <tr className="border-b border-px-blue/20 font-pixel text-[8px] text-px-gray">
                      <th className="py-2 pl-3 text-left">★</th>
                      <th className="py-2 text-left">ADDRESS</th>
                      <th className="py-2 text-right">PNL</th>
                      <th className="py-2 text-right">WIN RATE</th>
                      <th className="py-2 text-right">TRADES</th>
                      <th className="py-2 pr-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((w) => {
                      const winRate = (w.totalTrades ?? 0) > 0 ? (((w.winningTrades ?? 0) / w.totalTrades) * 100).toFixed(0) : '—';
                      return (
                        <tr key={w.address} className="border-b border-dashed border-px-blue/10 text-[12px] hover:bg-base-700/40 transition-colors">
                          <td className="py-2 pl-3">
                            <button type="button" onClick={() => toggleFavorite(w.address)} aria-label="favorite">
                              <span className={cn('text-[14px] transition-colors', w.favorite ? 'text-px-yellow' : 'text-px-gray opacity-40 hover:opacity-80')}>
                                {w.favorite ? '★' : '☆'}
                              </span>
                            </button>
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-px-gray-light">{shortAddr(w.address, 8)}</span>
                              <CopyButton text={w.address} />
                            </div>
                          </td>
                          <td className={cn('py-2 text-right font-mono', (w.totalPnl ?? 0) >= 0 ? 'text-px-green' : 'text-px-red')}>
                            {formatUsd(w.totalPnl ?? 0)}
                          </td>
                          <td className={cn('py-2 text-right font-mono', winRate !== '—' && Number(winRate) >= 50 ? 'text-px-cyan' : 'text-px-gray')}>
                            {winRate}%
                          </td>
                          <td className="py-2 text-right font-mono text-px-gray">{w.totalTrades ?? 0}</td>
                          <td className="py-2 pr-3 text-right">
                            <button
                              type="button"
                              className="pixel-btn pixel-btn--ghost px-2 py-1 text-[8px]"
                              onClick={() => removeWallet(w.address)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-px-blue/20 px-3 py-2">
                <span className="text-[10px] text-px-gray">TRACKED WALLET NET PNL (FROM CLOSED SIGNALS)</span>
                <span className={cn('font-mono text-[12px]', totalPnl >= 0 ? 'text-px-green' : 'text-px-red')}>
                  {formatUsd(totalPnl)}
                </span>
              </div>
            </PixelCard>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTimeframe(t.key)}
                  className={
                    timeframe === t.key
                      ? 'filter-chip filter-chip--on'
                      : 'filter-chip'
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span
              className={cn(
                'font-mono text-[12px]',
                leaderboard.reduce((acc, d) => acc + d.pnl, 0) >= 0 ? 'text-px-green' : 'text-px-red'
              )}
            >
              NET {formatUsd(leaderboard.reduce((acc, d) => acc + d.pnl, 0))}
            </span>
          </div>

          {lbLoading && leaderboard.length === 0 ? (
            <PixelLoader label="CALCULATING" />
          ) : leaderboard.length === 0 ? (
            <PixelCard className="p-8 text-center">
              <p className="font-pixel text-[9px] text-px-cyan">NO CLOSED SIGNALS IN THIS WINDOW</p>
              <p className="mt-2 text-[12px] text-px-gray">
                Wallet performance is built from signals that hit TP or SL. Open signals don&apos;t count yet.
              </p>
            </PixelCard>
          ) : (
            <PixelCard className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr className="border-b border-px-blue/20 font-pixel text-[8px] text-px-gray">
                      <th className="py-2 pl-3 text-left">#</th>
                      <th className="py-2 text-left">WALLET</th>
                      <th className="py-2 w-1/3 text-left">PNL BAR</th>
                      <th className="py-2 text-right">SUCCESS</th>
                      <th className="py-2 text-right">PNL</th>
                      <th className="py-2 pr-3 text-right">TRADES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((w) => (
                      <tr key={w.address} className="border-b border-dashed border-px-blue/10 text-[12px] hover:bg-base-700/40 transition-colors">
                        <td className={cn('py-2 pl-3 font-pixel text-[8px]', w.rank <= 3 ? 'text-px-yellow text-glow-yellow' : 'text-px-gray')}>
                          {String(w.rank).padStart(2, '0')}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-px-gray-light">{shortAddr(w.address, 8)}</span>
                            <CopyButton text={w.address} />
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="flex h-3 items-center">
                            <div className="flex-1 border border-px-blue/30 bg-base-950">
                              <div
                                className={cn('h-full transition-all duration-300', w.pnl >= 0 ? 'bg-px-green' : 'bg-px-red')}
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
        </>
      )}
    </div>
  );
}
