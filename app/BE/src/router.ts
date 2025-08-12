import { Router } from 'express';
import { chatRouter } from './features/endpoint/chat/routes';
import { authRouter } from './features/endpoint/auth/routes';

export function buildRouter() {
  const router = Router();

  router.use('/chat', chatRouter());
  router.use('/auth', authRouter());

  return router;
}


