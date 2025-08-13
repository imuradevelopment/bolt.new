import { Router, type Request, type Response } from 'express';

export function llmRouter() {
  const router = Router();

  // GET /api/llm/models - available providers/models
  router.get('/models', (_req: Request, res: Response) => {
    const providers = [
      {
        id: 'gemini',
        name: 'Gemini',
        models: [
          { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
          { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
          { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
          { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        ],
      },
      {
        id: 'openai',
        name: 'OpenAI',
        models: [
          { id: 'gpt-4o', label: 'GPT-4o' },
          { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
        ],
      },
      {
        id: 'azure-openai',
        name: 'Azure OpenAI',
        models: [
          { id: 'deployment', label: 'Use Azure deployment (configured by endpoint)' },
        ],
      },
    ];

    const defaults = {
      provider: process.env.LLM_PROVIDER || 'gemini',
      model:
        process.env.LLM_PROVIDER === 'openai'
          ? process.env.OPENAI_MODEL || 'gpt-4o-mini'
          : process.env.LLM_PROVIDER === 'azure-openai'
          ? 'deployment'
          : (process.env.GEMINI_MODEL || 'gemini-2.5-pro').replace(/^models\//, ''),
    };

    return res.json({ providers, defaults });
  });

  return router;
}


