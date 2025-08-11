import { Router, type Request, type Response } from 'express';
import { chatBodySchema } from './schema';
import { chatService } from './service';
import { sendPlainStream } from '../../../shared/streaming/sendPlainStream';

export function chatRouter() {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const parse = chatBodySchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ error: 'Invalid body' });
      }

      const chatIdParam = req.header('x-chat-id');
      const chatId = chatIdParam ? Number(chatIdParam) : undefined;

      const { readable, chatId: effectiveChatId } = await chatService(parse.data, chatId);
      res.setHeader('X-Chat-Id', String(effectiveChatId));
      sendPlainStream(res, readable);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      res.status(500).end();
    }
  });

  return router;
}


