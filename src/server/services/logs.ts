import type { LogEntry } from '@/lib/types';
import { DbTimeoutError, readJsonFile, writeJsonFile } from '../storage/jsonStore';
import { isDemoMode, readMemoryJson, writeMemoryJson } from '../storage/memoryStore';

const LOGS_FILE_PATH = 'logs.json';
const MAX_LOG_ENTRIES = 200;

const reader = <T,>(path: string, fallback: T) =>
  isDemoMode() ? readMemoryJson(path, fallback) : readJsonFile(path, fallback);
const writer = <T,>(path: string, data: T) =>
  isDemoMode() ? writeMemoryJson(path, data) : writeJsonFile(path, data);

let logWriteQueue: Promise<void> = Promise.resolve();

async function persistLog(entry: Omit<LogEntry, 'timestamp'>) {
  const logs = await getLogs();
  const history = Array.isArray(logs) ? logs : [];
  const newLog: LogEntry = { ...entry, timestamp: new Date().toISOString() };
  await writer(LOGS_FILE_PATH, [newLog, ...history].slice(0, MAX_LOG_ENTRIES));
}

async function persistLogWithRetry(entry: Omit<LogEntry, 'timestamp'>, attempt = 1): Promise<void> {
  try {
    await persistLog(entry);
  } catch (error) {
    if (error instanceof DbTimeoutError) {
      console.warn('[logs] D1 timeout while persisting log entry, aborting retries.');
      throw error;
    }
    if (attempt >= 3) throw error;
    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    await persistLogWithRetry(entry, attempt + 1);
  }
}

export async function getLogs(): Promise<LogEntry[]> {
  const logs = await reader<LogEntry[]>(LOGS_FILE_PATH, []);
  return Array.isArray(logs) ? logs : [];
}

export async function log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
  logWriteQueue = logWriteQueue.catch(() => undefined).then(() => persistLogWithRetry(entry));
  try {
    await logWriteQueue;
  } catch (error) {
    console.error('Failed to persist log entry', error);
  }
}

export async function clearLogs(): Promise<void> {
  await writer(LOGS_FILE_PATH, []);
}
