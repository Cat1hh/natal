// Cliente da API do servidor. Erros chegam como Error com .message em português quando o servidor envia.
async function call(url, { method = 'GET', body } = {}) {
  const r = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw Object.assign(
      new Error(j.message || j.error || `Erro ${r.status}: acesso negado.`),
      { status: r.status, code: j.error }
    );
  }
  return j;
}

export const api = {
  me: () => call('/api/me'),
  event: () => call('/api/event'),
  ranking: () => call('/api/ranking'),
  prizes: () => call('/api/prizes'),
  letters: () => call('/api/letters?limit=60'),
  postLetter: (text, anonymous) => call('/api/letters', { method: 'POST', body: { text, anonymous } }),
  readLetter: (id) => call(`/api/letters/${id}/read`, { method: 'POST' }),
  complete: (day, proof) => call(`/api/missions/${day}/complete`, { method: 'POST', body: { proof } }),
  gallery: () => call('/api/gallery'),
  postGallery: ({ title, message, imageUrl }) =>
    call('/api/gallery', { method: 'POST', body: { title, message, imageUrl } }),
  reviewGallery: (id, status) =>
    call(`/api/gallery/${id}`, { method: 'PATCH', body: { status } }),
  logout: () => call('/auth/logout', { method: 'POST' }),
};