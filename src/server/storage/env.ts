import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

export interface CloudflareBindings extends CloudflareEnv {
  DB: D1Database;
}

let explicitEnv: CloudflareBindings | null = null;

export function setCloudflareEnv(env: CloudflareBindings) {
  explicitEnv = env;
}

export function getCloudflareEnv(): CloudflareBindings {
  if (explicitEnv) return explicitEnv;

  try {
    const context = getCloudflareContext({ async: false });
    if (context?.env && typeof context.env === 'object' && context.env !== null && 'DB' in context.env) {
      return context.env as CloudflareBindings;
    }
  } catch {
    // not inside a Cloudflare request
  }

  if (typeof globalThis !== 'undefined' && globalThis.__CLOUDFLARE_ENV__) {
    return globalThis.__CLOUDFLARE_ENV__ as CloudflareBindings;
  }

  throw new Error(
    'Cloudflare environment bindings are not available. Run with DEMO=1 for local development, or deploy to Cloudflare.'
  );
}
