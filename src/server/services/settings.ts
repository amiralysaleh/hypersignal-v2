import type { Settings } from '@/lib/types';
import { readJsonFile, writeJsonFile } from '../storage/jsonStore';
import { isDemoMode, readMemoryJson, writeMemoryJson } from '../storage/memoryStore';

const SETTINGS_FILE_PATH = 'settings.json';

export const defaultSettings: Settings = {
  minWalletCount: 3,
  timeWindow: 10,
  minVolume: 500,
  walletPollInterval: 60,
  pricePollInterval: 30,
  defaultStopLoss: 2.5,
  takeProfitTargets: '2.0, 3.5, 5.0',
  includeFunding: true,
  telegramBotToken: '',
  telegramChannelIds: '',
  monitoredPairs: 'BTC, ETH, SOL',
  quoteCurrencies: 'USDT, USDC',
  ignoredPairs: '',
};

const reader = <T,>(path: string, fallback: T) =>
  isDemoMode() ? readMemoryJson(path, fallback) : readJsonFile(path, fallback);
const writer = <T,>(path: string, data: T) =>
  isDemoMode() ? writeMemoryJson(path, data) : writeJsonFile(path, data);

export async function getSettings(): Promise<Settings> {
  const raw = await reader(SETTINGS_FILE_PATH, defaultSettings);
  return {
    ...raw,
    takeProfitTargets: (raw.takeProfitTargets || '2.0, 3.5, 5.0')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', '),
    monitoredPairs: (raw.monitoredPairs || 'BTC, ETH, SOL, BNB, ADA')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .join(', '),
    quoteCurrencies: (raw.quoteCurrencies || 'USDT, USDC')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .join(', '),
    ignoredPairs: (raw.ignoredPairs || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .join(', '),
  };
}

export async function saveSettings(newSettings: Settings): Promise<void> {
  await writer(SETTINGS_FILE_PATH, newSettings);
}
