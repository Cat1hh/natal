import './boot.js'; // PRECISA ser o primeiro import
import { handleAsNodeRequest } from 'cloudflare:node';

const PORT = 3000;
let expressReady;

// O server.js cria coisas que o Workers só permite DENTRO de uma requisição (timers do express-rate-limit,
// valores aleatórios, chamadas de rede). Por isso ele é carregado na primeira requisição, e não ao iniciar.
// O server.js não chama listen no modo serverless, então registramos o Express aqui.
function loadExpress() {
  expressReady ??= import('./server.js')
    .then(({ default: app }) => {
      app.listen(PORT);
    })
    .catch((error) => {
      expressReady = undefined; // tenta de novo na próxima requisição
      throw error;
    });
  return expressReady;
}

const isExpressPath = (p) => /^\/(api|auth)(\/|$)/i.test(p) || p === '/healthz';

// Entrega um HTML da pasta public/ (assets).
function page(request, env, file) {
  const url = new URL(request.url);
  url.pathname = file;
  url.search = '';
  return env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }));
}

// Repassa a requisição ao Express. O Worker não manda IP nem protocolo no formato que o Express espera,
// então copiamos do cabeçalho da Cloudflare (sem isso, o rate limit enxerga todo mundo como o mesmo IP).
async function toExpress(request) {
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

    // API, login e saúde -> Express
    if (isExpressPath(path)) return toExpress(request);

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
    if (/^\/(login|cadastro|comunidades|perfil|portal(\/.*)?|comunidade(\/.*)?)$/i.test(path)) {
      const target = path
        .replace(/^\/comunidades\/?$/i, '/portal/comunidades')
        .replace(/^\/comunidade\/([^/]+)\/?$/i, '/comunidade/$1/eventos');
      return Response.redirect(`${url.origin}/#${target}`, 302);
    }

    // "/" e o resto -> Portal Vulpora
    return page(request, env, '/vulpora.html');
  },
};