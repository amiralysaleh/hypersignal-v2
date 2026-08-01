import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#070a07',
          800: '#0b0f0b',
          700: '#0f140f',
          600: '#131a13',
        },
        px: {
          green: '#33ff55',
          dim: '#1c8f33',
          dark: '#0c3d16',
          cyan: '#2ee6c8',
          yellow: '#ffd733',
          red: '#ff5555',
          orange: '#ff9f2e',
          purple: '#b48cff',
          gray: '#5c725f',
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
        'radar': 'radar 3s linear infinite',
        'wobble': 'wobble .5s steps(2) infinite',
        'loadbar': 'loadbar 1.4s steps(6) infinite',
        'crt-flash': 'crtFlash .3s steps(2)',
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
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        wobble: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        loadbar: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        crtFlash: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
