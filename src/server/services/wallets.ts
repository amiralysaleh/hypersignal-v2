import type { Wallet } from '@/lib/types';
import { readJsonFile, writeJsonFile } from '../storage/jsonStore';
import { isDemoMode, readMemoryJson, writeMemoryJson } from '../storage/memoryStore';

const WALLETS_FILE_PATH = 'wallets.json';
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

const reader = <T,>(path: string, fallback: T) =>
  isDemoMode() ? readMemoryJson(path, fallback) : readJsonFile(path, fallback);
const writer = <T,>(path: string, data: T) =>
  isDemoMode() ? writeMemoryJson(path, data) : writeJsonFile(path, data);

export async function readWallets(): Promise<Wallet[]> {
  const wallets = await reader<Wallet[]>(WALLETS_FILE_PATH, []);
  if (!Array.isArray(wallets)) return [];
  return wallets.map((wallet) => ({
    address: wallet.address,
    addedOn: wallet.addedOn ?? new Date().toISOString(),
    totalPnl: wallet.totalPnl ?? 0,
    totalTrades: wallet.totalTrades ?? 0,
    winningTrades: wallet.winningTrades ?? 0,
    cooldowns: wallet.cooldowns ?? {},
    favorite: wallet.favorite ?? false,
  }));
}

export async function writeWallets(wallets: Wallet[]): Promise<void> {
  await writer(WALLETS_FILE_PATH, wallets);
}

export async function getWallets(): Promise<Wallet[]> {
  return readWallets();
}

export async function addWallet(address: string): Promise<Wallet> {
  const wallets = await readWallets();
  const normalized = address.trim().toLowerCase();
  if (!normalized) throw new Error('Wallet address cannot be empty.');
  if (wallets.some((w) => w.address.toLowerCase() === normalized)) {
    throw new Error('Wallet address already exists.');
  }

  const newWallet: Wallet = {
    address,
    addedOn: new Date().toISOString(),
    totalPnl: 0,
    totalTrades: 0,
    winningTrades: 0,
    cooldowns: {},
    favorite: false,
  };
  wallets.push(newWallet);
  await writeWallets(wallets);
  return newWallet;
}

export async function deleteWallet(address: string): Promise<void> {
  const wallets = await readWallets();
  const filtered = wallets.filter((w) => w.address.toLowerCase() !== address.toLowerCase());
  if (filtered.length === wallets.length) throw new Error('Wallet not found.');
  await writeWallets(filtered);
}

export async function toggleWalletFavorite(address: string): Promise<Wallet> {
  const wallets = await readWallets();
  const idx = wallets.findIndex((w) => w.address.toLowerCase() === address.toLowerCase());
  if (idx === -1) throw new Error('Wallet not found.');
  wallets[idx].favorite = !wallets[idx].favorite;
  await writeWallets(wallets);
  return wallets[idx];
}

export async function getTrackedAddresses(): Promise<string[]> {
  const wallets = await readWallets();
  return wallets.map((w) => w.address);
}

export async function updateWalletCooldowns(walletAddresses: string[], coin: string): Promise<void> {
  if (walletAddresses.length === 0) return;
  const wallets = await readWallets();
  const now = new Date().toISOString();
  for (const address of walletAddresses) {
    const idx = wallets.findIndex((w) => w.address.toLowerCase() === address.toLowerCase());
    if (idx > -1) {
      wallets[idx].cooldowns = wallets[idx].cooldowns ?? {};
      wallets[idx].cooldowns[coin] = now;
    }
  }
  await writeWallets(wallets);
}

export function isOnCooldown(wallet: Wallet, coin: string, now = Date.now()): boolean {
  const ts = wallet.cooldowns?.[coin];
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) && now - t < COOLDOWN_MS;
}
