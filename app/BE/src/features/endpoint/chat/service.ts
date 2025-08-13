import type { ChatBody } from './schema';
import { streamText, type StreamingOptions } from '../../llm/stream-text';
import SwitchableStream from '../../llm/switchable-stream';
import { CONTINUE_PROMPT } from '../../llm/prompts';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '../../llm/constants';
import { sseToPlainTextTransform } from '../../../shared/streaming/sseToPlainText';
import { createChatIfNotExists, insertMessage, setTitleIfEmpty, getMessagesByChat } from './repository';
import { debugLog, debugError } from '../../../shared/logger';

export async function chatService(
  body: ChatBody,
  chatId?: number | null,
  userId?: number | null,
  abortSignal?: AbortSignal,
  provider?: 'gemini' | 'azure-openai' | 'openai',
  model?: string
) {
  const clientMessages = body.messages;

  debugLog('chatService: begin', { userId, chatId, messagesCount: clientMessages.length });
  const effectiveChatId = await createChatIfNotExists(userId ?? null, chatId);
  debugLog('chatService: effectiveChatId', { effectiveChatId });
  // 直近のユーザー入力のみを受け入れる（その他は信用しない）
  const lastUser = clientMessages[clientMessages.length - 1];
  if (!lastUser || lastUser.role !== 'user') {
    const err = new Error('Invalid body: last message must be user');
    (err as any).code = 'INVALID_LAST_MESSAGE';
    throw err;
  }
  try {
    await insertMessage(effectiveChatId, 'user', lastUser.content);
    debugLog('chatService: user message saved', { effectiveChatId, length: lastUser.content.length });
  } catch (e) {
    debugError('chatService: failed to save user message', e);
  }

  // DB の権威履歴を復元（今回保存した user を含む）
  let messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  const rows = await getMessagesByChat(effectiveChatId, Number(userId));
  messages = rows.map((r) => ({ role: r.role, content: r.content })) as typeof messages;
  debugLog('chatService: authoritative messages loaded', { effectiveChatId, messagesCount: messages.length });

  // 簡易プリトリム
  // 全履歴投げを基本とし、文脈超過の恐れがある場合のみ
  // 最古の user→assistant ペアから段階的に間引く安全ネット。
  // 将来の「短期記憶/要約/RAG」は buildMessages 側に差し込み、
  // ここは最終防衛ラインとして維持する。
  messages = trimHistoryForBudget(messages, MAX_TOKENS * 4);
  debugLog('chatService: messages after pre-trim', { effectiveChatId, messagesCount: messages.length });

  const stream = new SwitchableStream();

  const stringToStream = (text: string): ReadableStream<Uint8Array> => {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  };

  const shouldAutoCloseOnDone = MAX_RESPONSE_SEGMENTS === 0;

  const options: StreamingOptions = {
    toolChoice: 'none',
    abortSignal,
    onFinish: async ({ text, finishReason }) => {
      debugLog('chatService.onFinish', {
        effectiveChatId,
        textLength: (text || '').length,
        finishReason,
      });
      if (finishReason !== 'length') {
        let closedBySwitch = false;
        try {
          // 応答テキストが空でも、タイトルはユーザー入力から生成して保存する
          let assistantText = text || '';
          // タイトル生成・保存
          try {
            // <chatTitle>...</chatTitle> を末尾から抽出（存在すればDB保存に使用し、本体からは除去済として扱う）
            const m = assistantText.match(/<chatTitle>([^<]{1,100})<\/chatTitle>\s*$/);
            let title: string | null = null;
            if (m) {
              title = m[1].trim();
              assistantText = assistantText.replace(/<chatTitle>[^<]*<\/chatTitle>\s*$/, '').trimEnd();
              debugLog('chatService: chatTitle tag detected', { title });
            }
            const firstUser = messages.find((mm: { role: 'user' | 'assistant' | 'system'; content: string }) => mm.role === 'user')?.content || '';
            if (!title) {
              title = generateTitle(firstUser, assistantText);
              debugLog('chatService: chatTitle generated', { title });
            }
            await setTitleIfEmpty(effectiveChatId, title);
            debugLog('chatService: title saved (if empty)', { effectiveChatId, title });
          } catch {}

          // タイトル除去後の本文を保存
          if (assistantText) {
            try {
              await insertMessage(effectiveChatId, 'assistant', assistantText);
              debugLog('chatService: assistant message saved', { effectiveChatId, length: assistantText.length });
            } catch (e) {
              debugError('chatService: failed to save assistant message', e);
            }
          }

          // 空応答だった場合はフォールバックの短いメッセージをクライアントへ出力
          if (!assistantText) {
            const fallback = 'すみません、応答を生成できませんでした。もう一度試してください。';
            try {
              await insertMessage(effectiveChatId, 'assistant', fallback);
            } catch {}
            const fallbackStream = stringToStream(fallback);
            stream.switchSource(fallbackStream, { closeOnDone: true });
            closedBySwitch = true;
            return; // close は switch 後に自動
          }
        } finally {
          debugLog('chatService: closing stream');
          // フォールバックで closeOnDone を使った場合はここで閉じない
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          if (typeof closedBySwitch === 'boolean' && !closedBySwitch && !shouldAutoCloseOnDone) {
            return stream.close();
          }
          return;
        }
      }

      if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
        debugLog('chatService: max response segments reached, closing stream');
        stream.close();
        return;
      }

      const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
      // eslint-disable-next-line no-console
      console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

      messages.push({ role: 'assistant', content: text });
      await insertMessage(effectiveChatId, 'assistant', text);
      messages.push({ role: 'user', content: CONTINUE_PROMPT });

      const result = await streamText(messages, { provider, model }, options);
      const transformed = result.toAIStream().pipeThrough(sseToPlainTextTransform());
      stream.switchSource(transformed);
    },
  };

  // 初回メッセージ（チャットID新規のとき）はタイトル指示を埋め込む
  const includeTitleInstruction = !chatId;
  debugLog('chatService: calling streamText (initial)', {
    includeTitleInstruction,
    messagesCount: messages.length,
  });
  const initial = await streamText(messages, { includeTitleInstruction, provider, model }, options);
  const transformed = initial.toAIStream().pipeThrough(sseToPlainTextTransform());
  // 既定では継続生成を許可していないため、上流が完了したら自動で閉じる。
  // 継続を許可（MAX_RESPONSE_SEGMENTS > 0）する場合のみ、自動クローズを抑止。
  stream.switchSource(transformed, { closeOnDone: shouldAutoCloseOnDone });
  debugLog('chatService: initial stream switched');

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

function trimHistoryForBudget(
  original: { role: 'system' | 'user' | 'assistant'; content: string }[],
  charBudget: number
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages = [...original];
  const estimateChars = () => messages.reduce((s, m) => s + (m.content?.length || 0), 0);
  const within = () => estimateChars() <= charBudget || messages.length <= 2;
  // 末尾のユーザ入力は必ず保持する
  const lastUserIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) if (messages[i].role === 'user') return i;
    return -1;
  })();
  if (lastUserIndex < 0) return messages;
  while (!within()) {
    // 最古の user を探して、その user と直後の assistant（あれば）を落とす
    let dropUser = -1;
    for (let i = 0; i < messages.length; i += 1) {
      if (messages[i].role !== 'user') continue;
      if (i === lastUserIndex) break; // 最終 user は保持
      dropUser = i;
      break;
    }
    if (dropUser === -1) break;
    const toRemove: number[] = [dropUser];
    if (messages[dropUser + 1]?.role === 'assistant') toRemove.push(dropUser + 1);
    // 実際に削除（後ろから）
    toRemove.sort((a, b) => b - a).forEach((idx) => messages.splice(idx, 1));
  }
  return messages;
}


