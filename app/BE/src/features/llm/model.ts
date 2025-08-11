import { google } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';

export type Provider = 'gemini';

export function getLanguageModel(): LanguageModelV1 {
  const provider = (process.env.LLM_PROVIDER || 'gemini') as Provider;
  if (provider !== 'gemini') {
    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    // Vercel AI SDK の google プロバイダは GOOGLE_GENERATIVE_AI_API_KEY を参照
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
  }

  const configuredModel = normalizeModelId(process.env.GEMINI_MODEL || 'gemini-2.5-pro');
  return google(configuredModel);
}

function normalizeModelId(model: string): string {
  return model.startsWith('models/') ? model : `models/${model}`;
}


