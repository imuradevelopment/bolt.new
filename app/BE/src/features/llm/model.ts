import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { debugLog } from '../../shared/logger';

export type Provider = 'gemini' | 'azure-openai' | 'openai';

export function getLanguageModel(runtime?: { provider?: Provider; model?: string; extra?: Record<string, string> }): LanguageModelV1 {
  const provider = (runtime?.provider || process.env.LLM_PROVIDER || 'gemini') as Provider;

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing required env: GEMINI_API_KEY');
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    const modelEnv = runtime?.model || process.env.GEMINI_MODEL;
    if (!modelEnv) throw new Error('Missing required env: GEMINI_MODEL');
    const configuredModel = normalizeGeminiModelId(modelEnv);
    debugLog('LLM: provider setup', { provider, model: configuredModel });
    return google(configuredModel);
  }

  if (provider === 'openai' || provider === 'azure-openai') {
    const isAzure = provider === 'azure-openai';
    const apiKey = isAzure ? (process.env.AZURE_OPENAI_API_KEY || runtime?.extra?.AZURE_OPENAI_API_KEY) : process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error(isAzure ? 'Missing required env: AZURE_OPENAI_API_KEY' : 'Missing required env: OPENAI_API_KEY');
    const baseURL = isAzure ? (process.env.AZURE_OPENAI_ENDPOINT || runtime?.extra?.AZURE_OPENAI_ENDPOINT) : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
    const client = createOpenAI({ apiKey, baseURL });
    const model = runtime?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    debugLog('LLM: provider setup', { provider, model });
    return client(model);
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

function normalizeGeminiModelId(model: string): string {
  return model.startsWith('models/') ? model : `models/${model}`;
}


