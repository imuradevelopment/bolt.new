import { Router } from 'express';
import { chatRouter } from './features/endpoint/chat/routes';

export function buildRouter() {
  const router = Router();

  router.use('/chat', chatRouter());

  return router;
}


