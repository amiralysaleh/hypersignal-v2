'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="crt-scanlines crt-vignette flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-pixel text-[24px] text-px-green text-glow">404</p>
      <p className="font-pixel text-[10px] text-px-yellow">SYSTEM ERROR: PAGE NOT FOUND</p>
      <p className="max-w-md text-[12px] text-px-gray">
        The requested sector does not exist. The signal you are looking for may have been lost in transmission.
      </p>
      <Link href="/" className="pixel-btn">
        ◂ RETURN TO DASHBOARD
      </Link>
    </div>
  );
}
