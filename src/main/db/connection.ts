import Database from 'better-sqlite3';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';

import * as schema from './schema';

export type DB = ReturnType<typeof openDatabase>;

/**
 * Either the top-level DB or a transaction. Service helpers that may be
 * called both standalone and inside `db.transaction(...)` use this — drizzle
 * exposes the same surface on both but the TS types diverge ($client).
 */
export type DBLike =
  | DB
  | SQLiteTransaction<
      'sync',
      Database.RunResult,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;

export interface OpenDatabaseOptions {
  /** Filesystem path or `:memory:`. */
  path: string;
  /** Set to true in tests to skip PRAGMAs that depend on a real file. */
  inMemory?: boolean;
}

export function openDatabase({ path, inMemory = false }: OpenDatabaseOptions) {
  const sqlite = new Database(path);
  sqlite.pragma('foreign_keys = ON');
  if (!inMemory) {
    sqlite.pragma('journal_mode = WAL');
  }
  return drizzle(sqlite, { schema });
}

export { schema };
