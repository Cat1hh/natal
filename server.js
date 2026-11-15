import { envLoaded } from './env.js';
import { existsSync } from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import db from './db.js';
import { MISSIONS, PRIZES, MILESTONES } from './missions.js';

const {
  PORT = 3000,
  BASE_URL = `http://localhost:${PORT}`,
  NODE_ENV = 'development',
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  ADMIN_IDS = '',
  EVENT_START = '2026-12-01',
  DEBUG_DAY,
  TRUST_PROXY,
} = process.env;

const PROD = NODE_ENV === 'production';
const ORIGIN = new URL(BASE_URL).origin;
const REDIRECT_URI = `${BASE_URL}/auth/discord/callback`;
const ADMINS = new Set(ADMIN_IDS.split(',').map((s) => s.trim()).filter(Boolean));
const SESSION_MS = 30 * 24 * 3600 * 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  console.warn('⚠ Configure DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET no .env para o login funcionar.');
}

/* ---------- Dia do evento (fuso de São Paulo) ---------- */
function eventState() {
  const dbg = parseInt(DEBUG_DAY, 10);
  if (!PROD && dbg >= 1 && dbg <= 25) return { status: 'live', today: dbg };
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diff = Math.round((Date.parse(hoje) - Date.parse(EVENT_START)) / 86400000);
  if (diff < 0) return { status: 'before', today: 0 };
  if (diff >= 25) return { status: 'ended', today: 25 };
  return { status: 'live', today: diff + 1 };
}

/* ---------- Consultas ---------- */
const q = {
  session: db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?'),
  stats: db.prepare('SELECT COALESCE(SUM(points), 0) AS points, COUNT(*) AS missions FROM completions WHERE user_id = ?'),
  doneDays: db.prepare('SELECT day FROM completions WHERE user_id = ? ORDER BY day'),
  hasDone: db.prepare('SELECT 1 FROM completions WHERE user_id = ? AND day = ?'),
  subs: db.prepare('SELECT day, status FROM submissions WHERE user_id = ?'),
  insDone: db.prepare('INSERT OR IGNORE INTO completions (user_id, day, points) VALUES (?, ?, ?)'),
  hasLetter: db.prepare('SELECT 1 FROM letters WHERE user_id = ? LIMIT 1'),
  readCount: db.prepare('SELECT COUNT(*) AS n FROM letter_reads WHERE user_id = ?'),
};

const giveCompletion = (uid, day) =>
  q.insDone.run(uid, day, MISSIONS[day - 1][2]).changes ? MISSIONS[day - 1][2] : 0;

const avatarUrl = (u) =>
  u.avatar ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=128` : null;

/* Verificações automáticas de missão */
const checks = {
  login: () => true,
  discord: () => true,
  letter: (uid) => !!q.hasLetter.get(uid),
  reads3: (uid) => q.readCount.get(uid).n >= 3,
  count10: (uid) => q.stats.get(uid).missions >= 10,
};
const checkMsg = {
  letter: 'Escreva uma cartinha na árvore primeiro.',
  reads3: 'Leia 3 cartinhas de outras pessoas primeiro.',
  count10: 'Conclua 10 missões antes desta.',
};

/* ---------- App e segurança ---------- */
const app = express();
if (TRUST_PROXY) app.set('trust proxy', Number(TRUST_PROXY));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ['https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: BASE_URL.startsWith('https') ? [] : null,
      },
    },
  })
);
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

// Bloqueia requisições que mudam dados vindas de outros sites (CSRF)
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== ORIGIN) return res.status(403).json({ error: 'origem_invalida' });
  next();
});

// Carrega o usuário da sessão
app.use((req, res, next) => {
  const sid = req.cookies.sid;
  req.user = sid ? q.session.get(sid, Date.now()) : null;
  if (req.user) req.user.isAdmin = ADMINS.has(req.user.discord_id);
  next();
});

const limits = { standardHeaders: 'draft-7', legacyHeaders: false };
app.use('/api', rateLimit({ ...limits, windowMs: 60_000, limit: 120, message: { error: 'muitas_requisicoes' } }));
const strict = rateLimit({ ...limits, windowMs: 60_000, limit: 15, message: { error: 'muitas_requisicoes' } });

const requireAuth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'nao_autenticado' }));
const requireAdmin = (req, res, next) => (req.user?.isAdmin ? next() : res.status(403).json({ error: 'sem_permissao' }));

// Tudo em /api exige login, menos /api/me (o site usa essa rota para saber se já há sessão)
app.use('/api', (req, res, next) =>
  req.path === '/me' || req.user ? next() : res.status(401).json({ error: 'nao_autenticado' })
);

/* ---------- Login com Discord (OAuth2) ---------- */
app.get('/auth/discord', (req, res) => {
  const state = randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID ?? '',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    state,
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, state } = req.query;
  const saved = req.cookies.oauth_state;
  res.clearCookie('oauth_state');
  if (!code || !state || state !== saved) return res.redirect('/?erro=state');

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!meRes.ok) throw new Error(`users/@me ${meRes.status}`);
    const d = await meRes.json();

    db.prepare(
      `INSERT INTO users (discord_id, username, avatar) VALUES (?, ?, ?)
       ON CONFLICT(discord_id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar`
    ).run(d.id, d.global_name || d.username, d.avatar);
    const user = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(d.id);

    const sid = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sid, user.id, Date.now() + SESSION_MS);
    res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: SESSION_MS });
    res.redirect('/#perfil');
  } catch (e) {
    console.error('Erro no login do Discord:', e.message);
    res.redirect('/?erro=discord');
  }
});

app.post('/auth/logout', (req, res) => {
  if (req.cookies.sid) db.prepare('DELETE FROM sessions WHERE id = ?').run(req.cookies.sid);
  res.clearCookie('sid');
  res.json({ ok: true });
});

/* ---------- Perfil ---------- */
app.get('/api/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const s = q.stats.get(req.user.id);
  res.json({
    user: {
      id: req.user.id,
      name: req.user.username,
      avatar: avatarUrl(req.user),
      discord: { connected: true, id: req.user.discord_id },
      isAdmin: req.user.isAdmin,
    },
    points: s.points,
    missionsDone: s.missions,
    done: q.doneDays.all(req.user.id).map((r) => r.day),
  });
});

/* ---------- Evento e missões ---------- */
app.get('/api/event', (req, res) => {
  const ev = eventState();
  const subs = new Map();
  let done = new Set();
  if (req.user) {
    done = new Set(q.doneDays.all(req.user.id).map((r) => r.day));
    q.subs.all(req.user.id).forEach((s) => subs.set(s.day, s.status));
  }
  const missions = MISSIONS.map(([title, objective, points, verify], i) => {
    const day = i + 1;
    let status;
    if (done.has(day)) status = 'done';
    else if (day > ev.today) status = 'locked';
    else if (subs.get(day) === 'pending') status = 'pending';
    else if (subs.get(day) === 'rejected') status = 'rejected';
    else status = day === ev.today && ev.status === 'live' ? 'today' : 'open';
    return { day, title, objective, points, status, needsReview: verify === 'review' };
  });
  res.json({ status: ev.status, today: ev.today, start: EVENT_START, missions });
});

app.post('/api/missions/:day/complete', strict, requireAuth, (req, res) => {
  const day = parseInt(req.params.day, 10);
  const m = MISSIONS[day - 1];
  if (!m) return res.status(404).json({ error: 'missao_inexistente' });

  const ev = eventState();
  if (ev.status === 'ended') return res.status(403).json({ error: 'evento_encerrado' });
  if (day > ev.today) return res.status(403).json({ error: 'dia_bloqueado' });

  const uid = req.user.id;
  if (q.hasDone.get(uid, day)) return res.status(409).json({ error: 'ja_concluida' });

  const verify = m[3];
  if (verify === 'review') {
    const proof = String(req.body?.proof ?? '').trim().slice(0, 500);
    if (proof.length < 3) {
      return res.status(400).json({ error: 'prova_obrigatoria', message: 'Descreva ou cole o link do que você fez.' });
    }
    const r = db
      .prepare(
        `INSERT INTO submissions (user_id, day, proof) VALUES (?, ?, ?)
         ON CONFLICT(user_id, day) DO UPDATE SET proof = excluded.proof, status = 'pending'
         WHERE submissions.status = 'rejected'`
      )
      .run(uid, day, proof);
    if (!r.changes) return res.status(409).json({ error: 'em_analise' });
    return res.status(202).json({ status: 'pending' });
  }

  if (!checks[verify](uid)) return res.status(400).json({ error: 'requisito_pendente', message: checkMsg[verify] });
  const points = giveCompletion(uid, day);
  res.json({ status: 'done', points, total: q.stats.get(uid).points });
});

/* ---------- Ranking e prêmios ---------- */
app.get('/api/ranking', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.username AS name, u.discord_id, u.avatar,
              SUM(c.points) AS total, COUNT(*) AS missions, MAX(c.created_at) AS last
       FROM completions c JOIN users u ON u.id = c.user_id
       GROUP BY u.id ORDER BY total DESC, last ASC LIMIT 50`
    )
    .all();
  const ranking = rows.map((r, i) => ({
    position: i + 1,
    name: r.name,
    avatar: avatarUrl(r),
    points: r.total,
    missions: r.missions,
  }));
  let me = null;
  if (req.user) {
    const s = q.stats.get(req.user.id);
    const ahead = db
      .prepare('SELECT COUNT(*) AS n FROM (SELECT SUM(points) AS t FROM completions GROUP BY user_id HAVING t > ?)')
      .get(s.points).n;
    me = { points: s.points, missions: s.missions, position: s.points > 0 ? ahead + 1 : null };
  }
  res.json({ ranking, me });
});

app.get('/api/prizes', (req, res) => res.json({ prizes: PRIZES, milestones: MILESTONES }));

/* ---------- Árvore de cartinhas ---------- */
app.get('/api/letters', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 30);
  const order = req.query.order === 'random' ? 'RANDOM()' : 'id DESC';
  const letters = db
    .prepare(`SELECT id, author, text, created_at FROM letters WHERE hidden = 0 ORDER BY ${order} LIMIT ?`)
    .all(limit);
  res.json({ letters });
});

app.post('/api/letters', strict, requireAuth, (req, res) => {
  const text = String(req.body?.text ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();
  if (text.length < 3 || text.length > 280) {
    return res.status(400).json({ error: 'texto_invalido', message: 'A cartinha precisa ter entre 3 e 280 caracteres.' });
  }
  const recent = db
    .prepare("SELECT COUNT(*) AS n FROM letters WHERE user_id = ? AND created_at > datetime('now', '-1 day')")
    .get(req.user.id).n;
  if (recent >= 3) {
    return res.status(429).json({ error: 'limite_diario', message: 'Você já pendurou 3 cartinhas nas últimas 24 horas.' });
  }
  const author = req.body?.anonymous ? 'Anônimo' : req.user.username;
  const r = db.prepare('INSERT INTO letters (user_id, author, text) VALUES (?, ?, ?)').run(req.user.id, author, text);
  res.status(201).json({ letter: { id: Number(r.lastInsertRowid), author, text } });
});

// Registra que a pessoa leu a cartinha (conta para a missão "Leitor de cartas")
app.post('/api/letters/:id/read', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const l = db.prepare('SELECT user_id FROM letters WHERE id = ? AND hidden = 0').get(id);
  if (!l) return res.status(404).json({ error: 'cartinha_inexistente' });
  if (l.user_id !== req.user.id) {
    db.prepare('INSERT OR IGNORE INTO letter_reads (user_id, letter_id) VALUES (?, ?)').run(req.user.id, id);
  }
  res.json({ reads: q.readCount.get(req.user.id).n });
});

/* ---------- Admin ---------- */
app.get('/api/admin/submissions', requireAuth, requireAdmin, (req, res) => {
  const status = req.query.status === 'rejected' ? 'rejected' : 'pending';
  const submissions = db
    .prepare(
      `SELECT s.id, s.day, s.proof, s.status, s.created_at, u.username, u.discord_id
       FROM submissions s JOIN users u ON u.id = s.user_id
       WHERE s.status = ? ORDER BY s.id LIMIT 100`
    )
    .all(status);
  res.json({ submissions });
});

app.post('/api/admin/submissions/:id/:action', requireAuth, requireAdmin, (req, res) => {
  const { action } = req.params;
  if (!['approve', 'reject'].includes(action)) return res.status(404).json({ error: 'acao_invalida' });
  const s = db.prepare('SELECT * FROM submissions WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!s || s.status !== 'pending') return res.status(404).json({ error: 'nao_encontrada' });

  db.transaction(() => {
    db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(action === 'approve' ? 'approved' : 'rejected', s.id);
    if (action === 'approve') giveCompletion(s.user_id, s.day);
  })();
  res.json({ ok: true });
});

app.delete('/api/admin/letters/:id', requireAuth, requireAdmin, (req, res) => {
  const r = db.prepare('UPDATE letters SET hidden = 1 WHERE id = ?').run(parseInt(req.params.id, 10));
  res.json({ ok: r.changes > 0 });
});

/* ---------- Site, erros e start ---------- */
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/', (req, res, next) =>
  existsSync(path.join(__dirname, 'public', 'index.html'))
    ? next()
    : res.type('html').send('<h1>🎄 Servidor no ar, mas falta o site</h1><p>Não encontrei <code>public/index.html</code> ao lado do server.js. Copie a pasta <code>public</code> inteira (com a subpasta <code>assets</code>).</p>')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res) => res.status(404).json({ error: 'rota_inexistente' }));

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.status === 413 ? 'corpo_grande' : 'erro_interno' });
});

setInterval(() => db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()), 3600_000).unref();

const server = app.listen(PORT, () => {
  const ev = eventState();
  const site = existsSync(path.join(__dirname, 'public', 'index.html'));
  const discord = DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET;
  console.log(`\n🎄 Natal Mágico no ar!  Abra: http://localhost:${PORT}`);
  console.log(`   Evento: ${ev.status}, dia ${ev.today}`);
  console.log(`   Site (public/index.html): ${site ? 'ok' : `NÃO ENCONTRADO. Procurei em: ${path.join(__dirname, 'public', 'index.html')}`}`);
  console.log(`   Arquivo .env: ${envLoaded ? 'ok' : 'não encontrado, copie .env.example para .env'}`);
  console.log(`   Login do Discord: ${discord ? 'configurado' : 'NÃO configurado, preencha o .env'}\n`);
});
server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `✖ A porta ${PORT} já está em uso. Feche o outro servidor ou mude PORT no .env.` : `✖ Erro ao iniciar: ${e.message}`);
  process.exit(1);
});