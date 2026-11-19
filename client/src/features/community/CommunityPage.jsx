import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { CommunityTag } from '../../components/SharedUI.jsx';
import { Ranking } from '../events/EventViews.jsx';

function CommunityEventsCarousel({ events = [], isHeaven, onEnterEvent, onNotify }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reminded, setReminded] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vulpora_event_reminders') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (paused || events.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % events.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [paused, events.length]);

  if (!events.length) return null;

  const safeIndex = index >= events.length ? 0 : index;
  const prev = () => setIndex((i) => (i - 1 + events.length) % events.length);
  const next = () => setIndex((i) => (i + 1) % events.length);

  const toggleReminder = (evItem) => {
    const updated = { ...reminded, [evItem.id]: !reminded[evItem.id] };
    setReminded(updated);
    localStorage.setItem('vulpora_event_reminders', JSON.stringify(updated));
    onNotify?.(
      updated[evItem.id]
        ? `Lembrete ativado para "${evItem.title}"!`
        : `Lembrete removido de "${evItem.title}".`
    );
  };

  return (
    <section
      className="comm-section-card comm-carousel-sec"
      aria-label="Avisos e eventos futuros da comunidade"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="comm-car-head">
        <div>
          <p className="comm-eyebrow">AVISOS & EVENTOS FUTUROS</p>
          <h2>Mural de Eventos</h2>
        </div>

        {events.length > 1 && (
          <div className="comm-car-controls">
            <span className="comm-car-count">
              {safeIndex + 1} / {events.length}
            </span>
            <button type="button" className="comm-car-arrow" onClick={prev} aria-label="Aviso anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button type="button" className="comm-car-arrow" onClick={next} aria-label="Próximo aviso">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="comm-car-viewport">
        <div
         className="comm-car-track"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {events.map((evItem) => {
            const isLive = evItem.status === 'live';
            const isReminded = Boolean(reminded[evItem.id]);

            return (
              <div key={evItem.id} className="comm-car-slide">
                <article
                  className={`comm-banner-slide ${isLive ? 'is-live' : 'is-upcoming'} ${
                    isHeaven ? 'is-heaven' : 'is-kingdom'
                  }`}
                >
                  <div className="comm-slide-glow" aria-hidden="true" />

                  <div className="comm-slide-content">
                    <div className="comm-ev-top">
                      <span className={`comm-ev-badge ${isLive ? 'live' : 'soon'}`}>
                        <Icon name={isLive ? 'sparkles' : 'calendar'} size={13} />
                        <span>{evItem.badge || (isLive ? 'AO VIVO' : 'AVISO · EM BREVE')}</span>
                      </span>
                      <span className="comm-ev-date">{evItem.date}</span>
                    </div>

                    <h3>{evItem.title}</h3>
                    <p className="m">{evItem.description}</p>
                  </div>

                  <div className="comm-slide-action">
                    {isLive ? (
                      <button
                        type="button"
                        className={`comm-enter-btn ${isHeaven ? 'heaven' : 'kingdom'}`}
                        onClick={onEnterEvent}
                      >
                        <span>{evItem.cta || 'Entrar no Evento'}</span>
                        <span className="vp-arrow-circle">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`comm-remind-btn ${isReminded ? 'is-on' : ''}`}
                        onClick={() => toggleReminder(evItem)}
                      >
                        <Icon name={isReminded ? 'check' : 'clock'} size={16} />
                        <span>{isReminded ? 'Lembrete ativado' : evItem.cta || 'Avise-me'}</span>
                      </button>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {events.length > 1 && (
        <div className="comm-car-dots" role="tablist" aria-label="Selecionar aviso">
          {events.map((evItem, idx) => (
            <button
              key={evItem.id}
              type="button"
              className={`comm-car-dot ${idx === safeIndex ? 'on' : ''}`}
              onClick={() => setIndex(idx)}
              aria-label={`Ver ${evItem.title}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CommunityPage({ me, rk, communityMeta, onEnterEvent, onNotify }) {
  const commName = communityMeta?.name || 'The Kingdom';
  const commTag = communityMeta?.tag || 'THE KINGDOM';
  const isHeaven = communityMeta?.theme === 'ducks' || communityMeta?.slug === 'heaven';
  const events = communityMeta?.events || [];

  return (
    <div className="comm-page-wrap">
      <section className={`comm-banner-card ${isHeaven ? 'is-heaven' : 'is-kingdom'}`}>
        <div className="comm-banner-emblem" aria-hidden="true">
          {isHeaven ? (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          ) : (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
            </svg>
          )}
        </div>

        <div className="comm-banner-info">
          <div className="who-name">
            <CommunityTag tag={commTag} theme={communityMeta?.theme} />
            <span className="comm-member-pill">Membro conectado: {me?.user?.name}</span>
          </div>
          <h1>{commName}</h1>
          <p className="m">{communityMeta?.subtitle}</p>
        </div>
      </section>

      <CommunityEventsCarousel
        events={events}
        isHeaven={isHeaven}
        onEnterEvent={onEnterEvent}
        onNotify={onNotify}
      />

      <section className="comm-section-card">
        <div className="comm-sec-head">
          <div>
            <p className="comm-eyebrow">DESTAQUES · {commTag}</p>
            <h2>Ranking da Comunidade</h2>
          </div>
        </div>
        <Ranking rk={rk || { ranking: [] }} isCommunity />
      </section>
    </div>
  );
}