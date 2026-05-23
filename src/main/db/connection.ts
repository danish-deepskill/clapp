import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

export type DB = ReturnType<typeof openDatabase>;

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
