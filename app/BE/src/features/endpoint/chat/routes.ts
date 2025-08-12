import { Router, type Request, type Response } from 'express';
import { chatBodySchema } from './schema';
import { chatService } from './service';
import {
  listChatsByUser,
  getMessagesByChat,
  renameChat,
  deleteChat,
  listPublicChats,
  getPublicMessagesByChat,
  renamePublicChat,
  deletePublicChat,
} from './repository';
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
      const userId: number | undefined = (res.locals as any)?.userId;

      const { readable, chatId: effectiveChatId } = await chatService(parse.data, chatId, userId);
      res.setHeader('X-Chat-Id', String(effectiveChatId));
      sendPlainStream(req, res, readable);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      res.status(500).end();
    }
  });

  // GET /api/chat/chats - list chats for current user (or public if auth disabled)
  router.get('/chats', async (_req: Request, res: Response) => {
    try {
      const userId: number | undefined = (res.locals as any)?.userId;
      let chats;
      if (userId) chats = await listChatsByUser(userId);
      else chats = await listPublicChats();
      return res.json({ chats });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return res.status(500).end();
    }
  });

  // GET /api/chat/:id/messages - list messages for a chat (owner or public)
  router.get('/:id/messages', async (req: Request, res: Response) => {
    try {
      const userId: number | undefined = (res.locals as any)?.userId;
      const chatId = Number(req.params.id);
      let messages;
      if (userId) messages = await getMessagesByChat(chatId, userId);
      else messages = await getPublicMessagesByChat(chatId);
      if (!messages.length) return res.status(404).json({ error: 'Not found' });
      return res.json({ messages });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return res.status(500).end();
    }
  });

  // PATCH /api/chat/:id - rename chat (owner or public)
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const userId: number | undefined = (res.locals as any)?.userId;
      const chatId = Number(req.params.id);
      const title = String((req.body?.title ?? '') as string);
      if (!title) return res.status(400).json({ error: 'title is required' });
      const ok = userId ? await renameChat(chatId, userId, title) : await renamePublicChat(chatId, title);
      if (!ok) return res.status(404).json({ error: 'Not found' });
      return res.json({ ok: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return res.status(500).end();
    }
  });

  // DELETE /api/chat/:id - delete chat and its messages (owner or public)
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const userId: number | undefined = (res.locals as any)?.userId;
      const chatId = Number(req.params.id);
      const ok = userId ? await deleteChat(chatId, userId) : await deletePublicChat(chatId);
      if (!ok) return res.status(404).json({ error: 'Not found' });
      return res.json({ ok: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return res.status(500).end();
    }
  });

  return router;
}


