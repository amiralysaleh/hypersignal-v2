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
  return reader(SETTINGS_FILE_PATH, defaultSettings);
}

export async function saveSettings(newSettings: Settings): Promise<void> {
  await writer(SETTINGS_FILE_PATH, newSettings);
}
