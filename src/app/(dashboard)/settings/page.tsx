'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '@/lib/types';
import { api } from '@/lib/utils';
import { PixelCard, PixelLoader, PixelTitle } from '@/components/pixel/retro-widgets';
import { usePixelToast } from '@/components/pixel/toast';

const PROFILES: Record<string, { label: string; desc: string; values: Partial<Settings> }> = {
  highQuality: {
    label: 'HIGH-QUALITY',
    desc: 'Fewer, stronger signals. 10+ wallets, 5 min window, $5k volume.',
    values: { minWalletCount: 10, timeWindow: 5, minVolume: 5000 },
  },
  balanced: {
    label: 'BALANCED',
    desc: 'Default. 3 wallets, 10 min window, $500 volume.',
    values: { minWalletCount: 3, timeWindow: 10, minVolume: 500 },
  },
  highFrequency: {
    label: 'HIGH-FREQUENCY',
    desc: 'More signals, more noise. 2 wallets, 15 min window, $200 volume.',
    values: { minWalletCount: 2, timeWindow: 15, minVolume: 200 },
  },
};

export default function SettingsPage() {
  const toast = usePixelToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<Settings>('/api/settings');
      setSettings(data);
    } catch (e) {
      toast('err', 'LOAD FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setProfile(null);
  };

  const applyProfile = (key: string) => {
    const p = PROFILES[key];
    if (!p) return;
    setSettings((prev) => (prev ? { ...prev, ...p.values } : prev));
    setProfile(key);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
      toast('ok', 'SETTINGS SAVED');
    } catch (e) {
      toast('err', 'SAVE FAILED', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) return <PixelLoader label="LOADING SETTINGS" />;

  const num = (key: keyof Settings) => (
    <input
      className="pixel-input"
      type="number"
      value={settings ? (settings[key] as number) : ''}
      onChange={(e) => set(key, Number(e.target.value))}
    />
  );
  const text = (key: keyof Settings, placeholder?: string) => (
    <input
      className="pixel-input"
      value={settings ? String(settings[key] ?? '') : ''}
      placeholder={placeholder}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(PROFILES).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyProfile(key)}
            className={
              profile === key
                ? 'crt-panel border-px-purple/60 p-3 text-left shadow-[0_0_14px_-4px_rgba(167,139,250,0.4)]'
                : 'crt-panel p-3 text-left hover:border-px-cyan/50'
            }
          >
            <p className="font-pixel text-[9px] text-px-purple">{p.label}</p>
            <p className="mt-1 text-[10px] text-px-gray">{p.desc}</p>
          </button>
        ))}
      </div>

      <PixelCard>
        <PixelTitle icon="▤" accent="cyan">DETECTION PARAMETERS</PixelTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="MIN WALLET COUNT (N)" hint="wallets needed for a signal">
            {num('minWalletCount')}
          </Field>
          <Field label="TIME WINDOW (MIN)" hint="cluster window">
            {num('timeWindow')}
          </Field>
          <Field label="MIN VOLUME ($)" hint="cluster notional floor">
            {num('minVolume')}
          </Field>
          <Field label="DEFAULT STOP LOSS (%)" hint="from entry">
            {num('defaultStopLoss')}
          </Field>
          <Field label="TAKE PROFIT TARGETS (%)" hint="comma separated">
            {text('takeProfitTargets', '2.0, 3.5, 5.0')}
          </Field>
          <Field label="MONITORED PAIRS" hint="comma separated">
            {text('monitoredPairs', 'BTC, ETH, SOL')}
          </Field>
          <Field label="QUOTE CURRENCIES" hint="comma separated">
            {text('quoteCurrencies', 'USDT, USDC')}
          </Field>
          <Field label="IGNORED PAIRS" hint="comma separated">
            {text('ignoredPairs')}
          </Field>
        </div>
      </PixelCard>

      <PixelCard>
        <PixelTitle icon="▤" accent="yellow">ALERTS</PixelTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="TELEGRAM BOT TOKEN" hint="from @BotFather">
            {text('telegramBotToken')}
          </Field>
          <Field label="ALERT CHANNEL IDS" hint="comma separated">
            {text('telegramChannelIds', '-100xxxxxxxxxx')}
          </Field>
        </div>
      </PixelCard>

      <div className="flex items-center justify-end gap-3">
        {profile && (
          <span className="font-pixel text-[8px] text-px-yellow">PROFILE: {PROFILES[profile].label}</span>
        )}
        <button type="button" className="pixel-btn px-4 py-2 text-[9px]" onClick={save} disabled={saving}>
          {saving ? 'SAVING...' : '⟳ SAVE CONFIG'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-pixel text-[8px] text-px-gray">{label}</span>
      <span className="mt-0.5 block text-[10px] text-px-gray">{hint}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
