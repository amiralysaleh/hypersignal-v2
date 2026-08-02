'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Signal } from '@/lib/types';
import { api } from '@/lib/utils';
import { EmptySignals, SignalCard } from '@/components/pixel/signal-card';
import { PixelCard, PixelLoader, PixelTitle, LiveDot } from '@/components/pixel/retro-widgets';
import { usePixelToast } from '@/components/pixel/toast';

const TYPE_FILTERS: ('LONG' | 'SHORT')[] = ['LONG', 'SHORT'];
const STATUS_FILTERS: Signal['status'][] = ['OPEN', 'TP', 'SL'];

export default function SignalsPage() {
  const toast = usePixelToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState('');
  const [pairs, setPairs] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<'LONG' | 'SHORT'>>(new Set(TYPE_FILTERS));
  const [statuses, setStatuses] = useState<Set<Signal['status']>>(new Set(STATUS_FILTERS));

  const fetchSignals = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    try {
      const data = await api<Signal[]>('/api/signals');
      setSignals(data);
      setPairs((prev) => new Set(data.map((s) => s.pair).filter((p) => prev.has(p) || prev.size === 0)));
    } catch (e) {
      toast('err', 'UNABLE TO LOAD SIGNALS', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSignals();
    const t = setInterval(() => fetchSignals({ silent: true }), 10000);
    return () => clearInterval(t);
  }, [fetchSignals]);

  const runDetection = async () => {
    setDetecting(true);
    try {
      const data = await api<Signal[]>('/api/signals/detect', { method: 'POST' });
      setSignals(data);
      toast('ok', 'DETECTION COMPLETE', `${data.length} signals in store`);
    } catch (e) {
      toast('err', 'DETECTION FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setDetecting(false);
    }
  };

  const syncPrices = async () => {
    setSyncing(true);
    try {
      const data = await api<Signal[]>('/api/signals/update-prices', { method: 'POST' });
      setSignals(data);
      toast('ok', 'PRICES SYNCED');
    } catch (e) {
      toast('err', 'PRICE SYNC FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setSyncing(false);
    }
  };

  const toggle = <T extends string>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const filtered = useMemo(
    () =>
      signals.filter(
        (s) =>
          s.pair.toLowerCase().includes(query.toLowerCase()) &&
          (pairs.size === 0 || pairs.has(s.pair)) &&
          types.has(s.type) &&
          statuses.has(s.status)
      ),
    [signals, query, pairs, types, statuses]
  );

  const allPairs = useMemo(() => [...new Set(signals.map((s) => s.pair))].sort(), [signals]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LiveDot label="SCANNING" color="cyan" />
          <span className="font-mono text-[11px] text-px-gray">{signals.length} SIGNALS · {filtered.length} SHOWN</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="pixel-btn pixel-btn--green px-3 py-2 text-[8px]" onClick={syncPrices} disabled={syncing}>
            {syncing ? 'SYNCING...' : '◈ SYNC PRICES'}
          </button>
          <button type="button" className="pixel-btn px-3 py-2 text-[8px]" onClick={runDetection} disabled={detecting}>
            {detecting ? 'SCANNING...' : '▶ RUN DETECTION'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <PixelCard className="p-3" lift={false}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="pixel-input max-w-[180px] flex-1 sm:flex-none"
            placeholder="SEARCH PAIR..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <FilterGroup label="PAIR">
            {allPairs.length === 0 && <span className="px-2 text-[10px] text-px-gray">NONE</span>}
            {allPairs.map((p) => (
              <FilterChip key={p} active={pairs.has(p)} onClick={() => toggle(pairs, p, setPairs)}>
                {p}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup label="TYPE">
            {TYPE_FILTERS.map((t) => (
              <FilterChip key={t} active={types.has(t)} onClick={() => toggle(types, t, setTypes)}>
                {t}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup label="STATUS">
            {STATUS_FILTERS.map((s) => (
              <FilterChip key={s} active={statuses.has(s)} onClick={() => toggle(statuses, s, setStatuses)}>
                {s}
              </FilterChip>
            ))}
          </FilterGroup>
        </div>
      </PixelCard>

      {loading && signals.length === 0 ? (
        <PixelLoader label="LOADING SIGNALS" />
      ) : signals.length === 0 ? (
        <EmptySignals hasAny={false} onRun={runDetection} />
      ) : filtered.length === 0 ? (
        <EmptySignals hasAny />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((s) => (
            <SignalCard key={s.id} signal={s} onDelete={() => fetchSignals({ silent: true })} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-pixel text-[7px] text-px-gray">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={active ? 'filter-chip filter-chip--on' : 'filter-chip'}>
      {children}
    </button>
  );
}
