import './boot.js'; // PRECISA ser o primeiro import
import { handleAsNodeRequest } from 'cloudflare:node';

globalThis.__CLOUDFLARE_WORKER__ = true;

const PORT = 3000;
let expressReady;

function syncWorkerEnv(env) {
  if (!env || typeof env !== 'object') return;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string' && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadExpress() {
  expressReady ??= import('./server.js')
    .then(({ default: app }) => {
      app.listen(PORT);
    })
    .catch((error) => {
      expressReady = undefined;
      throw error;
    });
  return expressReady;
}

const isExpressPath = (p) => /^\/(api|auth)(\/|$)/i.test(p) || p === '/healthz';

function page(request, env, file) {
  const url = new URL(request.url);
  url.pathname = file;
  url.search = '';
  return env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }));
}

async function toExpress(request, env) {
  syncWorkerEnv(env);
  await loadExpress();
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
  return handleAsNodeRequest(PORT, new Request(request, { headers }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // www -> domínio principal (o servidor confere o Origin contra o BASE_URL)
    if (url.hostname === 'www.vulpora.com.br') {
      return Response.redirect(`https://vulpora.com.br${path}${url.search}`, 301);
    }

    // API, login e saúde -> Express
    if (isExpressPath(path)) return toExpress(request, env);

    // Slug legado: ducks -> heaven
    if (/^\/comunidade\/ducks(\/|$)/i.test(path)) {
      const fixed = path.replace(/^\/comunidade\/ducks/i, '/comunidade/heaven');
      return Response.redirect(`${url.origin}${fixed}${url.search}`, 302);
    }

    // Evento de Natal -> React (index.html)
    if (/^\/comunidade\/[^/]+\/natal(\/|$)/i.test(path)) {
      return page(request, env, '/index.html');
    }

    // Rotas do portal acessadas sem "#" -> /#/...
    if (/^\/(login|cadastro|comunidades|perfil(\/.*)?|usuario(\/.*)?|evento(\/.*)?|admin(\/.*)?|portal(\/.*)?|comunidade(\/.*)?)$/i.test(path)) {
      const target = path
        .replace(/^\/comunidades\/?$/i, '/portal/comunidades')
        .replace(/^\/comunidade\/([^/]+)\/?$/i, '/comunidade/$1/inicio');
      return Response.redirect(`${url.origin}/#${target}`, 302);
    }

    // "/" e o resto -> Portal Vulpora
    return page(request, env, '/vulpora.html');
  },
};