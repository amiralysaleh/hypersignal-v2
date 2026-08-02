import type { RunRecord } from '@/lib/types';
import { readJsonFile, writeJsonFile } from '../storage/jsonStore';
import { isDemoMode, readMemoryJson, writeMemoryJson } from '../storage/memoryStore';

const WORKER_RUNS_FILE_PATH = 'worker-runs.json';
const MAX_WORKER_RUN_RECORDS = 60;
// Cloudflare workers die within 30s. A run is stale after 60 seconds max.
const DEFAULT_ACTIVE_RUN_GRACE_MS = 60 * 1000;

const reader = <T,>(path: string, fallback: T) =>
  isDemoMode() ? readMemoryJson(path, fallback) : readJsonFile(path, fallback);
const writer = <T,>(path: string, data: T) =>
  isDemoMode() ? writeMemoryJson(path, data) : writeJsonFile(path, data);

async function readWorkerRuns(): Promise<RunRecord[]> {
  const runs = await reader<RunRecord[]>(WORKER_RUNS_FILE_PATH, []);
  return Array.isArray(runs) ? runs : [];
}

async function writeWorkerRuns(runs: RunRecord[]): Promise<void> {
  await writer(WORKER_RUNS_FILE_PATH, runs.slice(0, MAX_WORKER_RUN_RECORDS));
}

export async function markStaleWorkerRuns({ now, staleAfterMs }: { now: number; staleAfterMs: number }): Promise<RunRecord[]> {
  const runs = await readWorkerRuns();
  if (runs.length === 0) return [];

  const staleRuns: RunRecord[] = [];
  const updated = runs.map((run) => {
    if (run.status !== 'running') return run;
    const startedTime = Date.parse(run.startedAt);
    if (!Number.isFinite(startedTime) || startedTime >= now - staleAfterMs) return run;
    const timedOut: RunRecord = { ...run, status: 'timeout', updatedAt: new Date(now).toISOString() };
    staleRuns.push(timedOut);
    return timedOut;
  });

  if (staleRuns.length > 0) await writeWorkerRuns(updated);
  return staleRuns;
}

export async function registerWorkerRun({ runId, startedAt, reason }: { runId: string; startedAt: number; reason?: string }): Promise<void> {
  const runs = await readWorkerRuns();
  const iso = new Date(startedAt).toISOString();
  await writeWorkerRuns([
    { runId, status: 'running', startedAt: iso, updatedAt: iso, reason },
    ...runs.filter((r) => r.runId !== runId),
  ]);
}

export async function touchWorkerRun({ runId, durationMs }: { runId: string; durationMs?: number }): Promise<void> {
  const runs = await readWorkerRuns();
  const iso = new Date().toISOString();
  const existing = runs.find((r) => r.runId === runId);
  const record: RunRecord = existing
    ? { ...existing, status: 'running', updatedAt: iso, ...(durationMs !== undefined ? { durationMs } : {}) }
    : { runId, status: 'running', startedAt: iso, updatedAt: iso, ...(durationMs !== undefined ? { durationMs } : {}) };
  await writeWorkerRuns([record, ...runs.filter((r) => r.runId !== runId)]);
}

export async function completeWorkerRun({ runId, status, durationMs }: { runId: string; status: 'success' | 'error'; durationMs: number }): Promise<void> {
  const runs = await readWorkerRuns();
  const iso = new Date().toISOString();
  const existing = runs.find((r) => r.runId === runId);
  const record: RunRecord = existing
    ? { ...existing, status, durationMs, updatedAt: iso }
    : { runId, status, startedAt: iso, updatedAt: iso, durationMs };
  await writeWorkerRuns([record, ...runs.filter((r) => r.runId !== runId)]);
}

export async function findActiveWorkerRun({ now, activityGraceMs = DEFAULT_ACTIVE_RUN_GRACE_MS }: { now: number; activityGraceMs?: number }): Promise<RunRecord | null> {
  const runs = await readWorkerRuns();
  const grace = Math.max(5_000, activityGraceMs);
  const threshold = now - grace;
  for (const run of runs) {
    if (run.status !== 'running') continue;
    const updatedAtMs = Date.parse(run.updatedAt);
    if (Number.isFinite(updatedAtMs) && updatedAtMs >= threshold) return run;
  }
  return null;
}

export async function getRecentRuns(limit = 15): Promise<RunRecord[]> {
  const runs = await readWorkerRuns();
  return runs.slice(0, limit);
}
