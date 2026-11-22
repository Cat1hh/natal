// Roda ANTES do server.js (o worker.js importa este arquivo primeiro).
import { env } from 'cloudflare:workers';

// 1) Variáveis e secrets da Cloudflare viram process.env, que é de onde o server.js, o env.js e o db.js leem.
for (const [key, value] of Object.entries(env)) {
  if (typeof value === 'string' && process.env[key] === undefined) {
    process.env[key] = value;
  }
}

// 2) Reaproveita o modo "serverless" que o server.js já tem para a Vercel:
//    com VERCEL definido, ele não chama app.listen nem agenda o setInterval (que não é permitido aqui).
process.env.VERCEL = '1';
