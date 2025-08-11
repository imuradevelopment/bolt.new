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

      const readable = await chatService(parse.data);
      sendPlainStream(res, readable);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      res.status(500).end();
    }
  });

  return router;
}


