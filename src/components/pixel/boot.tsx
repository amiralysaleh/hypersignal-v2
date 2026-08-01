'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Pixel boot text that types itself out. */
export function useTypewriter(text: string, speedMs = 16, enabled = true) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!enabled) {
      setOut(text);
      return;
    }
    let i = 0;
    setOut('');
    const t = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speedMs);
    return () => clearInterval(t);
  }, [text, speedMs, enabled]);
  return out;
}

export function BootLog({ lines, speedMs = 14 }: { lines: string[]; speedMs?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), speedMs);
    return () => clearTimeout(t);
  }, [shown, lines.length, speedMs]);
  return (
    <div className="hidden-scrollbar h-full overflow-y-auto bg-base-900 p-4 font-mono text-[11px] leading-relaxed">
      {lines.slice(0, shown).map((line, i) => (
        <p
          key={i}
          className={cn(
            'whitespace-pre-wrap',
            line.startsWith('ERR') && 'text-px-red',
            line.startsWith('WARN') && 'text-px-yellow',
            line.startsWith('OK') && 'text-px-cyan',
            !/^(ERR|WARN|OK|$)/.test(line) && 'text-px-gray'
          )}
        >
          <span className="mr-2 text-px-dim">&gt;</span>
          {line}
        </p>
      ))}
      {shown < lines.length && <span className="animate-blink text-px-green">▊</span>}
    </div>
  );
}

/** Random static noise pixels behind the app. */
export function NoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[39] opacity-[0.05]"
      style={{
        backgroundImage:
          'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2760%27 height=%2760%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%272%27/%3E%3C/filter%3E%3Crect width=%2760%27 height=%2760%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
      }}
    />
  );
}

/** Floating pixel particles that drift upward. */
export function PixelRain({ count = 14 }: { count?: number }) {
  const [parts, setParts] = useState<{ id: number; x: number; delay: number; dur: number; c: string }[]>([]);
  useEffect(() => {
    const colors = ['#33ff55', '#1c8f33', '#2ee6c8', '#ffd733'];
    setParts(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 12,
        dur: 8 + Math.random() * 10,
        c: colors[i % colors.length],
      }))
    );
  }, [count]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[38] overflow-hidden">
      {parts.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: 3,
            height: 3,
            background: p.c,
            animation: `pixelFall ${p.dur}s linear ${p.delay}s infinite`,
            opacity: 0.5,
          }}
        />
      ))}
      <style>{`@keyframes pixelFall{0%{transform:translateY(-10px)}100%{transform:translateY(105vh)}}`}</style>
    </div>
  );
}
