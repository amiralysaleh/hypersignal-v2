'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type ToastKind = 'ok' | 'err' | 'info';
interface ToastMsg {
  id: number;
  kind: ToastKind;
  title: string;
  desc?: string;
}

const ToastCtx = createContext<(kind: ToastKind, title: string, desc?: string) => void>(() => {});

export function usePixelToast() {
  return useContext(ToastCtx);
}

const KIND_ICON: Record<ToastKind, string> = {
  ok: '★',
  err: '✕',
  info: '▸',
};

const KIND_STYLE: Record<ToastKind, string> = {
  ok: 'border-px-green/60 text-px-green',
  err: 'border-px-red/60 text-px-red',
  info: 'border-px-cyan/60 text-px-cyan',
};

export function PixelToaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, title: string, desc?: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, kind, title, desc }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 3500);
    return () => clearTimeout(t);
  }, [toasts]);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'crt-panel animate-slide-down pointer-events-auto flex items-start gap-3 bg-base-900/95 px-3 py-3',
              KIND_STYLE[t.kind],
              t.kind === 'err' && 'shadow-[0_0_16px_-4px_rgba(248,113,113,0.3)]'
            )}
          >
            <span className={cn('font-pixel text-[10px]', KIND_STYLE[t.kind])}>{KIND_ICON[t.kind]}</span>
            <div className="min-w-0">
              <p className={cn('font-pixel text-[9px] leading-relaxed', KIND_STYLE[t.kind])}>{t.title}</p>
              {t.desc && <p className="mt-1 break-words text-[11px] text-px-gray">{t.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}