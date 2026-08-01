import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#070b12',
          900: '#0b1220',
          800: '#101a2c',
          700: '#16233a',
          600: '#1e3050',
          500: '#2a4068',
        },
        px: {
          cyan: '#22d3ee',
          'cyan-dim': '#0e7490',
          blue: '#60a5fa',
          green: '#34d399',
          red: '#f87171',
          yellow: '#fbbf24',
          purple: '#a78bfa',
          pink: '#f472b6',
          gray: '#64748b',
          'gray-light': '#94a3b8',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pixel-in': 'pixelIn .18s steps(2) both',
        'flicker': 'flicker 4s linear infinite',
        'blink': 'blink 1.2s steps(1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'marquee': 'marquee 22s linear infinite',
        'wobble': 'wobble .5s steps(2) infinite',
        'slide-down': 'slideDown .16s steps(3) both',
        'slide-up': 'slideUp .16s steps(3) both',
        'card-lift': 'cardLift .18s steps(2) both',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'shake': 'shake .3s steps(2)',
        'spin-slow': 'spin 2.4s linear infinite',
      },
      keyframes: {
        pixelIn: {
          '0%': { transform: 'scale(.92) translateY(4px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.82' },
          '52%': { opacity: '1' },
          '54%': { opacity: '.9' },
          '82%': { opacity: '1' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        wobble: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        cardLift: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(34,211,238,.4)' },
          '70%': { boxShadow: '0 0 0 8px rgba(34,211,238,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(34,211,238,0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
