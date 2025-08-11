import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

// Lazy-load better-sqlite3 to avoid startup failure on environments
// where native bindings are not prebuilt. Callers may catch errors
// from getDb() and fallback as needed.
let dbInstance: any = null;

export function getDb(): any {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.SQLITE_PATH || path.resolve(process.cwd(), 'db', 'data.sqlite3');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3');
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
}


