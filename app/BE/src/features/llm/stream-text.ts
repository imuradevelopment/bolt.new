import type { CoreMessage, LanguageModelV1 } from 'ai';
import { streamText as aiStreamText } from 'ai';
import { getLanguageModel } from './model';
import { MAX_TOKENS, TEMPERATURE, TOP_P, TOP_K } from './constants';
import { TITLE_INSTRUCTION } from './prompts';
import { debugLog } from '../../shared/logger';
import { buildMessages, type ChatMessage } from './build-messages';

export type Role = 'system' | 'user' | 'assistant';

export type Message = ChatMessage;

export interface StreamingOptions {
  toolChoice?: 'none';
  onFinish?: (args: { text: string; finishReason?: string }) => Promise<void> | void;
  abortSignal?: AbortSignal;
}

export interface StreamTextResult {
  toAIStream(): ReadableStream<Uint8Array>;
}

export async function streamText(
  messages: Message[],
  env: { includeTitleInstruction?: boolean; provider?: 'gemini' | 'azure-openai' | 'openai'; model?: string; extra?: Record<string, string> } | undefined,
  options?: StreamingOptions
): Promise<StreamTextResult> {
  const model: LanguageModelV1 = getLanguageModel({ provider: env?.provider as any, model: env?.model, extra: env?.extra });

  // Vercel AI SDK に合わせる
  const addTitle = Boolean(env?.includeTitleInstruction);
  const base: CoreMessage[] = buildMessages(messages, {});
  const vercelMessages: CoreMessage[] = addTitle
    ? ([{ role: 'system' as any, content: TITLE_INSTRUCTION }, ...base])
    : base;

  debugLog('LLM: request', {
    model: env?.provider || 'gemini',
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    topP: TOP_P,
    topK: TOP_K,
    includeTitleInstruction: Boolean(env?.includeTitleInstruction),
    messagesCount: vercelMessages.length,
  });

  const result = await aiStreamText({
    model,
    messages: vercelMessages,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    ...(TOP_P !== undefined ? { topP: TOP_P } : {}),
    ...(TOP_K !== undefined ? { topK: TOP_K } : {}),
    ...(options?.abortSignal ? { abortSignal: options.abortSignal } : {}),
    onFinish: async (event: { text: string; finishReason?: string }) => {
      debugLog('LLM: onFinish', { finishReason: event.finishReason, textLength: (event.text || '').length });
      await options?.onFinish?.({ text: event.text, finishReason: event.finishReason });
    },
  });

  return {
    toAIStream() {
      debugLog('LLM: response stream ready');
      return result.toAIStream();
    },
  };
}


