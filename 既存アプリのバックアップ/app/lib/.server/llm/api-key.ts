import { env } from 'node:process';

export function getAPIKey(cloudflareEnv: Env) {
  // Cloudflare Pages/Workers 本番・プレビューでは `cloudflareEnv`、
  // ローカル開発では `process.env` を優先的に参照
  return env.GEMINI_API_KEY || cloudflareEnv.GEMINI_API_KEY;
}
