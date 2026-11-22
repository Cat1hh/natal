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
const PROD_DOMAIN = 'vulpora.com.br';

const IS_WORKER = Boolean(globalThis.__CLOUDFLARE_WORKER__ || process.env.CF_PAGES);
const IS_SERVERLESS = Boolean(process.env.VERCEL || IS_WORKER);

const getEnv = (key, fallback = '') => {
  const val = process.env[key];
  return typeof val === 'string' && val.trim() !== '' ? val.trim() : fallback;
};

const isLocalHost = (host = '') => /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(host).trim());

const FALLBACK_COMMUNITIES = {
  thekingdom: {
    slug: 'thekingdom',
    tag: 'THE KINGDOM',
    name: 'The Kingdom',
    description: 'Um reino de encontros, conquistas e histórias compartilhadas.',
    theme: 'kingdom',
    members: 128,
    visualTheme: {
      primary: '#101d2d',
      secondary: '#223c52',
      accent: '#f3cf8a',
      font: 'Georgia',
      hero: 'O reino espera por você',
      subtitle: 'Onde cada membro faz parte de uma grande história.',
      symbol: '♛',
      cover: '',
    },
    subtitle: 'Comunidade oficial · Eventos, desafios e recompensas exclusivas',
    events: [
      {
        id: 'natal-2026',
        slug: 'natal',
        title: 'Natal Mágico 2026',
        badge: 'AO VIVO AGORA',
        status: 'live',
        date: '01 Dez – 25 Dez',
        isoDate: '2026-12-01T00:00',
        description: '25 dias de missões diárias, árvore de cartinhas da comunidade e premiações especiais.',
        cta: 'Entrar no Evento',
        path: '/comunidade/thekingdom/natal',
      },
      {
        id: 'ano-novo-2027',
        title: 'Virada Real · Ano Novo',
        badge: 'EM BREVE',
        status: 'upcoming',
        date: '28 Dez – 03 Jan',
        isoDate: '2026-12-28T20:00',
        description: 'Retrospectiva do reino, sorteios relâmpago no Discord e insígnia exclusiva de Ano Novo.',
        cta: 'Avise-me',
      },
    ],
  },
  heaven: {
    slug: 'heaven',
    tag: 'HEAVEN',
    name: 'Heaven',
    description: 'Um espaço para imaginar, compartilhar e explorar novas experiências.',
    theme: 'ducks',
    members: 42,
    visualTheme: {
      primary: '#102939',
      secondary: '#20495c',
      accent: '#8febed',
      font: 'Arial',
      hero: 'Novos mundos começam aqui',
      subtitle: 'Uma comunidade que brilha com suas próprias ideias.',
      symbol: '✧',
      cover: '',
    },
    subtitle: 'Comunidade oficial Heaven · Eventos, desafios e recompensas exclusivas',
    events: [
      {
        id: 'natal-2026-heaven',
        slug: 'natal',
        title: 'Natal Mágico 2026 · Heaven',
        badge: 'AO VIVO AGORA',
        status: 'live',
        date: '01 Dez – 25 Dez',
        isoDate: '2026-12-01T00:00',
        description: '25 dias de missões diárias, árvore de cartinhas da Heaven e premiações exclusivas.',
        cta: 'Entrar no Evento',
        path: '/comunidade/heaven/natal',
      },
      {
        id: 'ano-novo-2027-heaven',
        title: 'Virada Heaven · Ano Novo',
        badge: 'EM BREVE',
        status: 'upcoming',
        date: '28 Dez – 03 Jan',
        isoDate: '2026-12-28T20:00',
        description: 'Celebração de fim de ano da Heaven com sorteios no Discord e insígnia especial.',
        cta: 'Avise-me',
      },
    ],
  },
};

function normalizeEventPath(rawPath, communitySlug, eventSlug) {
  const fallback = eventSlug ? `/comunidade/${communitySlug}/${eventSlug}` : undefined;
  const val = String(rawPath || fallback || '').trim();
  if (!val) return undefined;
  return val
    .replace(/^\/#/, '')
    .replace(/^\/comunidade\/ducks(?=\/|$)/i, '/comunidade/heaven');
}

function mapCommunityRow(row) {
  const events = Array.isArray(row.events) ? row.events : [];
  return {
    slug: row.slug,
    tag: row.tag || row.name.toUpperCase(),
    name: row.name,
    description: row.description,
    subtitle: row.subtitle || 'Comunidade oficial · Eventos, desafios e recompensas exclusivas',
    owner: row.owner_name || 'VULPORA',
    status: row.status || 'ativa',
    visibility: row.visibility || 'publica',
    entry: row.entry_mode || 'livre',
    members: row.members_count ?? 0,
    theme: row.slug === 'heaven' ? 'ducks' : 'kingdom',
    visualTheme: {
      primary: row.primary_color || '#140b2b',
      secondary: row.secondary_color || '#12283d',
      accent: row.accent_color || '#f3cf8a',
      font: 'Georgia',
      hero: row.hero_title || 'Onde a magia e a comunidade se encontram',
      subtitle: row.hero_subtitle || 'Participe dos eventos oficiais e celebrações.',
      symbol: row.symbol || '✦',
      cover: row.cover_url || '',
    },
    events: events.map((ev) => ({
      ...ev,
      path: normalizeEventPath(ev.path, row.slug, ev.slug),
    })),
  };
}

async function fetchAllCommunities() {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .order('created_at', { ascending: true });

  if (!error && Array.isArray(data) && data.length > 0) {
    const map = {};
    for (const row of data) map[row.slug] = mapCommunityRow(row);
    return map;
  }
  return FALLBACK_COMMUNITIES;
}

const PORT = Number(getEnv('PORT', '3000')) || 3000;
const NODE_ENV = getEnv('NODE_ENV', IS_SERVERLESS ? 'production' : 'development');
const PROD = NODE_ENV === 'production' || IS_SERVERLESS;
const SESSION_MS = 30 * 24 * 3600 * 1000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const CLIENT_DIR = path.join(__dirname, 'client');
const CLIENT_PUBLIC_DIR = path.join(CLIENT_DIR, 'public');
const CLIENT_DIST_DIR = path.join(CLIENT_DIR, 'dist');
const run = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const memoryMemberships = new Map();
const memoryMessages = [];

function normalizeSlug(raw) {
  const clean = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  if (clean === 'ducks' || clean === 'heavem') return 'heaven';
  if (clean === 'the-kingdom' || clean === 'kingdom') return 'thekingdom';
  return clean || DEFAULT_COMMUNITY;
}

function extractCommunityFromPath(urlOrPath) {
  const match = String(urlOrPath || '').match(/(?:#)?\/comunidade\/([^/?#]+)/i);
  return normalizeSlug(match?.[1]);
}

function getReqCommunity(req) {
  return normalizeSlug(
    req.query.community ||
      req.get('x-community') ||
      extractCommunityFromPath(req.get('referer'))
  );
}

async function getCommunityMeta(slug) {
  const key = normalizeSlug(slug);
  const all = await fetchAllCommunities();
  if (all[key]) return all[key];

  const label = key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const base = all[DEFAULT_COMMUNITY] || FALLBACK_COMMUNITIES[DEFAULT_COMMUNITY];
  return {
    slug: key,
    tag: label.toUpperCase(),
    name: label,
    description: `Comunidade oficial ${label}`,
    theme: 'kingdom',
    members: 1,
    visualTheme: base.visualTheme,
    subtitle: 'Comunidade oficial · Eventos, desafios e recompensas',
    events: base.events.map((ev) => ({
      ...ev,
      path: ev.slug ? `/comunidade/${key}/${ev.slug}` : undefined,
    })),
  };
}

function safeReturnPath(raw, fallback = '/#/portal/comunidades') {
  const val = String(raw || '').trim();
  if (!val) return fallback;
  if (val.startsWith('/') && !/^\/[\/\\]/.test(val)) {
    const normalized = val.replace(/^(\/#)?\/comunidade\/ducks(?=\/|$)/i, '$1/comunidade/heaven');
    if (/^\/comunidade\/[^/]+\/natal(\/|$)/i.test(normalized)) {
      return normalized;
    }
    if (normalized !== '/' && !normalized.startsWith('/#')) {
      return `/#${normalized}`;
    }
    return normalized;
  }
  return fallback;
}

function oauthErrorRedirect(code) {
  const encoded = encodeURIComponent(code);
  return `/?erro=${encoded}#/login?erro=${encoded}`;
}

function isUserAdmin(u) {
  if (!u) return false;
  const admins = new Set(getEnv('ADMIN_IDS').split(',').map((s) => s.trim()).filter(Boolean));
  const adminEmails = new Set(
    getEnv('ADMIN_EMAILS')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  return Boolean(
    (u.discord_id && admins.has(String(u.discord_id))) ||
    (u.email && adminEmails.has(String(u.email).toLowerCase()))
  );
}

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

function isSecureRequest(req) {
  const host = req.get('host') || '';
  if (isLocalHost(host)) return false;
  return PROD && (req.secure || req.get('x-forwarded-proto') === 'https');
}

function cookieOptions(req, maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

async function createSession(req, res, userId) {
  await supabase.from('sessions').delete().lt('expires_at', Date.now());
  const sid = randomBytes(32).toString('hex');
  const { error } = await supabase
    .from('sessions')
    .insert({ id: sid, user_id: userId, expires_at: Date.now() + SESSION_MS });
  if (error) throw error;
  res.cookie('sid', sid, cookieOptions(req, SESSION_MS));
}

function getBaseUrl(req) {
  const host = (req.get('host') || '').replace(/^www\./i, '');
  if (isLocalHost(host)) {
    const proto = req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${proto}://${host}`;
  }
  const envBase = getEnv('BASE_URL').replace(/\/$/, '');
  if (envBase && (!PROD || !/localhost|127\.0\.0\.1/i.test(envBase))) {
    return envBase;
  }
  if (host) {
    const proto = PROD ? 'https' : req.get('x-forwarded-proto') || req.protocol || 'http';
    return `${proto}://${host}`;
  }
  return PROD ? `https://${PROD_DOMAIN}` : `http://localhost:${PORT}`;
}

function getDiscordRedirectUri(req) {
  const host = req.get('host') || '';
  const suffix = req.path.startsWith('/api/') ? '/api/auth/discord/callback' : '/auth/discord/callback';
  if (isLocalHost(host)) {
    return `${getBaseUrl(req)}${suffix}`;
  }
  const envUri = getEnv('DISCORD_REDIRECT_URI');
  if (envUri && (!PROD || !/localhost|127\.0\.0\.1/i.test(envUri))) {
    return envUri;
  }
  return `${getBaseUrl(req)}${suffix}`;
}

function getGoogleRedirectUri(req) {
  const host = req.get('host') || '';
  const suffix = req.path.startsWith('/api/') ? '/api/auth/google/callback' : '/auth/google/callback';
  if (isLocalHost(host)) {
    return `${getBaseUrl(req)}${suffix}`;
  }
  const envUri = getEnv('GOOGLE_REDIRECT_URI');
  if (envUri && (!PROD || !/localhost|127\.0\.0\.1/i.test(envUri))) {
    return envUri;
  }
  return `${getBaseUrl(req)}${suffix}`;
}

async function insertUserSafe(payload, selectCols = 'id') {
  let res = await supabase.from('users').insert(payload).select(selectCols).single();
  if (res.error && /community/i.test(String(res.error.message || ''))) {
    const { community, ...fallbackPayload } = payload;
    res = await supabase.from('users').insert(fallbackPayload).select(selectCols).single();
  }
  if (res.error) throw res.error;
  return res.data;
}

/* ---------- Dia do evento ---------- */
function eventState() {
  const eventStart = getEnv('EVENT_START', '2026-12-01');
  const dbg = parseInt(getEnv('DEBUG_DAY'), 10);
  if (!PROD && dbg >= 1 && dbg <= 25) return { status: 'live', today: dbg, finale: false };
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diff = Math.round((Date.parse(hoje) - Date.parse(eventStart)) / 86400000);
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

function formatPortalUser(u) {
  if (!u) return null;
  const provider = u.discord_id ? 'discord' : u.google_id ? 'google' : 'email';
  return {
    id: u.id,
    name: u.username,
    email: u.email || null,
    provider,
    avatarUrl: avatarUrl(u),
    role: isUserAdmin(u) ? 'ADM' : 'USER',
  };
}

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
const trustProxy = getEnv('TRUST_PROXY');
if (trustProxy || IS_SERVERLESS) app.set('trust proxy', Number(trustProxy) || 1);

app.use((req, res, next) => {
  const host = req.get('host') || '';
  if (/^www\./i.test(host)) {
    return res.redirect(301, `https://${host.replace(/^www\./i, '')}${req.originalUrl}`);
  }
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: PROD
          ? ["'self'", 'https://*.supabase.co']
          : ["'self'", 'https://*.supabase.co', 'ws:', 'wss:'],
        upgradeInsecureRequests: PROD && !IS_WORKER ? [] : null,
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
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return next();
  return res.status(403).json({ error: 'origem_invalida' });
});

app.use(
  run(async (req, res, next) => {
    const sid = req.cookies?.sid;
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

const PUBLIC_API_PATHS = new Set([
  '/me',
  '/auth/me',
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/discord',
  '/auth/discord/callback',
  '/auth/google',
  '/auth/google/callback',
  '/communities/public',
  '/messages',
]);
app.use('/api', (req, res, next) => {
  const isPublicLettersGet = req.method === 'GET' && req.path === '/letters';
  if (PUBLIC_API_PATHS.has(req.path) || isPublicLettersGet || req.user) {
    return next();
  }
  return res.status(401).json({ error: 'nao_autenticado' });
});

/* ---------- Login com Discord (suporta /auth/* e /api/auth/*) ---------- */
app.get(['/auth/discord', '/api/auth/discord'], (req, res) => {
  const clientId = getEnv('DISCORD_CLIENT_ID');
  const clientSecret = getEnv('DISCORD_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.error('[Discord OAuth] DISCORD_CLIENT_ID ou DISCORD_CLIENT_SECRET ausente');
    return res.redirect(oauthErrorRedirect('discord_config'));
  }
  const state = randomBytes(16).toString('hex');
  const redirectUri = getDiscordRedirectUri(req);
  const returnTo = safeReturnPath(req.query.returnTo, '/#/portal/comunidades');

  res.cookie('oauth_state', state, cookieOptions(req, 10 * 60 * 1000));
  res.cookie('oauth_return', returnTo, cookieOptions(req, 10 * 60 * 1000));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get(
  ['/auth/discord/callback', '/api/auth/discord/callback'],
  run(async (req, res) => {
    const clientId = getEnv('DISCORD_CLIENT_ID');
    const clientSecret = getEnv('DISCORD_CLIENT_SECRET');
    const { code, state, error: oauthErr, error_description: oauthDesc } = req.query;
    const saved = req.cookies?.oauth_state;
    const returnTo = safeReturnPath(req.cookies?.oauth_return, '/#/portal/comunidades');
    const loginCommunity = extractCommunityFromPath(returnTo);
    const redirectUri = getDiscordRedirectUri(req);

    res.clearCookie('oauth_state', { path: '/' });
    res.clearCookie('oauth_return', { path: '/' });

    if (!clientId || !clientSecret) {
      console.error('[Discord OAuth] Credenciais ausentes no callback');
      return res.redirect(oauthErrorRedirect('discord_config'));
    }
    if (oauthErr) {
      console.error('[Discord OAuth] Recusado pelo Discord:', oauthErr, oauthDesc || '');
      return res.redirect(oauthErrorRedirect('discord'));
    }
    if (!code || !state || state !== saved) {
      console.error('[Discord OAuth] State inválido:', { hasCode: Boolean(code), state, saved });
      return res.redirect(oauthErrorRedirect('state'));
    }

    try {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        throw new Error(`token HTTP ${tokenRes.status} (redirect_uri="${redirectUri}"): ${body}`);
      }
      const { access_token } = await tokenRes.json();

      const meRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!meRes.ok) {
        const body = await meRes.text();
        throw new Error(`users/@me HTTP ${meRes.status}: ${body}`);
      }
      const d = await meRes.json();

      const email = d.email ? String(d.email).trim().toLowerCase() : null;
      const displayName = String(d.global_name || d.username || 'Viajante').trim().slice(0, 40);

      let { data: existing, error: selErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('discord_id', String(d.id))
        .maybeSingle();
      if (selErr) throw selErr;

      let emailAlreadyUsed = false;
      if (!existing && email) {
        const resByEmail = await supabase
          .from('users')
          .select('id, email')
          .eq('email', email)
          .maybeSingle();
        if (resByEmail.error) throw resByEmail.error;
        existing = resByEmail.data;
        emailAlreadyUsed = Boolean(existing);
      }

      let userId = existing?.id;
      if (userId) {
        const { error: uErr } = await supabase
          .from('users')
          .update({
            discord_id: String(d.id),
            username: displayName,
            avatar: d.avatar || null,
          })
          .eq('id', userId);
        if (uErr) throw uErr;
      } else {
        const created = await insertUserSafe(
          {
            discord_id: String(d.id),
            username: displayName,
            avatar: d.avatar || null,
            ...(email && !emailAlreadyUsed ? { email } : {}),
            community: loginCommunity,
          },
          'id'
        );
        userId = created.id;
      }

      await createSession(req, res, userId);
      res.redirect(returnTo);
    } catch (e) {
      console.error('[Discord OAuth] Falha na autenticação:', e?.message || e, e);
      res.redirect(oauthErrorRedirect('discord'));
    }
  })
);

/* ---------- Login com Google (suporta /auth/* e /api/auth/*) ---------- */
app.get(['/auth/google', '/api/auth/google'], (req, res) => {
  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  const returnTo = safeReturnPath(req.query.returnTo, '/#/portal/comunidades');
  if (!clientId || !clientSecret) {
    return res.redirect(oauthErrorRedirect('google_config'));
  }
  const state = randomBytes(16).toString('hex');
  const redirectUri = getGoogleRedirectUri(req);
  res.cookie('oauth_state', state, cookieOptions(req, 10 * 60 * 1000));
  res.cookie('oauth_return', returnTo, cookieOptions(req, 10 * 60 * 1000));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get(
  ['/auth/google/callback', '/api/auth/google/callback'],
  run(async (req, res) => {
    const clientId = getEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
    const { code, state } = req.query;
    const saved = req.cookies?.oauth_state;
    const returnTo = safeReturnPath(req.cookies?.oauth_return, '/#/portal/comunidades');
    const loginCommunity = extractCommunityFromPath(returnTo);
    const redirectUri = getGoogleRedirectUri(req);
    res.clearCookie('oauth_state', { path: '/' });
    res.clearCookie('oauth_return', { path: '/' });
    if (!code || !state || state !== saved) return res.redirect(oauthErrorRedirect('state'));

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        throw new Error(`google token HTTP ${tokenRes.status}: ${body}`);
      }
      const { access_token } = await tokenRes.json();

      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!infoRes.ok) {
        const body = await infoRes.text();
        throw new Error(`google userinfo HTTP ${infoRes.status}: ${body}`);
      }
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
        const created = await insertUserSafe(
          {
            google_id: g.sub,
            email,
            username: displayName,
            avatar: g.picture || null,
            community: loginCommunity,
          },
          'id'
        );
        userId = created.id;
      }

      await createSession(req, res, userId);
      res.redirect(returnTo);
    } catch (e) {
      console.error('[Google OAuth] Falha na autenticação:', e?.message || e, e);
      res.redirect(oauthErrorRedirect('google'));
    }
  })
);

/* ---------- Cadastro, Login e Logout (suporta /auth/* e /api/auth/*) ---------- */
const handleRegister = run(async (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 40);
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const loginCommunity = getReqCommunity(req);

  if (name.length < 2) {
    return res.status(400).json({
      code: 'nome_invalido',
      error: 'Informe um nome com pelo menos 2 caracteres.',
      message: 'Informe um nome com pelo menos 2 caracteres.',
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      code: 'email_invalido',
      error: 'Informe um e-mail válido.',
      message: 'Informe um e-mail válido.',
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      code: 'senha_curta',
      error: 'A senha precisa ter pelo menos 6 caracteres.',
      message: 'A senha precisa ter pelo menos 6 caracteres.',
    });
  }

  const { data: exists } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (exists) {
    return res.status(409).json({
      code: 'email_em_uso',
      error: 'Este e-mail já está cadastrado. Faça login.',
      message: 'Este e-mail já está cadastrado. Faça login.',
    });
  }

  const created = await insertUserSafe(
    {
      email,
      username: name,
      password_hash: hashPassword(password),
      community: loginCommunity,
    },
    'id, username, email, avatar, discord_id, google_id'
  );

  await createSession(req, res, created.id);
  res.status(201).json({ ok: true, user: formatPortalUser(created) });
});

const handleLogin = run(async (req, res) => {
  const loginInput = String(req.body?.login ?? req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!loginInput || !password) {
    return res.status(400).json({
      code: 'dados_incompletos',
      error: 'Preencha e-mail/usuário e senha.',
      message: 'Preencha e-mail/usuário e senha.',
    });
  }

  const query = supabase
    .from('users')
    .select('id, username, email, avatar, password_hash, google_id, discord_id');
  const { data: user } = loginInput.includes('@')
    ? await query.eq('email', loginInput.toLowerCase()).maybeSingle()
    : await query.ilike('username', loginInput).limit(1).maybeSingle();

  if (!user) {
    return res.status(401).json({
      code: 'credenciais_invalidas',
      error: 'Usuário/e-mail ou senha incorretos.',
      message: 'Usuário/e-mail ou senha incorretos.',
    });
  }
  if (!user.password_hash) {
    const metodo = user.google_id ? 'Google' : 'Discord';
    return res.status(400).json({
      code: 'usar_oauth',
      error: `Esta conta foi criada com ${metodo}. Continue usando o botão do ${metodo}.`,
      message: `Esta conta foi criada com ${metodo}. Continue usando o botão do ${metodo}.`,
    });
  }
  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({
      code: 'credenciais_invalidas',
      error: 'Usuário/e-mail ou senha incorretos.',
      message: 'Usuário/e-mail ou senha incorretos.',
    });
  }

  await createSession(req, res, user.id);
  res.json({ ok: true, user: formatPortalUser(user) });
});

const handleLogout = run(async (req, res) => {
  if (req.cookies?.sid) await supabase.from('sessions').delete().eq('id', req.cookies.sid);
  res.clearCookie('sid', { path: '/' });
  res.json({ ok: true });
});

app.post(['/auth/register', '/api/auth/register'], strict, handleRegister);
app.post(['/auth/login', '/api/auth/login'], strict, handleLogin);
app.post(['/auth/logout', '/api/auth/logout'], handleLogout);

/* ---------- Endpoints usados pelo app.js (Portal Vulpora) ---------- */
app.get(['/auth/me', '/api/auth/me'], (req, res) => {
  res.json({ user: formatPortalUser(req.user) });
});

app.get(
  '/api/communities/public',
  run(async (req, res) => {
    const all = await fetchAllCommunities();
    let dbMemberships = new Map();

    if (req.user) {
      const { data: mRows } = await supabase
        .from('community_memberships')
        .select('community_slug, status')
        .eq('user_id', req.user.id);
      (mRows || []).forEach((m) => dbMemberships.set(m.community_slug, m.status));
    }

    const list = Object.values(all).map((c) => {
      const key = req.user ? `${req.user.id}:${c.slug}` : null;
      const membershipStatus = req.user
        ? dbMemberships.get(c.slug) || memoryMemberships.get(key) || 'active'
        : null;

      return {
        id: c.slug,
        name: c.name,
        description: c.description || c.subtitle,
        owner: c.owner || 'VULPORA',
        status: c.status || 'ativa',
        visibility: c.visibility || 'publica',
        entry: c.entry || 'livre',
        members: c.members ?? 0,
        membershipStatus,
        theme: c.visualTheme,
        modules: ['Mensagem de boas-vindas', 'Próximos eventos', 'Mural da comunidade'],
        team: [{ name: c.owner || 'VULPORA', role: 'Proprietário' }],
        events: (c.events || []).map((ev) => ({
          id: ev.id,
          communityId: c.slug,
          name: ev.title,
          description: ev.description,
          status: ev.status === 'live' ? 'publicado' : 'rascunho',
          type: 'temporario',
          date: ev.isoDate || '2026-12-01T00:00',
          symbol: ev.status === 'live' ? '❄️' : '✨',
          games: ['Jogo da memória', 'Quiz de alternativas'],
          prizes: [],
        })),
      };
    });
    res.json(list);
  })
);

app.post(
  '/api/communities/request',
  requireAuth,
  run(async (req, res) => {
    const slug = normalizeSlug(req.body?.communityId);
    const all = await fetchAllCommunities();
    if (!all[slug]) {
      return res.status(404).json({ error: 'Comunidade não encontrada.' });
    }
    memoryMemberships.set(`${req.user.id}:${slug}`, 'pending');
    await supabase
      .from('community_memberships')
      .upsert(
        { user_id: req.user.id, community_slug: slug, status: 'pending' },
        { onConflict: 'user_id,community_slug' }
      );
    res.status(201).json({ ok: true, status: 'pending' });
  })
);

app.post(
  '/api/admin/communities',
  requireAuth,
  requireAdmin,
  run(async (req, res) => {
    const name = String(req.body?.name ?? '').trim().slice(0, 60);
    const slug = normalizeSlug(req.body?.slug || name);
    const description = String(req.body?.description ?? '').trim().slice(0, 240);

    if (!name || slug.length < 2) {
      return res.status(400).json({ error: 'dados_invalidos', message: 'Informe o nome da comunidade.' });
    }

    const payload = {
      slug,
      tag: slug.toUpperCase(),
      name,
      description: description || `Comunidade oficial ${name}`,
      primary_color: String(req.body?.primary || '#140b2b'),
      secondary_color: String(req.body?.secondary || '#12283d'),
      accent_color: String(req.body?.accent || '#f3cf8a'),
      symbol: String(req.body?.symbol || '✦').slice(0, 4),
      hero_title: String(req.body?.hero || `Bem-vindo à ${name}`).slice(0, 100),
      hero_subtitle: String(req.body?.subtitle || 'Eventos, missões e conquistas exclusivas.').slice(0, 180),
      cover_url: String(req.body?.cover || ''),
    };

    const { data, error } = await supabase
      .from('communities')
      .upsert(payload, { onConflict: 'slug' })
      .select('*')
      .single();
    if (error) throw error;

    res.status(201).json({ ok: true, community: mapCommunityRow(data) });
  })
);

app.post('/api/messages', strict, (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 80);
  const subject = String(req.body?.subject ?? 'Outros').trim().slice(0, 80);
  const message = String(req.body?.message ?? '').trim().slice(0, 1200);
  if (!name || message.length < 3) {
    return res.status(400).json({ error: 'Preencha seu nome e uma mensagem válida.' });
  }
  memoryMessages.unshift({
    id: randomBytes(6).toString('hex'),
    userId: req.user?.id || null,
    name,
    subject,
    message,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ ok: true });
});

/* ---------- Perfil e Dados da Comunidade ---------- */
app.get(
  '/api/me',
  run(async (req, res) => {
    const comm = getReqCommunity(req);
    const [meta, allMap] = await Promise.all([
      getCommunityMeta(comm),
      fetchAllCommunities(),
    ]);
    const communities = Object.values(allMap);

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
  requireAuth,
  run(async (req, res) => {
    const ev = eventState();
    const community = getReqCommunity(req);
    const meta = await getCommunityMeta(community);

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
      start: getEnv('EVENT_START', '2026-12-01'),
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
    const meta = await getCommunityMeta(community);

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

/* ---------- Site e Rotas SPA ---------- */
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'rota_inexistente' }));

if (existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR, { index: false }));
}
app.use(express.static(CLIENT_PUBLIC_DIR, { index: false }));
if (existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR, { index: false }));
}

app.get(/^\/comunidade\/ducks(\/.*)?$/i, (req, res) => {
  res.redirect(302, req.path.replace(/^\/comunidade\/ducks/i, '/comunidade/heaven'));
});

app.get(/^\/comunidade\/[^/]+\/natal(\/.*)?$/i, (req, res) => {
  const builtEventHtml = path.join(PUBLIC_DIR, 'index.html');
  const devEventHtml = path.join(CLIENT_DIR, 'index.html');
  if (existsSync(builtEventHtml)) return res.sendFile(builtEventHtml);
  if (existsSync(devEventHtml)) return res.sendFile(devEventHtml);
  res.status(404).send('<h1>Build do evento não encontrado.</h1>');
});

app.get(/^\/(login|cadastro|comunidades|perfil(\/.*)?|usuario(\/.*)?|evento(\/.*)?|admin(\/.*)?|portal(\/.*)?|comunidade(\/.*)?)$/i, (req, res) => {
  const target = req.path
    .replace(/^\/comunidades\/?$/i, '/portal/comunidades')
    .replace(/^\/comunidade\/([^/]+)\/?$/i, '/comunidade/$1/inicio');

  res.redirect(302, `/#${target}`);
});

app.get('*', (req, res) => {
  const builtPortalHtml = path.join(PUBLIC_DIR, 'vulpora.html');
  const devPortalHtml = path.join(CLIENT_PUBLIC_DIR, 'vulpora.html');
  if (existsSync(builtPortalHtml)) return res.sendFile(builtPortalHtml);
  if (existsSync(devPortalHtml)) return res.sendFile(devPortalHtml);
  res.status(404).send('<h1>Portal Vulpora (vulpora.html) não encontrado.</h1>');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 413 ? 'corpo_grande' : 'erro_interno' });
});

if (!IS_SERVERLESS) {
  setInterval(() => supabase.from('sessions').delete().lt('expires_at', Date.now()), 3600_000).unref();
  const server = app.listen(PORT, () => {
    const ev = eventState();
    console.log(
      `\nPortal Vulpora no ar!\n` +
      `• Início (Portal):    http://localhost:${PORT}/#/\n` +
      `• Login:              http://localhost:${PORT}/#/login\n` +
      `• Seleção Comunidade: http://localhost:${PORT}/#/portal/comunidades\n` +
      `• The Kingdom:        http://localhost:${PORT}/#/comunidade/thekingdom/inicio\n` +
      `• Heaven:             http://localhost:${PORT}/#/comunidade/heaven/inicio\n` +
      `• Evento Natal:       http://localhost:${PORT}/comunidade/thekingdom/natal\n` +
      `(Evento Natal Mágico: ${ev.status}, dia ${ev.today})\n`
    );
  });
  server.on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `A porta ${PORT} já está em uso.` : `Erro ao iniciar: ${e.message}`);
    process.exit(1);
  });
}

export default app;