import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deployToDokploy } from '../scripts/deploy-dokploy.mjs';

const env = {
  DOKPLOY_URL: 'https://dokploy.example.com/',
  DOKPLOY_API_KEY: 'test-key-never-log',
  DOKPLOY_APPLICATION_ID: 'natal-id',
  DOCKER_IMAGE: `ghcr.io/cat1hh/natal@sha256:${'a'.repeat(64)}`,
  DEPLOYMENT_TITLE: 'GitHub test-sha · run-1',
  APP_URL: 'https://natal.example.com',
};

function harness({ status = 'done', sourceType = 'docker', autoDeploy = false, pending = false, health = true, failure } = {}) {
  const calls = [];
  const logs = [];
  let polls = 0;
  return {
    calls,
    logs,
    options: {
      attempts: 3,
      interval: 0,
      sleep: async () => {},
      log: (value) => logs.push(value),
      fetchImpl: async (url, opts = {}) => {
        const path = new URL(url).pathname;
        calls.push({ path, ...opts, body: opts.body ? JSON.parse(opts.body) : undefined });
        if (failure === path) return Response.json({ error: env.DOKPLOY_API_KEY }, { status: 403 });
        if (path === '/healthz') return Response.json({ ok: health }, { status: health ? 200 : 503 });
        if (path === '/api/application.one') {
          return Response.json({ applicationId: env.DOKPLOY_APPLICATION_ID, sourceType, autoDeploy, customGitUrl: 'https://github.com/Cat1hh/natal.git' });
        }
        if (path === '/api/application.update') return Response.json(true);
        // O agendamento pode responder com 200 e corpo vazio.
        if (path === '/api/application.deploy') return new Response(null);
        if (path === '/api/deployment.all') {
          polls++;
          return Response.json([
            { applicationId: env.DOKPLOY_APPLICATION_ID, title: 'implantação anterior', status: 'done' },
            ...(pending && polls === 1 ? [] : [{ applicationId: env.DOKPLOY_APPLICATION_ID, title: env.DEPLOYMENT_TITLE, status, deploymentId: 'deploy-id' }]),
          ]);
        }
        throw new Error(`Chamada inesperada: ${path}`);
      },
    },
  };
}

test('deploy espera a execução atual e verifica saúde sem enviar a chave ao site', async () => {
  const h = harness({ pending: true });
  const result = await deployToDokploy(env, h.options);
  assert.equal(result.deploymentId, 'deploy-id');
  assert.equal(h.calls.filter((c) => c.path === '/api/deployment.all').length, 2);
  const writes = h.calls.filter((c) => c.method === 'POST');
  assert.deepEqual(writes[0].body, { applicationId: env.DOKPLOY_APPLICATION_ID, dockerImage: env.DOCKER_IMAGE });
  assert.equal(writes[1].path, '/api/application.deploy');
  assert.equal(h.calls.find((c) => c.path === '/healthz').headers, undefined);
  assert.ok(!h.logs.join('\n').includes(env.DOKPLOY_API_KEY));
});

test('deploy recusa configuração incompleta antes de acessar a rede', async () => {
  for (const key of Object.keys(env)) {
    const h = harness();
    await assert.rejects(deployToDokploy({ ...env, [key]: '' }, h.options), new RegExp(key));
    assert.equal(h.calls.length, 0);
  }
  const h = harness();
  await assert.rejects(deployToDokploy({ ...env, DOCKER_IMAGE: 'ghcr.io/cat1hh/natal:latest' }, h.options), /digest sha256/);
  assert.equal(h.calls.length, 0);
});

test('deploy Git usa a tag validada e recusa outro repositório ou referência mutável', async () => {
  const gitEnv = { ...env, DOCKER_IMAGE: '', GIT_REF: `dokploy-${'b'.repeat(40)}`, GIT_REPOSITORY: 'https://github.com/Cat1hh/natal.git' };
  const h = harness({ sourceType: 'git' });
  await deployToDokploy(gitEnv, h.options);
  assert.deepEqual(h.calls.find(c => c.path === '/api/application.update').body, { applicationId: env.DOKPLOY_APPLICATION_ID, customGitBranch: gitEnv.GIT_REF });
  for (const fields of [{ GIT_REF: 'main' }, { GIT_REPOSITORY: 'https://github.com/other/repository.git' }, { DOCKER_IMAGE: env.DOCKER_IMAGE }]) {
    const rejected = harness({ sourceType: 'git' });
    await assert.rejects(deployToDokploy({ ...gitEnv, ...fields }, rejected.options), /GIT_REF|GIT_REPOSITORY/);
    assert.equal(rejected.calls.some(c => c.method === 'POST'), false);
  }
});

test('deploy preserva aplicações com outro provider e exige controle único do pipeline', async () => {
  for (const config of [{ sourceType: 'github' }, { autoDeploy: true }]) {
    const h = harness(config);
    await assert.rejects(deployToDokploy(env, h.options), /Source Type Docker|Desative Auto Deploy/);
    assert.equal(h.calls.filter((c) => c.method === 'POST').length, 0);
  }
});

test('falha HTTP interrompe o deploy sem exibir a resposta que pode conter segredos', async () => {
  const h = harness({ failure: '/api/application.update' });
  await assert.rejects(deployToDokploy(env, h.options), (error) => {
    assert.match(error.message, /HTTP 403/);
    assert.ok(!error.message.includes(env.DOKPLOY_API_KEY));
    return true;
  });
  assert.equal(h.calls.some((c) => c.path === '/api/application.deploy'), false);
});

test('agendamento aceito não esconde falhas, cancelamentos ou timeout', async () => {
  for (const status of ['error', 'cancelled', 'running']) {
    const h = harness({ status });
    await assert.rejects(deployToDokploy(env, h.options), /error|cancelled|Tempo limite/);
    assert.equal(h.calls.some((c) => c.path === '/healthz'), false);
  }
});

test('implantação concluída com aplicação indisponível falha na verificação final', async () => {
  const h = harness({ health: false });
  await assert.rejects(deployToDokploy(env, h.options), /healthz não ficou saudável/);
});
