import type { ChatBody } from './schema';
import { streamText, type StreamingOptions } from '../../llm/stream-text';
import SwitchableStream from '../../llm/switchable-stream';
import { CONTINUE_PROMPT } from '../../llm/prompts';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '../../llm/constants';
import { sseToPlainTextTransform } from '../../../shared/streaming/sseToPlainText';
import { createChatIfNotExists, insertMessage, ensureSchema } from './repository';

export async function chatService(body: ChatBody, chatId?: number | null) {
  const { messages } = body;

  // マイグレーション未適用環境でも動くよう暫定作成
  ensureSchema();
  const effectiveChatId = createChatIfNotExists(chatId);
  // 直近のユーザー入力を保存（最後の message を想定）
  const lastUser = messages[messages.length - 1];
  if (lastUser?.role === 'user') {
    insertMessage(effectiveChatId, 'user', lastUser.content);
  }

  const stream = new SwitchableStream();

  const options: StreamingOptions = {
    toolChoice: 'none',
    onFinish: async ({ text, finishReason }) => {
      if (finishReason !== 'length') {
        return stream.close();
      }

      if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
        throw new Error('Cannot continue message: Maximum segments reached');
      }

      const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
      // eslint-disable-next-line no-console
      console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

      messages.push({ role: 'assistant', content: text });
      insertMessage(effectiveChatId, 'assistant', text);
      messages.push({ role: 'user', content: CONTINUE_PROMPT });

      const result = await streamText(messages, undefined, options);
      stream.switchSource(result.toAIStream());
    },
  };

  const initial = await streamText(messages, undefined, options);
  const transformed = initial.toAIStream().pipeThrough(sseToPlainTextTransform());
  stream.switchSource(transformed);

  return { readable: stream.readable, chatId: effectiveChatId } as const;
}


