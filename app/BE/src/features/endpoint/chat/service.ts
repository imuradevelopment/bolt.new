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
            // タイトルが未設定なら最初のユーザー入力と最初の応答から生成
            try {
              let firstAssistant = text || '';
              // <chatTitle>...</chatTitle> を末尾から抽出（存在すればDB保存に使用し、本体からは除去済として扱う）
              const m = firstAssistant.match(/<chatTitle>([^<]{1,100})<\/chatTitle>\s*$/);
              let title: string | null = null;
              if (m) {
                title = m[1].trim();
                firstAssistant = firstAssistant.replace(/<chatTitle>[^<]*<\/chatTitle>\s*$/, '').trimEnd();
              }
              const firstUser = messages.find((mm) => mm.role === 'user')?.content || '';
              if (!title) {
                title = generateTitle(firstUser, firstAssistant);
              }
              await setTitleIfEmpty(effectiveChatId, title);
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

  // 初回メッセージ（チャットID新規のとき）はタイトル指示を埋め込む
  const includeTitleInstruction = !chatId;
  const initial = await streamText(messages, { includeTitleInstruction }, options);
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


