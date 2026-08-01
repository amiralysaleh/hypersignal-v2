/**
 * In-memory JSON store used when DEMO=1 (local dev without Cloudflare/D1).
 * Data is seeded once per process and survives for the session.
 */

const buckets = new Map<string, string>();

export function ensureDemoSeedOnce() {
  // Lazy import avoids a circular dependency (demoSeed writes via writeMemoryJson)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ensureDemoSeed } = require('./demoSeed') as { ensureDemoSeed: () => void };
  ensureDemoSeed();
}

export async function readMemoryJson<T>(relativePath: string, defaultValue: T): Promise<T> {
  if (isDemoMode() && !relativePath.startsWith('settings.json') && !relativePath.startsWith('worker')) {
    ensureDemoSeedOnce();
  }
  const raw = buckets.get(relativePath);
  if (raw === undefined) {
    buckets.set(relativePath, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(defaultValue)) return Array.isArray(parsed) ? (parsed as T) : defaultValue;
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      return { ...(defaultValue as object), ...(parsed as object) } as T;
    }
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

export async function writeMemoryJson<T>(relativePath: string, data: T): Promise<void> {
  buckets.set(relativePath, JSON.stringify(data));
}

export function isDemoMode(): boolean {
  return process.env.DEMO === '1';
}
