import type { NextFunction, Request, Response } from 'express';
import { getPgPool } from '../database/postgres';

function parseUsersEnv(envValue: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!envValue) return map;
  for (const pair of envValue.split(',').map((s) => s.trim()).filter(Boolean)) {
    const idx = pair.indexOf(':');
    if (idx <= 0) continue;
    const username = pair.slice(0, idx).trim();
    const password = pair.slice(idx + 1).trim();
    if (!username || !password) continue;
    map.set(username, password);
  }
  return map;
}

async function getOrCreateUserIdByName(username: string): Promise<number> {
  const pool = getPgPool();
  // Try find
  const found = await pool.query('SELECT id FROM users WHERE name = $1 LIMIT 1', [username]);
  if (found.rows[0]?.id) return Number(found.rows[0].id);
  // Create
  const inserted = await pool.query('INSERT INTO users (name) VALUES ($1) RETURNING id', [username]);
  return Number(inserted.rows[0]?.id || 0);
}

export function basicAuth() {
  const realm = process.env.BASIC_AUTH_REALM || 'Bolt API';
  const users = parseUsersEnv(process.env.BASIC_AUTH_USERS);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Basic 認証は廃止。常にスキップ。
    return next();
  };
}


