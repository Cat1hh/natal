import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
process.env.VERCEL = '1';
process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder';
const { default: app } = await import('../server.js');
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage();
  const artifactDir = process.env.BROWSER_ARTIFACT_DIR;
  if (artifactDir) await mkdir(artifactDir, { recursive: true });
  const screenshot = async (name) => {
    if (artifactDir) await page.screenshot({ path: path.join(artifactDir, name), fullPage: true, animations: 'disabled' });
  };
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const communities = ['thekingdom', 'heaven'].map(slug => ({ slug, name: slug === 'heaven' ? 'Heaven' : 'The Kingdom', tag: slug === 'heaven' ? 'HEAVEN' : 'THE KINGDOM', theme: slug === 'heaven' ? 'ducks' : 'kingdom', events: [{ id: slug === 'heaven' ? 'natal-2026-heaven' : 'natal-2026', title: 'Natal Mágico 2026', status: 'live', date: '01 Dez – 25 Dez' }] }));
  let authenticated = false;
  let missionsOpen = false;
  await page.route('**/auth/me', route => route.fulfill({ json: { user: authenticated ? { id: 'test', name: 'Teste', role: 'USER' } : null } }));
  await page.route('**/auth/login', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const community = communities.find(c => c.slug === url.searchParams.get('community')) || communities[0];
    if (/^\/api\/missions\//.test(url.pathname) || (url.pathname === '/api/letters' && route.request().method() === 'POST')) {
      return route.fulfill({ status: 503, json: { message: 'Envio indisponível. Tente novamente.' } });
    }
    const responses = {
      '/api/communities/public': communities.map(c => ({
        id: c.slug, name: c.name, status: 'ativa', visibility: 'publica', entry: 'livre', members: 3,
        theme: { primary: '#102939', secondary: '#20495c', accent: '#8febed', hero: `Bem-vindo à ${c.name}`, subtitle: 'Eventos e comunidade', symbol: '✧' },
        modules: ['Próximos eventos'],
        events: c.events.map(e => ({ ...e, name: e.title, communityId: c.slug, status: 'publicado', date: '2026-12-01T00:00', games: [], prizes: [] })),
      })),
      '/api/me': { user: authenticated ? { id: 'test', name: 'Teste', isAdmin: true } : null, community, communities, missionsDone: 0, points: 0 },
      '/api/event': { status: missionsOpen ? 'live' : 'before', today: missionsOpen ? 1 : 0, start: '2026-12-01', missions: Array.from({ length: 25 }, (_, i) => ({ day: i+1, status: missionsOpen && i === 0 ? 'open' : 'locked' })) },
      '/api/ranking': { ranking: [], me: null },
      '/api/prizes': { prizes: [], milestones: [] },
      '/api/letters': { letters: [] },
      '/api/gallery': { items: [] },
    };
    await route.fulfill({ json: responses[url.pathname] || { ok: true } });
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin);
    await page.getByRole('heading', { name: /Cada comunidade merece/ }).waitFor();
    assert.equal(await page.locator('.community-directory-card').count(), 2, 'aliases não devem duplicar comunidades');
    await screenshot(`portal-${width}.png`);
    await page.goto(origin + '/login');
    await page.getByRole('heading', { name: 'Seu perfil está visível' }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'login overflow');
    await screenshot(`login-${width}.png`);
    await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
    await page.getByRole('heading', { name: 'Criar conta' }).waitFor();
  }
  await page.goto(origin + '/login');
  await page.locator('#form-auth input[name=email]').fill('teste@example.com');
  await page.locator('#form-auth input[name=password]').fill('senha-de-teste');
  await page.locator('#form-auth button[type=submit]').click();
  await page.locator('#auth-error').getByText('Resposta inválida do servidor. Tente novamente.').waitFor();
  authenticated = true;
  await page.goto(origin + '/#/portal/comunidades');
  await page.reload();
  await page.getByRole('heading', { name: 'Comunidades', exact: true }).waitFor();
  assert.equal(await page.locator('.community-directory-card').count(), 2);
  await page.locator('.community-directory-card').filter({ has: page.getByRole('heading', { name: 'Heaven', exact: true }) }).getByRole('link', { name: /Entrar/ }).click();
  await page.getByRole('heading', { name: 'Bem-vindo à Heaven', exact: true }).waitFor();
  await page.locator('a[href="#/evento/natal-2026-heaven/inicio"]').first().click();
  await page.getByRole('heading', { name: 'Calendário do Advento · Heaven' }).waitFor();
  await page.locator('.side-nav').getByRole('link', { name: 'Calendário do Advento', exact: true }).click();
  await page.locator('.adv-spot').first().waitFor();
  await page.waitForFunction(() => document.querySelector('.advent-bg-img')?.naturalWidth > 0);
  assert.equal(await page.locator('.adv-spot:disabled').count(), 25, 'production must keep future doors locked');
  assert.equal(await page.getByText('Modo Teste', { exact: false }).count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'event desktop overflow');
  await screenshot('calendar-1440.png');
  await page.getByRole('button', { name: 'Voltar para Heaven' }).click();
  await page.getByRole('heading', { name: 'Bem-vindo à Heaven', exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '#/comunidade/heaven/inicio');
  await page.goBack();
  await page.locator('.adv-spot').first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'event mobile overflow');
  await screenshot('calendar-390.png');
  await page.route('**/assets/calendario-natal-heaven.jpg', route => route.abort());
  await page.reload();
  await page.locator('.advent-image-stage.is-fallback').waitFor();
  assert.equal(await page.locator('.adv-spot').count(), 25);
  await page.unroute('**/assets/calendario-natal-heaven.jpg');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.advent-bg-img')?.naturalWidth > 0);
  for (const tab of ['arvore', 'galeria', 'ranking', 'regras', 'suporte', 'perfil']) {
    await page.goto(origin + '/comunidade/heaven/natal#' + tab);
    await page.locator('.main-area main').waitFor();
    await page.waitForFunction(() => !document.body.innerText.includes('Carregando evento'));
    assert.equal(await page.getByText('Não foi possível carregar esta aba').count(), 0, tab);
  }

  // Falha remota deve manter a missão aberta e permitir nova tentativa.
  missionsOpen = true;
  await page.goto(origin + '/comunidade/heaven/natal#calendario');
  await page.reload();
  await page.locator('.adv-spot').first().click();
  await page.getByRole('textbox', { name: 'Link da publicação' }).fill('https://example.com/prova-natal');
  await page.getByRole('button', { name: 'Enviar para revisão' }).click();
  await page.getByRole('dialog').getByText('Envio indisponível. Tente novamente.').waitFor();
  assert.equal(await page.locator('.adv-spot.is-done, .adv-spot.is-pending').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('vulpora:natal2026:v1:heaven')), null);
  await page.keyboard.press('Escape');

  // Uma cartinha recusada pela API deve conservar o texto e o rascunho.
  await page.locator('.side-nav').getByRole('link', { name: 'Árvore', exact: true }).click();
  await page.getByRole('button', { name: 'Escrever enfeite rápido' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Feliz Natal para toda a comunidade!');
  await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
  await page.getByRole('alert').getByText('Envio indisponível. Tente novamente.').waitFor();
  assert.equal(await page.getByRole('dialog').getByRole('textbox').inputValue(), 'Feliz Natal para toda a comunidade!');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('natal:letter-draft')), 'Feliz Natal para toda a comunidade!');
  assert.deepEqual(errors, []);
  console.log('Chrome: portal completo, login/cadastro em 390 e 1440 px, comunidades sem duplicação, ida/volta do evento React, imagens e fallback, histórico e recuperação de falhas verificados.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
