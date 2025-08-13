import { Router } from 'express';
import { chatRouter } from './features/endpoint/chat/routes';
import { authRouter, authJwtRouter } from './features/endpoint/auth/routes';
import { llmRouter } from './features/endpoint/llm/routes';

export function buildRouter() {
  const router = Router();

  router.use('/chat', chatRouter());
  router.use('/auth', authRouter());
  router.use('/auth', authJwtRouter());
  router.use('/llm', llmRouter());

  return router;
}


