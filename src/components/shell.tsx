'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTypewriter } from './pixel/boot';
import { PixelRain } from './pixel/boot';
import { BlinkCursor, LiveDot } from './pixel/retro-widgets';
import type { RunRecord } from '@/lib/types';

const NAV = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/signals', label: 'SIGNALS' },
  { href: '/wallets', label: 'WALLETS' },
  { href: '/performance', label: 'PERFORMANCE' },
  { href: '/explorer', label: 'EXPLORER' },
  { href: '/settings', label: 'SETTINGS' },
  { href: '/logs', label: 'LOGS' },
];

const BOOT_LINES = [
  'HYPERSIGNAL OS v2.0.0',
  'MONITORING HYPERLIQUID PERP MARKETS',
  'OK  loading tracked wallets',
  'OK  signal engine armed',
  'OK  telegram relay configured',
  'OK  system ready',
  '',
];

function HeaderBar() {
  const [now, setNow] = useState(() => new Date());
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [walletCount, setWalletCount] = useState<number | null>(null);
  const [openCount, setOpenCount] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, w, s] = await Promise.all([
          fetch('/api/runs').then((r) => r.json()),
          fetch('/api/wallets').then((r) => r.json()),
          fetch('/api/signals').then((r) => r.json()),
        ]);
        setRuns((((r as { data?: { runs?: RunRecord[] } }).data?.runs ?? []) as RunRecord[]));
        setWalletCount(((w as { data?: unknown[] }).data ?? []).length);
        setOpenCount(((s as { data?: { status: string }[] }).data ?? []).filter((x) => x.status === 'OPEN').length);
      } catch {
        /* header must never break the page */
      }
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const lastRun = runs.find((r) => r.status === 'running') ?? runs[0];

  return (
    <header className="crt-panel sticky top-2 z-30 mx-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2">
      <Link href="/" className="group flex items-center gap-2">
        <span className="grid h-5 w-5 grid-cols-2 gap-0.5">
          <span className="bg-px-green group-hover:bg-px-cyan" />
          <span className="bg-px-dim" />
          <span className="bg-px-dim" />
          <span className="bg-px-green" />
        </span>
        <span className="font-pixel text-[10px] text-px-green text-glow">HYPERSIGNAL</span>
        <span className="hidden font-pixel text-[7px] text-px-dim sm:inline">v2.0</span>
      </Link>

      <div className="hidden items-center gap-1 lg:flex">
        {NAV.map((item) => (
          <HeaderLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="hidden text-[10px] text-px-gray md:inline">
          {lastRun
            ? lastRun.status === 'running'
              ? 'RUN IN PROGRESS'
              : `LAST RUN ${lastRun.startedAt ? new Date(lastRun.startedAt).toLocaleTimeString() : '--'}`
            : 'NO RUNS YET'}
        </span>
        <span className="font-mono text-[11px] text-px-yellow">
          {now.toLocaleTimeString(undefined, { hour12: false })}
        </span>
        <LiveDot label="ONLINE" />
      </div>
    </header>
  );
}

function HeaderLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        'px-1 py-0.5 font-pixel text-[8px] tracking-wide transition-colors',
        active ? 'text-px-green text-glow' : 'text-px-dim hover:text-px-green'
      )}
    >
      {active && <span className="mr-1 text-px-cyan">▸</span>}
      {label}
    </Link>
  );
}

export function Shell({ children, bootText }: { children: React.ReactNode; bootText?: string }) {
  const pathname = usePathname();
  const [booted, setBooted] = useState(false);
  const typed = useTypewriter(bootText ?? '', 10, !booted);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 1100);
    return () => clearTimeout(t);
  }, []);

  const title = pathname === '/' ? 'DASHBOARD' : pathname.split('/')[1]?.toUpperCase() ?? 'HYPERSIGNAL';

  return (
    <div className="crt-scanlines crt-vignette relative min-h-screen">
      <PixelRain />
      {!booted ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="crt-panel w-full max-w-lg p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-pixel text-[8px] text-px-dim">HYPERSIGNAL BOOT</span>
              <BlinkCursor />
            </div>
            <div className="h-64 bg-base-900">
              <div className="h-full p-3 font-mono text-[11px] leading-relaxed text-px-green">
                <span className="text-px-dim">&gt;</span> {typed}
                <BlinkCursor />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <HeaderBar />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-3 pb-16 pt-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h1 className="font-pixel text-[13px] text-px-green text-glow">
                <span className="mr-2 text-px-cyan">[</span>
                {title}
                <span className="ml-2 text-px-cyan">]</span>
              </h1>
              <span className="hidden font-pixel text-[8px] text-px-dim md:inline">▰▰▰▰▰▰▰▰▰▰</span>
            </div>
            <div className="animate-crt-flash">{children}</div>
          </main>
          <footer className="mx-auto mb-4 w-full max-w-7xl px-3 sm:px-6">
            <div className="crt-panel px-4 py-2 text-center font-mono text-[10px] text-px-gray">
              HYPERSIGNAL ▸ ON-CHAIN WALLET CONSENSUS TRACKER — {new Date().getFullYear()}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
