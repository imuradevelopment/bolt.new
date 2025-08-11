import type { Response } from 'express';

export function sendPlainStream(res: Response, stream: ReadableStream<Uint8Array>) {
  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  // Flush headers early to ensure chunked transfer starts
  // @ts-ignore
  if (typeof (res as any).flushHeaders === 'function') {
    // @ts-ignore
    (res as any).flushHeaders();
  }

  const reader = stream.getReader();

  const write = async () => {
    const { done, value } = await reader.read();
    if (done) {
      res.end();
      return;
    }
    if (value) {
      res.write(Buffer.from(value));
    }
    write();
  };

  write().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    try {
      res.end();
    } catch {}
  });
}


