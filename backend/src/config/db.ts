import { Pool } from 'pg';
import { config } from './config';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.db.url || undefined,
      host: config.db.url ? undefined : config.db.host,
      port: config.db.url ? undefined : config.db.port,
      database: config.db.url ? undefined : config.db.name,
      user: config.db.url ? undefined : config.db.user,
      password: config.db.url ? undefined : config.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err);
    });
  }
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
