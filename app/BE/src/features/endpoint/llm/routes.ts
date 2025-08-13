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
          { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        ],
      },
      {
        id: 'azure-openai',
        name: 'Azure OpenAI',
        models: [
          (() => {
            const ep = process.env.AZURE_OPENAI_ENDPOINT || '';
            const { deployment } = parseAzureEndpoint(ep);
            const dep = deployment || process.env.AZURE_OPENAI_DEPLOYMENT || 'deployment';
            return { id: dep, label: `Azure deployment: ${dep}` };
          })() as any,
        ],
      },
    ];

    const defaults = {
      provider: process.env.LLM_PROVIDER || 'gemini',
      model:
        process.env.LLM_PROVIDER === 'azure-openai'
          ? (parseAzureEndpoint(process.env.AZURE_OPENAI_ENDPOINT || '').deployment || process.env.AZURE_OPENAI_DEPLOYMENT || 'deployment')
          : (process.env.GEMINI_MODEL || 'gemini-2.5-pro').replace(/^models\//, ''),
    };

    return res.json({ providers, defaults });
  });

  return router;
}

function parseAzureEndpoint(input: string): { resource: string; deployment: string } {
  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`);
    const resource = `${url.protocol}//${url.host}`;
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'deployments');
    const deployment = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : '';
    return { resource, deployment };
  } catch {
    return { resource: input.replace(/\/openai.*$/, ''), deployment: '' };
  }
}


