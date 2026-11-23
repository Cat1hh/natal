# Banco Natal no Dokploy

Provisionado pelo MCP em 22/11/2026, no projeto **Vulpora → production**:

| Recurso | Identificador |
| --- | --- |
| Compose do banco | `NrcLa22JXEuZXMlrewBBQ` |
| Host interno | `vulpora-natal-postgres` |
| Banco / proprietário | `vulpora_natal` / `vulpora_owner` |
| Volume persistente | `vulpora-natal-db-jraeq2-data` |
| Serviço PostgreSQL | `database` no Compose **Natal · Banco de dados** |
| API interna | `http://vulpora-natal-rest:3000` |

PostgreSQL 17.12 foi confirmado nos logs. Porta 5432 sem publicação externa, limite de memória de 512 MiB e healthcheck `pg_isready`. O backend anterior da Vulpora foi preservado. O PostgreSQL é executado no Compose com imagem própria, construída a partir de `deploy/Postgres.Dockerfile`: bibliotecas Alpine atualizadas e substituição do gosu por su-exec. A imagem corrigida passou no Trivy com zero CVEs detectados em todas as severidades; a imagem oficial analisada tinha 72 ocorrências.

As credenciais estão no Environment do Compose e, localmente, em `.env.dokploy-db` com permissão `0600`. O arquivo é ignorado pelo Git. Não copie essas credenciais para variáveis `VITE_`, arquivos públicos ou commits.

## Conectar esta aplicação

Na aplicação Natal do Dokploy, na mesma rede `dokploy-network`, configure `POSTGREST_URL` e `POSTGREST_SERVICE_KEY` com os valores do arquivo privado. O backend passa a usar o PostgreSQL para dados, login e sessões, conservando as consultas existentes. Não basta definir `DATABASE_URL`: o cliente atual utiliza o protocolo PostgREST.

A aplicação **Natal · Aplicação** (`MQdOmb9PN1EkT1tVKXoQc`) foi criada no mesmo projeto e configurada com essas duas variáveis. A publicação usa o Dockerfile do repositório Git. Os usuários e dados de outro Supabase não são copiados automaticamente.

Uploads são independentes do banco. A galeria continua usando Supabase Storage e requer `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e o bucket `gallery`; sem isso, o envio retorna erro de configuração. O banco não substitui esse armazenamento de arquivos.

## Esquema e permissões

- `sql/000_core.sql`: usuários, sessões, comunidades, membros, conclusões, provas, cartinhas, leituras e galeria.
- `sql/001_admin.sql`: equipe por comunidade, eventos, auditoria e moderação transacional.
- `sql/002_postgrest.sql`: login de conexão sem acesso direto às tabelas e papel de serviço permitido somente com JWT válido. Nenhum papel anônimo é configurado.

A autorização de administradores da plataforma continua no backend, com `ADMIN_IDS` / `ADMIN_EMAILS`. O esquema não concede acesso administrativo a todos os usuários.

O Compose constrói a imagem PostgreSQL com atualização sem cache e usa o volume externo existente. O inicializador aplica as migrações e encerra; o REST só inicia se ele terminar com sucesso. Para atualizar o YAML após alterar SQL ou o Dockerfile:

```sh
node scripts/prepare-dokploy-db.mjs
```

Cole `deploy/dokploy-database.yml` no Compose existente, mantenha o Environment e faça deploy. O YAML contém SQL codificado, sem senhas; a codificação serve somente ao transporte. Nunca remova o volume para aplicar uma migração. Os scripts podem ser reaplicados sem apagar registros.

## Validação local

Com Docker instalado, `npm run test:database` cria um ambiente isolado, aplica as migrações duas vezes, executa os testes SQL e da API e remove os containers ao terminar. O CI executa essa verificação antes do deploy.

Execute as três migrações em um PostgreSQL isolado, com `NATAL_API_PASSWORD` definido no ambiente do `psql`. Execute `test/database.sql`: testa isolamento por comunidade, pontuação idempotente, reversão em caso de erro e auditoria.

Com um PostgREST apontando para esse banco de testes, execute:

```sh
ALLOW_DATABASE_TEST=1 POSTGREST_URL=http://localhost:3001 POSTGREST_SERVICE_KEY=chave-do-banco-de-testes node test/database.mjs
```

Esse teste cria e remove um usuário temporário; utilize um banco de testes. Verifica cadastro e login pelo Express, sessões persistidas, logout, hash de senha, gravação de cartinhas e rejeição de acesso REST sem JWT.

O volume persiste os dados entre reinícios. Um backup anterior à troca de imagem foi validado em `vulpora-natal-bootstrap-backup`, no arquivo `natal-before-image-update.dump`. Em cada deploy, o serviço `backup` grava e valida `natal-latest.dump` nesse volume separado, com permissão privada. Esse snapshot fica no mesmo servidor; backup externo automático ainda não foi configurado.

O registro nativo anterior `RRRkUAm9rkV6zczbplPBW` ficou desligado, com zero réplicas e o nome **Natal · Serviço anterior (desligado)**. A revisão automática bloqueou sua remoção por possível risco ao volume; o banco ativo está no Compose. Não inicie esse serviço antigo nem outro PostgreSQL usando o mesmo volume de dados simultaneamente. Para uma instalação nova fora desse servidor, crie os volumes externos antes do primeiro deploy; nesse servidor eles já existem.

Referências: [configuração PostgREST](https://docs.postgrest.org/en/stable/references/configuration.html), [versões PostgreSQL](https://www.postgresql.org/support/versioning/).
