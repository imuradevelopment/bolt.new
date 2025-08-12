import corsLib from 'cors';

export function cors() {
  const origin = process.env.CORS_ORIGIN;
  if (!origin) throw new Error('Missing required env: CORS_ORIGIN');
  return corsLib({
    origin,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-Chat-Id', 'Authorization'],
    exposedHeaders: ['X-Chat-Id'],
  });
}


