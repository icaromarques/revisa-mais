/** Builds the WebSocket URL with a short-lived auth token. */
export function getWebSocketUrl(token: string): string {
  const env = (import.meta as { env?: Record<string, string> }).env;
  const explicit = env?.VITE_WS_URL;

  let base: string;
  if (explicit) {
    base = explicit.replace(/\/$/, '');
  } else {
    const apiUrl = env?.VITE_API_URL || 'http://localhost:4000/api';
    const httpBase = apiUrl.replace(/\/api\/?$/, '');
    const parsed = new URL(httpBase || 'http://localhost:4000');
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = '/ws';
    parsed.search = '';
    base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}token=${encodeURIComponent(token)}`;
}
