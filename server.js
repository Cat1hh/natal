import { envLoaded } from './env.js';
import { existsSync } from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import supabase from './db.js';
import { MISSIONS, MISSIONS_BY_COMMUNITY, COMMUNITY_META, PRIZES, MILESTONES } from './missions.js';

const {
  PORT = 3000,
  VERCEL,
  VERCEL_URL,
  BASE_URL = VERCEL_URL ? `https://${VERCEL_URL}` : `http://localhost:${PORT}`,
  NODE_ENV = VERCEL ? 'production' : 'development',
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DUCKS_GUILD_ID = '1472932028721664148',
  KINGDOM_GUILD_ID = '992981876664971306',
  ADMIN_IDS = '',
  EVENT_START = '2026-12-01',
  DEBUG_DAY,
  TRUST_PROXY,
} = process.env;

const PROD = NODE_ENV === 'production' || Boolean(VERCEL);
const ADMINS = new Set(ADMIN_IDS.split(',').map((s) => s.trim()).filter(Boolean));
const SESSION_MS = 30 * 24 * 3600 * 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const run = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const host = req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return host ? `${proto}://${host}` : BASE_URL.replace(/\/$/, '');
}

function getMissionsFor(community) {
  return MISSIONS_BY_COMMUNITY[community] || MISSIONS;
}

function eventState() {
  const dbg = parseInt(DEBUG_DAY, 10);
  if (!PROD && dbg >= 1 && dbg <= 25) return { status: 'live', today: dbg, finale: false };
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diff = Math.round((Date.parse(hoje) - Date.parse(EVENT_START)) / 86400000);
  if (diff < 0) return { status: 'before', today: 0, finale: false };
  if (diff >= 25) return { status: 'ended', today: 25, finale: true };
  return { status: 'live', today: diff + 1, finale: false };
}

async function getUserStats(uid) {
  const { data } = await supabase.from('completions').select('points').eq('user_id', uid);
  const rows = data || [];
  return {
    points: rows.reduce((acc, r) => acc + (r.points || 0), 0),
    missions: rows.length,
  };
}

async function getDoneDays(uid) {
  const { data } = await supabase.from('completions').select('day').eq('user_id', uid).order('day');
  return (data || []).map((r) => r.day);
}

async function giveCompletion(uid, day, community) {
  const list = getMissionsFor(community);
  const pts = list[day - 1][2];
  const { data, error } = await supabase
    .from('completions')
    .upsert({ user_id: uid, day, points: pts }, { onConflict: 'user_id,day', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return data && data.length > 0 ? pts : 0;
}

const avatarUrl = (u) =>
  u?.avatar ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=128` : null;

const checks = {
  login: async () => true,
  discord: async () => true,
  letter: async (uid) => {
    const { count } = await supabase.from('letters').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    return (count || 0) > 0;
  },
  reads3: async (uid) => {
    const { count } = await supabase.from('letter_reads').select('letter_id', { count: 'exact', head: true }).eq('user_id', uid);
    return (count || 0) >= 3;
  },
  count10: async (uid) => {
    const s = await getUserStats(uid);
    return s.missions >= 10;
  },
};

const checkMsg = {
  letter: 'Escreva uma cartinha na árvore primeiro.',
  reads3: 'Leia 3 cartinhas de outras pessoas primeiro.',
  count10: 'Conclua 10 missões antes desta.',
};

const app = express();
if (TRUST_PROXY || VERCEL) app.set('trust proxy', Number(TRUST_PROXY) || 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://cdn.discordapp.com', 'https://*.supabase.co'],
        connectSrc: ["'self'", 'https://*.supabase.co'],
        upgradeInsecureRequests: PROD ? [] : null,
      },
    },
  })
);
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const currentOrigin = new URL(getBaseUrl(req)).origin;
  if (origin === currentOrigin) return next();
  if (!PROD && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return next();
  return res.status(403).json({ error: 'origem_invalida' });
});

app.use(
  run(async (req, res, next) => {
    const sid = req.cookies.sid;
    if (!sid) {
      req.user = null;
      return next();
    }
    const { data: session } = await supabase
      .from('sessions')
      .select('expires_at, users(*)')
      .eq('id', sid)
      .gt('expires_at', Date.now())
      .maybeSingle();

    req.user = session?.users || null;
    if (req.user) req.user.isAdmin = ADMINS.has(req.user.discord_id);
    next();
  })
);

const limits = { standardHeaders: 'draft-7', legacyHeaders: false };
app.use('/api', rateLimit({ ...limits, windowMs: 60_000, limit: 120, message: { error: 'muitas_requisicoes' } }));
const strict = rateLimit({ ...limits, windowMs: 60_000, limit: 15, message: { error: 'muitas_requisicoes' } });

const requireAuth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'nao_autenticado' }));
const requireAdmin = (req, res, next) => (req.user?.isAdmin ? next() : res.status(403).json({ error: 'sem_permissao' }));
const requireCommunity = (req, res, next) =>
  req.user?.community ? next() : res.status(403).json({ error: 'comunidade_nao_definida' });

app.use('/api', (req, res, next) =>
  req.path === '/me' || req.user ? next() : res.status(401).json({ error: 'nao_autenticado' })
);

/* ---------- Login com Discord + Verificação de Servidor ---------- */
app.get('/auth/discord', (req, res) => {
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${getBaseUrl(req)}/auth/discord/callback`;
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get(
  '/auth/discord/callback',
  run(async (req, res) => {
    const { code, state } = req.query;
    const saved = req.cookies.oauth_state;
    const redirectUri = `${getBaseUrl(req)}/auth/discord/callback`;
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
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
      const { access_token } = await tokenRes.json();

      const [meRes, guildsRes] = await Promise.all([
        fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${access_token}` } }),
        fetch('https://discord.com/api/users/@me/guilds', { headers: { Authorization: `Bearer ${access_token}` } }),
      ]);
      if (!meRes.ok || !guildsRes.ok) throw new Error('falha ao consultar usuario/servidores no Discord');

      const d = await meRes.json();
      const guilds = await guildsRes.json();
      const guildIds = new Set((guilds || []).map((g) => g.id));

      const inDucks = guildIds.has(DUCKS_GUILD_ID);
      const inKingdom = guildIds.has(KINGDOM_GUILD_ID);
      const isAdmin = ADMINS.has(d.id);

      // Bloqueia quem não participa de nenhum dos dois servidores (exceto admins)
      if (!inDucks && !inKingdom && !isAdmin) {
        return res.redirect('/?erro=sem_servidor');
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id, community')
        .eq('discord_id', d.id)
        .maybeSingle();

      // Mantém a tag travada se já escolheu; caso contrário atribui pelo servidor
      let community = existing?.community || null;
      if (!community) {
        if (inDucks && !inKingdom) community = 'ducks';
        else if (inKingdom && !inDucks) community = 'kingdom';
        // Se estiver nos dois servidores, community fica null até escolher na tela inicial
      }

      const { data: user, error: uErr } = await supabase
        .from('users')
        .upsert(
          {
            discord_id: d.id,
            username: d.global_name || d.username,
            avatar: d.avatar,
            community,
          },
          { onConflict: 'discord_id' }
        )
        .select('id')
        .single();
      if (uErr) throw uErr;

      await supabase.from('sessions').delete().lt('expires_at', Date.now());
      const sid = randomBytes(32).toString('hex');
      const { error: sErr } = await supabase
        .from('sessions')
        .insert({ id: sid, user_id: user.id, expires_at: Date.now() + SESSION_MS });
      if (sErr) throw sErr;

      res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: SESSION_MS });
      res.redirect('/#perfil');
    } catch (e) {
      console.error('Erro no login do Discord:', e.message);
      res.redirect('/?erro=discord');
    }
  })
);

app.post(
  '/auth/logout',
  run(async (req, res) => {
    if (req.cookies.sid) await supabase.from('sessions').delete().eq('id', req.cookies.sid);
    res.clearCookie('sid');
    res.json({ ok: true });
  })
);

/* ---------- Perfil e Escolha/Tag de Comunidade ---------- */
app.get(
  '/api/me',
  run(async (req, res) => {
    if (!req.user) return res.json({ user: null });
    const [s, done] = await Promise.all([getUserStats(req.user.id), getDoneDays(req.user.id)]);
    const meta = COMMUNITY_META[req.user.community] || null;
    res.json({
      user: {
        id: req.user.id,
        name: req.user.username,
        avatar: avatarUrl(req.user),
        discord: { connected: true, id: req.user.discord_id },
        isAdmin: req.user.isAdmin,
        community: req.user.community,
        tag: meta?.tag || null,
        communityName: meta?.name || null,
        currency: meta?.currency || 'Ducks',
      },
      points: s.points,
      missionsDone: s.missions,
      done,
    });
  })
);

// Usado quando o membro está nos dois servidores e escolhe em qual evento competir
app.post(
  '/api/me/community',
  requireAuth,
  run(async (req, res) => {
    const choice = req.body?.community;
    if (!['ducks', 'kingdom'].includes(choice)) {
      return res.status(400).json({ error: 'comunidade_invalida' });
    }
    if (req.user.community && !req.user.isAdmin) {
      return res.status(409).json({ error: 'tag_ja_definida', message: 'Sua tag de evento já está travada.' });
    }
    const { error } = await supabase.from('users').update({ community: choice }).eq('id', req.user.id);
    if (error) throw error;
    res.json({ ok: true, community: choice });
  })
);

/* ---------- Evento e missões (separados por comunidade) ---------- */
app.get(
  '/api/event',
  requireCommunity,
  run(async (req, res) => {
    const ev = eventState();
    const community = req.user.community;
    const list = getMissionsFor(community);
    const subs = new Map();
    let done = new Set();

    const [doneDays, { data: subRows }] = await Promise.all([
      getDoneDays(req.user.id),
      supabase.from('submissions').select('day, status').eq('user_id', req.user.id),
    ]);
    done = new Set(doneDays);
    (subRows || []).forEach((s) => subs.set(s.day, s.status));

    const missions = list.map(([title, objective, points, verify], i) => {
      const day = i + 1;
      let status;
      if (done.has(day)) status = 'done';
      else if (day > ev.today) status = 'locked';
      else if (subs.get(day) === 'pending') status = 'pending';
      else if (subs.get(day) === 'rejected') status = 'rejected';
      else status = day === ev.today && ev.status === 'live' ? 'today' : 'open';
      return { day, title, objective, points, status, needsReview: verify === 'review' };
    });

    res.json({ status: ev.status, today: ev.today, finale: ev.finale, start: EVENT_START, community, missions });
  })
);

app.post(
  '/api/missions/:day/complete',
  strict,
  requireAuth,
  requireCommunity,
  run(async (req, res) => {
    const day = parseInt(req.params.day, 10);
    const list = getMissionsFor(req.user.community);
    const m = list[day - 1];
    if (!m) return res.status(404).json({ error: 'missao_inexistente' });

    const ev = eventState();
    if (ev.status === 'ended') return res.status(403).json({ error: 'evento_encerrado' });
    if (day > ev.today) return res.status(403).json({ error: 'dia_bloqueado' });

    const uid = req.user.id;
    const { data: existing } = await supabase
      .from('completions')
      .select('id')
      .eq('user_id', uid)
      .eq('day', day)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'ja_concluida' });

    const verify = m[3];
    if (verify === 'review') {
      const proof = String(req.body?.proof ?? '').trim().slice(0, 500);
      if (proof.length < 3) {
        return res.status(400).json({ error: 'prova_obrigatoria', message: 'Descreva ou cole o link do que você fez.' });
      }
      const { data: curSub } = await supabase
        .from('submissions')
        .select('status')
        .eq('user_id', uid)
        .eq('day', day)
        .maybeSingle();

      if (curSub && curSub.status !== 'rejected') {
        return res.status(409).json({ error: 'em_analise' });
      }

      await supabase
        .from('submissions')
        .upsert({ user_id: uid, day, proof, status: 'pending' }, { onConflict: 'user_id,day' });
      return res.status(202).json({ status: 'pending' });
    }

    if (!(await checks[verify](uid))) {
      return res.status(400).json({ error: 'requisito_pendente', message: checkMsg[verify] });
    }
    const points = await giveCompletion(uid, day, req.user.community);
    const stats = await getUserStats(uid);
    res.json({ status: 'done', points, total: stats.points });
  })
);

/* ---------- Ranking isolado por comunidade ---------- */
app.get(
  '/api/ranking',
  requireAuth,
  requireCommunity,
  run(async (req, res) => {
    const ev = eventState();
    if (!req.user.isAdmin && !ev.finale) {
      return res.status(403).json({ error: 'ranking_oculto', message: 'O ranking será revelado no dia 26!' });
    }

    const community = req.user.community;
    const { data: rows } = await supabase
      .from('completions')
      .select('user_id, points, created_at, users!inner(username, discord_id, avatar, community)')
      .eq('users.community', community);

    const map = new Map();
    for (const r of rows || []) {
      if (!r.users) continue;
      const cur = map.get(r.user_id) || {
        user_id: r.user_id,
        name: r.users.username,
        discord_id: r.users.discord_id,
        avatar: r.users.avatar,
        community: r.users.community,
        total: 0,
        missions: 0,
        last: r.created_at,
      };
      cur.total += r.points || 0;
      cur.missions += 1;
      if (r.created_at > cur.last) cur.last = r.created_at;
      map.set(r.user_id, cur);
    }

    const sorted = [...map.values()].sort((a, b) => b.total - a.total || a.last.localeCompare(b.last));
    const ranking = sorted.slice(0, 50).map((r, i) => ({
      position: i + 1,
      name: r.name,
      avatar: avatarUrl(r),
      tag: COMMUNITY_META[r.community]?.tag,
      points: r.total,
      missions: r.missions,
    }));

    const idx = sorted.findIndex((r) => r.user_id === req.user.id);
    const s = await getUserStats(req.user.id);
    const me = { points: s.points, missions: s.missions, position: idx >= 0 ? idx + 1 : null };

    res.json({ ranking, me, community });
  })
);

app.get('/api/prizes', requireAuth, (req, res) => {
  const ev = eventState();
  if (!req.user.isAdmin && !ev.finale) {
    return res.status(403).json({ error: 'premios_ocultos', message: 'As premiações abrem no dia 26!' });
  }
  res.json({ prizes: PRIZES, milestones: MILESTONES });
});

/* ---------- Árvore de cartinhas isolada por comunidade ---------- */
app.get(
  '/api/letters',
  requireCommunity,
  run(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 60);
    const { data } = await supabase
      .from('letters')
      .select('id, author, text, created_at')
      .eq('hidden', false)
      .eq('community', req.user.community)
      .order('id', { ascending: false })
      .limit(limit);

    let letters = data || [];
    if (req.query.order === 'random') {
      letters = [...letters].sort(() => Math.random() - 0.5);
    }
    res.json({ letters });
  })
);

app.post(
  '/api/letters',
  strict,
  requireAuth,
  requireCommunity,
  run(async (req, res) => {
    const text = String(req.body?.text ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .trim();
    if (text.length < 3 || text.length > 280) {
      return res.status(400).json({ error: 'texto_invalido', message: 'A cartinha precisa ter entre 3 e 280 caracteres.' });
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from('letters')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gt('created_at', since);

    if ((count || 0) >= 3) {
      return res.status(429).json({ error: 'limite_diario', message: 'Você já pendurou 3 cartinhas nas últimas 24 horas.' });
    }

    const author = req.body?.anonymous ? 'Anônimo' : req.user.username;
    const { data: created, error } = await supabase
      .from('letters')
      .insert({ user_id: req.user.id, author, text, community: req.user.community })
      .select('id, author, text')
      .single();
    if (error) throw error;

    res.status(201).json({ letter: created });
  })
);

app.post(
  '/api/letters/:id/read',
  requireAuth,
  run(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { data: l } = await supabase
      .from('letters')
      .select('user_id')
      .eq('id', id)
      .eq('hidden', false)
      .maybeSingle();
    if (!l) return res.status(404).json({ error: 'cartinha_inexistente' });

    if (l.user_id !== req.user.id) {
      await supabase
        .from('letter_reads')
        .upsert({ user_id: req.user.id, letter_id: id }, { onConflict: 'user_id,letter_id', ignoreDuplicates: true });
    }
    const { count } = await supabase
      .from('letter_reads')
      .select('letter_id', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    res.json({ reads: count || 0 });
  })
);

/* ---------- Galeria isolada por comunidade ---------- */
app.get(
  '/api/gallery',
  requireAuth,
  requireCommunity,
  run(async (req, res) => {
    const community = req.user.community;
    let query = supabase
      .from('gallery')
      .select('id, user_id, author_name, title, message, image_url, status, created_at')
      .eq('community', community)
      .order('id', { ascending: false })
      .limit(100);

    if (req.user.isAdmin) {
      query = query.in('status', ['approved', 'pending']);
    } else {
      query = query.or(`status.eq.approved,and(status.eq.pending,user_id.eq.${req.user.id})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map((g) => ({
      id: g.id,
      authorId: g.user_id,
      authorName: g.author_name,
      title: g.title,
      message: g.message,
      imageUrl: g.image_url,
      status: g.status,
      createdAt: g.created_at,
    }));
    res.json({ items });
  })
);

app.post(
  '/api/gallery',
  strict,
  requireAuth,
  requireCommunity,
  run(async (req, res) => {
    const title = String(req.body?.title ?? '').trim().slice(0, 80);
    const message = String(req.body?.message ?? '').trim().slice(0, 300);
    const rawImage = String(req.body?.imageUrl ?? '');

    if (title.length < 2) {
      return res.status(400).json({ error: 'titulo_invalido', message: 'Informe um título para a arte.' });
    }
    const match = rawImage.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'imagem_invalida', message: 'Selecione uma imagem válida (PNG, JPG ou WEBP).' });
    }

    const contentType = match[1];
    const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
    const buffer = Buffer.from(match[2], 'base64');
    const filePath = `${req.user.community}/${req.user.id}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('gallery')
      .upload(filePath, buffer, { contentType, upsert: false });
    if (upErr) {
      return res.status(500).json({ error: 'erro_upload', message: 'Falha ao salvar imagem no Storage do Supabase.' });
    }

    const { data: pub } = supabase.storage.from('gallery').getPublicUrl(filePath);
    const { data: item, error: insErr } = await supabase
      .from('gallery')
      .insert({
        user_id: req.user.id,
        author_name: req.user.username,
        title,
        message,
        image_url: pub.publicUrl,
        status: 'pending',
        community: req.user.community,
      })
      .select('id, status')
      .single();
    if (insErr) throw insErr;

    res.status(201).json({ item });
  })
);

app.patch(
  '/api/gallery/:id',
  requireAuth,
  requireAdmin,
  run(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status_invalido' });
    }
    const { error } = await supabase.from('gallery').update({ status }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  })
);

/* ---------- Admin ---------- */
app.get(
  '/api/admin/submissions',
  requireAuth,
  requireAdmin,
  run(async (req, res) => {
    const status = req.query.status === 'rejected' ? 'rejected' : 'pending';
    const { data } = await supabase
      .from('submissions')
      .select('id, day, proof, status, created_at, users(username, discord_id, community)')
      .eq('status', status)
      .order('id')
      .limit(100);

    const submissions = (data || []).map((s) => ({
      id: s.id,
      day: s.day,
      proof: s.proof,
      status: s.status,
      created_at: s.created_at,
      username: s.users?.username,
      discord_id: s.users?.discord_id,
      community: s.users?.community,
    }));
    res.json({ submissions });
  })
);

app.post(
  '/api/admin/submissions/:id/:action',
  requireAuth,
  requireAdmin,
  run(async (req, res) => {
    const { action } = req.params;
    if (!['approve', 'reject'].includes(action)) return res.status(404).json({ error: 'acao_invalida' });
    const id = parseInt(req.params.id, 10);

    const { data: s } = await supabase
      .from('submissions')
      .select('*, users(community)')
      .eq('id', id)
      .maybeSingle();
    if (!s || s.status !== 'pending') return res.status(404).json({ error: 'nao_encontrada' });

    await supabase
      .from('submissions')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', s.id);
    if (action === 'approve') await giveCompletion(s.user_id, s.day, s.users?.community || 'ducks');
    res.json({ ok: true });
  })
);

app.delete(
  '/api/admin/letters/:id',
  requireAuth,
  requireAdmin,
  run(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { data } = await supabase.from('letters').update({ hidden: true }).eq('id', id).select('id');
    res.json({ ok: (data?.length || 0) > 0 });
  })
);

/* ---------- Site, erros e start ---------- */
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/', (req, res, next) =>
  existsSync(path.join(__dirname, 'public', 'index.html'))
    ? next()
    : res.type('html').send('<h1>Servidor no ar, mas falta o build em public/index.html</h1>')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res) => res.status(404).json({ error: 'rota_inexistente' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 413 ? 'corpo_grande' : 'erro_interno' });
});

if (!VERCEL) {
  setInterval(() => supabase.from('sessions').delete().lt('expires_at', Date.now()), 3600_000).unref();
  const server = app.listen(PORT, () => {
    const ev = eventState();
    console.log(`\nNatal Mágico no ar! Abra: http://localhost:${PORT} (Evento: ${ev.status}, dia ${ev.today})\n`);
  });
  server.on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `A porta ${PORT} já está em uso.` : `Erro ao iniciar: ${e.message}`);
    process.exit(1);
  });
}

export default app;