import React, { useState } from 'react';
import { Icon } from '../../icons.jsx';
import { Avatar, CommunityTag, RulesPage, SupportPage } from '../../components/SharedUI.jsx';
import {
  Home,
  Calendar,
  Ranking,
  Prizes,
  MissionModal,
  WriteModal,
  LetterModal,
} from './EventViews.jsx';
import { TreePage } from './natal/TreePage.jsx';
import { Snow, Burst } from './natal/Tree.jsx';
import { Profile } from '../community/ProfileView.jsx';
import {
  GalleryPage,
  GalleryModal,
  GalleryInspectModal,
} from '../community/GalleryViews.jsx';

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

export function EventLayout({
  me = {},
  ev,
  rk,
  pz,
  letters = [],
  gallery = [],
  route,
  wide,
  activeMeta,
  commName,
  commTag,
  communitySlug,
  isAdmin,
  modal,
  setModal,
  burst,
  onLogout,
  onCompleteMission,
  onWriteLetter,
  onSubmitArt,
  onReviewArt,
  onOpenLetter,
}) {
  const now = new Date();
  const isFinale = Boolean(ev?.finale || (now.getMonth() === 11 && now.getDate() >= 26));
  const canSeePrizes = isAdmin || isFinale;
  const missionsDone = me?.missionsDone ?? 0;

  const rawSlug = (communitySlug || 'thekingdom').toLowerCase();
  const safeSlug = rawSlug === 'ducks' ? 'heaven' : rawSlug;

  // Sai do React do Evento e volta direto para o Portal Vulpora (vulpora.html) na rota #
  const goToPortal = (hashRoute) => {
    const cleanHash = hashRoute.startsWith('/') ? hashRoute : `/${hashRoute}`;
    const alreadyAtRoot = window.location.pathname === '/';
    window.location.href = `/#${cleanHash}`;
    if (alreadyAtRoot) {
      window.location.reload();
    }
  };

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

  const openMission = (m) => setModal({ t: 'mission', day: m.day });
  const activeTab = tabs.find(([id]) => id === route) ? route : 'inicio';
  const currentTabLabel = tabs.find(([id]) => id === activeTab)?.[2] || 'Início do Evento';

  const view = !ev ? (
    <p className="m center pad">Carregando evento…</p>
  ) : activeTab === 'arvore' ? (
    <TreePage
      letters={letters}
      communityMeta={activeMeta}
      onOpen={onOpenLetter}
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
      onReview={onReviewArt}
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
      <Prizes pz={pz} done={missionsDone} />
    </section>
  ) : activeTab === 'perfil' ? (
    <Profile me={me} communityMeta={activeMeta} onLogout={onLogout} />
  ) : (
    <Home
      me={me}
      ev={ev}
      communityMeta={activeMeta}
      letters={letters}
      onOpen={onOpenLetter}
      onWrite={() => setModal({ t: 'write' })}
      onMission={openMission}
      onBackToCommunity={() => goToPortal(`/comunidade/${safeSlug}/eventos`)}
    />
  );

  const activeMission = modal?.t === 'mission'
    ? ev?.missions?.find((x) => x.day === modal.day) ?? ev?.missions?.[modal.day - 1]
    : null;

  const body =
    !modal ? null :
    modal.t === 'mission' ? <MissionModal key={modal.day} m={activeMission} onSubmit={onCompleteMission} /> :
    modal.t === 'write' ? <WriteModal authorName={me?.user?.name} onSend={onWriteLetter} /> :
    modal.t === 'gallery-new' ? <GalleryModal onSubmit={onSubmitArt} /> :
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
                <b>{missionsDone}/25</b>
              </div>
              <div className="bar mini">
                <i style={{ width: `${(missionsDone / 25) * 100}%` }} />
              </div>
            </div>

            <button
              type="button"
              className="btn ghost"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => goToPortal(`/comunidade/${safeSlug}/eventos`)}
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
                onClick={() => goToPortal('/portal/comunidades')}
              >
                VULPORA
              </button>
              <span className="sep">/</span>
              <button
                type="button"
                className="crumb-link"
                onClick={() => goToPortal(`/comunidade/${safeSlug}/eventos`)}
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
                <Avatar u={me?.user} />
                <span className="uname">{me?.user?.name || 'Viajante'}</span>
                <CommunityTag tag={commTag} theme={activeMeta?.theme} />
                {me?.points != null && <span>· {me.points} pts</span>}
              </a>
            </div>
          </header>

          <div className={showRightWidget ? 'layout' : ''}>
            <main>{view}</main>
            {showRightWidget && (
              <aside className="side">
                <Side rk={rk} pz={pz} done={missionsDone} showPrizes={canSeePrizes} />
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
      {burst > 0 && <Burst key={burst} />}
    </>
  );
}