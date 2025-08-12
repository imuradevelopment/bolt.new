import type { ChatBody } from './schema';
import { streamText, type StreamingOptions } from '../../llm/stream-text';
import SwitchableStream from '../../llm/switchable-stream';
import { CONTINUE_PROMPT } from '../../llm/prompts';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '../../llm/constants';
import { sseToPlainTextTransform } from '../../../shared/streaming/sseToPlainText';
import { createChatIfNotExists, insertMessage, setTitleIfEmpty } from './repository';

export async function chatService(body: ChatBody, chatId?: number | null, userId?: number | null) {
  const { messages } = body;

  const effectiveChatId = await createChatIfNotExists(userId ?? null, chatId);
  // 直近のユーザー入力を保存（最後の message を想定）
  const lastUser = messages[messages.length - 1];
  if (lastUser?.role === 'user') {
    await insertMessage(effectiveChatId, 'user', lastUser.content);
  }

  const stream = new SwitchableStream();

  const options: StreamingOptions = {
    toolChoice: 'none',
    onFinish: async ({ text, finishReason }) => {
      if (finishReason !== 'length') {
        try {
          if (text) {
            await insertMessage(effectiveChatId, 'assistant', text);
            // タイトルが未設定ならユーザー初回入力＋先頭応答からタイトル生成（簡易）
            try {
              if (messages.length >= 2) {
                const firstUser = messages.find((m) => m.role === 'user')?.content || '';
                const firstAssistant = text;
                const title = generateTitle(firstUser, firstAssistant);
                await setTitleIfEmpty(effectiveChatId, title);
              }
            } catch {}
          }
        } finally {
          return stream.close();
        }
      }

      if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
        throw new Error('Cannot continue message: Maximum segments reached');
      }

      const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
      // eslint-disable-next-line no-console
      console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

      messages.push({ role: 'assistant', content: text });
      await insertMessage(effectiveChatId, 'assistant', text);
      messages.push({ role: 'user', content: CONTINUE_PROMPT });

      const result = await streamText(messages, undefined, options);
      const transformed = result.toAIStream().pipeThrough(sseToPlainTextTransform());
      stream.switchSource(transformed);
    },
  };

  const initial = await streamText(messages, undefined, options);
  const transformed = initial.toAIStream().pipeThrough(sseToPlainTextTransform());
  stream.switchSource(transformed);

  return { readable: stream.readable, chatId: effectiveChatId } as const;
}

function generateTitle(user: string, assistant: string): string {
  const text = `${user} ${assistant}`.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  // 先頭50文字程度、句読点や改行で区切る
  const cut = text.split(/[。！？!?.\n]/)[0] || text;
  const trimmed = cut.slice(0, 50);
  return trimmed || 'New Chat';
}


