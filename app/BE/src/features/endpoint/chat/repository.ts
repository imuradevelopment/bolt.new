import { isPostgres } from '../../../shared/database';
import { getPgPool } from '../../../shared/database/postgres';

export interface ChatRecord {
  id: number;
  user_id: number | null;
  title: string | null;
  created_at: string;
  updated_at?: string;
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
  // touch chats.updated_at if column exists (best-effort)
  try {
    await pool.query('UPDATE chats SET title = title, created_at = created_at WHERE id = $1', [Number(chatId)]);
  } catch {}
  return Number(rows[0]?.id || 0);
}

export async function listChatsByUser(userId: number): Promise<ChatRecord[]> {
  const pool = getPgPool();
  const { rows } = await pool.query(
    'SELECT id, user_id, title, created_at FROM chats WHERE user_id = $1 ORDER BY id DESC',
    [userId]
  );
  return rows as ChatRecord[];
}

export async function getMessagesByChat(chatId: number, userId: number): Promise<MessageRecord[]> {
  const pool = getPgPool();
  const ok = await pool.query('SELECT 1 FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
  if (!ok.rows.length) return [];
  const { rows } = await pool.query(
    'SELECT id, chat_id, role, content, created_at FROM messages WHERE chat_id = $1 ORDER BY id ASC',
    [chatId]
  );
  return rows as MessageRecord[];
}


export async function renameChat(chatId: number, userId: number, title: string): Promise<boolean> {
  const pool = getPgPool();
  const result = await pool.query('UPDATE chats SET title = $1 WHERE id = $2 AND user_id = $3', [
    title,
    chatId,
    userId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteChat(chatId: number, userId: number): Promise<boolean> {
  const pool = getPgPool();
  const ok = await pool.query('SELECT 1 FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
  if (!ok.rows.length) return false;
  await pool.query('DELETE FROM messages WHERE chat_id = $1', [chatId]);
  const result = await pool.query('DELETE FROM chats WHERE id = $1', [chatId]);
  return (result.rowCount ?? 0) > 0;
}



