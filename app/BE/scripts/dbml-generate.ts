import fs from 'node:fs';
import path from 'node:path';

// Minimal DBML -> SQLite SQL generator for current schema
// This script is intentionally simple and tailored to db/datamase.dbml

function main() {
  const dbmlPath = path.resolve(process.cwd(), 'db', 'datamase.dbml');
  const outPath = path.resolve(process.cwd(), 'db', 'migrations', '000_init.sql');

  if (!fs.existsSync(dbmlPath)) {
    console.error(`DBML not found: ${dbmlPath}`);
    process.exit(1);
  }

  // Generate fixed SQL for current tables (users, chats, messages)
  const sql = `PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id)
);
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, sql);
  console.log(`Generated: ${outPath}`);
}

main();


