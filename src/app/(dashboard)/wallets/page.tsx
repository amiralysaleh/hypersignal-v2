'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Wallet } from '@/lib/types';
import { api, cn, formatUsd } from '@/lib/utils';
import { PixelCard, PixelLoader, PixelTitle, CopyButton, shortAddr } from '@/components/pixel/retro-widgets';
import { usePixelToast } from '@/components/pixel/toast';

export default function WalletsPage() {
  const toast = usePixelToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [query, setQuery] = useState('');

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

  useEffect(() => {
    fetchWallets();
    const t = setInterval(fetchWallets, 30000);
    return () => clearInterval(t);
  }, [fetchWallets]);

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <span className="border border-px-dim/40 px-2 py-1 font-mono text-[10px] text-px-green">{wallets.length} TRACKED</span>
          <span className="border border-px-dim/40 px-2 py-1 font-mono text-[10px] text-px-cyan">{favorites} FAVORITES</span>
          <span className="border border-px-dim/40 px-2 py-1 font-mono text-[10px] text-px-yellow">{totalTrades} TRADES</span>
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
        <PixelCard className="p-3">
          <PixelTitle icon="+" className="text-px-cyan">ADD WALLET</PixelTitle>
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
          <p className="font-pixel text-[10px] text-px-dim">[▯▯]</p>
          <p className="mt-3 font-pixel text-[9px] text-px-green">
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
                <tr className="border-b-2 border-px-dim/40 font-pixel text-[8px] text-px-dim">
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
                    <tr key={w.address} className="border-b border-dashed border-px-dim/20 text-[12px] hover:bg-base-700/40">
                      <td className="py-2 pl-3">
                        <button type="button" onClick={() => toggleFavorite(w.address)} aria-label="favorite">
                          <span className={cn('text-[14px]', w.favorite ? 'text-px-yellow' : 'text-px-gray opacity-40')}>
                            {w.favorite ? '★' : '☆'}
                          </span>
                        </button>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-px-gray">{shortAddr(w.address, 8)}</span>
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
          <div className="flex items-center justify-between border-t-2 border-px-dim/40 px-3 py-2">
            <span className="text-[10px] text-px-gray">TRACKED WALLET NET PNL (FROM CLOSED SIGNALS)</span>
            <span className={cn('font-mono text-[12px]', totalPnl >= 0 ? 'text-px-green' : 'text-px-red')}>
              {formatUsd(totalPnl)}
            </span>
          </div>
        </PixelCard>
      )}
    </div>
  );
}
