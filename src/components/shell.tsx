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
  { href: '/', label: 'DASHBOARD', icon: '▦' },
  { href: '/signals', label: 'SIGNALS', icon: '◈' },
  { href: '/wallets', label: 'WALLETS', icon: '▣' },
  { href: '/explorer', label: 'EXPLORER', icon: '◉' },
  { href: '/settings', label: 'SETTINGS', icon: '⚙' },
  { href: '/logs', label: 'LOGS', icon: '▤' },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
        setRuns(((r as { data?: { runs?: RunRecord[] } }).data?.runs ?? []) as RunRecord[]);
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
    <>
      <header className="crt-panel sticky top-2 z-30 mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="group flex items-center gap-2">
          <span className="grid h-5 w-5 grid-cols-2 gap-0.5">
            <span className="bg-px-cyan group-hover:bg-px-blue transition-colors" />
            <span className="bg-px-blue/60" />
            <span className="bg-px-blue/60" />
            <span className="bg-px-cyan" />
          </span>
          <span className="font-pixel text-[10px] text-px-cyan text-glow">HYPERSIGNAL</span>
          <span className="hidden font-pixel text-[7px] text-px-gray sm:inline">v2.0</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <HeaderLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[10px] text-px-gray md:inline">
            {lastRun
              ? lastRun.status === 'running'
                ? 'RUN IN PROGRESS'
                : `LAST RUN ${lastRun.startedAt ? new Date(lastRun.startedAt).toLocaleTimeString() : '--'}`
              : 'NO RUNS YET'}
          </span>
          {walletCount !== null && (
            <span className="hidden text-[10px] text-px-gray sm:inline">{walletCount} WALLETS</span>
          )}
          {openCount !== null && openCount > 0 && (
            <span className="chip chip--yellow hidden sm:inline-flex">{openCount} OPEN</span>
          )}
          <span className="font-mono text-[11px] text-px-gray-light">
            {now.toLocaleTimeString(undefined, { hour12: false })}
          </span>
          <LiveDot label="ONLINE" color="cyan" />

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center border border-px-cyan/50 text-px-cyan lg:hidden"
          >
            <span className="font-pixel text-[9px]">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <nav className="crt-panel animate-slide-down sticky top-14 z-30 mx-2 flex flex-col gap-1 p-2 lg:hidden">
          {NAV.map((item) => (
            <MobileLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>
      )}
    </>
  );
}

function HeaderLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        'px-1.5 py-0.5 font-pixel text-[8px] tracking-wide transition-colors',
        active ? 'text-px-cyan text-glow' : 'text-px-gray hover:text-slate-200'
      )}
    >
      <span className="mr-1 opacity-70">{icon}</span>
      {label}
    </Link>
  );
}

function MobileLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 border-l-2 px-3 py-2.5 font-pixel text-[9px] transition-colors',
        active
          ? 'border-px-cyan bg-px-cyan/10 text-px-cyan text-glow'
          : 'border-transparent text-px-gray hover:bg-base-700/40 hover:text-slate-200'
      )}
    >
      <span className="w-4 text-center">{icon}</span>
      {label}
      {active && <span className="ml-auto animate-blink text-px-cyan">▸</span>}
    </Link>
  );
}

export function Shell({ children, bootText }: { children: React.ReactNode; bootText?: string }) {
  const pathname = usePathname();
  const [booted, setBooted] = useState(false);
  const typed = useTypewriter(bootText ?? '', 10, !booted);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 900);
    return () => clearTimeout(t);
  }, []);

  const title = pathname === '/' ? 'DASHBOARD' : pathname.split('/')[1]?.toUpperCase() ?? 'HYPERSIGNAL';

  return (
    <div className="crt-scanlines crt-vignette relative min-h-screen">
      <PixelRain />
      {!booted ? (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="crt-panel w-full max-w-lg p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-pixel text-[8px] text-px-gray">HYPERSIGNAL BOOT</span>
              <BlinkCursor />
            </div>
            <div className="h-64 bg-base-950">
              <div className="h-full p-3 font-mono text-[11px] leading-relaxed text-px-cyan">
                <span className="text-px-gray">&gt;</span> {typed}
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
              <h1 className="font-pixel text-[13px] text-slate-100">
                <span className="mr-2 text-px-cyan">[</span>
                {title}
                <span className="ml-2 text-px-cyan">]</span>
              </h1>
              <span className="hidden font-pixel text-[8px] text-px-gray md:inline">▰▰▰▰▰▰▰▰▰▰</span>
            </div>
            <div className="animate-crt-flash">{children}</div>
          </main>
          <footer className="mx-auto mb-4 w-full max-w-7xl px-3 sm:px-6">
            <div className="crt-panel--flat px-4 py-2 text-center font-mono text-[10px] text-px-gray">
              HYPERSIGNAL ▸ ON-CHAIN WALLET CONSENSUS TRACKER — {new Date().getFullYear()}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
