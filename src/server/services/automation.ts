import { detectAndSaveSignals, updateSignalPrices } from './signals';
import { log } from './logs';
import {
  completeWorkerRun,
  findActiveWorkerRun,
  getRecentRuns,
  markStaleWorkerRuns,
  registerWorkerRun,
  touchWorkerRun,
} from './workerRuns';
import { readWorkerState, writeWorkerState } from './workerState';
import { getTrackedAddresses } from './wallets';
import { getSettings } from './settings';

export const CRON_INTERVAL_MS = 10 * 60 * 1000;

/** How long a tick may run before the platform kills it (Cloudflare: 30s). */
const TICK_HARD_LIMIT_MS = 25_000;
/** Keep margin to write state + respond before the hard limit. */
const TICK_COMPLETION_BUFFER_MS = 4_000;
const DETECTION_STRIDE = 20;

export interface AutomationTickResult {
  status: 'ok' | 'partial' | 'skipped';
  skipReason?: string;
  phase?: 'detection' | 'prices';
  walletStart: number;
  walletsProcessed: number;
  totalWallets: number;
  detectionDone: boolean;
  runId: string;
  durationMs: number;
}

export async function runAutomationTick({ reason }: { reason: string }): Promise<AutomationTickResult> {
  const startedAt = Date.now();
  const runId = `${startedAt}-${Math.random().toString(16).slice(2)}`;

  const activeRun = await findActiveWorkerRun({ now: startedAt });
  if (activeRun) {
    await log({
      level: 'WARN',
      message: 'Tick skipped: another run is still active.',
      context: { runId, activeRunId: activeRun.runId, reason },
    });
    return {
      status: 'skipped',
      skipReason: 'active-run',
      phase: undefined,
      walletStart: 0,
      walletsProcessed: 0,
      totalWallets: 0,
      detectionDone: false,
      runId,
      durationMs: 0,
    };
  }

  await registerWorkerRun({ runId, startedAt, reason });
  const heartbeat = (() => {
    let last = 0;
    return async (durationMs?: number) => {
      const now = Date.now();
      if (now - last < 2_000 && !(durationMs && durationMs >= 60_000)) return;
      last = now;
      await touchWorkerRun({ runId, durationMs });
    };
  })();

  try {
    const settings = await getSettings();
    const totalWallets = (await getTrackedAddresses()).length;
    const state = await readWorkerState();
    const startIndex = totalWallets > 0 ? state.nextWalletIndex % totalWallets : 0;
    const stride = Math.min(DETECTION_STRIDE, Math.max(1, totalWallets));

    /* ---- Phase 1: detect (up to DETECTION_STRIDE wallets) ---- */
    const detectionStart = Date.now();
    const detectionDeadline = detectionStart + 15_000;
    await detectAndSaveSignals({
      deadlineMs: detectionDeadline,
      onProgress: async ({ processedWallets }) => {
        await heartbeat();
      },
    });

    const detectionDone = await isDetectionComplete(totalWallets);
    const walletStart = startIndex;
    const walletsProcessed = Math.min(stride, Math.max(0, totalWallets - startIndex)) || stride;
    await heartbeat(Date.now() - startedAt);

    /* ---- Phase 2: refresh prices (only when detection is caught up) ---- */
    let phase: AutomationTickResult['phase'] = 'detection';
    if (detectionDone) {
      if (Date.now() - startedAt > TICK_HARD_LIMIT_MS - TICK_COMPLETION_BUFFER_MS) {
        await log({ level: 'WARN', message: 'Skipping price update this tick: time budget low.' });
      } else {
        phase = 'prices';
        await updateSignalPrices({
          deadlineMs: startedAt + TICK_HARD_LIMIT_MS - TICK_COMPLETION_BUFFER_MS,
          onProgress: async () => {
            await heartbeat();
          },
        });
      }
    }

    await completeWorkerRun({ runId, status: 'success', durationMs: Date.now() - startedAt });
    await log({
      level: 'INFO',
      message: `Tick complete (${reason})`,
      context: {
        phase,
        walletStart,
        walletsProcessed,
        totalWallets,
        detectionDone,
        durationMs: Date.now() - startedAt,
      },
    });

    return {
      status: 'ok',
      phase,
      walletStart,
      walletsProcessed,
      totalWallets,
      detectionDone,
      runId,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const err = error as Error;
    await log({
      level: 'ERROR',
      message: 'Automation tick failed',
      context: { runId, error: err.message, stack: err.stack, reason },
    });
    await completeWorkerRun({ runId, status: 'error', durationMs: Date.now() - startedAt });
    throw error;
  }
}

async function isDetectionComplete(totalWallets: number): Promise<boolean> {
  if (totalWallets === 0) return true;
  const state = await readWorkerState();
  return state.nextWalletIndex % totalWallets === 0;
}

export interface SystemStatus {
  runs: Awaited<ReturnType<typeof getRecentRuns>>;
  workerState: Awaited<ReturnType<typeof readWorkerState>>;
  staleRuns: number;
  totalWallets: number;
  lastRunAt: string | null;
  nextExpectedRunAt: string | null;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const [runs, workerState, wallets] = await Promise.all([getRecentRuns(20), readWorkerState(), getTrackedAddresses()]);
  const staleRuns = runs.filter((r) => r.status === 'timeout').length;
  const lastRunAt = runs.find((r) => r.status !== 'running')?.startedAt ?? null;
  const nextExpectedRunAt = lastRunAt ? new Date(new Date(lastRunAt).getTime() + CRON_INTERVAL_MS).toISOString() : null;
  return { runs, workerState, staleRuns, totalWallets: wallets.length, lastRunAt, nextExpectedRunAt };
}
