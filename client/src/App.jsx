import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getRouteContext } from './api.js';
import { Tree, Snow, Burst } from './tree.jsx';
import { Icon } from './icons.jsx';
import {
  Avatar,
  CommunityTag,
  VulporaLogo,
  CommunitiesHub,
  CommunityPage,
  Login,
  Home,
  Calendar,
  Ranking,
  Prizes,
  Profile,
  MissionModal,
  WriteModal,
  LetterModal,
  GalleryPage,
  GalleryModal,
  GalleryInspectModal,
  RulesPage,
  SupportPage,
} from './views.jsx';

const DEFAULT_COMMUNITIES = [
  {
    slug: 'thekingdom',
    tag: 'THE KINGDOM',
    name: 'The Kingdom',
    theme: 'kingdom',
    subtitle: 'Comunidade oficial · Eventos, desafios, histórias e recompensas exclusivas',
  },
  {
    slug: 'heaven',
    tag: 'HEAVEN',
    name: 'Heaven',
    theme: 'ducks',
    subtitle: 'Comunidade oficial Heaven · Eventos, desafios e recompensas exclusivas',
  },
];

function getFallbackMeta(slug) {
  if (slug === 'heaven') return DEFAULT_COMMUNITIES[1];
  return DEFAULT_COMMUNITIES[0];
}

function useHash() {
  const get = () => location.hash.slice(1) || 'inicio';
  const [h, setH] = useState(get);
  useEffect(() => {
    const f = () => setH(get());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return h;
}

function useWide() {
  const q = '(min-width:1180px)';
  const [w, setW] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), f = (e) => setW(e.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return w;
}

function Side({ rk, pz, done, showPrizes }) {
  const [t, setT] = useState('rk');
  return (
    <div className="glass hot">
      {showPrizes ? (
        <div className="seg">
          <button className={t === 'rk' ? 'on' : ''} onClick={() => setT('rk')}>
            <Icon name="trophy" size={15} />
            <span>Ranking</span>
          </button>
          <button className={t === 'pr' ? 'on' : ''} onClick={() => setT('pr')}>
            <Icon name="gift" size={15} />
            <span>Premiações</span>
          </button>
        </div>
      ) : (
        <h3 className="ico-title" style={{ marginTop: 0, marginBottom: 10 }}>
          <Icon name="trophy" size={20} />
          <span>Ranking do Evento</span>
        </h3>
      )}
      {t === 'rk' || !showPrizes ? <Ranking rk={rk} /> : <Prizes pz={pz} done={done} />}
    </div>
  );
}

/* ---------- Página Exclusiva da Árvore (dentro do Evento de Natal) ---------- */
export function TreePage({ letters = [], communityMeta, onOpen, onWrite }) {
  const [page, setPage] = useState(0);
  const total = letters.length;
  const pages = Math.max(1, Math.ceil(total / 12));
  const current = page % pages;
  const visible = letters.slice(current * 12, current * 12 + 12);

  const openRandom = () => {
    if (!total) return;
    const pick = letters[Math.floor(Math.random() * total)];
    onOpen?.(pick);
  };

  return (
    <section className="glass hot tree-page">
      <div className="tree-head">
        <div>
          <p className="eyebrow">
            Correio de Natal · {communityMeta?.tag || 'COMUNIDADE'}
          </p>
          <div className="who-name">
            <h2 style={{ margin: 0 }}>Árvore de {communityMeta?.name || 'Comunidade'}</h2>
            <CommunityTag tag={communityMeta?.tag} theme={communityMeta?.theme} />
          </div>
          <p className="m">
            Toque em qualquer envelope pendurado nos galhos para ler uma mensagem ou deixe a sua.
          </p>
        </div>
        <span className="badge gold">
          <Icon name="mail" size={14} />
          <span>{total} {total === 1 ? 'cartinha' : 'cartinhas'}</span>
        </span>
      </div>

      <div className="tree-stage">
        <Tree letters={visible} onOpen={onOpen} />
      </div>

      {visible.length > 0 && (
        <div className="letter-tags" aria-label="Cartinhas penduradas">
          {visible.map((l, idx) => (
            <button
              key={l.id ?? idx}
              type="button"
              className="letter-pill"
              onClick={() => onOpen?.(l)}
              title={`Ler cartinha de ${l.author || 'Anônimo'}`}
            >
              <Icon name="mail" size={14} />
              <span>{l.author || 'Anônimo'}</span>
            </button>
          ))}
        </div>
      )}

      {!total && (
        <p className="m center">A árvore ainda está sem cartinhas. Seja a primeira pessoa a pendurar uma!</p>
      )}

      <div className="tree-actions">
        <button className="btn red" onClick={onWrite}>
          <Icon name="mail" size={17} />
          <span>Escrever cartinha</span>
        </button>
        {total > 0 && (
          <button className="btn ghost" onClick={openRandom}>
            <Icon name="sparkles" size={17} />
            <span>Ler aleatória</span>
          </button>
        )}
        {total > 12 && (
          <button className="btn ghost" onClick={() => setPage((p) => p + 1)}>
            <Icon name="refresh" size={16} />
            <span>Ver outras ({current + 1}/{pages})</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const route = useHash(), wide = useWide();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const { isPortal, communitySlug, isEvent, isCommunity } = getRouteContext(pathname);

  const [me, setMe] = useState(undefined);
  const [communities, setCommunities] = useState(DEFAULT_COMMUNITIES);
  const [communityMeta, setCommunityMeta] = useState(null);
  const [netErr, setNetErr] = useState('');
  const [ev, setEv] = useState(null);
  const [rk, setRk] = useState(null);
  const [pz, setPz] = useState(null);
  const [letters, setLetters] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [burst, setBurst] = useState(0);
  const toastTimer = useRef(null);

  const navigateTo = useCallback((nextPath) => {
    const [cleanPath, hashPart] = nextPath.split('#');
    window.history.pushState(null, '', nextPath);
    setPathname(cleanPath);
    if (hashPart) {
      window.location.hash = hashPart;
    } else if (window.location.hash) {
      window.history.replaceState(null, '', cleanPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Normaliza /comunidade/ducks -> /comunidade/heaven
  useEffect(() => {
    if (/^\/comunidade\/ducks(\/|$)/i.test(pathname)) {
      const normalized = pathname.replace(/^\/comunidade\/ducks/i, '/comunidade/heaven');
      window.history.replaceState(null, '', `${normalized}${window.location.search}${window.location.hash}`);
      setPathname(normalized);
    }
  }, [pathname]);

  const say = useCallback((t) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const load = useCallback(async () => {
    setNetErr('');
    const ctx = getRouteContext(window.location.pathname);
    const m = await api.me();
    if (m.communities?.length) setCommunities(m.communities);
    if (m.community) setCommunityMeta(m.community);
    if (!m.user) return setMe(null);

    setMe(m);

    // Portal (/ ou /comunidade): não carrega dados de comunidade/evento
    if (ctx.isPortal) {
      setEv(null);
      setRk(null);
      return;
    }

    // Página da Comunidade (/comunidade/:slug): carrega ranking da comunidade
    if (ctx.isCommunity) {
      const r = await api.ranking().catch(() => ({ ranking: [], me: null }));
      setRk(r);
      setEv(null);
      return;
    }

    // Página do Evento (/comunidade/:slug/natal): carrega tudo do evento
    const [e, r, p, l, g] = await Promise.all([
      api.event(),
      api.ranking().catch(() => ({ ranking: [], me: null })),
      api.prizes().catch(() => null),
      api.letters(),
      api.gallery ? api.gallery().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
    ]);
    setEv(e);
    setRk(r);
    setPz(p);
    setLetters(l.letters || []);
    setGallery(g?.items || g?.gallery || []);
  }, []);

  useEffect(() => {
    load().catch(() => {
      setNetErr('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
      setMe(null);
    });
  }, [load, pathname]);

  const activeMeta = isPortal ? null : (communityMeta || getFallbackMeta(communitySlug));
  const commName = activeMeta?.name || 'Vulpora';
  const commTag = activeMeta?.tag || 'COMUNIDADES';

  // Separação estrita de temas:
  // 1) Deslogado ou Portal -> 'vulpora' (screen: 'login' | 'portal')
  // 2) Comunidade -> 'kingdom' ou 'ducks' (screen: 'community') — SEM Natal
  // 3) Evento -> 'natal' + community accent (screen: 'event') — COM Natal
  useEffect(() => {
    const root = document.documentElement;
    if (!me) {
      root.dataset.screen = 'login';
      root.dataset.community = 'vulpora';
    } else if (isPortal) {
      root.dataset.screen = 'portal';
      root.dataset.community = 'vulpora';
    } else if (isCommunity) {
      root.dataset.screen = 'community';
      root.dataset.community = activeMeta?.theme || (communitySlug === 'heaven' ? 'ducks' : 'kingdom');
    } else {
      root.dataset.screen = 'event';
      root.dataset.community = activeMeta?.theme || (communitySlug === 'heaven' ? 'ducks' : 'kingdom');
    }
  }, [me, isPortal, isCommunity, activeMeta?.theme, communitySlug]);

  useEffect(() => {
    const f = (e) => e.key === 'Escape' && setModal(null);
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, []);

  const isAdmin = Boolean(
    me?.user?.isAdmin || me?.user?.admin || me?.isAdmin || me?.user?.role === 'admin'
  );
  const now = new Date();
  const isFinale = Boolean(ev?.finale || (now.getMonth() === 11 && now.getDate() >= 26));
  const canSeePrizes = isAdmin || isFinale;

  const tabs = [
    ['inicio', 'home', 'Início do Evento'],
    ['arvore', 'tree', 'Árvore de Natal'],
    ['calendario', 'calendar', 'Calendário'],
    ['ranking', 'trophy', 'Ranking'],
    ['galeria', 'gallery', 'Galeria'],
    ['regras', 'rules', 'Regras'],
    ['suporte', 'support', 'Suporte'],
    ...(canSeePrizes ? [['premios', 'gift', 'Premiações']] : []),
    ['perfil', 'user', 'Perfil'],
  ];

  const complete = async (day, proof) => {
    try {
      const r = await api.complete(day, proof);
      if (r.status === 'pending') say('Enviado! Um admin vai conferir.');
      else {
        say(r.points != null ? `+${r.points} pontos!` : 'Missão concluída!');
        setBurst((b) => b + 1);
      }
      setModal(null);
      await load();
    } catch (e) {
      say(e.message);
    }
  };

  const write = async (text, anonymous) => {
    try {
      const res = await api.postLetter(text, anonymous);
      const created = res?.letter || res;
      const newLetter = {
        id: created?.id ?? Date.now(),
        text: created?.text ?? text.trim(),
        author: anonymous ? 'Anônimo' : (created?.author || me?.user?.name || 'Participante'),
      };

      setLetters((prev) => [newLetter, ...prev.filter((item) => item.id !== newLetter.id)]);
      setModal(null);
      say('Cartinha pendurada na árvore!');

      api.letters().then((d) => {
        if (d?.letters?.length) {
          setLetters((prev) => {
            const exists = d.letters.some((x) => x.id === newLetter.id);
            return exists ? d.letters : [newLetter, ...d.letters.filter((x) => x.id !== newLetter.id)];
          });
        }
      }).catch(() => {});
    } catch (e) {
      say(e.message);
    }
  };

  const submitArt = async (payload) => {
    try {
      if (api.postGallery) {
        await api.postGallery(payload);
        await load();
      } else {
        setGallery((prev) => [
          {
            id: Date.now(),
            title: payload.title,
            message: payload.message,
            imageUrl: payload.imageUrl,
            status: 'pending',
            authorId: me?.user?.id,
            authorName: me?.user?.name,
          },
          ...prev,
        ]);
      }
      setModal(null);
      say('Arte enviada para aprovação dos administradores!');
    } catch (e) {
      say(e.message || 'Erro ao enviar arte.');
    }
  };

  const reviewArt = async (id, status) => {
    try {
      if (api.reviewGallery) {
        await api.reviewGallery(id, status);
        await load();
      } else {
        setGallery((prev) =>
          status === 'rejected'
            ? prev.filter((item) => item.id !== id)
            : prev.map((item) => (item.id === id ? { ...item, status } : item))
        );
      }
      say(status === 'approved' ? 'Arte aprovada e publicada!' : 'Arte recusada.');
    } catch (e) {
      say(e.message || 'Erro ao moderar arte.');
    }
  };

  const openLetter = (l) => {
    setModal({ t: 'letter', l });
    api.readLetter(l.id).catch(() => {});
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setMe(null);
    setEv(null);
    setRk(null);
    setPz(null);
    setLetters([]);
    setGallery([]);
    setModal(null);
    navigateTo('/');
  };

  const openMission = (m) => setModal({ t: 'mission', day: m.day });

  const activeTab = tabs.find(([id]) => id === route) ? route : 'inicio';
  const currentTabLabel = tabs.find(([id]) => id === activeTab)?.[2] || 'Início do Evento';

  /* ========================================================================
     1. CARREGANDO SESSÃO (VULPORA)
     ======================================================================== */
  if (me === undefined) {
    return (
      <div className="vulpora-auth-shell">
        <div className="vulpora-waves" aria-hidden="true" />
        <p className="m center pad" style={{ position: 'relative', zIndex: 2 }}>Carregando Vulpora…</p>
      </div>
    );
  }

  /* ========================================================================
     2. TELA DE LOGIN (100% VULPORA — SEPARADA DE COMUNIDADE E DE EVENTO)
     ======================================================================== */
  if (!me) {
    return (
      <>
        <Login
          erro={netErr || new URLSearchParams(location.search).get('erro')}
          isPortal={isPortal}
          onNotify={say}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </>
    );
  }

  /* ========================================================================
     3. PORTAL DE COMUNIDADES (/comunidade — VULPORA)
     ======================================================================== */
  if (isPortal) {
    return (
      <div className="vulpora-portal-shell">
        <div className="vulpora-waves" aria-hidden="true" />
        <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
          <header className="portal-topbar">
            <VulporaLogo compact />
            <div className="topbar-right">
              <div className="chip vp-chip">
                <Avatar u={me.user} />
                <span className="uname">{me.user.name}</span>
              </div>
              <button type="button" className="btn ghost btn-sm" onClick={logout}>
                Sair
              </button>
            </div>
          </header>

          <main>
            <CommunitiesHub
              user={me.user}
              communities={communities}
              onSelect={(slug) => navigateTo(`/comunidade/${slug}`)}
            />
          </main>
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  /* ========================================================================
     4. PÁGINA DA COMUNIDADE (/comunidade/:slug — TEMA KINGDOM / HEAVEN, SEM NATAL)
     ======================================================================== */
  if (isCommunity) {
    return (
      <div className={`comm-shell theme-${activeMeta?.theme || 'kingdom'}`}>
        <div className="comm-backdrop" aria-hidden="true" />
        <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
          <header className="comm-topbar">
            <div className="crumb">
              <span className="dot" />
              <button
                type="button"
                className="crumb-link"
                onClick={() => navigateTo('/comunidade')}
              >
                VULPORA
              </button>
              <span className="sep">/</span>
              <b>{commTag}</b>
            </div>

            <div className="topbar-right">
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={() => navigateTo('/comunidade')}
              >
                Trocar comunidade
              </button>
              <div className="chip">
                <Avatar u={me.user} />
                <span className="uname">{me.user.name}</span>
                <CommunityTag tag={commTag} theme={activeMeta?.theme} />
              </div>
              <button type="button" className="btn ghost btn-sm" onClick={logout}>
                Sair
              </button>
            </div>
          </header>

          <main>
            <CommunityPage
              me={me}
              rk={rk}
              communityMeta={activeMeta}
              onEnterEvent={() => navigateTo(`/comunidade/${communitySlug}/natal#inicio`)}
              onNotify={say}
            />
          </main>
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  /* ========================================================================
     5. PÁGINA DO EVENTO (/comunidade/:slug/natal — EVENTO DE NATAL)
     ======================================================================== */
  const view = !ev ? (
    <p className="m center pad">Carregando evento…</p>
  ) : activeTab === 'arvore' ? (
    <TreePage
      letters={letters}
      communityMeta={activeMeta}
      onOpen={openLetter}
      onWrite={() => setModal({ t: 'write' })}
    />
  ) : activeTab === 'calendario' ? (
    <Calendar ev={ev} communityMeta={activeMeta} onMission={openMission} />
  ) : activeTab === 'galeria' ? (
    <GalleryPage
      items={gallery}
      me={me}
      communityMeta={activeMeta}
      isAdmin={isAdmin}
      onOpenForm={() => setModal({ t: 'gallery-new' })}
      onReview={reviewArt}
      onInspect={(art) => setModal({ t: 'gallery-view', art })}
    />
  ) : activeTab === 'regras' ? (
    <RulesPage />
  ) : activeTab === 'suporte' ? (
    <SupportPage />
  ) : activeTab === 'ranking' ? (
    <section className="glass hot">
      <p className="eyebrow">{commTag} · CLASSIFICAÇÃO DO EVENTO</p>
      <h2>Ranking · Natal Mágico</h2>
      <Ranking rk={rk || { ranking: [] }} />
    </section>
  ) : activeTab === 'premios' && canSeePrizes ? (
    <section className="glass hot">
      <h2>Premiações</h2>
      <Prizes pz={pz} done={me.missionsDone} />
    </section>
  ) : activeTab === 'perfil' ? (
    <Profile me={me} communityMeta={activeMeta} onLogout={logout} />
  ) : (
    <Home
      me={me}
      ev={ev}
      communityMeta={activeMeta}
      letters={letters}
      onOpen={openLetter}
      onWrite={() => setModal({ t: 'write' })}
      onMission={openMission}
      onBackToCommunity={() => navigateTo(`/comunidade/${communitySlug}`)}
    />
  );

  const activeMission = modal?.t === 'mission'
    ? ev?.missions?.find((x) => x.day === modal.day) ?? ev?.missions?.[modal.day - 1]
    : null;

  const body =
    !modal ? null :
    modal.t === 'mission' ? <MissionModal key={modal.day} m={activeMission} onSubmit={complete} /> :
    modal.t === 'write' ? <WriteModal authorName={me?.user?.name} onSend={write} /> :
    modal.t === 'gallery-new' ? <GalleryModal onSubmit={submitArt} /> :
    modal.t === 'gallery-view' ? <GalleryInspectModal art={modal.art} /> :
    <LetterModal l={modal.l} />;

  const showRightWidget =
    me && ev && wide && rk && activeTab !== 'ranking' && activeTab !== 'premios' && activeTab !== 'inicio';

  return (
    <>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <Snow />

      <div className="app-shell">
        <aside className="sidebar" aria-label="Navegação do evento">
          <div>
            <a href="#inicio" className="side-brand">
              <span className="side-emblem">
                <Icon name="sparkles" size={18} />
              </span>
              <div>
                <div className="brand">Natal Mágico</div>
                <small>EVENTO · {commTag}</small>
              </div>
            </a>

            <p className="side-label">EVENTO DE NATAL</p>
            <nav className="side-nav">
              {tabs.map(([id, icon, name]) => (
                <a key={id} href={`#${id}`} className={activeTab === id ? 'on' : ''}>
                  <span className="nav-ico" aria-hidden="true">
                    <Icon name={icon} size={18} />
                  </span>
                  <span>{name}</span>
                </a>
              ))}
            </nav>
          </div>

          <div className="side-foot">
            <div className="side-progress">
              <div className="side-prog-top">
                <span>Progresso Natal</span>
                <b>{me.missionsDone}/25</b>
              </div>
              <div className="bar mini">
                <i style={{ width: `${(me.missionsDone / 25) * 100}%` }} />
              </div>
            </div>

            <button
              type="button"
              className="btn ghost"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigateTo(`/comunidade/${communitySlug}`)}
            >
              <Icon name="home" size={16} />
              <span>Voltar para {commName}</span>
            </button>
          </div>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <div className="crumb">
              <span className="dot" />
              <button
                type="button"
                className="crumb-link"
                onClick={() => navigateTo('/comunidade')}
              >
                VULPORA
              </button>
              <span className="sep">/</span>
              <button
                type="button"
                className="crumb-link"
                onClick={() => navigateTo(`/comunidade/${communitySlug}`)}
              >
                {commTag}
              </button>
              <span className="sep">/</span>
              <span>NATAL 2026</span>
              <span className="sep">/</span>
              <b>{currentTabLabel}</b>
            </div>

            <div className="topbar-right">
              <a href="#perfil" className="chip" title="Ver perfil">
                <Avatar u={me.user} />
                <span className="uname">{me.user.name}</span>
                <CommunityTag tag={commTag} theme={activeMeta?.theme} />
                {me.points != null && <span>· {me.points} pts</span>}
              </a>
            </div>
          </header>

          <div className={showRightWidget ? 'layout' : ''}>
            <main>{view}</main>
            {showRightWidget && (
              <aside className="side">
                <Side rk={rk} pz={pz} done={me.missionsDone} showPrizes={canSeePrizes} />
              </aside>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div className="ov" onClick={() => setModal(null)}>
          <div className="box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => setModal(null)} aria-label="Fechar">
              <Icon name="x" size={18} />
            </button>
            {body}
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
      {burst > 0 && <Burst key={burst} />}
    </>
  );
}