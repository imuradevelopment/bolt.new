import { google } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';
import { debugLog } from '../../shared/logger';

export type Provider = 'gemini';

export function getLanguageModel(): LanguageModelV1 {
  const provider = (process.env.LLM_PROVIDER ?? 'gemini') as Provider;
  if (provider !== 'gemini') {
    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing required env: GEMINI_API_KEY');
  // Vercel AI SDK の google プロバイダは GOOGLE_GENERATIVE_AI_API_KEY を参照
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;

  const modelEnv = process.env.GEMINI_MODEL;
  if (!modelEnv) throw new Error('Missing required env: GEMINI_MODEL');
  const configuredModel = normalizeModelId(modelEnv);
  debugLog('LLM: provider setup', { provider, model: configuredModel });
  return google(configuredModel);
}

function normalizeModelId(model: string): string {
  return model.startsWith('models/') ? model : `models/${model}`;
}


