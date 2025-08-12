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

export async function createChatIfNotExists(userId?: number | null, chatId?: number | null): Promise<number> {
  const pool = getPgPool();
  if (chatId) {
    const { rows } = await pool.query('SELECT id FROM chats WHERE id = $1 AND (user_id IS NULL OR user_id = $2) LIMIT 1', [
      Number(chatId),
      userId ?? null,
    ]);
    if (rows.length > 0) return Number(chatId);
  }
  const { rows } = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id', [userId ?? null, null]);
  return Number(rows[0]?.id || 0);
}

export async function insertMessage(chatId: number, role: 'user' | 'assistant' | 'system', content: string): Promise<number> {
  const pool = getPgPool();
  const { rows } = await pool.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id', [
    Number(chatId),
    role,
    content,
  ]);
  return Number(rows[0]?.id || 0);
}


