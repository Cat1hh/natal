import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getRouteContext } from './api.js';
import {
  DEFAULT_COMMUNITIES,
  getFallbackMeta,
  useHash,
  useWide,
} from './hooks/useAppNavigation.js';
import { Login } from './features/auth/LoginView.jsx';
import { PortalLayout } from './features/portal/PortalLayout.jsx';
import { CommunityLayout } from './features/community/CommunityLayout.jsx';
import { EventLayout } from './features/events/EventLayout.jsx';

export { TreePage } from './features/events/natal/TreePage.jsx';

export default function App() {
  const route = useHash();
  const wide = useWide();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const { isPortal, communitySlug, isCommunity } = getRouteContext(pathname);

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

    if (ctx.isPortal) {
      setEv(null);
      setRk(null);
      return;
    }

    if (ctx.isCommunity) {
      const r = await api.ranking().catch(() => ({ ranking: [], me: null }));
      setRk(r);
      setEv(null);
      return;
    }

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

  if (me === undefined) {
    return (
      <div className="vulpora-auth-shell">
        <div className="vulpora-waves" aria-hidden="true" />
        <p className="m center pad" style={{ position: 'relative', zIndex: 2 }}>Carregando Vulpora…</p>
      </div>
    );
  }

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

  if (isPortal) {
    return (
      <>
        <PortalLayout
          user={me.user}
          communities={communities}
          onSelectCommunity={(slug) => navigateTo(`/comunidade/${slug}`)}
          onLogout={logout}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </>
    );
  }

  if (isCommunity) {
    return (
      <>
        <CommunityLayout
          me={me}
          rk={rk}
          activeMeta={activeMeta}
          commTag={commTag}
          communitySlug={communitySlug}
          navigateTo={navigateTo}
          onLogout={logout}
          onNotify={say}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </>
    );
  }

  return (
    <>
      <EventLayout
        me={me}
        ev={ev}
        rk={rk}
        pz={pz}
        letters={letters}
        gallery={gallery}
        route={route}
        wide={wide}
        activeMeta={activeMeta}
        commName={commName}
        commTag={commTag}
        communitySlug={communitySlug}
        isAdmin={isAdmin}
        modal={modal}
        setModal={setModal}
        burst={burst}
        navigateTo={navigateTo}
        onLogout={logout}
        onCompleteMission={complete}
        onWriteLetter={write}
        onSubmitArt={submitArt}
        onReviewArt={reviewArt}
        onOpenLetter={openLetter}
      />
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}