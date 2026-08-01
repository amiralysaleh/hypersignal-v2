'use client';

import { useState } from 'react';
import type { WalletData, WalletPositionView } from '@/lib/types';
import { api, cn, formatTimeAgo, formatUsd } from '@/lib/utils';
import { CoinSprite } from '@/components/pixel/coin-sprite';
import { PixelCard, PixelLoader, PixelTitle, shortAddr, CopyButton } from '@/components/pixel/retro-widgets';
import { usePixelToast } from '@/components/pixel/toast';

export default function ExplorerPage() {
  const toast = usePixelToast();
  const [coin, setCoin] = useState('');
  const [coinLoading, setCoinLoading] = useState(false);
  const [coinResult, setCoinResult] = useState<{ positions: WalletPositionView[]; trackedWalletCount: number } | null>(null);
  const [coinError, setCoinError] = useState<string | null>(null);

  const [address, setAddress] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const searchCoin = async () => {
    if (!coin.trim()) return;
    setCoinLoading(true);
    setCoinResult(null);
    setCoinError(null);
    try {
      const data = await api<{ positions: WalletPositionView[]; trackedWalletCount: number }>(
        `/api/explorer/coin?coin=${encodeURIComponent(coin.trim())}`
      );
      setCoinResult(data);
    } catch (e) {
      setCoinError(e instanceof Error ? e.message : 'Search failed');
      toast('err', 'COIN SCAN FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setCoinLoading(false);
    }
  };

  const searchWallet = async () => {
    if (!address.trim()) return;
    setWalletLoading(true);
    setWalletData(null);
    setWalletError(null);
    try {
      const data = await api<WalletData>(`/api/explorer/wallet?address=${encodeURIComponent(address.trim())}`);
      setWalletData(data);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : 'Lookup failed');
      toast('err', 'WALLET LOOKUP FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setWalletLoading(false);
    }
  };

  const longs = coinResult?.positions.filter((p) => p.direction === 'LONG') ?? [];
  const shorts = coinResult?.positions.filter((p) => p.direction === 'SHORT') ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PixelCard className="p-3" glow>
        <PixelTitle icon="◈" accent="purple">COIN SCANNER</PixelTitle>
        <p className="mt-1 text-[10px] text-px-gray">
          Find tracked wallets holding a position in a coin right now (with reconstructed entry &amp; open time).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="pixel-input max-w-[160px] font-pixel text-[9px] uppercase"
            placeholder="BTC"
            value={coin}
            onChange={(e) => setCoin(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && searchCoin()}
          />
          <button type="button" className="pixel-btn px-3 py-2 text-[8px]" onClick={searchCoin} disabled={coinLoading}>
            {coinLoading ? 'SCANNING...' : '▶ SCAN'}
          </button>
          {coinResult && (
            <span className="font-mono text-[10px] text-px-gray">
              {coinResult.positions.length} POSITIONS ACROSS {coinResult.trackedWalletCount} WALLETS
            </span>
          )}
        </div>
        {coinError && <p className="mt-2 text-[11px] text-px-red">{coinError}</p>}
      </PixelCard>

      {coinLoading && <PixelLoader label="SCANNING WALLETS" />}

      {coinResult && !coinLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <PositionTable title={`▲ LONG (${longs.length})`} positions={longs} accent="green" />
          <PositionTable title={`▼ SHORT (${shorts.length})`} positions={shorts} accent="red" />
        </div>
      )}

      <PixelCard className="p-3">
        <PixelTitle icon="▣" accent="yellow">WALLET LOOKUP</PixelTitle>
        <p className="mt-1 text-[10px] text-px-gray">Live clearinghouse state for any Hyperliquid address.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="pixel-input min-w-[240px] flex-1 font-mono"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchWallet()}
          />
          <button type="button" className="pixel-btn px-3 py-2 text-[8px]" onClick={searchWallet} disabled={walletLoading}>
            {walletLoading ? 'QUERYING...' : '▶ LOOKUP'}
          </button>
        </div>
        {walletError && <p className="mt-2 text-[11px] text-px-red">{walletError}</p>}
      </PixelCard>

      {walletLoading && <PixelLoader label="QUERYING WALLET" />}

      {walletData && !walletLoading && (
        <PixelCard>
          <PixelTitle icon="▣">WALLET STATE</PixelTitle>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat label="ACCOUNT VALUE" value={`$${Number(walletData.accountValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            <MiniStat label="MARGIN USED" value={`$${Number(walletData.marginUsed).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            <MiniStat label="UNREALIZED PNL" value={formatUsd(Number(walletData.pnl))} color={Number(walletData.pnl) >= 0 ? 'green' : 'red'} />
            <MiniStat label="ROI" value={`${walletData.roi}%`} color={Number(walletData.roi) >= 0 ? 'green' : 'red'} />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {walletData.positions.length === 0 && <p className="text-[12px] text-px-gray">No open positions.</p>}
            {walletData.positions.map((p) => (
              <div key={p.coin} className="crt-panel--flat flex flex-wrap items-center gap-3 p-2 transition-colors">
                <CoinSprite symbol={p.coin} size={30} />
                <div className="min-w-[90px]">
                  <span className="font-pixel text-[9px] text-slate-200">{p.coin}</span>
                  <span className={cn('ml-2 font-pixel text-[8px]', p.side === 'LONG' ? 'text-px-green' : 'text-px-red')}>
                    {p.side}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-px-gray-light">${p.entryPx.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                <span className="font-mono text-[11px] text-px-gray">x{p.leverage}</span>
                <span className="font-mono text-[11px] text-px-gray">sz {p.size.toFixed(3)}</span>
                <span className="font-mono text-[11px] text-px-cyan">${p.positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className={cn('ml-auto font-mono text-[11px]', p.unrealizedPnl >= 0 ? 'text-px-green' : 'text-px-red')}>
                  {formatUsd(p.unrealizedPnl)}
                </span>
                <span className="font-mono text-[10px] text-px-gray">
                  {p.openedAt ? `open ${formatTimeAgo(p.openedAt)}` : 'open time n/a'}
                </span>
              </div>
            ))}
          </div>
        </PixelCard>
      )}
    </div>
  );
}

function PositionTable({ title, positions, accent }: { title: string; positions: WalletPositionView[]; accent: 'green' | 'red' }) {
  return (
    <PixelCard className="p-3">
      <PixelTitle icon={accent === 'green' ? '▲' : '▼'} accent={accent === 'green' ? 'green' : 'red'}>
        {title}
      </PixelTitle>
      {positions.length === 0 ? (
        <p className="mt-3 text-[12px] text-px-gray">None found.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {positions.map((p) => (
            <div key={p.address} className="crt-panel--flat flex flex-wrap items-center gap-2 p-2 text-[11px] transition-colors">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate font-mono text-px-gray-light">{shortAddr(p.address, 8)}</span>
                <CopyButton text={p.address} />
              </span>
              <span className="font-mono text-px-cyan">{p.positionSize}</span>
              <span className="font-mono text-px-gray">@ ${p.entryPrice}</span>
              <span className="font-mono text-px-cyan">${Number(p.positionValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="font-mono text-px-gray">x{p.leverage}</span>
              {p.openedAt && <span className="text-px-gray">{formatTimeAgo(p.openedAt)}</span>}
            </div>
          ))}
        </div>
      )}
    </PixelCard>
  );
}

function MiniStat({ label, value, color = 'cyan' }: { label: string; value: string; color?: 'green' | 'red' | 'cyan' }) {
  return (
    <div className="crt-panel--flat p-2 transition-colors">
      <p className="font-pixel text-[7px] text-px-gray">{label}</p>
      <p className={cn('mt-1 font-mono text-[13px]', color === 'green' ? 'text-px-green' : color === 'red' ? 'text-px-red' : 'text-px-cyan')}>{value}</p>
    </div>
  );
}
