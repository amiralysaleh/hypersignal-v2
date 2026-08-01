'use client';

import { cn, formatUsd, formatTimeAgo } from '@/lib/utils';
import type { Signal } from '@/lib/types';
import { useState } from 'react';
import { CoinSprite } from './coin-sprite';
import { BlinkCursor, CopyButton, shortAddr } from './retro-widgets';

const STATUS_STYLE: Record<Signal['status'], { label: string; className: string }> = {
  OPEN: { label: '● OPEN', className: 'chip chip--cyan' },
  TP: { label: '★ TP HIT', className: 'chip chip--green' },
  SL: { label: '✕ SL HIT', className: 'chip chip--red' },
};

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-px-blue/20 py-1.5">
      <span className="text-[11px] uppercase text-px-gray">{label}</span>
      <span className={cn('font-mono text-[12px] text-slate-200', className)}>{value}</span>
    </div>
  );
}

export function SignalCard({ signal, onDelete }: { signal: Signal; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const pnl = parseFloat(signal.pnl);
  const roi = parseFloat(signal.roi);
  const status = STATUS_STYLE[signal.status];

  const walletSizes = new Map<string, number>();
  if (signal.clusterFills?.length) {
    for (const f of signal.clusterFills) {
      walletSizes.set(f.walletAddress, (walletSizes.get(f.walletAddress) ?? 0) + Math.abs(parseFloat(f.sz)));
    }
  }

  return (
    <div
      className={cn(
        'crt-panel animate-slide-up overflow-hidden',
        signal.status === 'OPEN' && 'border-px-cyan/40 shadow-[0_0_16px_-6px_rgba(34,211,238,0.3)]'
      )}
    >
      {/* Header band */}
      <div className="flex flex-wrap items-center gap-3 border-b border-px-blue/20 bg-base-800/60 px-4 py-3">
        <CoinSprite symbol={signal.pair} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-pixel text-[11px] text-slate-100">{signal.pair}</span>
            <span
              className={cn(
                'font-pixel text-[8px]',
                signal.type === 'LONG' ? 'text-px-green text-glow-green' : 'text-px-red text-glow-red'
              )}
            >
              {signal.type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
            </span>
            <span className={status.className}>{status.label}</span>
          </div>
          <p className="mt-1 truncate text-[10px] text-px-gray">
            {formatTimeAgo(signal.timestamp)} · {signal.contributingWallets} WALLETS · {signal.leverage}x
          </p>
        </div>
        <div
          className={cn(
            'font-pixel text-[10px]',
            pnl >= 0 ? 'text-px-green text-glow-green' : 'text-px-red text-glow-red'
          )}
        >
          {formatUsd(pnl)}
          <span className="ml-2 text-[8px]">{roi >= 0 ? '+' : ''}{roi.toFixed(2)}%</span>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-x-6 gap-y-1 px-4 py-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <DetailRow label="ENTRY" value={`$${signal.entryPrice}`} />
          <DetailRow label="CURRENT" value={<span className="text-px-cyan">{`$${signal.currentPrice}`}</span>} />
          <DetailRow label="LIQUIDATION" value={`$${signal.liquidationPrice}`} />
        </div>
        <div>
          <DetailRow label="SIZE" value={`${signal.size} ${signal.pair}`} />
          <DetailRow label="MARGIN" value={`$${signal.margin}`} />
          <DetailRow
            label="ROI"
            value={roi.toFixed(2) + '%'}
            className={roi >= 0 ? 'text-px-green' : 'text-px-red'}
          />
        </div>
        <div>
          <DetailRow label="STOP LOSS" value={<span className="text-px-red">{`$${signal.stopLoss}`}</span>} />
          {signal.takeProfitTargets.map((tp, i) => (
            <DetailRow key={i} label={`TP ${i + 1}`} value={<span className="text-px-green">{`$${tp}`}</span>} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-px-blue/20 px-4 py-2">
        <button
          type="button"
          className="text-[10px] uppercase text-px-cyan hover:text-px-blue transition-colors"
          onClick={() => setShowWallets((v) => !v)}
        >
          {showWallets ? '▼ HIDE WALLETS' : '▶ WALLETS IN CLUSTER'} ({signal.contributingWallets})
        </button>
        {showWallets && (
          <div className="mt-2 grid animate-slide-down gap-1 border border-px-blue/20 bg-base-950 p-2 sm:grid-cols-2">
            {walletSizes.size === 0 &&
              signal.contributingWalletAddresses.map((addr) => (
                <div key={addr} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-mono text-px-gray">{shortAddr(addr)}</span>
                  <CopyButton text={addr} label="COPY" />
                </div>
              ))}
            {[...walletSizes.entries()].map(([addr, size]) => (
              <div key={addr} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate font-mono text-px-gray">
                  <span className="mr-1 text-px-cyan-dim">▸</span>
                  {shortAddr(addr)}
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-mono text-px-cyan">{size.toFixed(2)}</span>
                  <CopyButton text={addr} label="COPY" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="flex items-center justify-between border-t border-px-blue/20 bg-base-800/40 px-4 py-2">
        <span className="text-[9px] text-px-gray">
          ID: <span className="font-mono">{signal.id.slice(0, 32)}</span>
        </span>
        <button
          type="button"
          disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            try {
              await fetch(`/api/signals/${encodeURIComponent(signal.id)}`, { method: 'DELETE' });
              onDelete();
            } finally {
              setDeleting(false);
            }
          }}
          className="pixel-btn pixel-btn--danger px-2 py-1 text-[8px]"
        >
          {deleting ? '...' : '✕ DELETE'}
        </button>
      </div>
    </div>
  );
}

export function EmptySignals({ hasAny, onRun }: { hasAny: boolean; onRun?: () => void }) {
  return (
    <div className="crt-panel flex flex-col items-center gap-4 p-10 text-center">
      <div className="animate-wobble text-3xl text-px-blue">[▯▯]</div>
      <p className="font-pixel text-[10px] text-px-cyan">
        {hasAny ? 'NO SIGNALS MATCH FILTERS' : 'NO SIGNALS DETECTED YET'}
        <BlinkCursor />
      </p>
      <p className="max-w-md text-[12px] text-px-gray">
        {hasAny
          ? 'Adjust the filters above to see more signals.'
          : 'A signal fires when N+ tracked wallets open the same direction on the same pair within T minutes. The cron bot scans every 10 minutes.'}
      </p>
      {onRun && (
        <button type="button" onClick={onRun} className="pixel-btn">
          ▶ RUN DETECTION NOW
        </button>
      )}
    </div>
  );
}
