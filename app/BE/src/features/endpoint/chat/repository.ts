import { getDb } from '../../../shared/database/sqlite';
import { isPostgres } from '../../../shared/database';
import { getPgPool } from '../../../shared/database/postgres';

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

export async function createChatIfNotExists(chatId?: number | null): Promise<number> {
  if (isPostgres()) {
    const pool = getPgPool();
    if (chatId) {
      const { rows } = await pool.query('SELECT 1 AS ok FROM chats WHERE id = $1 LIMIT 1', [Number(chatId)]);
      if (rows.length > 0) return Number(chatId);
    }
    const { rows } = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id', [null, null]);
    return Number(rows[0]?.id || 0);
  }
  const db = getDb();
  if (chatId) {
    const row = db.prepare('SELECT 1 AS ok FROM chats WHERE id = ? LIMIT 1').get(Number(chatId));
    if (row && row.ok === 1) return Number(chatId);
  }
  const info = db.prepare('INSERT INTO chats (user_id, title) VALUES (?, ?)').run(null, null);
  return Number(info.lastInsertRowid || 0);
}

export async function insertMessage(chatId: number, role: 'user' | 'assistant' | 'system', content: string): Promise<number> {
  if (isPostgres()) {
    const pool = getPgPool();
    const { rows } = await pool.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id', [
      Number(chatId),
      role,
      content,
    ]);
    return Number(rows[0]?.id || 0);
  }
  const db = getDb();
  const info = db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)').run(Number(chatId), role, content);
  return Number(info.lastInsertRowid || 0);
}


