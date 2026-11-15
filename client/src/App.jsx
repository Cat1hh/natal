import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Tree, Snow, Burst } from './tree.jsx';
import { Icon } from './icons.jsx';
import {
  Avatar,
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
          <span>Ranking (Admin)</span>
        </h3>
      )}
      {t === 'rk' || !showPrizes ? <Ranking rk={rk} /> : <Prizes pz={pz} done={done} />}
    </div>
  );
}

/* ---------- Página Exclusiva da Árvore ---------- */
export function TreePage({ letters = [], onOpen, onWrite }) {
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
          <p className="eyebrow">Correio de Natal</p>
          <h2>A Árvore das Cartinhas</h2>
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
  const [me, setMe] = useState(undefined);
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

  const say = useCallback((t) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const load = useCallback(async () => {
    setNetErr('');
    const m = await api.me();
    if (!m.user) return setMe(null);
    const [e, r, p, l, g] = await Promise.all([
      api.event(),
      api.ranking().catch(() => null),
      api.prizes().catch(() => null),
      api.letters(),
      api.gallery ? api.gallery().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
    ]);
    setMe(m);
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
  }, [load]);

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
  const canSeeRanking = isAdmin || isFinale;
  const canSeePrizes = isFinale;

  const tabs = [
    ['inicio', 'home', 'Início'],
    ['arvore', 'tree', 'Árvore de Natal'],
    ['calendario', 'calendar', 'Calendário'],
    ['galeria', 'gallery', 'Galeria'],
    ['regras', 'rules', 'Regras'],
    ['suporte', 'support', 'Suporte'],
    ...(canSeeRanking ? [['ranking', 'trophy', 'Ranking']] : []),
    ...(canSeePrizes ? [['premios', 'gift', 'Premiações']] : []),
    ['perfil', 'user', 'Perfil'],
  ];

  const complete = async (day, proof) => {
    try {
      const r = await api.complete(day, proof);
      if (r.status === 'pending') say('Enviado! Um admin vai conferir.');
      else { say(`+${r.points} pontos!`); setBurst((b) => b + 1); }
      setModal(null);
      await load();
    } catch (e) { say(e.message); }
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
            authorId: me?.user?.id || me?.user?._id || me?.user?.discordId,
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

  const openLetter = (l) => { setModal({ t: 'letter', l }); api.readLetter(l.id).catch(() => {}); };
  const logout = async () => { await api.logout().catch(() => {}); setMe(null); setModal(null); };
  const openMission = (m) => setModal({ t: 'mission', day: m.day });

  const activeTab = tabs.find(([id]) => id === route) ? route : 'inicio';
  const currentTabLabel = tabs.find(([id]) => id === activeTab)?.[2] || 'Início';

  let view;
  if (me === undefined) view = <p className="m center pad">Acendendo as luzes…</p>;
  else if (!me) view = <Login erro={netErr || new URLSearchParams(location.search).get('erro')} />;
  else if (!ev) view = <p className="m center pad">Carregando…</p>;
  else {
    view =
      activeTab === 'arvore' ? <TreePage letters={letters} onOpen={openLetter} onWrite={() => setModal({ t: 'write' })} /> :
      activeTab === 'calendario' ? <Calendar ev={ev} onMission={openMission} /> :
      activeTab === 'galeria' ? (
        <GalleryPage
          items={gallery}
          me={me}
          isAdmin={isAdmin}
          onOpenForm={() => setModal({ t: 'gallery-new' })}
          onReview={reviewArt}
          onInspect={(art) => setModal({ t: 'gallery-view', art })}
        />
      ) :
      activeTab === 'regras' ? <RulesPage /> :
      activeTab === 'suporte' ? <SupportPage /> :
      activeTab === 'ranking' && canSeeRanking ? <section className="glass hot"><h2>Ranking do Natal</h2><Ranking rk={rk} /></section> :
      activeTab === 'premios' && canSeePrizes ? <section className="glass hot"><h2>Premiações</h2><Prizes pz={pz} done={me.missionsDone} /></section> :
      activeTab === 'perfil' ? <Profile me={me} rk={canSeeRanking ? rk : null} onLogout={logout} /> :
      <Home me={me} ev={ev} letters={letters} onOpen={openLetter} onWrite={() => setModal({ t: 'write' })} onMission={openMission} />;
  }

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
    me && ev && wide && canSeeRanking && rk && activeTab !== 'ranking' && activeTab !== 'premios';

  return (
    <>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <Snow />

      {!me ? (
        <div className="wrap">
          <header className="solo">
            <div className="brand">Natal Mágico</div>
          </header>
          <main>{view}</main>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="sidebar" aria-label="Navegação principal">
            <div>
              <a href="#inicio" className="side-brand">
                <span className="side-emblem">
                  <Icon name="sparkles" size={18} />
                </span>
                <div>
                  <div className="brand">Natal Mágico</div>
                  <small>FESTIVAL DE NATAL · 2026</small>
                </div>
              </a>

              <p className="side-label">O FESTIVAL</p>
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
                  <span>Seu progresso</span>
                  <b>{me.missionsDone}/25</b>
                </div>
                <div className="bar mini">
                  <i style={{ width: `${(me.missionsDone / 25) * 100}%` }} />
                </div>
              </div>

              <div className="side-season">
                <span className="season-star">
                  <Icon name="snowflake" size={18} />
                </span>
                <strong>Advento 2026</strong>
                <p>25 dias para sentir a magia, no seu ritmo.</p>
              </div>
            </div>
          </aside>

          <div className="main-area">
            <header className="topbar">
              <div className="crumb">
                <span className="dot" />
                <span>NATAL MÁGICO</span>
                <span className="sep">/</span>
                <b>{currentTabLabel}</b>
              </div>

              <a href="#perfil" className="chip" title="Ver perfil">
                <Avatar u={me.user} />
                <span>{me.user.name} · {me.points} pts</span>
              </a>
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
      )}

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