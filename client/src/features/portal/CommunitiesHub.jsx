import React from 'react';
import { Icon } from '../../icons.jsx';
import { CommunityTag } from '../../components/SharedUI.jsx';

export function CommunitiesHub({ user, communities = [], onSelect }) {
  return (
    <section className="vulpora-portal-card">
      <div className="portal-intro">
        <p className="vp-eyebrow">OLÁ, {user?.name?.toUpperCase() || 'EXPLORADOR(A)'} · UNIVERSO VULPORA</p>
        <h1>Escolha uma comunidade</h1>
        <p className="m">
          Explore as comunidades oficiais da Vulpora. Cada comunidade possui sua própria identidade, ranking e eventos.
        </p>
      </div>

      <div className="comm-cards-grid">
        {communities.map((comm) => {
          const isHeaven = comm.theme === 'ducks' || comm.slug === 'heaven';
          const liveEvent = comm.events?.find((e) => e.status === 'live');

          return (
            <article
              key={comm.slug}
              className={`comm-card ${isHeaven ? 'is-heaven' : 'is-kingdom'}`}
            >
              <div className="comm-card-top">
                <CommunityTag tag={comm.tag} theme={comm.theme} />
                <span className={`comm-status-pill ${isHeaven ? 'heaven' : 'kingdom'}`}>
                  <Icon name="sparkles" size={13} />
                  <span>{isHeaven ? 'Tema Heaven' : 'Tema Kingdom'}</span>
                </span>
              </div>

              <h2>{comm.name}</h2>
              <p className="m">{comm.subtitle}</p>

              {liveEvent && (
                <div className="comm-card-event">
                  <small>EVENTO ATIVO NA COMUNIDADE</small>
                  <b>{liveEvent.title}</b>
                  <span>{liveEvent.date}</span>
                </div>
              )}

              <button
                type="button"
                className={`comm-enter-btn ${isHeaven ? 'heaven' : 'kingdom'}`}
                onClick={() => onSelect?.(comm.slug)}
              >
                <span>Entrar em {comm.name}</span>
                <span className="vp-arrow-circle">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}