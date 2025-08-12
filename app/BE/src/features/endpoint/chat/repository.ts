import { getDb } from '../../../shared/database/sqlite';

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

export function createChatIfNotExists(chatId?: number | null): number {
  const db = getDb();
  if (chatId) {
    const row = db
      .prepare('SELECT 1 AS ok FROM chats WHERE id = ? LIMIT 1')
      .get(Number(chatId));
    if (row && row.ok === 1) return Number(chatId);
  }
  const info = db
    .prepare('INSERT INTO chats (user_id, title) VALUES (?, ?)')
    .run(null, null);
  return Number(info.lastInsertRowid || 0);
}

export function insertMessage(chatId: number, role: 'user' | 'assistant' | 'system', content: string): number {
  const db = getDb();
  const info = db
    .prepare('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)')
    .run(Number(chatId), role, content);
  return Number(info.lastInsertRowid || 0);
}


