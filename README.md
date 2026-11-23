# Natal Mágico · Vulpora

Portal de comunidades e eventos de Natal com duas interfaces: o portal completo em HTML/JavaScript e o evento de Natal em React. A API Express usa Supabase ou PostgreSQL com PostgREST para autenticação e dados do evento. O servidor atende as comunidades Heaven e The Kingdom, calendário do Advento, missões, cartinhas, ranking e galeria moderada.

O GitHub Actions valida o código e a imagem Docker, fixa o commit aprovado em uma tag de deploy e solicita ao Dokploy a compilação desse código com o Dockerfile. O workflow acompanha a implantação até verificar a saúde do site.

## Requisitos

- Node.js 22.12 ou superior, preferindo o patch mais recente da versão 22, e npm para desenvolvimento e testes, seguindo a versão usada no CI e no Docker.
- PostgreSQL com PostgREST ou projeto Supabase com as tabelas utilizadas pelo backend. Para uploads de imagens, Supabase Storage com bucket público `gallery`.
- Docker para executar o container localmente.
- Para CI/CD: GitHub Actions habilitado, uma aplicação no Dokploy e acesso do servidor ao repositório Git público.

As migrações em `sql/` criam o banco do zero. O PostgreSQL dedicado já foi provisionado no Dokploy; veja [configuração e credenciais](deploy/README.md). O backend consulta `users`, `sessions`, `communities`, `community_memberships`, `completions`, `submissions`, `letters`, `letter_reads` e `gallery`. Configure um projeto compatível antes de validar login e gravações reais.

## Instalação

```sh
npm ci
npm --prefix client ci
cp env.example .env
```

Preencha `.env` a partir do exemplo. As variáveis do backend são lidas de `process.env` ou desse arquivo; no Dokploy, configure-as na aba **Environment** da aplicação.

| Variável | Configuração |
| --- | --- |
| `POSTGREST_URL`, `POSTGREST_SERVICE_KEY` | Acesso privado ao PostgreSQL do Dokploy; substitui Supabase para dados e sessões. |
| `SUPABASE_URL` | URL do Supabase; usada para dados quando PostgREST não estiver configurado e para Storage. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço usada pelo backend para Supabase/Storage. |
| `BASE_URL` | URL pública, sem barra final: `http://localhost:3000` localmente ou `https://seu-dominio.com` em produção. |
| `PORT` | Porta HTTP do Express; padrão `3000`. |
| `NODE_ENV` | `development` localmente e `production` no Dokploy. |
| `TRUST_PROXY` | `1` atrás do proxy do Dokploy; deixe vazio ao executar diretamente, sem proxy. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Opcionais; habilitam autenticação com Discord. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Opcionais; habilitam autenticação com Google. |
| `ADMIN_IDS` | IDs Discord dos administradores, separados por vírgula. |
| `ADMIN_EMAILS` | E-mails dos administradores, separados por vírgula. |
| `EVENT_START` | Início do evento; padrão `2026-12-01`, no fuso `America/Sao_Paulo`. |
| `DEBUG_DAY` | Força um dia de teste em desenvolvimento; ignorado em produção. |

Cadastre nos respectivos provedores OAuth as URLs `${BASE_URL}/auth/discord/callback` e `${BASE_URL}/auth/google/callback`, substituindo `${BASE_URL}` pelo endereço real. A chave de serviço Supabase e os secrets OAuth ficam no backend e não devem usar o prefixo `VITE_`.

Não defina `VERCEL` ou `CF_PAGES` no Dokploy: esses indicadores ativam o modo serverless e impedem que `server.js` abra a porta HTTP.

## Desenvolvimento

Em dois terminais:

```sh
npm run dev
```

```sh
npm --prefix client run dev
```

Abra a URL informada pelo Vite. O frontend encaminha `/api` e `/auth` ao backend na porta `3000`.

Para executar o frontend compilado junto com o Express:

```sh
npm run build
npm start
```

Abra `http://localhost:3000`.

| Rota | Conteúdo |
| --- | --- |
| `/` ou `/comunidade` | Portal e seleção de comunidade. |
| `/login` | Autenticação do portal. |
| `/comunidade/heaven` | Comunidade Heaven. |
| `/comunidade/thekingdom` | Comunidade The Kingdom. |
| `/comunidade/:slug/natal` | Evento de Natal da comunidade. |
| `/healthz` | Saúde HTTP do servidor: `{"ok":true}`. |

## Testes

```sh
npm test
npx playwright install chromium
npm run test:browser
```

`npm test` compila o evento React, copia os arquivos do portal e verifica as duas entradas HTML, assets, destinos OAuth, contexto da API, armazenamento inválido e o script de deploy com uma API Dokploy simulada. O teste de navegador cobre o portal completo em celular e desktop, login/cadastro, comunidades sem duplicação, navegação entre portal e evento, histórico, imagens dos calendários e a grade alternativa quando uma imagem falha. Também verifica bloqueio das portas futuras e preservação de dados quando um envio falha.

Para usar um Chrome já instalado:

```sh
CHROME_PATH=/caminho/do/chrome npm run test:browser
```

Os testes usam dados fictícios. Login real, banco e Storage precisam de validação adicional em um ambiente configurado. `/healthz` confirma que o servidor está respondendo; não verifica conexão com o Supabase.

Para liberar as missões e os controles de teste somente no Vite, defina `VITE_ADVENT_TEST_MODE=true` em `client/.env.local`. Esse modo permanece desabilitado no build de produção.

## Auditorias de segurança

```sh
npm run audit:deps
docker build --pull --no-cache-filter runtime --tag natal:security .
bash scripts/scan-image.sh natal:security
```

A auditoria npm inclui dependências de produção e desenvolvimento dos dois projetos. O script de imagem usa Trivy 0.76.2 com digest fixado e a base de vulnerabilidades atualizada. Verifica pacotes do sistema e bibliotecas da imagem final em todas as severidades, incluindo alertas sem correção disponível; não usa lista de exclusões nem `--ignore-unfixed`.

Verificação local em **22/11/2026**:

| Verificação | Antes | Após as correções |
| --- | --- | --- |
| `npm audit` do backend | 0 alertas | 0 alertas |
| `npm audit` do frontend | Vite 5.4.21 e esbuild 0.21.5 afetados | 0 alertas com Vite 8.3.8 |
| Trivy da imagem PostgreSQL dedicada | 72 ocorrências na imagem oficial atual analisada | 0 com bibliotecas atualizadas e su-exec |
| Trivy da imagem final | 267 ocorrências de vulnerabilidades em pacotes da base Debian e no npm incluído nela | 0 alertas em Alpine 3.24 atualizado, sem npm/Yarn no runtime |

As ocorrências do Trivy são registros por pacote, não necessariamente CVEs distintos. Os resultados cobrem os lockfiles e a imagem final analisados; o estado de uma implantação existente só muda após um novo deploy.

O CI bloqueia a publicação/deploy quando essas auditorias falham. O estágio `runtime` é reconstruído sem cache para buscar os patches do Alpine mesmo quando a tag da base não mudou. `.github/dependabot.yml` verifica semanalmente dependências npm, imagens Docker e GitHub Actions. Os testes de segurança do Vite confirmam bloqueio de Host externo, ausência de CORS aberto e proteção de arquivos fora da pasta permitida.

Avisos corrigidos incluem [CVE-2026-39365](https://github.com/advisories/GHSA-4w7w-66w2-5vf9), [CVE-2026-112942](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [CVE-2026-112945](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) e o [aviso do esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

## Docker

```sh
docker build --tag natal:local .
docker run --rm --name natal-local --env-file .env --env NODE_ENV=production --publish 3000:3000 natal:local
```

O Dockerfile usa estágios separados para compilar o frontend, instalar dependências de produção e montar a imagem final em Node 22 com Alpine 3.24. Os pacotes do Alpine são atualizados durante o build, e npm/Yarn são removidos da imagem final. O processo roda com o usuário `node`, escuta na porta `3000` e tem healthcheck em `/healthz`. `.dockerignore` exclui credenciais locais, dependências instaladas e os arquivos antigos em `data/` do contexto de build.

Os dados de autenticação e do evento ficam no PostgreSQL/PostgREST do Dokploy quando configurado, ou no Supabase; imagens enviadas pela API usam o Supabase Storage. O backend atual não usa os arquivos SQLite em `data/`, e o container não precisa de um volume para esses arquivos. As funções locais do portal usam o armazenamento do navegador, conforme descrito na seção de estrutura.

## CI/CD com Dokploy

O workflow `.github/workflows/ci-cd.yml` instala pelos lockfiles, audita npm e a imagem Docker, executa testes da API, do navegador, das migrações com PostgreSQL real e a validação do Worker. Pull requests executam somente essas verificações.

Após aprovação na `main`, o job cria a tag `dokploy-<SHA completo>` apontando para o commit validado e atualiza somente a referência Git da aplicação no Dokploy. O Dokploy compila o Dockerfile dessa tag e mantém o ambiente e o domínio existentes. Não é necessário configurar credenciais de um registry privado.

A aplicação **Natal · Aplicação** tem ID `MQdOmb9PN1EkT1tVKXoQc`, no projeto **Vulpora → production**. Usa Source Type **Git**, URL `https://github.com/Cat1hh/natal.git`, Build Type **Dockerfile**, contexto `.`, arquivo `Dockerfile`, porta interna `3000` e Auto Deploy desabilitado. O environment da aplicação guarda as credenciais do banco; elas não passam pelo GitHub.

Para habilitar os próximos deploys automáticos, um administrador do repositório precisa configurar estes secrets no environment `production` do GitHub. A chave ainda não foi enviada: a criação do environment retornou falta de permissão administrativa e a revisão automática bloqueou usar secrets no escopo mais amplo do repositório público. Sem a configuração, o CI executa normalmente e o job informa que o deploy automático está pendente:

| Secret | Valor |
| --- | --- |
| `DOKPLOY_URL` | URL do painel Dokploy. |
| `DOKPLOY_API_KEY` | Chave usada para consultar e atualizar a aplicação e suas implantações. |
| `DOKPLOY_APPLICATION_ID` | ID da aplicação acima. |

A variável `APP_URL` contém `https://vulpora.com.br`. O domínio usa Cloudflare na frente da aplicação e a conexão com o banco ocorre somente na rede interna do Dokploy.

Pushes na `main` e execuções manuais nessa branch fazem deploy após o CI passar. Outras branches e pull requests executam somente CI. A concorrência serializa as execuções da `main`; a verificação final espera a implantação correspondente e consulta `/healthz`. Falhas, cancelamentos, timeout e healthcheck indisponível fazem o job falhar.

O script `scripts/deploy-dokploy.mjs` também mantém suporte a aplicações Docker que recebem `DOCKER_IMAGE` por digest, mas o workflow deste projeto usa uma tag Git fixa. Os envios que alteram a aplicação não são repetidos automaticamente.

## Estrutura

```text
client/src/                  Evento React, navegação e componentes
client/public/vulpora.html   Entrada do portal completo
client/public/app.js         Código do portal (perfil, comunidades e gestão)
client/public/styles.css     Estilos compartilhados e do evento
client/public/global.css     Estilos do portal
client/public/assets/        Imagens, calendários e bundle legado
client/public/fonts/         Fontes locais
server.js                    API, autenticação, regras e rotas SPA
db.js                        Cliente Supabase do backend
env.example                  Exemplo de configuração
Dockerfile                   Imagem de produção para Dokploy
scripts/deploy-dokploy.mjs    Integração com a API e acompanhamento do deploy
test/                        Testes automatizados
.github/workflows/ci-cd.yml   Pipeline de CI/CD
wrangler.jsonc e worker.js   Entrada alternativa para Cloudflare Workers
```

Faça alterações no evento em `client/src/` e no portal em `client/public/app.js`, `vulpora.html` e nos estilos fornecidos. O build gera `public/` com as duas interfaces. O arquivo `client/public/assets/app.js` é um bundle antigo e não é a entrada do React atual; ele é diferente do `/app.js` usado pelo portal.

O portal navega por hashes, como `/#/portal/comunidades` e `/#/perfil`. As URLs diretas de login, perfil e comunidades abrem essa interface. O evento usa `/comunidade/:slug/natal#aba`; ao voltar à comunidade, o navegador abre o portal completo. Express, Vite e Worker selecionam a entrada pelo mesmo helper em `client/src/routes.js`.

Parte das funções sociais, personalização e telas de gestão do portal fornecido usa `localStorage`; essas alterações ficam no navegador. As operações já integradas à API, como autenticação e dados oficiais do evento React, usam o backend. O CI valida navegação e integrações simuladas, sem transformar as funções locais em persistência no servidor.

## Cloudflare Workers

A entrada alternativa usa `wrangler.jsonc`. Para verificar o pacote sem publicar:

```sh
npm run build
npx wrangler deploy --dry-run
```

O CI preserva essa validação. O deploy automatizado deste README tem como destino o Dokploy; ele não publica no Cloudflare nem na Vercel.

## Referências

- [Deploy em produção com Dokploy](https://docs.dokploy.com/docs/core/applications/going-production)
- [Automação pela API do Dokploy](https://docs.dokploy.com/docs/core/auto-deploy#api-method)
- [API de aplicações](https://docs.dokploy.com/docs/api/application) e [implantações](https://docs.dokploy.com/docs/api/deployment)
- [Publicação de imagens Docker no GitHub Actions](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
