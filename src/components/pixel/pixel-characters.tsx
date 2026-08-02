'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/**
 * Animated Pixel-Art Runner Character for Loading Screens.
 * Runs on a pixel track with moving dust particles.
 */
export function PixelRunner({ label = 'LOADING...', className }: { label?: string; className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 120);
    return () => clearInterval(t);
  }, []);

  // 12x16 Pixel Art Runner Frames
  const RUNNER_FRAMES = [
    [
      '....3333....',
      '...335533...',
      '...335533...',
      '....3333....',
      '..33999933..',
      '.3399999933.',
      '.3.999999.3.',
      '...999999...',
      '....9999....',
      '...33..33...',
      '..33....33..',
      '.33......33.',
      '33........33',
    ],
    [
      '....3333....',
      '...335533...',
      '...335533...',
      '....3333....',
      '..33999933..',
      '.3399999933.',
      '...999999...',
      '...999999...',
      '....9999....',
      '....3333....',
      '....3333....',
      '....3333....',
      '....3333....',
    ],
    [
      '....3333....',
      '...335533...',
      '...335533...',
      '....3333....',
      '..33999933..',
      '.3399999933.',
      '.3.999999.3.',
      '...999999...',
      '....9999....',
      '..33....33..',
      '.33......33.',
      '33........33',
      '.............',
    ],
    [
      '....3333....',
      '...335533...',
      '...335533...',
      '....3333....',
      '..33999933..',
      '.3399999933.',
      '...999999...',
      '...999999...',
      '....9999....',
      '...333333...',
      '..33....33..',
      '..33........',
      '..33........',
    ],
  ];

  const PALETTE: Record<string, string> = {
    '3': '#0284c7', // Cap/Shoes Blue
    '5': '#fdba74', // Skin
    '9': '#22d3ee', // Cyan Shirt
  };

  const rows = RUNNER_FRAMES[frame];
  const cell = 3;

  return (
    <div className={cn('crt-panel flex flex-col items-center justify-center gap-4 p-8', className)}>
      <div className="relative flex flex-col items-center">
        <div
          className="relative select-none"
          style={{ width: 12 * cell, height: 14 * cell, imageRendering: 'pixelated' }}
        >
          {rows.map((row, y) =>
            row.split('').map((char, x) => {
              if (char === '.') return null;
              return (
                <div
                  key={`${y}-${x}`}
                  className="absolute"
                  style={{
                    left: x * cell,
                    top: y * cell,
                    width: cell + 0.2,
                    height: cell + 0.2,
                    backgroundColor: PALETTE[char] ?? '#22d3ee',
                  }}
                />
              );
            })
          )}
        </div>

        <div className="mt-1 flex gap-1">
          <span className={cn('h-1 w-1 bg-px-cyan/60 transition-opacity', frame % 2 === 0 ? 'opacity-100' : 'opacity-20')} />
          <span className={cn('h-1.5 w-1.5 bg-px-cyan/40 transition-opacity', frame % 2 === 1 ? 'opacity-100' : 'opacity-10')} />
          <span className={cn('h-1 w-1 bg-px-cyan/20 transition-opacity', frame === 2 ? 'opacity-100' : 'opacity-0')} />
        </div>

        <div className="mt-0.5 h-1 w-32 border-b-2 border-dashed border-px-cyan/40" />
      </div>

      <p className="font-pixel text-[10px] uppercase text-px-cyan text-glow">
        {label}
        <span className="inline-block h-3 w-2 animate-blink bg-px-cyan align-middle ml-1" />
      </p>
    </div>
  );
}

/**
 * Detailed Pixel-Art Batman Standing on Building Edge (Matching User Image).
 */
export function PixelBatman({ className }: { className?: string }) {
  const [capeFrame, setCapeFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCapeFrame((f) => (f + 1) % 3);
    }, 180);
    return () => clearInterval(t);
  }, []);

  const BATMAN_SPRITE = [
    [
      '.....3...3......', // Ears
      '....333.333.....',
      '....3333333.....', // Mask
      '.....39993......', // Eyes Glow
      '.....33333......',
      '....3333333.....', // Neck
      '...333555333....', // Gold Emblem Chest
      '..33335553333...',
      '.3333333333333..', // Shoulders / Belt
      '.3333999993333..', // Gold Utility Belt
      '.3333333333333..',
      '..3333...3333...', // Legs
      '..333.....333...',
      '.333.......333..', // Boots
    ],
    [
      '.....3...3......',
      '....333.333.....',
      '....3333333.....',
      '.....39993......',
      '.....33333......',
      '....3333333.....',
      '...333555333....',
      '..33335553333...',
      '..333333333333..', // Cape flap right
      '.33339999933333.',
      '.33333333333333.',
      '..3333...3333...',
      '..333.....333...',
      '.333.......333..',
    ],
    [
      '.....3...3......',
      '....333.333.....',
      '....3333333.....',
      '.....39993......',
      '.....33333......',
      '....3333333.....',
      '...333555333....',
      '..33335553333...',
      '.333333333333...', // Cape flap left
      '3.333399999333..',
      '3.333333333333..',
      '..3333...3333...',
      '..333.....333...',
      '.333.......333..',
    ],
  ];

  const PALETTE: Record<string, string> = {
    '3': '#0f172a', // Dark Bat Suit / Cape
    '5': '#fbbf24', // Gold Emblem
    '9': '#ffffff', // Glowing Eyes
  };

  const rows = BATMAN_SPRITE[capeFrame];
  const cell = 2.4;

  return (
    <div className={cn('relative flex flex-col items-center select-none', className)}>
      <div
        className="relative"
        style={{ width: 16 * cell, height: 14 * cell, imageRendering: 'pixelated' }}
      >
        {rows.map((row, y) =>
          row.split('').map((char, x) => {
            if (char === '.') return null;
            return (
              <div
                key={`${y}-${x}`}
                className="absolute"
                style={{
                  left: x * cell,
                  top: y * cell,
                  width: cell + 0.2,
                  height: cell + 0.2,
                  backgroundColor: PALETTE[char] ?? '#0f172a',
                  boxShadow: char === '9' ? '0 0 6px #ffffff' : char === '5' ? '0 0 4px #fbbf24' : undefined,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Pixel-Art Gotham Building Props (Water Tank, Antenna, Fire Escape, Windows).
 */
export function WaterTank({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center select-none', className)}>
      {/* Tank Barrel */}
      <div className="h-4 w-6 border border-amber-950 bg-amber-900 shadow-inner">
        <div className="h-1 w-full border-b border-amber-950/60 bg-amber-800" />
      </div>
      {/* Wooden Legs */}
      <div className="flex h-3 w-5 justify-between px-0.5">
        <div className="h-full w-0.5 bg-amber-950" />
        <div className="h-full w-0.5 bg-amber-950" />
      </div>
    </div>
  );
}

export function Antenna({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center select-none', className)}>
      <div className="h-6 w-0.5 bg-slate-400" />
      <div className="relative -top-4 flex w-3 justify-between">
        <div className="h-0.5 w-1.5 bg-slate-300" />
        <div className="h-0.5 w-1.5 bg-slate-300" />
      </div>
    </div>
  );
}
