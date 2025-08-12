import { Router, type Request, type Response } from 'express';

export function authRouter() {
  const router = Router();

  router.get('/whoami', (req: Request, res: Response) => {
    const usersConfigured = Boolean(process.env.BASIC_AUTH_USERS);
    const userId: number | null = (res.locals as any)?.userId ?? null;
    const username: string | null = (res.locals as any)?.username ?? null;

    if (usersConfigured && !userId) {
      const realm = process.env.BASIC_AUTH_REALM || 'Bolt API';
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ userId, username, authRequired: usersConfigured });
  });

  return router;
}


