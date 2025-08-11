import { getDb } from '../../../shared/database/sqlite';

export interface ChatRecord { id: number; user_id: number | null; title: string | null; created_at: string }
export interface MessageRecord { id: number; chat_id: number; role: 'user' | 'assistant' | 'system'; content: string; created_at: string }

export function ensureSchema() {}

export function createChatIfNotExists(chatId?: number | null): number {
  const db = getDb();
  if (chatId && db.prepare('SELECT 1 FROM chats WHERE id = ?').get(chatId)) return chatId;
  const info = db.prepare('INSERT INTO chats (title) VALUES (NULL)').run();
  return Number(info.lastInsertRowid);
}

export function insertMessage(chatId: number, role: 'user' | 'assistant' | 'system', content: string): number {
  const db = getDb();
  const info = db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)').run(chatId, role, content);
  return Number(info.lastInsertRowid);
}


