import Database, { type Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let dbInstance: BetterSqlite3Database | null = null;

export function getDb(): BetterSqlite3Database {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.SQLITE_PATH || path.resolve(process.cwd(), 'db', 'data.sqlite3');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
}


