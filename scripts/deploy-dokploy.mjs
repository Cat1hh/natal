import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

// API oficial: https://docs.dokploy.com/docs/core/auto-deploy#api-method
export async function deployToDokploy(env = process.env, {
  fetchImpl = fetch,
  sleep = delay,
  log = console.log,
  attempts = 90,
  interval = 10000,
} = {}) {
  for (const key of ['DOKPLOY_URL', 'DOKPLOY_API_KEY', 'DOKPLOY_APPLICATION_ID', 'DEPLOYMENT_TITLE', 'APP_URL']) {
    if (!env[key]?.trim()) throw new Error(`Configure ${key} no environment production do GitHub.`);
  }
  const base = new URL(env.DOKPLOY_URL);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('DOKPLOY_URL deve ser a URL HTTP(S) do painel, sem credenciais ou parâmetros.');
  }
  const git = Boolean(env.GIT_REF);
  if (!git && !env.DOCKER_IMAGE) throw new Error('Configure DOCKER_IMAGE ou GIT_REF para selecionar o código do deploy.');
  if (git && env.DOCKER_IMAGE) throw new Error('Configure somente GIT_REF ou DOCKER_IMAGE.');
  if (git && (!/^dokploy-[a-f0-9]{40}$/.test(env.GIT_REF) || !/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\.git$/.test(env.GIT_REPOSITORY || ''))) {
    throw new Error('GIT_REF deve ser uma tag dokploy-<SHA completo> e GIT_REPOSITORY deve ser a URL HTTPS do repositório GitHub.');
  }
  if (!git && !/^[a-z0-9][a-z0-9./_-]*@sha256:[a-f0-9]{64}$/.test(env.DOCKER_IMAGE)) {
    throw new Error('DOCKER_IMAGE deve apontar para uma imagem com digest sha256.');
  }
  const healthUrl = new URL('/healthz', env.APP_URL);
  if (!['http:', 'https:'].includes(healthUrl.protocol) || healthUrl.username || healthUrl.password) {
    throw new Error('APP_URL deve ser a URL HTTP(S) pública da aplicação.');
  }
  const applicationId = env.DOKPLOY_APPLICATION_ID;
  const title = env.DEPLOYMENT_TITLE;

  async function api(endpoint, body) {
    const url = new URL(`${base.href.replace(/\/+$/, '')}/api/${endpoint}`);
    if (!body) url.searchParams.set('applicationId', applicationId);
    const res = await fetchImpl(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-api-key': env.DOKPLOY_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Dokploy ${endpoint}: HTTP ${res.status}. Consulte as permissões do token e os logs no painel.`);
    // application.deploy pode responder sem corpo; leituras precisam retornar JSON.
    const text = await res.text();
    if (!text.trim() && body) return null;
    try {
      const data = JSON.parse(text);
      if (data?.error || data === false) throw new Error();
      return data;
    } catch {
      throw new Error(`Dokploy ${endpoint}: resposta inválida da API.`);
    }
  }

  const application = await api('application.one');
  if (application?.applicationId !== applicationId || application.sourceType !== (git ? 'git' : 'docker')) {
    throw new Error(`A aplicação indicada precisa existir e usar Source Type ${git ? 'Git' : 'Docker'} no Dokploy.`);
  }
  if (git && application.customGitUrl?.toLowerCase() !== env.GIT_REPOSITORY.toLowerCase()) throw new Error('GIT_REPOSITORY não corresponde ao repositório da aplicação.');
  if (application.autoDeploy) {
    throw new Error('Desative Auto Deploy no Dokploy para que somente este workflow controle as implantações.');
  }
  // Altera somente a referência de código; ambiente e domínio permanecem no Dokploy.
  await api('application.update', { applicationId, ...(git ? { customGitBranch: env.GIT_REF } : { dockerImage: env.DOCKER_IMAGE }) });
  await api('application.deploy', { applicationId, title, description: git ? `Código: ${env.GIT_REF}` : `Imagem: ${env.DOCKER_IMAGE}` });
  log('Implantação solicitada. Aguardando o resultado no Dokploy…');

  let deployment;
  for (let i = 0; i < attempts; i++) {
    const deployments = await api('deployment.all');
    if (!Array.isArray(deployments)) throw new Error('Dokploy deployment.all: lista de implantações inválida.');
    deployment = deployments.find((item) => item.title === title && item.applicationId === applicationId);
    if (deployment?.status === 'done') break;
    if (['error', 'cancelled'].includes(deployment?.status)) {
      throw new Error(`Implantação ${deployment.status} no Dokploy. Consulte os logs dessa implantação no painel.`);
    }
    if (i < attempts - 1) await sleep(interval);
  }
  if (deployment?.status !== 'done') throw new Error('Tempo limite aguardando a implantação no Dokploy. Verifique a fila e os logs antes de tentar novamente.');

  // Um 200 na API do Dokploy só confirma o agendamento; agora confere a aplicação pública.
  for (let i = 0; i < 18; i++) {
    try {
      const response = await fetchImpl(healthUrl, { signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (response.ok && (await response.json()).ok === true) {
        log('Dokploy concluiu a implantação e /healthz respondeu com sucesso.');
        return { deploymentId: deployment.deploymentId, image: env.DOCKER_IMAGE };
      }
    } catch {
      // O proxy pode levar alguns segundos para encaminhar ao novo container.
    }
    if (i < 17) await sleep(interval);
  }
  throw new Error('A implantação terminou, mas /healthz não ficou saudável. Verifique domínio, porta 3000 e variáveis no Dokploy.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deployToDokploy().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
