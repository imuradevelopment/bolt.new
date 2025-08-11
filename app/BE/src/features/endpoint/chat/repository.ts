import { getDb } from '../../../shared/database/sqlite';

export interface ChatRecord { id: number; user_id: number | null; title: string | null; created_at: string }
export interface MessageRecord { id: number; chat_id: number; role: 'user' | 'assistant' | 'system'; content: string; created_at: string }

export function ensureSchema() {
  const db = getDb();
  db.exec(`
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
  `);
}

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


