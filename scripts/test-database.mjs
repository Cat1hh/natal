import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { randomBytes, createHmac } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const suffix = randomBytes(5).toString('hex');
const network = `natal-db-test-${suffix}`;
const pg = `${network}-pg`;
const pgImage = `natal-postgres:test-${suffix}`;
const rest = `${network}-rest`;
const password = randomBytes(24).toString('hex');
const jwtSecret = randomBytes(40).toString('hex');
const docker = (args, options = {}) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options });
const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
try {
  docker(['build', '--pull', '--no-cache', '--file', 'deploy/Postgres.Dockerfile', '--tag', pgImage, '.']);
  if (process.env.SCAN_DATABASE_IMAGE === '1') execFileSync('bash', ['scripts/scan-image.sh', pgImage], { stdio: 'inherit' });
  docker(['network', 'create', network]);
  docker(['run', '-d', '--name', pg, '--network', network, '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_USER=vulpora_owner', '-e', 'POSTGRES_DB=vulpora_natal', pgImage]);
  for (let i = 0; i < 60; i++) {
    try { docker(['exec', pg, 'pg_isready', '-U', 'vulpora_owner', '-d', 'vulpora_natal']); break; }
    catch { if (i === 59) throw new Error('PostgreSQL não ficou pronto'); await sleep(500); }
  }
  const files = ['000_core.sql', '001_admin.sql', '002_postgrest.sql'];
  const sql = (await Promise.all(files.map(f => readFile(new URL(`../sql/${f}`, import.meta.url), 'utf8')))).join('\n');
  const psql = input => docker(['exec', '-i', '-e', `NATAL_API_PASSWORD=${password}`, pg, 'psql', '-q', '-U', 'vulpora_owner', '-d', 'vulpora_natal', '-v', 'ON_ERROR_STOP=1'], { input });
  psql(sql);
  psql(sql); // Reaplicar migrações precisa preservar o banco.
  psql(await readFile(new URL('../test/database.sql', import.meta.url), 'utf8'));
  docker(['run', '-d', '--name', rest, '--network', network, '-p', '127.0.0.1::3000', '-e', `PGRST_DB_URI=postgres://natal_gateway:${password}@${pg}:5432/vulpora_natal`, '-e', 'PGRST_DB_SCHEMAS=public', '-e', `PGRST_JWT_SECRET=${jwtSecret}`, '-e', 'PGRST_OPENAPI_MODE=disabled', 'postgrest/postgrest:v16.5']);
  const address = docker(['port', rest, '3000/tcp']).trim();
  process.env.POSTGREST_URL = `http://${address}`;
  const payload = encode({alg:'HS256',typ:'JWT'}) + '.' + encode({role:'natal_service'});
  process.env.POSTGREST_SERVICE_KEY = payload + '.' + createHmac('sha256', jwtSecret).update(payload).digest('base64url');
  process.env.ALLOW_DATABASE_TEST = '1';
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`${process.env.POSTGREST_URL}/communities?select=slug`, { headers: { Authorization: `Bearer ${process.env.POSTGREST_SERVICE_KEY}` } });
      if (response.ok) break;
      if (i === 59) throw new Error(`PostgREST HTTP ${response.status}`);
    } catch (error) { if (i === 59) throw error; }
    await sleep(500);
  }
  await import('../test/database.mjs');
  console.log('Imagem PostgreSQL validada:', pgImage);
  console.log('Migrações reaplicadas sem perda; isolamento, moderação transacional e auditoria passaram.');
} finally {
  for (const container of [rest, pg]) { try { docker(['rm', '--force', '--volumes', container]); } catch {} }
  try { docker(['network', 'rm', network]); } catch {}
}
