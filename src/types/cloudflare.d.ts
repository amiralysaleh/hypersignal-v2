declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }

  var __CLOUDFLARE_ENV__: { DB: D1Database } | undefined;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; results: unknown[] }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export {};
