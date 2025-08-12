export function debugLog(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log('[CHAT]', ...args);
}

export function debugWarn(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn('[CHAT]', ...args);
}

export function debugError(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error('[CHAT]', ...args);
}


