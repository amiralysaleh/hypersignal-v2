import type { Metadata } from 'next';
import './globals.css';
import { PixelToaster } from '@/components/pixel/toast';

export const metadata: Metadata = {
  title: 'HyperSignal',
  description: 'On-chain wallet consensus tracker for Hyperliquid perps.',
  appleWebApp: { capable: true, title: 'HyperSignal' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#070a07" />
      </head>
      <body className="antialiased">
        <PixelToaster>{children}</PixelToaster>
      </body>
    </html>
  );
}
