import { createGoogleGenerativeAI } from '@ai-sdk/google';

export function getGeminiModel(apiKey: string, modelName?: string) {
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelName ?? 'gemini-2.5-pro');
}
