import corsLib from 'cors';

export function cors() {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  return corsLib({
    origin,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });
}


