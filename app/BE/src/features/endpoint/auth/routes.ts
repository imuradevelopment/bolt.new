import { Router, type Request, type Response } from 'express';
import { getPgPool } from '../../../shared/database/postgres';
import crypto from 'node:crypto';
import { createJwt, verifyJwt } from '../../../shared/auth/jwt';

export function authRouter() {
  const router = Router();

  router.get('/whoami', (req: Request, res: Response) => {
    const userId: number | null = (res.locals as any)?.userId ?? null;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ userId });
  });

  return router;
}

// Helper: password hashing (PBKDF2)
function hashPassword(password: string, salt?: string) {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, usedSalt, 200000, 32, 'sha256').toString('hex');
  return { salt: usedSalt, hash };
}

export function authJwtRouter() {
  const router = Router();
  const pool = getPgPool();

  // POST /api/auth/register { name, password }
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const name = String(req.body?.name || '').trim();
      const password = String(req.body?.password || '');
      if (!name || !password) return res.status(400).json({ error: 'name and password are required' });

      const { salt, hash } = hashPassword(password);
      const passwordHash = `pbkdf2$${salt}$${hash}`;
      // 既存ユーザーのパスワードは上書きせず、409 を返す
      const inserted = await pool.query(
        'INSERT INTO users (name, password_hash) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
        [name, passwordHash]
      );
      if (!inserted.rows[0]?.id) {
        return res.status(409).json({ error: 'USER_EXISTS' });
      }
      const userId = Number(inserted.rows[0]?.id);
      return res.json({ userId });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).end();
    }
  });

  // POST /api/auth/login { name, password } -> { token }
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const name = String(req.body?.name || '').trim();
      const password = String(req.body?.password || '');
      if (!name || !password) return res.status(400).json({ error: 'name and password are required' });
      const user = await pool.query('SELECT id, password_hash FROM users WHERE name = $1 LIMIT 1', [name]);
      const record = user.rows[0];
      if (!record?.password_hash) return res.status(401).json({ error: 'invalid credentials' });
      const [method, salt, hash] = String(record.password_hash).split('$');
      if (method !== 'pbkdf2') return res.status(401).json({ error: 'invalid credentials' });
      const verify = hashPassword(password, salt);
      if (verify.hash !== hash) return res.status(401).json({ error: 'invalid credentials' });

      const token = createJwt({ sub: String(record.id) });
      return res.json({ token });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return res.status(500).end();
    }
  });

  // GET /api/auth/profile (JWT required)
  router.get('/profile', (req: Request, res: Response) => {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    const payload = verifyJwt(token || '');
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ userId: Number(payload.sub) || null });
  });

  return router;
}


