import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
if (process.env.ALLOW_DATABASE_TEST !== '1' || !process.env.POSTGREST_URL || !process.env.POSTGREST_SERVICE_KEY) {
  throw new Error('Use um banco isolado com ALLOW_DATABASE_TEST=1, POSTGREST_URL e POSTGREST_SERVICE_KEY.');
}
process.env.VERCEL = '1';
const { default: db } = await import('../db.js');
const { default: app } = await import('../server.js');
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const email = `validation-${randomUUID()}@example.invalid`;
let userId;
try {
  for (const headers of [{}, { Authorization: 'Bearer invalid-token' }]) {
    const response = await fetch(`${process.env.POSTGREST_URL}/users?select=id`, { headers });
    assert.ok([401, 403].includes(response.status), 'REST deve rejeitar acesso sem JWT válido');
  }
  const request = (path, body, cookie) => fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const signup = await request('/auth/register', { name: 'Validação real', email, password: 'only-for-local-tests-123', community: 'heaven' });
  const signed = await signup.json();
  assert.equal(signup.status, 201, JSON.stringify(signed));
  userId = signed.user.id;
  let cookie = signup.headers.getSetCookie().find(c => c.startsWith('sid=')).split(';')[0];
  assert.equal((await (await request('/auth/me', null, cookie)).json()).user.email, email);
  const stored = await db.from('users').select('password_hash').eq('id', userId).single();
  assert.equal(stored.error, null);
  assert.ok(stored.data.password_hash && !stored.data.password_hash.includes('only-for-local-tests'));
  const letter = await request('/api/letters?community=heaven', { text: 'Mensagem de integração com banco real.' }, cookie);
  const created = await letter.json();
  assert.equal(letter.status, 201, JSON.stringify(created));
  const scoped = await db.from('letters').select('community').eq('id', created.letter.id).single();
  assert.equal(scoped.error, null);
  assert.equal(scoped.data.community, 'heaven');
  await request('/auth/logout', {}, cookie);
  assert.equal((await (await request('/auth/me', null, cookie)).json()).user, null);
  const login = await request('/auth/login', { email, password: 'only-for-local-tests-123' });
  assert.equal(login.status, 200, await login.clone().text());
  cookie = login.headers.getSetCookie().find(c => c.startsWith('sid=')).split(';')[0];
  assert.equal((await (await request('/auth/me', null, cookie)).json()).user.id, userId);
  console.log('Banco real: JWT obrigatório, cadastro, hash da senha, sessão, login, logout e cartinha com comunidade passaram.');
} finally {
  if (userId) {
    const result = await db.from('users').delete().eq('id', userId);
    assert.equal(result.error, null, 'Falha ao limpar usuário de teste');
  }
  await new Promise(resolve => server.close(resolve));
}
