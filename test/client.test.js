import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { api, getRouteContext } from '../client/src/api.js';
import { getFrontendEntry, normalizeAppPath } from '../client/src/routes.js';
import { loadAdventState, submitAdventMission } from '../client/src/features/events/natal/adventScoring.js';

const restoreGlobals = [];
function replaceGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  restoreGlobals.push(() => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  });
}
afterEach(() => {
  mock.restoreAll();
  while (restoreGlobals.length) restoreGlobals.pop()();
});

test('links antigos mantêm comunidade, aba e parâmetros ao abrir o app', () => {
  const links = [
    ['/#/comunidade/ducks/eventos', '/comunidade/heaven'],
    ['/#/portal/comunidades', '/comunidade'],
    ['/comunidade/ducks/natal?returnTo=x#calendario', '/comunidade/heaven/natal?returnTo=x#calendario'],
    ['/comunidade/thekingdom/inicio', '/comunidade/thekingdom'],
    ['/?erro=google#/login', '/login?erro=google'],
  ];
  for (const [input, expected] of links) {
    assert.equal(normalizeAppPath(input), expected);
  }
  assert.equal(getRouteContext(normalizeAppPath(links[0][0])).communitySlug, 'heaven');
  assert.equal(getRouteContext('/comunidade/heaven/natal/').isEvent, true);
  assert.equal(getRouteContext('/comunidade/heaven').isCommunity, true);
  assert.equal(getRouteContext('/comunidade').isPortal, true);
});

test('destino de retorno recusa URLs externas e caminhos ambíguos', () => {
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/#//example.com', '/\n/example.com', null]) {
    assert.equal(normalizeAppPath(path), '/comunidade');
  }
});

test('portal completo e evento React mantêm entradas independentes', () => {
  for (const path of ['/', '/login', '/comunidade', '/comunidade/heaven', '/perfil', '/gerenciar/heaven']) {
    assert.equal(getFrontendEntry(path), 'vulpora.html', path);
  }
  assert.equal(getFrontendEntry('/comunidade/heaven/natal'), 'index.html');
  assert.equal(getFrontendEntry('/comunidade/thekingdom/natal/'), 'index.html');
  assert.equal(getFrontendEntry('/comunidade/heaven/natal-outro'), 'vulpora.html');
  assert.equal(normalizeAppPath('/comunidade/the-kingdom/natal'), '/comunidade/thekingdom/natal');
  assert.equal(normalizeAppPath('/comunidade/heavem/natal'), '/comunidade/heaven/natal');
});

test('API mantém o contexto da comunidade em URLs com e sem parâmetros', async () => {
  replaceGlobal('window', { location: { pathname: '/comunidade/heaven/natal' } });
  const calls = [];
  mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ letters: [] });
  });
  await api.letters(12);
  await api.postLetter('Feliz Natal!', true);
  assert.equal(calls[0].url, '/api/letters?limit=12&community=heaven');
  assert.equal(calls[1].url, '/api/letters?community=heaven');
  assert.equal(calls[1].options.headers['X-Community'], 'heaven');
  assert.equal(calls[1].options.credentials, 'include');
  assert.deepEqual(JSON.parse(calls[1].options.body), { text: 'Feliz Natal!', anonymous: true });
});

test('API informa erros HTTP e não aceita HTML como resposta válida', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Sessão expirada' }, { status: 401 }));
  await assert.rejects(api.me(), /Sessão expirada/);
  mock.restoreAll();
  mock.method(globalThis, 'fetch', async () => new Response('<html>Erro do proxy</html>'));
  await assert.rejects(api.me(), /Resposta inválida/);
});

test('armazenamento inválido não quebra o progresso das missões', () => {
  let stored;
  replaceGlobal('localStorage', { getItem: () => stored, setItem() {} });
  for (const raw of ['null', '[]', '{"points":2}', '{"points":-1,"missions":{}}', '{"points":0,"missions":[]}', 'inválido']) {
    stored = raw;
    const state = loadAdventState();
    assert.deepEqual(state.missions, {});
    assert.equal(state.points, 0);
    assert.doesNotThrow(() => submitAdventMission(2, 'RENO'));
  }
});
