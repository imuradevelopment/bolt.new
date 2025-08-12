import { parseStreamPart } from 'ai';

export function sseToPlainTextTransform(): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let carry = '';
  let seenTitle = false;

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const combined = carry + text;
      const lines = combined.split('\n');

      // keep last partial line for next chunk
      carry = lines.pop() ?? '';

      let acc = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const part = parseStreamPart(trimmed);
          const value = typeof part.value === 'string' ? part.value : '';
          if (value) {
            // 出力の末尾に <chatTitle>...</chatTitle> が出てきたら、ユーザー表示からは除去する
            if (!seenTitle && /<chatTitle>[^<]*<\/chatTitle>\s*$/.test(value)) {
              const without = value.replace(/<chatTitle>[^<]*<\/chatTitle>\s*$/, '');
              acc += without;
              seenTitle = true;
            } else {
              acc += value;
            }
          }
        } catch (_e) {
          // ignore unparsable lines
        }
      }

      if (acc) controller.enqueue(encoder.encode(acc));
    },
  });
}


