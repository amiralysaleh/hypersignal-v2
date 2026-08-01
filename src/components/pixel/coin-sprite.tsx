'use client';

import { cn } from '@/lib/utils';

/**
 * 8x8 pixel coin icons, hand-drawn on a 16x16 grid as a string map.
 * Each symbol has its own color identity (cyan-blue family for BTC, purple
 * for ETH, etc.) so coins are easy to tell apart at a glance.
 */

const COIN_ART: Record<string, { rows: string[]; palette: Record<string, string> }> = {
  BTC: {
    palette: { '3': '#7dd3fc', '9': '#fbbf24', '5': '#38bdf8' },
    rows: [
      '....3333....',
      '..33333333..',
      '.333999333.',
      '.339999993.',
      '3399999993.',
      '39933..9933',
      '3999....99.',
      '39993..993.',
      '3999999993.',
      '3993999399.',
      '3999999993.',
      '3993333393.',
      '3999..9993.',
      '.399999993.',
      '..33333333.',
      '....3333....',
    ],
  },
  ETH: {
    palette: { '3': '#c4b5fd', '5': '#a78bfa' },
    rows: [
      '....3333....',
      '...355553...',
      '..35555553..',
      '.3555555553.',
      '35533333555.',
      '3555555553.',
      '.355555553.',
      '..35555553..',
      '..35555553..',
      '.355555553.',
      '35555555555.',
      '.3555555553.',
      '..35555553..',
      '...355553...',
      '....3333....',
      '............',
    ],
  },
  SOL: {
    palette: { '3': '#6ee7b7', '5': '#34d399' },
    rows: [
      '............',
      '....33......',
      '...3553.....',
      '..355553....',
      '.35555553...',
      '.355555553..',
      '.3555555553.',
      '.355555553..',
      '.35555553...',
      '.3555553....',
      '..35553.....',
      '...353......',
      '....3.......',
      '............',
      '............',
      '............',
    ],
  },
  DOGE: {
    palette: { '3': '#fde68a', 'e': '#f59e0b', 'b': '#b45309', '2': '#fbbf24' },
    rows: [
      '....3333....',
      '..33eeee33..',
      '.3eebbbbee3.',
      '.eebbbb22be.',
      '3ebbbb22bbe3',
      '3eb222222be3',
      '3eb2bbbb2be3',
      '3eb2bbbb2be3',
      '3ebbbbbbbe3',
      '3ebb222bbe3',
      '3ebbbbbbbe3',
      '.ebbbbbbbe.',
      '.3eeeee3e3.',
      '..33e33e3..',
      '.....33....',
      '............',
    ],
  },
  XRP: {
    palette: { '3': '#93c5fd', '5': '#bfdbfe', 'e': '#60a5fa' },
    rows: [
      '....3333....',
      '..33333333..',
      '.333eeee333.',
      '.33e5555e33.',
      '33e555555e33',
      '33e555555e33',
      '33e555555e33',
      '33e555555e33',
      '33e555555e33',
      '33e555555e33',
      '33e555555e33',
      '.33e5555e33.',
      '.333eeee333.',
      '..33333333..',
      '....3333....',
      '............',
    ],
  },
  AVAX: {
    palette: { '3': '#fca5a5', '5': '#f87171' },
    rows: [
      '....33......',
      '...3553.....',
      '..355553....',
      '.35555553...',
      '355555553...',
      '.35555553...',
      '..355553....',
      '..355553....',
      '.35555553...',
      '355555553...',
      '355555553...',
      '355555553...',
      '355555553...',
      '355555553...',
      '.35555553...',
      '....33......',
    ],
  },
  LINK: {
    palette: { '3': '#cbd5e1', 'd': '#0ea5e9' },
    rows: [
      '....3333....',
      '..33333333..',
      '.3333333333.',
      '.3d333333d3.',
      '3d3dddddd3d3',
      '3dd3dddd3dd3',
      '3dd3dddd3dd3',
      '3d33dddd33d3',
      '3d33333333d3',
      '3dd333333dd3',
      '3ddd3333ddd3',
      '.3dddddddd3.',
      '.333dddd333.',
      '..33333333..',
      '....3333....',
      '............',
    ],
  },
  ARB: {
    palette: { '3': '#5eead4', '5': '#2dd4bf' },
    rows: [
      '....3333....',
      '..33333333..',
      '.3335555533.',
      '.3355555553.',
      '335555555553',
      '335555555553',
      '.3355555553.',
      '..33555553..',
      '..33355533..',
      '.3333555533.',
      '335555555553',
      '335555555553',
      '.3355555553.',
      '..33355533..',
      '....3333....',
      '............',
    ],
  },
  OP: {
    palette: { '3': '#fdba74', '5': '#fb923c' },
    rows: [
      '....3333....',
      '..33333333..',
      '.3335555533.',
      '.3355555553.',
      '335555555553',
      '335555555553',
      '.3355555553.',
      '..33355533..',
      '..33355553..',
      '.3355555553.',
      '335555555553',
      '.3355555553.',
      '..33355533..',
      '....3333....',
      '............',
      '............',
    ],
  },
  SUI: {
    palette: { '3': '#f0abfc', '5': '#e879f9' },
    rows: [
      '............',
      '....3333....',
      '..33333333..',
      '.3355555553.',
      '335555555553',
      '335555555553',
      '.3355555553.',
      '..33333333..',
      '.3333333333.',
      '335555555553',
      '.3355555553.',
      '..33555553..',
      '...335553...',
      '....3333....',
      '............',
      '............',
    ],
  },
  TIA: {
    palette: { '3': '#c7d2fe', '5': '#a5b4fc' },
    rows: [
      '............',
      '....3333....',
      '..33333333..',
      '.3335555533.',
      '.3355555553.',
      '335555555553',
      '335555555553',
      '.3355555553.',
      '..33355533..',
      '..33555553..',
      '.3355555553.',
      '335555555553',
      '.3355555553.',
      '..33355533..',
      '....3333....',
      '............',
    ],
  },
  BONK: {
    palette: { '3': '#fbbf24', 'e': '#f59e0b', 'b': '#92400e', '2': '#fde68a' },
    rows: [
      '....3333....',
      '..33eeee33..',
      '.3ebb22bbe3.',
      '3eb22ee22be3',
      '3eb22ee22be3',
      '.3eb2222be3.',
      '.3ebbbbbbe3.',
      '3ebbbbbbbe3',
      '3eb2bbbb2be3',
      '3eb2bbbb2be3',
      '3eb2bbbb2be3',
      '3ebbbbbbbe3',
      '.3ebbbbbe3.',
      '.3ebbbbbe3.',
      '..3bbbb3...',
      '...3bb3....',
    ],
  },
  WIF: {
    palette: { '3': '#fcd34d', 'e': '#f59e0b', 'b': '#92400e', '2': '#fde68a' },
    rows: [
      '............',
      '....3333....',
      '..33eeee33..',
      '.3ebb22bbe3.',
      '3eb22bb22be3',
      '3eb22bb22be3',
      '.3e222222e3.',
      '.3ebbbbbbe3.',
      '3ebbbbbbbe3',
      '3ebbbbbbbe3',
      '3ebbbbbbbe3',
      '.3ebbbbbe3.',
      '..3ebbbe3..',
      '...3ee3....',
      '....33.....',
      '............',
    ],
  },
};

const DEFAULT_PALETTE: Record<string, string> = {
  '3': '#7dd3fc',
  '5': '#38bdf8',
};

function spriteToPixels(art: { rows: string[]; palette: Record<string, string> }): { x: number; y: number; color: string }[] {
  const pixels: { x: number; y: number; color: string }[] = [];
  for (let y = 0; y < art.rows.length; y++) {
    for (let x = 0; x < art.rows[y].length; x++) {
      const c = art.rows[y][x];
      if (c !== '.') pixels.push({ x, y, color: art.palette[c] ?? DEFAULT_PALETTE[c] ?? '#7dd3fc' });
    }
  }
  return pixels;
}

export function CoinSprite({
  symbol,
  size = 40,
  animate = true,
  className,
}: {
  symbol: string;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  const art = COIN_ART[symbol.toUpperCase()] ?? COIN_ART.BTC;
  const pixels = spriteToPixels(art);
  const cell = size / 16;

  return (
    <div
      aria-hidden
      className={cn('relative shrink-0', animate && 'animate-wobble', className)}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        animationDuration: animate ? undefined : 'none',
      }}
    >
      {pixels.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: p.x * cell,
            top: p.y * cell,
            width: cell + 0.5,
            height: cell + 0.5,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

export const KNOWN_COINS = Object.keys(COIN_ART);
