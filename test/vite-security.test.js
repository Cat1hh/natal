import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { get } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requireClient = createRequire(new URL('../client/package.json', import.meta.url));
const { createServer } = await import(pathToFileURL(requireClient.resolve('vite')).href);
let server;
let origin;
let fixtureDir;
const privateMarker = 'fixture-privada-fora-do-projeto';

before(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), 'natal-vite-security-'));
  await writeFile(path.join(fixtureDir, 'private.map'), JSON.stringify({ version: 3, sourcesContent: [privateMarker] }));
  await writeFile(path.join(fixtureDir, '.env'), `PRIVATE_TEST=${privateMarker}`);
  server = await createServer({
    root: fileURLToPath(new URL('../client/', import.meta.url)),
    configFile: fileURLToPath(new URL('../client/vite.config.js', import.meta.url)),
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0, hmr: false },
  });
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
});

after(async () => {
  await server?.close();
  if (fixtureDir) await rm(fixtureDir, { recursive: true, force: true });
});

test('Vite serve o portal e o evento sem liberar CORS para origem externa', async () => {
  for (const [route, marker] of [['/', 'id="app"'], ['/comunidade/heaven/natal', '/src/main.jsx']]) {
    const res = await fetch(origin + route, { headers: { Origin: 'https://externo.invalid' } });
    assert.equal(res.status, 200);
    assert.ok((await res.text()).includes(marker));
    assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
    assert.notEqual(res.headers.get('access-control-allow-origin'), 'https://externo.invalid');
  }
});

test('middleware do portal respeita a validação de Host do Vite', async () => {
  const response = await new Promise((resolve, reject) => {
    get(origin + '/', { headers: { Host: 'externo.invalid' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    }).on('error', reject);
  });
  assert.equal(response.status, 403);
  assert.ok(!response.body.includes('id="app"'));
});

test('Vite não expõe source maps nem arquivos de ambiente fora da pasta permitida', async () => {
  for (const name of ['private.map', '.env']) {
    const res = await fetch(`${origin}/@fs${path.join(fixtureDir, name)}`);
    assert.equal(res.status, 403, name);
    assert.ok(!(await res.text()).includes(privateMarker));
  }
});
