'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type Accent = 'cyan' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'dim';

const ACCENT_CLASS: Record<Accent, string> = {
  cyan: 'text-px-cyan text-glow',
  green: 'text-px-green text-glow-green',
  red: 'text-px-red text-glow-red',
  yellow: 'text-px-yellow text-glow-yellow',
  purple: 'text-px-purple text-glow-purple',
  pink: 'text-px-pink',
  dim: 'text-px-gray-light',
};

/** Pixel-art box with hover lift. */
export function PixelCard({
  children,
  className,
  glow = false,
  lift = true,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  lift?: boolean;
}) {
  return (
    <div
      className={cn(
        'crt-panel animate-pixel-in p-4',
        glow && 'shadow-[0_0_16px_-4px_rgba(34,211,238,0.35)]',
        lift && 'hover:-translate-y-0.5 transition-transform duration-100',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Section title with accent color. */
export function PixelTitle({
  children,
  className,
  icon,
  accent = 'cyan',
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  accent?: Accent;
}) {
  return (
    <h2 className={cn('font-pixel text-[10px] uppercase leading-relaxed', ACCENT_CLASS[accent], className)}>
      <span className="mr-1 opacity-80">{icon ?? '▸'}</span>
      {children}
    </h2>
  );
}

/** Stat box — arcade HUD number with accent color. */
export function StatBox({
  label,
  value,
  sub,
  color = 'cyan',
  loading,
  align = 'center',
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: Accent;
  loading?: boolean;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cn('crt-panel p-3', className)}>
      <div
        className={cn(
          'flex flex-col gap-2',
          align === 'center' ? 'items-center text-center' : 'items-start text-left'
        )}
      >
        <span className="font-pixel text-[8px] uppercase text-px-gray">{label}</span>
        <div className={cn('font-pixel text-sm md:text-base leading-tight', ACCENT_CLASS[color])}>
          {loading ? <PixelLoadingDots /> : value}
        </div>
        {sub && <span className="text-[11px] text-px-gray">{sub}</span>}
      </div>
    </div>
  );
}

/** Blinking terminal block cursor. */
export function BlinkCursor({ className }: { className?: string }) {
  return <span className={cn('inline-block h-3 w-2 animate-blink bg-px-cyan align-middle', className)} />;
}

/** Three-dot pixel loading indicator. */
export function PixelLoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-blink bg-px-cyan"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

import { PixelRunner } from './pixel-characters';

/** Full-panel "LOADING..." screen driven by cute Pixel Runner. */
export function PixelLoader({ label = 'LOADING...', className }: { label?: string; className?: string }) {
  return <PixelRunner label={label} className={className} />;
}

/** Progress bar with pixel blocks. */
export function PixelProgress({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const blocks = Math.round(pct / 10);
  return (
    <div className={cn('h-4 w-full border border-px-blue/40 bg-base-950 p-0.5', className)}>
      <div className="flex h-full gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-full flex-1 transition-colors duration-200',
              i < blocks ? (pct >= 100 ? 'bg-px-cyan' : 'bg-px-blue') : 'bg-base-600'
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Blinking "LIVE" indicator. */
export function LiveDot({ label = 'LIVE', color = 'green' }: { label?: string; color?: 'green' | 'cyan' | 'yellow' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-pixel text-[8px]',
        color === 'green' ? 'text-px-green' : color === 'yellow' ? 'text-px-yellow' : 'text-px-cyan'
      )}
    >
      <span
        className={cn(
          'h-2 w-2 animate-blink',
          color === 'green' ? 'bg-px-green' : color === 'yellow' ? 'bg-px-yellow' : 'bg-px-cyan'
        )}
      />
      {label}
    </span>
  );
}

/** Bottom status bar with marquee. */
export function StatusBar({
  items,
  className,
}: {
  items: { label: string; value: string; color?: string }[];
  className?: string;
}) {
  return (
    <div className={cn('crt-panel--flat flex items-center overflow-hidden px-3 py-2', className)}>
      <span className="mr-3 shrink-0 font-pixel text-[8px] text-px-yellow">▮▮</span>
      <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden whitespace-nowrap">
        <div className="flex min-w-max animate-marquee gap-10">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-2 text-[11px] text-px-gray">
              <span className="font-pixel text-[7px] text-px-gray">{item.label}</span>
              <span className={item.color ?? 'text-px-cyan'}>{item.value}</span>
            </span>
          ))}
        </div>
      </div>
      <span className="ml-3 shrink-0 font-pixel text-[8px] text-px-gray">v2.0</span>
    </div>
  );
}

/** Copy button with flash feedback. */
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

/** Paused overlay when cron falls behind. */
export function PausedOverlay({ since, nextRun }: { since?: string | null; nextRun?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!since) return null;
  const diffMin = Math.floor((now - new Date(since).getTime()) / 60000);
  return (
    <div className="crt-panel fixed bottom-4 right-4 z-50 max-w-xs border-px-red/60 p-4 shadow-[0_0_24px_rgba(248,113,113,0.2)]">
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

/** Shortens an address. */
export function shortAddr(address: string, len = 6) {
  if (!address) return '';
  if (address.length <= len * 2 + 3) return address;
  return `${address.slice(0, len)}...${address.slice(-4)}`;
}
