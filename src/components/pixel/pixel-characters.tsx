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
    // Frame 0: Contact
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
    // Frame 1: Passing
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
    // Frame 2: Extension
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
    // Frame 3: High Knee
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
        {/* Runner Sprite */}
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

        {/* Pixel Dust under feet */}
        <div className="mt-1 flex gap-1">
          <span className={cn('h-1 w-1 bg-px-cyan/60 transition-opacity', frame % 2 === 0 ? 'opacity-100' : 'opacity-20')} />
          <span className={cn('h-1.5 w-1.5 bg-px-cyan/40 transition-opacity', frame % 2 === 1 ? 'opacity-100' : 'opacity-10')} />
          <span className={cn('h-1 w-1 bg-px-cyan/20 transition-opacity', frame === 2 ? 'opacity-100' : 'opacity-0')} />
        </div>

        {/* Pixel Track Ground */}
        <div className="mt-0.5 h-1 w-32 border-b-2 border-dashed border-px-cyan/40" />
      </div>

      {/* Label */}
      <p className="font-pixel text-[10px] uppercase text-px-cyan text-glow">
        {label}
        <span className="inline-block h-3 w-2 animate-blink bg-px-cyan align-middle ml-1" />
      </p>
    </div>
  );
}

/**
 * Animated Pixel-Art Batman Standing on Top Building with Flapping Cape.
 */
export function PixelBatman({ className }: { className?: string }) {
  const [capeFrame, setCapeFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCapeFrame((f) => (f + 1) % 3);
    }, 180);
    return () => clearInterval(t);
  }, []);

  // Batman Head + Body + Flapping Cape
  const CAPE_WIND = [
    [
      '...3....3...', // Ears
      '..333..333..', // Head
      '..33333333..',
      '...339933...', // Eyes (White/Yellow glow)
      '...333333...',
      '..33333333..', // Shoulders
      '.3333333333.', // Torso + Cape
      '.3333..3333.',
      '3333....3333',
      '333......333',
    ],
    [
      '...3....3...',
      '..333..333..',
      '..33333333..',
      '...339933...',
      '...333333...',
      '..33333333..',
      '..333333333.', // Cape wind right
      '..3333..3333',
      '.3333....333',
      '.333......33',
    ],
    [
      '...3....3...',
      '..333..333..',
      '..33333333..',
      '...339933...',
      '...333333...',
      '..33333333..',
      '.333333333..', // Cape wind left
      '3333..3333..',
      '333....3333.',
      '33......333.',
    ],
  ];

  const PALETTE: Record<string, string> = {
    '3': '#1e293b', // Batman Suit Dark Slate
    '9': '#fef08a', // Yellow Eyes/Chest Emblem Glow
  };

  const rows = CAPE_WIND[capeFrame];
  const cell = 2.2;

  return (
    <div className={cn('relative flex flex-col items-center select-none', className)}>
      <div
        className="relative"
        style={{ width: 12 * cell, height: 10 * cell, imageRendering: 'pixelated' }}
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
                  backgroundColor: PALETTE[char] ?? '#1e293b',
                  boxShadow: char === '9' ? '0 0 6px #fef08a' : undefined,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
