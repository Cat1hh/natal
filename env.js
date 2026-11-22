// Lê o arquivo .env (se existir) sem depender de flags do Node nem de pacotes extras.
// Precisa ser o PRIMEIRO import do server.js, para as variáveis existirem antes de todo o resto.
// No Cloudflare Workers não há .env nem disco: as variáveis chegam por process.env (veja boot.js).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let file = null;
try {
  file = fileURLToPath(new URL('./.env', import.meta.url));
} catch {
  // Sem import.meta.url utilizável (ex.: Workers): segue só com process.env.
}

export const envLoaded = Boolean(file) && existsSync(file);

if (envLoaded) {
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (/^(['"]).*\1$/.test(val)) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}