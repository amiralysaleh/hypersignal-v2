'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/** Pixel-art box with hard offset shadow. */
export function PixelCard({
  children,
  className,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        'crt-panel animate-pixel-in relative p-4',
        glow && 'shadow-[0_0_18px_rgba(51,255,85,0.15)]',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Small section title with a hard underline. */
export function PixelTitle({
  children,
  className,
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <h2 className={cn('font-pixel text-[10px] uppercase leading-relaxed', className)}>
      <span className="mr-1">{icon ?? '▸'}</span>
      {children}
    </h2>
  );
}

/** A "stat box" — big pixel number with label, like an arcade HUD. */
export function StatBox({
  label,
  value,
  sub,
  color = 'green',
  loading,
  align = 'center',
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: 'green' | 'red' | 'cyan' | 'yellow' | 'purple';
  loading?: boolean;
  align?: 'center' | 'left';
  className?: string;
}) {
  const colorClass = {
    green: 'text-px-green text-glow',
    red: 'text-px-red text-glow-red',
    cyan: 'text-px-cyan text-glow-cyan',
    yellow: 'text-px-yellow text-glow-yellow',
    purple: 'text-px-purple',
  }[color];

  return (
    <div className={cn('pixel-border-soft bg-base-800/80 p-3', className)}>
      <div
        className={cn(
          'flex flex-col gap-2',
          align === 'center' ? 'items-center text-center' : 'items-start text-left'
        )}
      >
        <span className="font-pixel text-[8px] uppercase text-px-dim">{label}</span>
        <div className={cn('font-pixel text-sm md:text-base leading-tight', colorClass)}>
          {loading ? <PixelLoadingDots /> : value}
        </div>
        {sub && <span className="text-[11px] text-px-gray">{sub}</span>}
      </div>
    </div>
  );
}

/** Green blinking terminal block cursor. */
export function BlinkCursor({ className }: { className?: string }) {
  return <span className={cn('inline-block h-3 w-2 animate-blink bg-px-green align-middle', className)} />;
}

/** Three-dot pixel loading indicator. */
export function PixelLoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-blink bg-px-green"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

/** Full-panel "LOADING..." boot screen. */
export function PixelLoader({ label = 'LOADING', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('crt-panel flex flex-col items-center justify-center gap-4 p-10', className)}>
      <div className="flex gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-2 animate-blink bg-px-green"
            style={{ animationDelay: `${i * 0.09}s` }}
          />
        ))}
      </div>
      <p className="font-pixel text-[10px] uppercase text-px-green text-glow">
        {label}
        <BlinkCursor />
      </p>
    </div>
  );
}

/** Green progress bar with pixel steps. */
export function PixelProgress({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const blocks = Math.round(pct / 10);
  return (
    <div className={cn('h-4 w-full border-2 border-px-dim bg-base-900 p-0.5', className)}>
      <div className="flex h-full gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-full flex-1',
              i < blocks ? (pct >= 100 ? 'bg-px-cyan' : 'bg-px-green') : 'bg-base-700'
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** A blinking "LIVE" indicator. */
export function LiveDot({ label = 'LIVE' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-pixel text-[8px] text-px-green">
      <span className="h-2 w-2 animate-blink bg-px-red" />
      {label}
    </span>
  );
}

/** Bottom status bar shown on every page — marquee of system state. */
export function StatusBar({
  items,
  className,
}: {
  items: { label: string; value: string; color?: string }[];
  className?: string;
}) {
  return (
    <div className={cn('crt-panel flex items-center overflow-hidden px-3 py-2', className)}>
      <span className="mr-3 shrink-0 font-pixel text-[8px] text-px-yellow">▮▮</span>
      <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden whitespace-nowrap">
        <div className="flex min-w-max animate-marquee gap-10">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-2 text-[11px] text-px-gray">
              <span className="font-pixel text-[7px] text-px-dim">{item.label}</span>
              <span className={item.color ?? 'text-px-green'}>{item.value}</span>
            </span>
          ))}
        </div>
      </div>
      <span className="ml-3 shrink-0 font-pixel text-[8px] text-px-dim">v2.0</span>
    </div>
  );
}

/** Copies text with a tiny "COPIED!" flash. */
export function CopyButton({ text, label = 'COPY' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="pixel-btn pixel-btn--ghost px-2 py-1 text-[8px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard unavailable */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? 'COPIED!' : label}
    </button>
  );
}

/** "PAUSED" blinking overlay for the whole app when cron falls behind. */
export function PausedOverlay({ since, nextRun }: { since?: string | null; nextRun?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!since) return null;
  const diffMin = Math.floor((now - new Date(since).getTime()) / 60000);
  return (
    <div className="crt-panel fixed bottom-4 right-4 z-50 max-w-xs border-px-red/60 p-4 shadow-[0_0_24px_rgba(255,85,85,0.25)]">
      <p className="font-pixel text-[9px] text-px-red text-glow-red animate-blink">⚠ SYSTEM PAUSED</p>
      <p className="mt-2 text-[11px] text-px-gray">
        No automation run for {diffMin} min. Cron may be disabled.
      </p>
      {nextRun && (
        <p className="mt-1 text-[11px] text-px-gray">
          Next run: {new Date(nextRun).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/** Shortens an address like 0x1234...abcd. */
export function shortAddr(address: string, len = 6) {
  if (!address) return '';
  if (address.length <= len * 2 + 3) return address;
  return `${address.slice(0, len)}...${address.slice(-4)}`;
}
