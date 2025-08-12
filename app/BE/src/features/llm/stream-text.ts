import type { CoreMessage, LanguageModelV1 } from 'ai';
import { streamText as aiStreamText } from 'ai';
import { getLanguageModel } from './model';
import { MAX_TOKENS, TEMPERATURE, TOP_P, TOP_K } from './constants';

export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface StreamingOptions {
  toolChoice?: 'none';
  onFinish?: (args: { text: string; finishReason?: string }) => Promise<void> | void;
}

export interface StreamTextResult {
  toAIStream(): ReadableStream<Uint8Array>;
}

export async function streamText(messages: Message[], _env: unknown, options?: StreamingOptions): Promise<StreamTextResult> {
  const model: LanguageModelV1 = getLanguageModel();

  // Vercel AI SDK に合わせる
  const vercelMessages: CoreMessage[] = messages.map((m) => ({ role: m.role as any, content: m.content }));

  const result = await aiStreamText({
    model,
    messages: vercelMessages,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    ...(TOP_P !== undefined ? { topP: TOP_P } : {}),
    ...(TOP_K !== undefined ? { topK: TOP_K } : {}),
    onFinish: async (event) => {
      await options?.onFinish?.({ text: event.text, finishReason: event.finishReason });
    },
  });

  return {
    toAIStream() {
      return result.toAIStream();
    },
  };
}


