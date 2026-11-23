import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

// Fixtures sem acesso ao banco ou a provedores reais de autenticação.
process.env.VERCEL = '1';
process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder';
process.env.GOOGLE_CLIENT_ID = 'test-client';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
const { default: app } = await import('../server.js');
let server;
let origin;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server?.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('portal, login e comunidades servem a interface completa fornecida', async () => {
  for (const path of ['/', '/login', '/comunidade', '/comunidade/thekingdom', '/perfil']) {
    const res = await fetch(`${origin}${path}`, { redirect: 'manual' });
    assert.equal(res.status, 200, path);
    const html = await res.text();
    assert.match(html, /id="app"/);
    assert.match(html, /src="\/app.js"/);
    assert.doesNotMatch(html, /id="root"/);
  }
  for (const asset of ['/app.js', '/styles.css', '/global.css', '/assets/logo-vulpora.png', '/assets/calendario-natal-heaven.jpg', '/assets/calendario-natal.jpg']) {
    const res = await fetch(`${origin}${asset}`);
    assert.equal(res.status, 200, asset);
    assert.doesNotMatch(res.headers.get('content-type'), /text\/html/);
  }
});

test('eventos servem o React compilado com os assets disponíveis', async () => {
  for (const path of ['/comunidade/heaven/natal', '/comunidade/thekingdom/natal']) {
    const res = await fetch(`${origin}${path}`, { redirect: 'manual' });
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const html = await res.text();
    assert.match(html, /id="root"/);
    assert.doesNotMatch(html, /\/src\/main.jsx/);
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map((m) => m[1]);
    assert.ok(assets.length >= 2);
    for (const asset of assets) {
      const response = await fetch(`${origin}${asset}`);
      assert.equal(response.status, 200, asset);
      assert.doesNotMatch(response.headers.get('content-type'), /text\/html/);
    }
  }
});

test('arquivos ausentes retornam 404 em vez de HTML do app', async () => {
  const res = await fetch(`${origin}/assets/inexistente.js`);
  assert.equal(res.status, 404);
});

test('alias Ducks preserva parâmetros ao redirecionar para Heaven', async () => {
  const res = await fetch(`${origin}/comunidade/ducks/natal?origem=convite`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/comunidade/heaven/natal?origem=convite');
});

test('OAuth guarda o destino atual sem converter a comunidade em hash', async () => {
  for (const returnTo of ['/comunidade/heaven', '/#/comunidade/heaven/eventos']) {
    const res = await fetch(`${origin}/auth/google?returnTo=${encodeURIComponent(returnTo)}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    const cookie = res.headers.getSetCookie().find((value) => value.startsWith('oauth_return='));
    assert.equal(decodeURIComponent(cookie.split(';')[0].slice('oauth_return='.length)), '/comunidade/heaven');
  }
});

test('saúde e autenticação sem sessão respondem sem consultar o banco', async () => {
  assert.deepEqual(await (await fetch(`${origin}/healthz`)).json(), { ok: true });
  assert.deepEqual(await (await fetch(`${origin}/auth/me`)).json(), { user: null });
  assert.equal((await fetch(`${origin}/api/event`)).status, 401);
});
