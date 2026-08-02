'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/**
 * Arcade Retro Block-Filling Pixel Loader.
 * Fills up block-by-block with glowing cyan pixels and animated percentage.
 */
export function PixelBlockLoader({ label = 'LOADING SYSTEM...', className }: { label?: string; className?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 0;
        return p + 5;
      });
    }, 80);
    return () => clearInterval(t);
  }, []);

  const totalBlocks = 16;
  const activeBlocks = Math.floor((progress / 100) * totalBlocks);

  return (
    <div className={cn('crt-panel flex flex-col items-center justify-center gap-5 p-10 select-none', className)}>
      <div className="flex flex-col items-center gap-3">
        {/* Percentage Counter */}
        <div className="flex items-baseline gap-1">
          <span className="font-pixel text-xl font-bold text-px-cyan text-glow">
            {String(progress).padStart(3, '0')}
          </span>
          <span className="font-pixel text-xs text-px-cyan">%</span>
        </div>

        {/* Retro Pixel Block Bar */}
        <div className="flex h-6 w-64 items-center gap-1 border-2 border-px-cyan/50 bg-base-950 p-1 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
          {Array.from({ length: totalBlocks }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-full flex-1 transition-all duration-150',
                i < activeBlocks
                  ? 'bg-px-cyan shadow-[0_0_6px_#22d3ee]'
                  : 'bg-base-800/60 opacity-30'
              )}
            />
          ))}
        </div>
      </div>

      {/* Label */}
      <p className="font-pixel text-[9px] uppercase tracking-wider text-px-gray">
        {label}
        <span className="inline-block h-3 w-2 animate-blink bg-px-cyan align-middle ml-1" />
      </p>
    </div>
  );
}
