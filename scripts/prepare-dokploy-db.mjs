import { readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['000_core.sql', '001_admin.sql', '002_postgrest.sql'];
const sql = (await Promise.all(files.map(f => readFile(resolve(root, 'sql', f), 'utf8')))).join('\n');
const payload = Buffer.from(sql).toString('base64');
const dockerfile = await readFile(resolve(root, 'deploy/Postgres.Dockerfile'), 'utf8');
// As credenciais são configuradas em Environment no Dokploy; nunca entram no YAML.
const compose = `services:
  database:
    image: vulpora-natal-postgres:17-secure
    build:
      context: .
      no_cache: true
      pull: true
      dockerfile_inline: |
${dockerfile.trim().split('\n').map(line => '        ' + line).join('\n')}
    restart: unless-stopped
    mem_limit: 512m
    shm_size: 128m
    environment:
      POSTGRES_DB: vulpora_natal
      POSTGRES_USER: vulpora_owner
      POSTGRES_PASSWORD: \${NATAL_DB_PASSWORD:?Configure NATAL_DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vulpora_owner -d vulpora_natal"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    volumes: [natal-data:/var/lib/postgresql/data]
    networks:
      dokploy-network:
        aliases: [vulpora-natal-postgres]
  migrate:
    image: vulpora-natal-postgres:17-secure
    pull_policy: never
    restart: "no"
    depends_on:
      database:
        condition: service_healthy
    environment:
      PGHOST: \${NATAL_DB_HOST:?Configure NATAL_DB_HOST}
      PGDATABASE: vulpora_natal
      PGUSER: vulpora_owner
      PGPASSWORD: \${NATAL_DB_PASSWORD:?Configure NATAL_DB_PASSWORD}
      NATAL_API_PASSWORD: \${NATAL_API_PASSWORD:?Configure NATAL_API_PASSWORD}
    entrypoint: ["/bin/sh", "-ec"]
    command:
      - |
        for attempt in $$(seq 1 60); do
          if psql -q -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null 2>&1; then break; fi
          sleep 2
        done
        printf '%s' '${payload}' | base64 -d > /tmp/schema.sql
        psql -v ON_ERROR_STOP=1 -f /tmp/schema.sql
        psql -v ON_ERROR_STOP=1 -c "SELECT 'natal_schema_ready' AS status, count(*) AS tables FROM information_schema.tables WHERE table_schema='public';"
    networks: [dokploy-network]
  rest:
    image: postgrest/postgrest:v16.5
    restart: unless-stopped
    depends_on:
      migrate:
        condition: service_completed_successfully
    environment:
      PGRST_DB_URI: postgres://natal_gateway:\${NATAL_API_PASSWORD}@\${NATAL_DB_HOST}:5432/vulpora_natal
      PGRST_DB_SCHEMAS: public
      PGRST_JWT_SECRET: \${NATAL_JWT_SECRET:?Configure NATAL_JWT_SECRET}
      PGRST_SERVER_PORT: "3000"
      PGRST_OPENAPI_MODE: disabled
      PGRST_DB_MAX_ROWS: "1000"
    networks:
      dokploy-network:
        aliases: [vulpora-natal-rest]
  verify:
    image: vulpora-natal-postgres:17-secure
    pull_policy: never
    restart: "no"
    depends_on:
      rest:
        condition: service_started
    environment:
      NATAL_SERVICE_KEY: \${NATAL_SERVICE_KEY:?Configure NATAL_SERVICE_KEY}
    entrypoint: ["/bin/sh", "-ec"]
    command:
      - |
        for attempt in $$(seq 1 60); do
          if wget -qO /dev/null --header="Authorization: Bearer $$NATAL_SERVICE_KEY" 'http://rest:3000/communities?select=slug'; then break; fi
          sleep 2
        done
        wget -qO /dev/null --header="Authorization: Bearer $$NATAL_SERVICE_KEY" 'http://rest:3000/users?select=id&limit=1'
        if wget -qO /dev/null 'http://rest:3000/users?select=id&limit=1'; then
          echo 'ERRO: acesso anônimo foi aceito'; exit 1
        fi
        if wget -qO /dev/null --header='Authorization: Bearer invalid-token' 'http://rest:3000/users?select=id&limit=1'; then
          echo 'ERRO: JWT inválido foi aceito'; exit 1
        fi
        echo 'natal_database_verified: autenticado OK; anônimo e JWT inválido bloqueados'
    networks: [dokploy-network]
  backup:
    image: vulpora-natal-postgres:17-secure
    pull_policy: never
    restart: "no"
    depends_on:
      migrate:
        condition: service_completed_successfully
    environment:
      PGHOST: \${NATAL_DB_HOST}
      PGDATABASE: vulpora_natal
      PGUSER: vulpora_owner
      PGPASSWORD: \${NATAL_DB_PASSWORD}
    entrypoint: ["/bin/sh", "-ec"]
    command:
      - |
        umask 077
        pg_dump --format=custom --no-owner --no-acl --file=/backup/natal-latest.dump
        pg_restore --list /backup/natal-latest.dump >/dev/null
        echo 'natal_backup_verified'
    volumes: [natal-bootstrap-backup:/backup]
    networks: [dokploy-network]
volumes:
  natal-data:
    external: true
    name: vulpora-natal-db-jraeq2-data
  natal-bootstrap-backup:
    external: true
    name: vulpora-natal-bootstrap-backup
networks:
  dokploy-network:
    external: true
`;
const destination = resolve(root, 'deploy/dokploy-database.yml');
await writeFile(destination, compose);
await chmod(destination, 0o644);
console.log('Gerado deploy/dokploy-database.yml sem credenciais. Configure Environment antes do deploy.');
