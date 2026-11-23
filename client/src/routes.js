const ROUTE_ORIGIN = 'https://vulpora.invalid';

// Mantém links antigos funcionando sem misturar as abas do evento com a rota da comunidade.
export function normalizeAppPath(raw, fallback = '/comunidade') {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || /^\/[\/\\]/.test(value) || /[\\\r\n\t]/.test(value)) return fallback;

  const url = new URL(value, ROUTE_ORIGIN);
  if (url.pathname === '/' && url.hash.startsWith('#/')) {
    const legacy = new URL(url.hash.slice(1), ROUTE_ORIGIN);
    if (legacy.origin !== ROUTE_ORIGIN) return fallback;
    legacy.search ||= url.search;
    return normalizeAppPath(`${legacy.pathname}${legacy.search}${legacy.hash}`, fallback);
  }

  url.pathname = url.pathname
    .replace(/^\/comunidade\/(?:ducks|heavem)(?=\/|$)/i, '/comunidade/heaven')
    .replace(/^\/comunidade\/(?:the-kingdom|kingdom)(?=\/|$)/i, '/comunidade/thekingdom')
    .replace(/^\/(?:portal\/)?comunidades\/?$/i, '/comunidade')
    .replace(/^(\/comunidade\/[^/]+)\/(?:inicio|eventos)\/?$/i, '$1');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getFrontendEntry(pathname) {
  return /^\/comunidade\/[^/]+\/natal(?:\/|$)/i.test(pathname)
    ? 'index.html'
    : 'vulpora.html';
}
