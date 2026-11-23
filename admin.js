import express from 'express';
import { randomUUID } from 'node:crypto';

export class AdminError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new AdminError(status, message); };
export const communitySlug = (value) => ({ ducks: 'heaven', heavem: 'heaven', kingdom: 'thekingdom', 'the-kingdom': 'thekingdom' }[String(value).toLowerCase()] || String(value).toLowerCase());
export function communityPermissions(role, platform = false) {
  const all = platform || ['owner', 'admin'].includes(role);
  return { settings: all || role === 'editor', events: all || role === 'editor', members: all || role === 'moderator', team: all, moderation: all || role === 'moderator', audit: all, platform };
}
const txt = (value, name, max, min = 0) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400, `Informe ${name} válido (até ${max} caracteres).`);
  return value.trim();
};
const choice = (value, allowed) => { if (!allowed.includes(value)) fail(400, 'Opção inválida.'); return value; };
export function communityChanges(body, platform) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Dados inválidos.');
  const columns = { name: ['name', 60, 2], tag: ['tag', 30, 1], description: ['description', 500, 0], subtitle: ['subtitle', 220, 0], hero: ['hero_title', 100, 0], heroSubtitle: ['hero_subtitle', 220, 0], symbol: ['symbol', 8, 0] };
  const patch = {};
  for (const [key, value] of Object.entries(body)) {
    if (columns[key]) { const [col, max, min] = columns[key]; patch[col] = txt(value, key, max, min); }
    else if (['primary', 'secondary', 'accent'].includes(key)) {
      if (!/^#[0-9a-f]{6}$/i.test(value)) fail(400, 'Use uma cor hexadecimal válida.');
      patch[`${key}_color`] = value;
    } else if (key === 'cover') {
      patch.cover_url = txt(value, 'URL da capa', 2000);
      if (value && !/^https:\/\//i.test(value)) fail(400, 'A capa deve usar uma URL HTTPS.');
      if (value) { try { new URL(value); } catch { fail(400, 'URL da capa inválida.'); } }
    } else if (key === 'modules') {
      if (!Array.isArray(value) || value.length > 12) fail(400, 'Informe até 12 módulos.');
      patch.modules = value.map(v => txt(v, 'módulo', 80, 1));
    } else if (['status', 'visibility', 'entry', 'ownerUserId'].includes(key)) {
      if (!platform) fail(403, 'Somente a administração Vulpora pode alterar acesso, proprietário ou situação da comunidade.');
      if (key === 'status') patch.status = choice(value, ['ativa', 'preparacao', 'suspensa']);
      if (key === 'visibility') patch.visibility = choice(value, ['publica', 'privada']);
      if (key === 'entry') patch.entry_mode = choice(value, ['livre', 'aprovacao']);
      if (key === 'ownerUserId') patch.owner_user_id = value ? txt(String(value), 'ID do proprietário', 128, 1) : null;
    } else fail(400, `Campo não permitido: ${key}.`);
  }
  if (!Object.keys(patch).length) fail(400, 'Nenhuma alteração informada.');
  return patch;
}

function check(result) {
  if (result.error) {
    if (['42P01', '42703', 'PGRST202', 'PGRST204', 'PGRST205'].includes(result.error.code)) {
      fail(503, 'Administração ainda não configurada. Aplique a migração sql/001_admin.sql no Supabase.');
    }
    if (result.error.code === '23505') fail(409, 'Esse registro já existe.');
    throw result.error;
  }
  return result.data;
}

export function createAdminStore(db, getCommunities) {
  const rows = async query => check(await query) || [];
  const usersFor = async ids => ids.length ? rows(db.from('users').select('id, username, avatar').in('id', [...new Set(ids)])) : [];
  const people = async list => {
    const users = await usersFor(list.map(r => r.user_id));
    return list.map(r => ({ ...r, userId: String(r.user_id), name: users.find(u => String(u.id) === String(r.user_id))?.username || `Usuário ${r.user_id}` }));
  };
  const count = async (table, column, slug, status) => {
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (slug) q = q.eq(column, slug);
    if (status) q = q.eq('status', status);
    const result = await q; check(result); return result.count || 0;
  };
  return {
    communities: async () => Object.values(await getCommunities()),
    community: async slug => (await getCommunities())[slug] || null,
    user: async id => check(await db.from('users').select('id, username').eq('id', id).maybeSingle()),
    role: async (id, slug) => (check(await db.from('community_staff').select('role').eq('community_slug', slug).eq('user_id', id).maybeSingle()))?.role || null,
    async managed(user, platform) {
      const communities = Object.values(await getCommunities());
      if (platform) return communities.map(c => ({ slug: c.slug, name: c.name, role: 'admin' }));
      const staff = await rows(db.from('community_staff').select('community_slug, role').eq('user_id', user.id).neq('role', 'revoked'));
      return communities.flatMap(c => {
        const role = String(c.ownerUserId) === String(user.id) ? 'owner' : staff.find(s => s.community_slug === c.slug)?.role;
        return role ? [{ slug: c.slug, name: c.name, role }] : [];
      });
    },
    createCommunity: async data => check(await db.from('communities').insert(data).select('slug').single()),
    updateCommunity: async (slug, data) => check(await db.from('communities').update(data).eq('slug', slug).select('slug').maybeSingle()),
    async users(search = '') {
      let q = db.from('users').select('id, username, email').order('id', { ascending: false }).limit(50);
      if (search) q = q.ilike(search.includes('@') ? 'email' : 'username', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
      return rows(q);
    },
    membership: async (slug, id) => check(await db.from('community_memberships').select('user_id, status').eq('community_slug', slug).eq('user_id', id).maybeSingle()),
    members: async slug => people(await rows(db.from('community_memberships').select('user_id, status, created_at').eq('community_slug', slug).order('created_at', { ascending: false }).limit(100))),
    team: async slug => people(await rows(db.from('community_staff').select('user_id, role').eq('community_slug', slug).neq('role', 'revoked'))),
    saveTeam: async (slug, id, role, actor) => check(await db.from('community_staff').upsert({ community_slug: slug, user_id: id, role, updated_by: actor }, { onConflict: 'community_slug,user_id' })),
    saveMember: async (slug, id, status, actor) => check(await db.from('community_memberships').update({ status, updated_by: actor }).eq('community_slug', slug).eq('user_id', id).select('user_id').maybeSingle()),
    events: async slug => rows(db.from('community_events').select('id, title, description, status, starts_at, slug, created_at').eq('community_slug', slug).neq('status', 'archived').order('created_at', { ascending: false })),
    saveEvent: async data => check(await db.from('community_events').upsert(data, { onConflict: 'community_slug,id' })),
    archiveEvent: async (slug, id, actor) => check(await db.from('community_events').update({ status: 'archived', updated_by: actor }).eq('community_slug', slug).eq('id', id).select('id').maybeSingle()),
    async moderation(slug) {
      const query = (table, cols) => { let q = db.from(table).select(cols); if (slug) q = q.eq('community', slug); return q; };
      const [submissions, gallery, letters] = await Promise.all([
        rows(query('submissions', 'id, user_id, day, proof, status, community, created_at').eq('status', 'pending').order('id', { ascending: false }).limit(100)),
        rows(query('gallery', 'id, title, message, image_url, author_name, community, status').eq('status', 'pending').order('id', { ascending: false }).limit(100)),
        rows(query('letters', 'id, text, community, hidden').eq('hidden', false).order('id', { ascending: false }).limit(100)),
      ]);
      return { submissions, gallery, letters };
    },
    async review(kind, id, slug, action, actor, points) {
      const result = check(await db.rpc('admin_moderate_item', { p_kind: kind, p_id: Number(id), p_community: slug, p_action: action, p_actor: actor, p_points: points }));
      if (!result?.ok) fail(409, 'O item não existe nesta comunidade ou já foi analisado. Atualize a fila.');
      return result;
    },
    async audit(slug) {
      let q = db.from('admin_audit_log').select('id, actor_id, community_slug, entity_type, entity_id, action, details, created_at').order('id', { ascending: false }).limit(100);
      if (slug) q = q.eq('community_slug', slug);
      return rows(q);
    },
    async stats(slug) {
      const [members, requests, submissions, gallery, users] = await Promise.all([
        count('community_memberships', 'community_slug', slug, 'active'), count('community_memberships', 'community_slug', slug, 'pending'),
        count('submissions', 'community', slug, 'pending'), count('gallery', 'community', slug, 'pending'),
        slug ? 0 : count('users'),
      ]);
      return { members, requests, submissions, gallery, users };
    },
  };
}

export function createAdminRouter({ store, isPlatformAdmin, missionPoints }) {
  const router = express.Router();
  const run = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);
  router.use(['/admin', '/communities/:slug/admin'], (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Entre na sua conta para administrar.' });
    res.set('Cache-Control', 'no-store'); next();
  });
  const platform = user => { if (!isPlatformAdmin(user)) fail(403, 'Acesso restrito à administração Vulpora.'); };
  async function access(req, permission) {
    const slug = communitySlug(req.params.slug);
    if (!/^[a-z0-9_-]{2,64}$/.test(slug)) fail(404, 'Comunidade não encontrada.');
    const community = await store.community(slug);
    if (!community) fail(404, 'Comunidade não encontrada.');
    const global = isPlatformAdmin(req.user);
    const role = String(community.ownerUserId) === String(req.user.id) ? 'owner' : global ? 'admin' : await store.role(req.user.id, slug);
    if (!['owner', 'admin', 'editor', 'moderator'].includes(role)) fail(403, 'Você não faz parte da equipe desta comunidade.');
    const permissions = communityPermissions(role, global);
    if (permission && !permissions[permission]) fail(403, 'Sua função não permite esta ação.');
    return { slug, community, permissions, role };
  }
  router.get('/admin/dashboard', run(async (req, res) => {
    platform(req.user);
    const [communities, stats, users, moderation, audit] = await Promise.all([store.communities(), store.stats(), store.users(String(req.query.q || '').slice(0, 100)), store.moderation(), store.audit()]);
    res.json({ scope: 'platform', communities, stats, users, moderation, audit });
  }));
  router.post('/admin/communities', run(async (req, res) => {
    platform(req.user);
    const slug = txt(req.body?.slug, 'slug', 64, 2);
    if (!/^[a-z0-9][a-z0-9_-]+$/.test(slug) || communitySlug(slug) !== slug) fail(400, 'Use um slug canônico com letras minúsculas, números ou hífens.');
    if (await store.community(slug)) fail(409, 'Já existe uma comunidade com esse slug.');
    const { slug: ignored, ...fields } = req.body;
    const patch = communityChanges(fields, true);
    if (!patch.name) fail(400, 'Informe o nome da comunidade.');
    if (patch.owner_user_id && !await store.user(patch.owner_user_id)) fail(400, 'Proprietário não encontrado.');
    await store.createCommunity({ ...patch, slug, updated_by: String(req.user.id) });
    res.status(201).json({ ok: true, slug });
  }));
  router.get('/communities/:slug/admin/dashboard', run(async (req, res) => {
    const ctx = await access(req);
    const [stats, members, team, events, moderation, audit] = await Promise.all([
      store.stats(ctx.slug), ctx.permissions.members || ctx.permissions.team ? store.members(ctx.slug) : [], store.team(ctx.slug), store.events(ctx.slug),
      ctx.permissions.moderation ? store.moderation(ctx.slug) : { submissions: [], gallery: [], letters: [] }, ctx.permissions.audit ? store.audit(ctx.slug) : [],
    ]);
    res.json({ scope: 'community', ...ctx, stats, members, team, events, moderation, audit });
  }));
  router.patch('/communities/:slug/admin/settings', run(async (req, res) => {
    const ctx = await access(req, 'settings');
    const patch = communityChanges(req.body, ctx.permissions.platform);
    if (patch.owner_user_id && !await store.user(patch.owner_user_id)) fail(400, 'Proprietário não encontrado.');
    if (!await store.updateCommunity(ctx.slug, { ...patch, updated_by: String(req.user.id) })) fail(404, 'Comunidade não configurada no banco. Aplique a migração administrativa.');
    res.json({ ok: true });
  }));
  router.put('/communities/:slug/admin/team/:userId', run(async (req, res) => {
    const ctx = await access(req, 'team');
    const id = txt(req.params.userId, 'usuário', 128, 1);
    const role = choice(req.body?.role, ['admin', 'moderator', 'editor', 'revoked']);
    if (String(req.user.id) === id) fail(409, 'Peça a outro administrador para alterar a sua função.');
    if (String(ctx.community.ownerUserId) === id) fail(409, 'O proprietário é definido pela administração Vulpora.');
    if (!await store.user(id)) fail(404, 'Usuário não encontrado.');
    if (!ctx.permissions.platform && (await store.membership(ctx.slug, id))?.status !== 'active') fail(400, 'O integrante precisa ser membro ativo desta comunidade.');
    await store.saveTeam(ctx.slug, id, role, String(req.user.id));
    res.json({ ok: true });
  }));
  router.patch('/communities/:slug/admin/members/:userId', run(async (req, res) => {
    const ctx = await access(req, 'members');
    const id = txt(req.params.userId, 'usuário', 128, 1);
    const status = choice(req.body?.status, ['active', 'rejected', 'blocked']);
    if (status !== 'active' && (String(ctx.community.ownerUserId) === id || ['admin', 'moderator', 'editor'].includes(await store.role(id, ctx.slug)))) fail(409, 'Remova a função de equipe antes de bloquear este integrante.');
    if (!await store.saveMember(ctx.slug, id, status, String(req.user.id))) fail(404, 'Solicitação ou membro não encontrado nesta comunidade.');
    res.json({ ok: true });
  }));
  router.post('/communities/:slug/admin/events', run(async (req, res) => {
    const ctx = await access(req, 'events');
    const body = req.body || {};
    if (Object.keys(body).some(k => !['id', 'title', 'description', 'status', 'startsAt'].includes(k))) fail(400, 'Campo de evento não permitido.');
    const id = body.id ? txt(body.id, 'ID do evento', 100, 1) : randomUUID();
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) fail(400, 'ID do evento inválido.');
    const startsAt = txt(body.startsAt, 'data do evento', 16, 16);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt) || !Number.isFinite(Date.parse(startsAt + ':00-03:00'))) fail(400, 'Data inválida. Use o horário de Brasília.');
    await store.saveEvent({ id, community_slug: ctx.slug, title: txt(body.title, 'título', 90, 2), description: txt(body.description || '', 'descrição', 500), status: choice(body.status, ['draft', 'upcoming', 'live', 'ended']), starts_at: startsAt, updated_by: String(req.user.id) });
    res.status(201).json({ ok: true, id });
  }));
  router.delete('/communities/:slug/admin/events/:id', run(async (req, res) => {
    const ctx = await access(req, 'events');
    if (!await store.archiveEvent(ctx.slug, req.params.id, String(req.user.id))) fail(404, 'Evento não encontrado nesta comunidade.');
    res.json({ ok: true });
  }));
  router.post('/communities/:slug/admin/moderation/:kind/:id', run(async (req, res) => {
    const ctx = await access(req, 'moderation');
    const kind = choice(req.params.kind, ['submissions', 'gallery', 'letters']);
    if (!/^\d+$/.test(req.params.id)) fail(400, 'Identificador inválido.');
    const action = choice(req.body?.action, kind === 'letters' ? ['hide'] : ['approve', 'reject']);
    await store.review(kind, req.params.id, ctx.slug, action, String(req.user.id), missionPoints);
    res.json({ ok: true });
  }));
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (!(error instanceof AdminError)) console.error('admin_request_failed', error.code || error.name);
    res.status(error.status || 500).json({ message: error instanceof AdminError ? error.message : 'Não foi possível concluir a operação administrativa.' });
  });
  return router;
}
