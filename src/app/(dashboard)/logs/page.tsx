'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LogEntry } from '@/lib/types';
import { api, cn, formatTime } from '@/lib/utils';
import { PixelCard, PixelLoader, PixelTitle } from '@/components/pixel/retro-widgets';
import { usePixelToast } from '@/components/pixel/toast';

const LEVELS = ['INFO', 'WARN', 'ERROR'] as const;

const LEVEL_STYLE: Record<(typeof LEVELS)[number], string> = {
  INFO: 'text-px-green',
  WARN: 'text-px-yellow',
  ERROR: 'text-px-red text-glow-red',
};

export default function LogsPage() {
  const toast = usePixelToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<Set<(typeof LEVELS)[number]>>(new Set(LEVELS));

  const load = useCallback(async () => {
    try {
      const data = await api<LogEntry[]>('/api/logs');
      setLogs(data);
    } catch (e) {
      toast('err', 'LOG LOAD FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const clear = async () => {
    if (!confirm('Wipe all logs?')) return;
    try {
      await api('/api/logs', { method: 'DELETE' });
      setLogs([]);
      toast('ok', 'LOGS CLEARED');
    } catch (e) {
      toast('err', 'CLEAR FAILED', e instanceof Error ? e.message : undefined);
    }
  };

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        const text = `${l.message} ${JSON.stringify(l.context ?? {})}`.toLowerCase();
        return text.includes(query.toLowerCase()) && levels.has(l.level);
      }),
    [logs, query, levels]
  );

  const toggleLevel = (level: (typeof LEVELS)[number]) => {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const counts = {
    INFO: logs.filter((l) => l.level === 'INFO').length,
    WARN: logs.filter((l) => l.level === 'WARN').length,
    ERROR: logs.filter((l) => l.level === 'ERROR').length,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLevel(l)}
              className={
                levels.has(l)
                  ? cn('border-2 border-px-dim/60 bg-base-700 px-2 py-1 font-pixel text-[8px]', LEVEL_STYLE[l])
                  : 'border-2 border-px-dim/30 px-2 py-1 font-pixel text-[8px] text-px-gray'
              }
            >
              {l} {counts[l]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="pixel-input max-w-[220px]"
            placeholder="FILTER..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="pixel-btn pixel-btn--danger px-3 py-2 text-[8px]" onClick={clear}>
            ✕ CLEAR
          </button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <PixelLoader label="READING LOGS" />
      ) : filtered.length === 0 ? (
        <PixelCard className="p-8 text-center">
          <p className="font-pixel text-[9px] text-px-green">
            {logs.length === 0 ? 'NO LOG ENTRIES' : 'NO MATCHING ENTRIES'}
          </p>
          <p className="mt-2 text-[11px] text-px-gray">
            {logs.length === 0 ? 'The bot writes a log every scan cycle.' : 'Adjust filters.'}
          </p>
        </PixelCard>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((l, i) => (
            <div key={i} className="crt-panel px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className={cn('font-pixel text-[8px]', LEVEL_STYLE[l.level])}>[{l.level}]</span>
                <span className="font-mono text-[10px] text-px-gray">{formatTime(l.timestamp)}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-px-green">{l.message}</p>
              {l.context && Object.keys(l.context).length > 0 && (
                <pre className="mt-2 max-h-40 overflow-auto border border-px-dim/30 bg-base-900 p-2 text-[10px] leading-relaxed text-px-gray">
                  {JSON.stringify(l.context, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
