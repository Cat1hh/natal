import { envLoaded } from './env.js';
import { existsSync } from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import supabase from './db.js';
import * as missionsMod from './missions.js';

const { MISSIONS, PRIZES, MILESTONES } = missionsMod;

const DEFAULT_COMMUNITY = 'thekingdom';

const COMMUNITIES = {
  thekingdom: {
    slug: 'thekingdom',
    tag: 'THE KINGDOM',
    name: 'The Kingdom',
    theme: 'kingdom',
    subtitle: 'Comunidade oficial · Eventos, desafios e recompensas exclusivas',
    events: [
      {
        id: 'natal-2026',
        title: 'Natal Mágico 2026',
        badge: 'AO VIVO AGORA',
        status: 'live',
        date: '01 Dez – 25 Dez',
        description: '25 dias de missões diárias, árvore de cartinhas da comunidade e premiações especiais.',
        cta: 'Participar agora',
        target: '#natal-hub',
      },
      {
        id: 'ano-novo-2027',
        title: 'Virada Real · Ano Novo',
        badge: 'EM BREVE',
        status: 'upcoming',
        date: '28 Dez – 03 Jan',
        description: 'Retrospectiva do reino, sorteios relâmpago no Discord e insígnia exclusiva de Ano Novo.',
        cta: 'Avise-me',
      },
      {
        id: 'copa-kingdom',
        title: 'Torneio das Casas',
        badge: 'JANEIRO 2027',
        status: 'upcoming',
        date: '15 Jan – 30 Jan',
        description: 'Disputa entre equipes com minigames, desafios criativos e ranking geral da comunidade.',
        cta: 'Avise-me',
      },
    ],
  },
  heaven: {
    slug: 'heaven',
    tag: 'HEAVEN',
    name: 'Heaven',
    theme: 'ducks',
    subtitle: 'Comunidade oficial Heaven · Eventos, desafios e recompensas exclusivas',
    events: [
      {
        id: 'natal-2026-heaven',
        title: 'Natal Mágico 2026 · Heaven',
        badge: 'AO VIVO AGORA',
        status: 'live',
        date: '01 Dez – 25 Dez',
        description: '25 dias de missões diárias, árvore de cartinhas da Heaven e premiações exclusivas.',
        cta: 'Participar agora',
        target: '#natal-hub',
      },
      {
        id: 'ano-novo-2027-heaven',
        title: 'Virada Heaven · Ano Novo',
        badge: 'EM BREVE',
        status: 'upcoming',
        date: '28 Dez – 03 Jan',
        description: 'Celebração de fim de ano da Heaven com sorteios no Discord e insígnia especial.',
        cta: 'Avise-me',
      },
      {
        id: 'copa-heaven',
        title: 'Copa Heaven · Verão 2027',
        badge: 'JANEIRO 2027',
        status: 'upcoming',
        date: '15 Jan – 30 Jan',
        description: 'Torneio comunitário com minigames, desafios em equipe e ranking da Heaven.',
        cta: 'Avise-me',
      },
    ],
  },
};

const {
  PORT = 3000,
  VERCEL,
  VERCEL_URL,
  BASE_URL = VERCEL_URL ? `https://${VERCEL_URL}` : `http://localhost:${PORT}`,
  NODE_ENV = VERCEL ? 'production' : 'development',
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  ADMIN_IDS = '',
  ADMIN_EMAILS = '',
  EVENT_START = '2026-12-01',
  DEBUG_DAY,
  TRUST_PROXY,
} = process.env;

const PROD = NODE_ENV === 'production' || Boolean(VERCEL);
const ADMINS = new Set(ADMIN_IDS.split(',').map((s) => s.trim()).filter(Boolean));
const ADMIN_EMAIL_SET = new Set(
  ADMIN_EMAILS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);
const SESSION_MS = 30 * 24 * 3600 * 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const run = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function normalizeSlug(raw) {
  const clean = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  if (clean === 'ducks') return 'heaven';
  return clean || DEFAULT_COMMUNITY;
}

function extractCommunityFromPath(urlOrPath) {
  const match = String(urlOrPath || '').match(/\/comunidade\/([^/?#]+)/i);
  return normalizeSlug(match?.[1]);
}

function getReqCommunity(req) {
  return normalizeSlug(
    req.query.community ||
      req.get('x-community') ||
      extractCommunityFromPath(req.get('referer'))
  );
}

function getCommunityMeta(slug) {
  const key = normalizeSlug(slug);
  if (COMMUNITIES[key]) return COMMUNITIES[key];
  const label = key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    slug: key,
    tag: label.toUpperCase(),
    name: label,
    theme: 'kingdom',
    subtitle: 'Comunidade oficial · Eventos, desafios e recompensas',
    events: COMMUNITIES[DEFAULT_COMMUNITY].events,
  };
}

function safeReturnPath(raw, fallback = '/comunidade') {
  const val = String(raw || '').trim();
  if (val === '/') return '/comunidade';
  if (val.startsWith('/') && !val.startsWith('//')) {
    return val.replace(/^\/comunidade\/ducks(?=\/|$)/i, '/comunidade/heaven');
  }
  return fallback;
}

const isUserAdmin = (u) =>
  Boolean(
    (u?.discord_id && ADMINS.has(u.discord_id)) ||
    (u?.email && ADMIN_EMAIL_SET.has(u.email.toLowerCase()))
  );

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  try {
    const [salt, key] = stored.split(':');
    const keyBuf = Buffer.from(key, 'hex');
    const derived = scryptSync(password, salt, 64);
    return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
  } catch {
    return false;
  }
}

async function createSession(res, userId) {
  await supabase.from('sessions').delete().lt('expires_at', Date.now());
  const sid = randomBytes(32).toString('hex');
  const { error } = await supabase
    .from('sessions')
    .insert({ id: sid, user_id: userId, expires_at: Date.now() + SESSION_MS });
  if (error) throw error;
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: SESSION_MS });
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const host = req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return host ? `${proto}://${host}` : BASE_URL.replace(/\/$/, '');
}

/* ---------- Dia do evento ---------- */
function eventState() {
  const dbg = parseInt(DEBUG_DAY, 10);
  if (!PROD && dbg >= 1 && dbg <= 25) return { status: 'live', today: dbg, finale: false };
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diff = Math.round((Date.parse(hoje) - Date.parse(EVENT_START)) / 86400000);
  if (diff < 0) return { status: 'before', today: 0, finale: false };
  if (diff >= 25) return { status: 'ended', today: 25, finale: true };
  return { status: 'live', today: diff + 1, finale: false };
}

/* ---------- Helpers do banco (Supabase) ---------- */
async function getUserStats(uid, community) {
  const { data } = await supabase
    .from('completions')
    .select('points')
    .eq('user_id', uid)
    .eq('community', community);
  const rows = data || [];
  return {
    points: rows.reduce((acc, r) => acc + (r.points || 0), 0),
    missions: rows.length,
  };
}

async function getDoneDays(uid, community) {
  const { data } = await supabase
    .from('completions')
    .select('day')
    .eq('user_id', uid)
    .eq('community', community)
    .order('day');
  return (data || []).map((r) => r.day);
}

async function giveCompletion(uid, day, community) {
  const pts = MISSIONS[day - 1][2];
  const { data, error } = await supabase
    .from('completions')
    .upsert(
      { user_id: uid, day, points: pts, community },
      { onConflict: 'user_id,day,community', ignoreDuplicates: true }
    )
    .select('id');
  if (error) throw error;
  return data && data.length > 0 ? pts : 0;
}

const avatarUrl = (u) => {
  if (!u?.avatar) return null;
  if (u.avatar.startsWith('http://') || u.avatar.startsWith('https://')) return u.avatar;
  return u.discord_id
    ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png?size=128`
    : null;
};

/* Verificações automáticas de missão */
const checks = {
  login: async () => true,
  discord: async () => true,
  letter: async (uid, community) => {
    const { count } = await supabase
      .from('letters')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('community', community);
    return (count || 0) > 0;
  },
  reads3: async (uid, community) => {
    const { count } = await supabase
      .from('letter_reads')
      .select('letter_id, letters!inner(community)', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('letters.community', community);
    return (count || 0) >= 3;
  },
  count10: async (uid, community) => {
    const s = await getUserStats(uid, community);
    return s.missions >= 10;
  },
};

const checkMsg = {
  letter: 'Escreva uma cartinha na árvore da comunidade primeiro.',
  reads3: 'Leia 3 cartinhas da árvore da comunidade primeiro.',
  count10: 'Conclua 10 missões antes desta.',
};

/* ---------- App e segurança ---------- */
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
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://cdn.discordapp.com',
          'https://lh3.googleusercontent.com',
          'https://*.supabase.co',
        ],
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
    if (req.user) req.user.isAdmin = isUserAdmin(req.user);
    next();
  })
);

const limits = { standardHeaders: 'draft-7', legacyHeaders: false };
app.use('/api', rateLimit({ ...limits, windowMs: 60_000, limit: 120, message: { error: 'muitas_requisicoes' } }));
const strict = rateLimit({ ...limits, windowMs: 60_000, limit: 15, message: { error: 'muitas_requisicoes' } });

const requireAuth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'nao_autenticado' }));
const requireAdmin = (req, res, next) => (req.user?.isAdmin ? next() : res.status(403).json({ error: 'sem_permissao' }));

app.use('/api', (req, res, next) =>
  req.path === '/me' || req.user ? next() : res.status(401).json({ error: 'nao_autenticado' })
);

/* ---------- Login com Discord ---------- */
app.get('/auth/discord', (req, res) => {
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${getBaseUrl(req)}/auth/discord/callback`;
  const returnTo = safeReturnPath(req.query.returnTo);

  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 10 * 60 * 1000 });
  res.cookie('oauth_return', returnTo, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state,
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get(
  '/auth/discord/callback',
  run(async (req, res) => {
    const { code, state } = req.query;
    const saved = req.cookies.oauth_state;
    const returnTo = safeReturnPath(req.cookies.oauth_return);
    const loginCommunity = extractCommunityFromPath(returnTo);
    const redirectUri = `${getBaseUrl(req)}/auth/discord/callback`;
    res.clearCookie('oauth_state');
    res.clearCookie('oauth_return');
    if (!code || !state || state !== saved) return res.redirect(`${returnTo}?erro=state`);

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

      const meRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!meRes.ok) throw new Error(`users/@me ${meRes.status}`);
      const d = await meRes.json();

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('discord_id', d.id)
        .maybeSingle();

      let userId = existing?.id;
      if (userId) {
        const { error: uErr } = await supabase
          .from('users')
          .update({
            username: d.global_name || d.username,
            avatar: d.avatar,
          })
          .eq('id', userId);
        if (uErr) throw uErr;
      } else {
        const { data: created, error: uErr } = await supabase
          .from('users')
          .insert({
            discord_id: d.id,
            username: d.global_name || d.username,
            avatar: d.avatar,
            community: loginCommunity,
          })
          .select('id')
          .single();
        if (uErr) throw uErr;
        userId = created.id;
      }

      await createSession(res, userId);
      res.redirect(`${returnTo}#inicio`);
    } catch (e) {
      console.error('Erro no login do Discord:', e.message);
      res.redirect(`${returnTo}?erro=discord`);
    }
  })
);

/* ---------- Login com Google ---------- */
app.get('/auth/google', (req, res) => {
  const returnTo = safeReturnPath(req.query.returnTo);
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${returnTo}?erro=google_config`);
  }
  const state = randomBytes(16).toString('hex');
  const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 10 * 60 * 1000 });
  res.cookie('oauth_return', returnTo, { httpOnly: true, sameSite: 'lax', secure: PROD, maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get(
  '/auth/google/callback',
  run(async (req, res) => {
    const { code, state } = req.query;
    const saved = req.cookies.oauth_state;
    const returnTo = safeReturnPath(req.cookies.oauth_return);
    const loginCommunity = extractCommunityFromPath(returnTo);
    const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;
    res.clearCookie('oauth_state');
    res.clearCookie('oauth_return');
    if (!code || !state || state !== saved) return res.redirect(`${returnTo}?erro=state`);

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) throw new Error(`google token ${tokenRes.status}`);
      const { access_token } = await tokenRes.json();

      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!infoRes.ok) throw new Error(`google userinfo ${infoRes.status}`);
      const g = await infoRes.json();

      const email = String(g.email || '').trim().toLowerCase();
      if (!g.sub || !email) throw new Error('google_sem_email');

      let { data: existing } = await supabase
        .from('users')
        .select('id, username, avatar')
        .eq('google_id', g.sub)
        .maybeSingle();

      if (!existing) {
        const resByEmail = await supabase
          .from('users')
          .select('id, username, avatar')
          .eq('email', email)
          .maybeSingle();
        existing = resByEmail.data;
      }

      let userId = existing?.id;
      if (userId) {
        const { error } = await supabase
          .from('users')
          .update({
            google_id: g.sub,
            email,
            avatar: existing.avatar || g.picture || null,
          })
          .eq('id', userId);
        if (error) throw error;
      } else {
        const displayName = String(g.name || email.split('@')[0]).trim().slice(0, 40);
        const { data: created, error } = await supabase
          .from('users')
          .insert({
            google_id: g.sub,
            email,
            username: displayName,
            avatar: g.picture || null,
            community: loginCommunity,
          })
          .select('id')
          .single();
        if (error) throw error;
        userId = created.id;
      }

      await createSession(res, userId);
      res.redirect(`${returnTo}#inicio`);
    } catch (e) {
      console.error('Erro no login do Google:', e.message);
      res.redirect(`${returnTo}?erro=google`);
    }
  })
);

/* ---------- Cadastro e Login com E-mail/Usuário e Senha ---------- */
app.post(
  '/auth/register',
  strict,
  run(async (req, res) => {
    const name = String(req.body?.name ?? '').trim().slice(0, 40);
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const loginCommunity = getReqCommunity(req);

    if (name.length < 2) {
      return res.status(400).json({ error: 'nome_invalido', message: 'Informe um nome com pelo menos 2 caracteres.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'email_invalido', message: 'Informe um e-mail válido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'senha_curta', message: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    const { data: exists } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (exists) {
      return res.status(409).json({ error: 'email_em_uso', message: 'Este e-mail já está cadastrado. Faça login.' });
    }

    const { data: created, error } = await supabase
      .from('users')
      .insert({
        email,
        username: name,
        password_hash: hashPassword(password),
        community: loginCommunity,
      })
      .select('id')
      .single();
    if (error) throw error;

    await createSession(res, created.id);
    res.status(201).json({ ok: true });
  })
);

app.post(
  '/auth/login',
  strict,
  run(async (req, res) => {
    const loginInput = String(req.body?.login ?? req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!loginInput || !password) {
      return res.status(400).json({ error: 'dados_incompletos', message: 'Preencha e-mail/usuário e senha.' });
    }

    const query = supabase.from('users').select('id, password_hash, google_id, discord_id');
    const { data: user } = loginInput.includes('@')
      ? await query.eq('email', loginInput.toLowerCase()).maybeSingle()
      : await query.ilike('username', loginInput).limit(1).maybeSingle();

    if (!user) {
      return res.status(401).json({ error: 'credenciais_invalidas', message: 'Usuário/e-mail ou senha incorretos.' });
    }
    if (!user.password_hash) {
      const metodo = user.google_id ? 'Google' : 'Discord';
      return res.status(400).json({
        error: 'usar_oauth',
        message: `Esta conta foi criada com ${metodo}. Continue usando o ícone do ${metodo}.`,
      });
    }
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'credenciais_invalidas', message: 'Usuário/e-mail ou senha incorretos.' });
    }

    await createSession(res, user.id);
    res.json({ ok: true });
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

/* ---------- Perfil e Dados da Comunidade ---------- */
app.get(
  '/api/me',
  run(async (req, res) => {
    const comm = getReqCommunity(req);
    const meta = getCommunityMeta(comm);
    const communities = Object.values(COMMUNITIES);

    if (!req.user) {
      return res.json({ user: null, community: meta, communities });
    }

    const ev = eventState();
    const showPoints = Boolean(req.user.isAdmin || ev.finale);
    const [s, done] = await Promise.all([
      getUserStats(req.user.id, comm),
      getDoneDays(req.user.id, comm),
    ]);
    const provider = req.user.discord_id ? 'discord' : req.user.google_id ? 'google' : 'email';

    res.json({
      user: {
        id: req.user.id,
        name: req.user.username,
        email: req.user.email || null,
        provider,
        avatar: avatarUrl(req.user),
        discord: { connected: Boolean(req.user.discord_id), id: req.user.discord_id },
        isAdmin: req.user.isAdmin,
        community: comm,
        tag: meta.tag,
        communityName: meta.name,
      },
      community: meta,
      communities,
      points: showPoints ? s.points : null,
      showPoints,
      missionsDone: s.missions,
      done,
    });
  })
);

/* ---------- Evento e missões ---------- */
app.get(
  '/api/event',
  run(async (req, res) => {
    const ev = eventState();
    const community = getReqCommunity(req);
    const meta = getCommunityMeta(community);

    const subs = new Map();
    const [doneDays, { data: subRows }] = await Promise.all([
      getDoneDays(req.user.id, community),
      supabase
        .from('submissions')
        .select('day, status')
        .eq('user_id', req.user.id)
        .eq('community', community),
    ]);
    const done = new Set(doneDays);
    (subRows || []).forEach((s) => subs.set(s.day, s.status));

    const showPoints = Boolean(req.user?.isAdmin || ev.finale);
    const missions = MISSIONS.map(([title, objective, points, verify], i) => {
      const day = i + 1;
      let status;
      if (done.has(day)) status = 'done';
      else if (day > ev.today) status = 'locked';
      else if (subs.get(day) === 'pending') status = 'pending';
      else if (subs.get(day) === 'rejected') status = 'rejected';
      else status = day === ev.today && ev.status === 'live' ? 'today' : 'open';
      return {
        day,
        title,
        objective,
        points: showPoints ? points : null,
        status,
        needsReview: verify === 'review',
      };
    });

    res.json({
      status: ev.status,
      today: ev.today,
      finale: ev.finale,
      start: EVENT_START,
      community,
      communityMeta: meta,
      missions,
    });
  })
);

app.post(
  '/api/missions/:day/complete',
  strict,
  requireAuth,
  run(async (req, res) => {
    const day = parseInt(req.params.day, 10);
    const community = getReqCommunity(req);
    const m = MISSIONS[day - 1];
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
      .eq('community', community)
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
        .eq('community', community)
        .maybeSingle();

      if (curSub && curSub.status !== 'rejected') {
        return res.status(409).json({ error: 'em_analise' });
      }

      await supabase
        .from('submissions')
        .upsert(
          { user_id: uid, day, proof, status: 'pending', community },
          { onConflict: 'user_id,day,community' }
        );
      return res.status(202).json({ status: 'pending' });
    }

    if (!(await checks[verify](uid, community))) {
      return res.status(400).json({ error: 'requisito_pendente', message: checkMsg[verify] });
    }
    const points = await giveCompletion(uid, day, community);
    const stats = await getUserStats(uid, community);
    const showPoints = Boolean(req.user.isAdmin || ev.finale);

    res.json({
      status: 'done',
      points: showPoints ? points : null,
      total: showPoints ? stats.points : null,
    });
  })
);

/* ---------- Ranking e Prêmios da Comunidade ---------- */
app.get(
  '/api/ranking',
  requireAuth,
  run(async (req, res) => {
    const community = getReqCommunity(req);
    const meta = getCommunityMeta(community);

    const { data: rows } = await supabase
      .from('completions')
      .select('user_id, points, created_at, users!inner(username, discord_id, avatar)')
      .eq('community', community);

    const map = new Map();
    for (const r of rows || []) {
      if (!r.users) continue;
      const cur = map.get(r.user_id) || {
        user_id: r.user_id,
        name: r.users.username,
        discord_id: r.users.discord_id,
        avatar: r.users.avatar,
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
      tag: meta.tag,
      points: r.total,
      missions: r.missions,
    }));

    const idx = sorted.findIndex((r) => r.user_id === req.user.id);
    const s = await getUserStats(req.user.id, community);
    const me = { points: s.points, missions: s.missions, position: idx >= 0 ? idx + 1 : null };

    res.json({ ranking, me, community });
  })
);

app.get('/api/prizes', requireAuth, (req, res) => {
  res.json({ prizes: PRIZES, milestones: MILESTONES });
});

/* ---------- Árvore de cartinhas ---------- */
app.get(
  '/api/letters',
  run(async (req, res) => {
    const community = getReqCommunity(req);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 60);
    const { data } = await supabase
      .from('letters')
      .select('id, author, text, created_at')
      .eq('hidden', false)
      .eq('community', community)
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
  run(async (req, res) => {
    const community = getReqCommunity(req);
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
      .eq('community', community)
      .gt('created_at', since);

    if ((count || 0) >= 3) {
      return res.status(429).json({ error: 'limite_diario', message: 'Você já pendurou 3 cartinhas nas últimas 24 horas.' });
    }

    const author = req.body?.anonymous ? 'Anônimo' : req.user.username;
    const { data: created, error } = await supabase
      .from('letters')
      .insert({ user_id: req.user.id, author, text, community })
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
    const community = getReqCommunity(req);
    const { data: l } = await supabase
      .from('letters')
      .select('user_id')
      .eq('id', id)
      .eq('hidden', false)
      .eq('community', community)
      .maybeSingle();
    if (!l) return res.status(404).json({ error: 'cartinha_inexistente' });

    if (l.user_id !== req.user.id) {
      await supabase
        .from('letter_reads')
        .upsert({ user_id: req.user.id, letter_id: id }, { onConflict: 'user_id,letter_id', ignoreDuplicates: true });
    }
    const { count } = await supabase
      .from('letter_reads')
      .select('letter_id, letters!inner(community)', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('letters.community', community);
    res.json({ reads: count || 0 });
  })
);

/* ---------- Galeria de Artes ---------- */
app.get(
  '/api/gallery',
  requireAuth,
  run(async (req, res) => {
    const community = getReqCommunity(req);

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
  run(async (req, res) => {
    const community = getReqCommunity(req);
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
    const filePath = `${community}/${req.user.id}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;

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
        community,
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
    const community = getReqCommunity(req);
    const status = req.query.status === 'rejected' ? 'rejected' : 'pending';

    const { data } = await supabase
      .from('submissions')
      .select('id, day, proof, status, community, created_at, users(username, discord_id)')
      .eq('status', status)
      .eq('community', community)
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
      community: s.community || community,
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

    const { data: s } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle();
    if (!s || s.status !== 'pending') return res.status(404).json({ error: 'nao_encontrada' });

    await supabase
      .from('submissions')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', s.id);
    if (action === 'approve') {
      await giveCompletion(s.user_id, s.day, s.community || DEFAULT_COMMUNITY);
    }
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

/* ---------- Site, rotas /comunidade/:slug/natal e start ---------- */
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'rota_inexistente' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get(/^\/comunidade\/ducks(\/.*)?$/i, (req, res) => {
  res.redirect('/comunidade/heaven/natal');
});

app.get('/comunidade/:slug', (req, res) => {
  res.redirect(`/comunidade/${normalizeSlug(req.params.slug)}/natal`);
});

app.get(['/', '/comunidade', '/comunidade/', /^\/comunidade\/[^/]+\/natal(\/.*)?$/i], (req, res) => {
  const indexFile = path.join(__dirname, 'public', 'index.html');
  if (existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  res.type('html').send('<h1>Servidor no ar, mas falta o build em public/index.html</h1>');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 413 ? 'corpo_grande' : 'erro_interno' });
});

if (!VERCEL) {
  setInterval(() => supabase.from('sessions').delete().lt('expires_at', Date.now()), 3600_000).unref();
  const server = app.listen(PORT, () => {
    const ev = eventState();
    console.log(
      `\nPortal Vulpora & Natal Mágico no ar!\n` +
      `• Portal:      http://localhost:${PORT}/comunidade\n` +
      `• The Kingdom: http://localhost:${PORT}/comunidade/thekingdom/natal\n` +
      `• Heaven:      http://localhost:${PORT}/comunidade/heaven/natal\n` +
      `(Evento: ${ev.status}, dia ${ev.today})\n`
    );
  });
  server.on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `A porta ${PORT} já está em uso.` : `Erro ao iniciar: ${e.message}`);
    process.exit(1);
  });
}

export default app;