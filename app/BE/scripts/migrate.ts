import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.SQLITE_PATH || path.resolve(process.cwd(), 'db', 'data.sqlite3');
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'db', 'migrations');

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  ensureDir(path.dirname(DB_PATH));
  ensureDir(MIGRATIONS_DIR);

  const db = new Database(DB_PATH);

  const migrations = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(
    'CREATE TABLE IF NOT EXISTS __migrations__ (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);',
  );

  const applied = new Set<string>(db.prepare('SELECT name FROM __migrations__').all().map((r: any) => r.name));

  for (const file of migrations) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO __migrations__ (name) VALUES (?)').run(file);
    // eslint-disable-next-line no-console
    console.log(`Applied migration: ${file}`);
  }

  db.close();
}

main();


