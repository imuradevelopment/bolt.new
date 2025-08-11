import { execFileSync } from 'node:child_process';
import path from 'node:path';

export interface ChatRecord {
  id: number;
  user_id: number | null;
  title: string | null;
  created_at: string;
}

export interface MessageRecord {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

function dbPath(): string {
  return path.resolve(process.cwd(), 'db', path.basename(process.env.SQLITE_PATH || 'data.sqlite3'));
}

function runSql(sql: string): string {
  const out = execFileSync('sqlite3', [dbPath(), sql], { encoding: 'utf8' });
  return out.trim();
}

function escape(value: string): string {
  return value.replace(/'/g, "''");
}

export function createChatIfNotExists(chatId?: number | null): number {
  if (chatId) {
    const exists = runSql(`SELECT 1 FROM chats WHERE id = ${Number(chatId)} LIMIT 1;`);
    if (exists === '1') return Number(chatId);
  }
  runSql(`INSERT INTO chats (title) VALUES (NULL);`);
  const id = runSql('SELECT last_insert_rowid();');
  return Number(id || 0);
}

export function insertMessage(
  chatId: number,
  role: 'user' | 'assistant' | 'system',
  content: string,
): number {
  runSql(
    `INSERT INTO messages (chat_id, role, content) VALUES (${Number(chatId)}, '${escape(role)}', '${escape(content)}');`,
  );
  const id = runSql('SELECT last_insert_rowid();');
  return Number(id || 0);
}


