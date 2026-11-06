/**
 * @file db.ts
 * @description PostgreSQL Database Connection Manager & Query Utility
 *
 * This module manages a PostgreSQL connection pool using `pg` (node-postgres).
 * It is designed for serverless environments (e.g., Vercel Functions), where database
 * connections need to be reused across warm lambda invocations rather than opening
 * a new connection on every incoming HTTP request.
 *
 * Compatible with:
 * - Google Cloud SQL (PostgreSQL)
 * - Supabase / Neon / Render PostgreSQL
 * - Local PostgreSQL instance
 */

import { Pool } from 'pg';

/**
 * Cached PostgreSQL connection pool singleton.
 * In a serverless environment, this variable persists in memory across warm function invocations.
 */

let pool: Pool | null = null;

/**
 * Returns an existing PostgreSQL connection pool or initializes a new one.
 *
 * Configuration Highlights:
 * - `max: 10`: Limits the pool to a maximum of 10 concurrent connections to avoid
 *   exhausting the database's max allowed client connections.
 * - `idleTimeoutMillis: 30000`: Closes idle clients after 30 seconds.
 * - `connectionTimeoutMillis: 10000`: Fails fast if a connection cannot be established within 10s.
 * - `ssl`: Configured dynamically with `rejectUnauthorized: false` for cloud environments (like Cloud SQL / Neon).
 *
 * @returns {Pool} The shared pg.Pool instance
 */

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.warn('DATABASE_URL environment variable is not defined. Using local fallback.');
    }

    // Determine whether SSL is required (production or explicitly specified in connection string)
    const isProduction =
      process.env.NODE_ENV === 'production' || connectionString?.includes('sslmode=require');

    pool = new Pool({
      connectionString:
        connectionString || 'postgresql://postgres:password@localhost:5432/charap_db',
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Listen for unexpected errors on idle clients to prevent uncaught exceptions crashing the process
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL Pool Error:', err);
    });
  }

  return pool;
}

/**
 * Executes a parameterized SQL query against the database pool and returns the result rows.
 *
 * Parameterized queries ($1, $2, etc.) protect against SQL injection vulnerabilities.
 *
 * @example
 * // Querying users by email
 * const users = await queryDb<User>('SELECT * FROM users WHERE email = $1', [email]);
 *
 * @template T - The expected return type for each row (defaults to `any`)
 * @param {string} text - The parameterized SQL query string
 * @param {any[]} [params] - Optional array of query parameter values
 * @returns {Promise<T[]>} Array of typed row objects matching the query
 */
export async function queryDb<T = any>(text: string, params?: any[]): Promise<T[]> {
  const dbPool = getDbPool();
  const result = await dbPool.query(text, params);
  return result.rows;
}
