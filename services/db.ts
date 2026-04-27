import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let migrationPromise: Promise<void> | null = null;
let migrated = false;

export type DbStatus = {
  configured: boolean;
  connected: boolean;
  migrated: boolean;
  serverVersion?: string;
  databaseSizeBytes?: number;
  databaseSizePretty?: string;
  error?: string;
};

function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PG_CONNECTION_STRING ||
    undefined
  );
}

function needsSsl(connStr: string): boolean {
  if (/sslmode=disable/i.test(connStr)) return false;
  if (/sslmode=require/i.test(connStr)) return true;
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(connStr);
  if (isLocal) return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Resolve the SSL config for the pool.
 *
 * Defaults to strict certificate validation (`rejectUnauthorized: true`) for
 * remote/prod connections — this is what every reputable managed Postgres
 * provider (Neon, Supabase, Render, RDS) supports out-of-the-box.
 *
 * Opt out **only** if you understand the risk by setting
 * `PG_SSL_INSECURE=true` (e.g. for a self-hosted DB with a self-signed cert).
 * In production we refuse to start with the insecure flag set.
 */
function resolveSsl(connStr: string): pg.PoolConfig["ssl"] {
  if (!needsSsl(connStr)) return undefined;
  const insecure = process.env.PG_SSL_INSECURE === "true";
  if (insecure) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "FATAL: PG_SSL_INSECURE=true is forbidden in production — TLS certificate validation must be enabled to prevent MITM. Remove the variable or set it to false.",
      );
      process.exit(1);
    }
    console.warn(
      "[db] WARNING: PG_SSL_INSECURE=true — TLS certificate validation is DISABLED. Use only for local/dev DBs with self-signed certs.",
    );
    return { rejectUnauthorized: false };
  }
  return { rejectUnauthorized: true };
}

export function isConfigured(): boolean {
  return !!getConnectionString();
}

export function getPool(): pg.Pool | null {
  if (pool) return pool;
  const connStr = getConnectionString();
  if (!connStr) return null;
  pool = new Pool({
    connectionString: connStr,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: resolveSsl(connStr),
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
  });
  return pool;
}

export async function migrate(): Promise<void> {
  if (migrated) return;
  if (migrationPromise) return migrationPromise;
  const p = getPool();
  if (!p) return;
  migrationPromise = (async () => {
    await p.query(`
      CREATE TABLE IF NOT EXISTS simulation_runs (
        id            BIGSERIAL PRIMARY KEY,
        started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at      TIMESTAMPTZ,
        final_step    INTEGER,
        final_health  REAL,
        agent_count   INTEGER,
        notes         JSONB
      );
    `);
    await p.query(`
      CREATE INDEX IF NOT EXISTS simulation_runs_started_at_idx
        ON simulation_runs (started_at DESC);
    `);
    await p.query(`
      CREATE TABLE IF NOT EXISTS research_logs (
        id        BIGSERIAL PRIMARY KEY,
        run_id    BIGINT REFERENCES simulation_runs(id) ON DELETE SET NULL,
        ts        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        severity  TEXT NOT NULL DEFAULT 'INFO',
        message   TEXT NOT NULL
      );
    `);
    await p.query(`
      CREATE INDEX IF NOT EXISTS research_logs_run_id_ts_idx
        ON research_logs (run_id, ts DESC);
    `);
    migrated = true;
  })();
  try {
    await migrationPromise;
  } finally {
    migrationPromise = null;
  }
}

export async function status(): Promise<DbStatus> {
  if (!isConfigured()) {
    return { configured: false, connected: false, migrated: false };
  }
  const p = getPool();
  if (!p) {
    return { configured: false, connected: false, migrated: false };
  }
  try {
    const v = await p.query<{ version: string }>("SELECT version()");
    let sizeBytes: number | undefined;
    let sizePretty: string | undefined;
    try {
      const s = await p.query<{ bytes: string; pretty: string }>(
        "SELECT pg_database_size(current_database())::text AS bytes, pg_size_pretty(pg_database_size(current_database())) AS pretty",
      );
      sizeBytes = Number(s.rows[0]?.bytes);
      sizePretty = s.rows[0]?.pretty;
    } catch {
      // pg_database_size requires connect privilege; ignore on hosted providers that block it.
    }
    return {
      configured: true,
      connected: true,
      migrated,
      serverVersion: v.rows[0]?.version,
      databaseSizeBytes: sizeBytes,
      databaseSizePretty: sizePretty,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      migrated: false,
      error: err?.message ?? String(err),
    };
  }
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  if (!p) throw new Error("Database not configured. Set DATABASE_URL.");
  if (!migrated) await migrate();
  return p.query<T>(text, params as any);
}

export async function shutdown(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
