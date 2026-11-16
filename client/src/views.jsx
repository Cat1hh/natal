import React, { useState } from 'react';
import { Tree } from './tree.jsx';
import { Icon } from './icons.jsx';
import { getCommunityBasePath } from './api.js';

const MEDAL_COLOR = ['#F4A51D', '#E2D8CE', '#C87D3B'];

/* ---------- Logo Oficial Vulpora (Raposa + Lua Crescente) ---------- */
export function VulporaLogo({ compact = false }) {
  return (
    <div className={`vp-logo ${compact ? 'is-compact' : ''}`}>
      <svg
        className="vp-emblem"
        viewBox="0 0 120 120"
        width={compact ? 40 : 88}
        height={compact ? 40 : 88}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vpMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="48%" stopColor="#E96B9D" />
            <stop offset="100%" stopColor="#9B5CFF" />
          </linearGradient>
          <linearGradient id="vpFoxGrad" x1="20%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#F3E8FF" />
            <stop offset="45%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <filter id="vpGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#vpGlow)">
          <path
            d="M54 16 C31 20 16 41 19 65 C22 88 43 104 67 101 C81 99 93 91 100 80 C87 89 69 90 54 81 C37 70 32 47 43 30 C46 24 50 20 54 16 Z"
            fill="url(#vpMoonGrad)"
          />
          <path
            d="M64 24 L58 43 L48 53 L56 60 L51 74 C63 77 77 72 86 61 L93 47 L82 46 L86 28 L72 38 Z"
            fill="url(#vpFoxGrad)"
          />
          <path
            d="M42 46 L44 51 L49 53 L44 55 L42 60 L40 55 L35 53 L40 51 Z"
            fill="#FDE68A"
          />
        </g>
      </svg>

      <div className="vp-wordmark-wrap">
        <span className="vp-wordmark">Vulpora</span>
        {!compact && <span className="vp-tagline">SEU UNIVERSO COMEÇA AQUI.</span>}
      </div>
    </div>
  );
}

/* ---------- 1. Tela de Login & Cadastro (100% Vulpora — Independente de Comunidade/Evento) ---------- */
export function Login({ erro, isPortal = true, onNotify }) {
  const [screen, setScreen] = useState('login');
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const targetAfterLogin = isPortal ? '/comunidade' : getCommunityBasePath();
  const returnTo = encodeURIComponent(targetAfterLogin);

  const oauthErrMsg =
    erro === 'google'
      ? 'Não foi possível entrar com o Google. Tente novamente.'
      : erro === 'google_config'
      ? 'Login com Google ainda não configurado no servidor.'
      : erro && erro.length > 20
      ? erro
      : erro
      ? 'Não foi possível concluir o login. Tente novamente.'
      : '';

  const switchScreen = (next) => {
    setScreen(next);
    setFormErr('');
    setShowPass(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormErr('');
    setBusy(true);

    try {
      const isRegister = screen === 'register';
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? { name: name.trim(), email: email.trim(), password }
        : { email: loginId.trim(), login: loginId.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Não foi possível autenticar.');

      window.location.href = targetAfterLogin;
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vulpora-auth-shell">
      <div className="vulpora-waves" aria-hidden="true">
        <span className="vp-star s1" />
        <span className="vp-star s2" />
        <span className="vp-star s3" />
        <span className="vp-orb o1" />
        <span className="vp-orb o2" />
      </div>

      <section className="vulpora-card">
        {screen !== 'welcome' && (
          <button
            type="button"
            className="vp-back-btn"
            onClick={() => switchScreen('welcome')}
            aria-label="Voltar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}

        <VulporaLogo />

        {(formErr || oauthErrMsg) && <div className="vp-err">{formErr || oauthErrMsg}</div>}

        {screen === 'welcome' ? (
          <div className="vp-welcome-body">
            <p className="vp-lead">
              Crie, explore e conecte-se com comunidades, histórias e arte em um só lugar.
            </p>

            <div className="vp-dots" aria-hidden="true">
              <i />
              <i className="on" />
              <i />
            </div>

            <button
              type="button"
              className="vp-pill-btn primary"
              onClick={() => switchScreen('register')}
            >
              <span>Criar uma conta</span>
              <span className="vp-arrow-circle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>

            <button
              type="button"
              className="vp-pill-btn outline"
              onClick={() => switchScreen('login')}
            >
              <span>Entrar</span>
            </button>
          </div>
        ) : (
          <>
            <div className="vp-head-copy">
              <h1>{screen === 'register' ? 'Crie sua conta' : 'Bem-vindo(a) de volta!'}</h1>
              <p>
                {screen === 'register'
                  ? 'Faça parte de um espaço criativo, acolhedor e cheio de possibilidades.'
                  : 'Entre na sua conta para continuar explorando seu universo.'}
              </p>
            </div>

            <form className="vp-form" onSubmit={handleSubmit}>
              {screen === 'register' ? (
                <>
                  <label className="vp-field">
                    <span className="vp-field-ico" aria-hidden="true">
                      <Icon name="user" size={18} />
                    </span>
                    <input
                      type="text"
                      placeholder="Nome de usuário"
                      maxLength={40}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </label>

                  <label className="vp-field">
                    <span className="vp-field-ico" aria-hidden="true">
                      <Icon name="mail" size={18} />
                    </span>
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </label>
                </>
              ) : (
                <label className="vp-field">
                  <span className="vp-field-ico" aria-hidden="true">
                    <Icon name="user" size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="E-mail ou nome de usuário"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                  />
                </label>
              )}

              <label className="vp-field">
                <span className="vp-field-ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Senha"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="vp-eye-btn"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </label>

              {screen === 'login' && (
                <div className="vp-forgot-row">
                  <button
                    type="button"
                    className="vp-forgot-link"
                    onClick={() =>
                      onNotify?.('Entre via Google/Discord ou contate o suporte para redefinir sua senha.')
                    }
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}

              <button type="submit" className="vp-pill-btn primary" disabled={busy}>
                <span>
                  {busy
                    ? 'Aguarde...'
                    : screen === 'register'
                    ? 'Criar conta'
                    : 'Entrar'}
                </span>
                <span className="vp-arrow-circle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </button>
            </form>

            <div className="vp-divider">
              <span>ou continue com</span>
            </div>

            <div className="vp-oauth-row">
              <a
                className="vp-oauth-circle"
                href={`/auth/google?returnTo=${returnTo}`}
                title="Continuar com Google"
                aria-label="Continuar com Google"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
                  <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.8z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.9 7.4 24 12 24z" />
                </svg>
              </a>

              <a
                className="vp-oauth-circle"
                href={`/auth/discord?returnTo=${returnTo}`}
                title="Continuar com Discord"
                aria-label="Continuar com Discord"
              >
                <Icon name="discord" size={21} />
              </a>
            </div>

            <p className="vp-switch-copy">
              {screen === 'register' ? (
                <>
                  Já tem uma conta?{' '}
                  <button type="button" onClick={() => switchScreen('login')}>
                    Entrar
                  </button>
                </>
              ) : (
                <>
                  Ainda não tem uma conta?{' '}
                  <button type="button" onClick={() => switchScreen('register')}>
                    Cadastre-se
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

/* ---------- 2. Portal de Comunidades (/comunidade — Vulpora) ---------- */
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

/* ---------- 3. Página da Comunidade (/comunidade/:slug — Kingdom ou Heaven, SEM Natal) ---------- */
export function CommunityPage({ me, rk, communityMeta, onEnterEvent, onNotify }) {
  const commName = communityMeta?.name || 'The Kingdom';
  const commTag = communityMeta?.tag || 'THE KINGDOM';
  const isHeaven = communityMeta?.theme === 'ducks' || communityMeta?.slug === 'heaven';
  const events = communityMeta?.events || [];

  const [reminded, setReminded] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vulpora_event_reminders') || '{}');
    } catch {
      return {};
    }
  });

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

      <section className="comm-section-card">
        <div className="comm-sec-head">
          <div>
            <p className="comm-eyebrow">EVENTOS & TEMPORADAS · {commTag}</p>
            <h2>Eventos da Comunidade</h2>
          </div>
        </div>

        <div className="comm-events-grid">
          {events.map((evItem) => {
            const isLive = evItem.status === 'live';
            const isReminded = Boolean(reminded[evItem.id]);

            return (
              <article
                key={evItem.id}
                className={`comm-ev-card ${isLive ? 'is-live' : 'is-upcoming'}`}
              >
                <div className="comm-ev-top">
                  <span className={`comm-ev-badge ${isLive ? 'live' : 'soon'}`}>
                    <Icon name={isLive ? 'sparkles' : 'calendar'} size={13} />
                    <span>{evItem.badge}</span>
                  </span>
                  <span className="comm-ev-date">{evItem.date}</span>
                </div>

                <h3>{evItem.title}</h3>
                <p className="m">{evItem.description}</p>

                <div className="comm-ev-foot">
                  {isLive ? (
                    <button
                      type="button"
                      className={`comm-enter-btn ${isHeaven ? 'heaven' : 'kingdom'}`}
                      onClick={onEnterEvent}
                    >
                      <span>Entrar no Evento</span>
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
                      className="btn ghost"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => toggleReminder(evItem)}
                    >
                      <Icon name={isReminded ? 'check' : 'clock'} size={16} />
                      <span>{isReminded ? 'Lembrete ativado' : evItem.cta || 'Avise-me'}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="comm-section-card">
        <div className="comm-sec-head">
          <div>
            <p className="comm-eyebrow">DESTAQUES · {commTag}</p>
            <h2>Ranking da Comunidade</h2>
          </div>
        </div>
        <Ranking rk={rk || { ranking: [] }} />
      </section>
    </div>
  );
}

/* Mapa fiel ao mosaico do Calendário do Advento (grid 10x10) */
const ADVENT_TILES = {
  1:  { col: '1 / 3',  row: '1 / 3',  theme: 't-dark-stars',     icon: 'branch' },
  2:  { col: '3 / 5',  row: '1 / 3',  theme: 't-cream-stripes',  badge: 'dark' },
  3:  { col: '5 / 9',  row: '1 / 3',  theme: 't-gold',           icon: 'snowflake', wide: true },
  4:  { col: '9 / 11', row: '1 / 3',  theme: 't-cream',          icon: 'star' },

  5:  { col: '1 / 3',  row: '3 / 5',  theme: 't-gold' },
  6:  { col: '3 / 4',  row: '3 / 5',  theme: 't-dark-stars',     slim: true },
  7:  { col: '4 / 5',  row: '3 / 5',  theme: 't-gold',           slim: true },
  8:  { col: '5 / 7',  row: '3 / 5',  theme: 't-dark-dots',      badge: 'cream' },
  9:  { col: '7 / 9',  row: '3 / 6',  theme: 't-dark-stars',     icon: 'tree', tall: true },
  10: { col: '9 / 11', row: '3 / 5',  theme: 't-dark-stripes',   badge: 'cream' },

  11: { col: '1 / 3',  row: '5 / 7',  theme: 't-dark-stars',     icon: 'bell' },
  12: { col: '3 / 5',  row: '5 / 7',  theme: 't-dark-stripes',   badge: 'cream' },
  13: { col: '5 / 7',  row: '5 / 7',  theme: 't-dark-stars',     icon: 'baubles' },
  14: { col: '7 / 9',  row: '6 / 7',  theme: 't-cream',          flat: true },
  15: { col: '9 / 11', row: '5 / 7',  theme: 't-dark-stars',     icon: 'holly' },

  16: { col: '1 / 2',  row: '7 / 9',  theme: 't-dark-stars',     slim: true },
  17: { col: '2 / 4',  row: '7 / 9',  theme: 't-cream-stripes',  badge: 'dark' },
  18: { col: '4 / 5',  row: '7 / 9',  theme: 't-dark-stars',     slim: true },
  19: { col: '5 / 7',  row: '7 / 9',  theme: 't-gold',           icon: 'sprig' },
  20: { col: '7 / 9',  row: '7 / 9',  theme: 't-dark-dots',      badge: 'cream' },
  21: { col: '9 / 11', row: '7 / 9',  theme: 't-gold',           icon: 'bow' },

  22: { col: '1 / 3',  row: '9 / 11', theme: 't-gold' },
  23: { col: '3 / 5',  row: '9 / 11', theme: 't-dark-triangles', badge: 'cream' },
  24: { col: '5 / 7',  row: '9 / 11', theme: 't-dark-stars',     icon: 'gift' },
  25: { col: '7 / 11', row: '9 / 11', theme: 't-dark-stars',     icon: 'finials', wide: true },
};

function TileArt({ type }) {
  switch (type) {
    case 'branch':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M8 32 Q20 20 32 8 M14 26 L11 18 M14 26 L22 28 M20 20 L17 12 M20 20 L28 22 M26 14 L23 7 M26 14 L33 16" stroke="var(--gold, #F4A51D)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'snowflake':
      return (
        <svg className="t-art lg" viewBox="0 0 60 60" aria-hidden="true">
          <g stroke="var(--cream, #F1E4D4)" strokeWidth="1.8" strokeLinecap="round" fill="none">
            {[0, 60, 120].map((a) => (
              <g key={a} transform={`rotate(${a} 30 30)`}>
                <line x1="30" y1="6" x2="30" y2="54" />
                <path d="M24 13 L30 19 L36 13 M24 47 L30 41 L36 47" />
              </g>
            ))}
          </g>
        </svg>
      );
    case 'star':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 5 L24 15 L35 16 L26 23 L29 34 L20 28 L11 34 L14 23 L5 16 L16 15 Z" fill="none" stroke="var(--gold, #F4A51D)" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'tree':
      return (
        <svg className="t-art tall-art" viewBox="0 0 50 80" aria-hidden="true">
          <path d="M25 6 L27 11 L32 11 L28 14 L29 19 L25 16 L21 19 L22 14 L18 11 L23 11 Z" fill="var(--gold, #F4A51D)" />
          <polygon points="25,18 14,34 36,34" fill="var(--gold, #F4A51D)" />
          <polygon points="25,28 11,48 39,48" fill="var(--gold, #F4A51D)" />
          <polygon points="25,40 8,64 42,64" fill="var(--gold, #F4A51D)" />
          <rect x="22" y="64" width="6" height="9" fill="#A46227" />
        </svg>
      );
    case 'bell':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 7 C13 7 10 13 10 21 L7 27 L33 27 L30 21 C30 13 27 7 20 7 Z" fill="var(--gold, #F4A51D)" />
          <circle cx="20" cy="30" r="3.2" fill="var(--cream, #F1E4D4)" />
        </svg>
      );
    case 'baubles':
      return (
        <svg className="t-art" viewBox="0 0 44 40" aria-hidden="true">
          <line x1="14" y1="2" x2="14" y2="12" stroke="var(--cream, #F1E4D4)" strokeWidth="1.2" />
          <circle cx="14" cy="20" r="8" fill="var(--gold, #F4A51D)" />
          <line x1="30" y1="2" x2="30" y2="8" stroke="var(--cream, #F1E4D4)" strokeWidth="1.2" />
          <circle cx="30" cy="14" r="6" fill="var(--cream, #F1E4D4)" />
        </svg>
      );
    case 'holly':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M12 28 Q10 16 22 14 Q24 24 12 28 Z M20 28 Q24 18 34 22 Q30 31 20 28 Z" fill="var(--gold, #F4A51D)" />
          <circle cx="18" cy="28" r="2.4" fill="var(--red, #A81E23)" />
          <circle cx="22" cy="30" r="2.4" fill="var(--red, #A81E23)" />
        </svg>
      );
    case 'sprig':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M10 30 Q22 22 30 8" stroke="var(--cream, #F1E4D4)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="17" cy="19" r="2.5" fill="var(--cream, #F1E4D4)" />
          <circle cx="25" cy="22" r="2.5" fill="var(--cream, #F1E4D4)" />
          <circle cx="24" cy="12" r="2.5" fill="var(--cream, #F1E4D4)" />
        </svg>
      );
    case 'bow':
      return (
        <svg className="t-art" viewBox="0 0 44 40" aria-hidden="true">
          <path d="M22 16 C14 8 6 12 10 20 C13 24 19 20 22 16 Z M22 16 C30 8 38 12 34 20 C31 24 25 20 22 16 Z" fill="var(--cream, #F1E4D4)" />
          <path d="M20 18 L13 32 M24 18 L31 32" stroke="var(--cream, #F1E4D4)" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'gift':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <rect x="9" y="15" width="22" height="17" rx="2" fill="var(--cream, #F1E4D4)" />
          <rect x="7" y="11" width="26" height="5" rx="1.5" fill="var(--gold, #F4A51D)" />
          <rect x="18" y="11" width="4" height="21" fill="var(--red, #A81E23)" />
        </svg>
      );
    case 'finials':
      return (
        <svg className="t-art lg" viewBox="0 0 54 60" aria-hidden="true">
          <line x1="18" y1="2" x2="18" y2="10" stroke="var(--cream, #F1E4D4)" strokeWidth="1.2" />
          <path d="M18 10 C25 20 25 38 18 52 C11 38 11 20 18 10 Z" fill="var(--gold, #F4A51D)" />
          <line x1="36" y1="2" x2="36" y2="8" stroke="var(--cream, #F1E4D4)" strokeWidth="1.2" />
          <path d="M36 8 C42 17 42 32 36 44 C30 32 30 17 36 8 Z" fill="var(--gold, #F4A51D)" />
        </svg>
      );
    default:
      return null;
  }
}

export const Avatar = ({ u, big }) => {
  const custom = typeof window !== 'undefined' && u?.id ? localStorage.getItem(`avatar_${u.id}`) : null;
  const src = custom || u?.avatar;
  return src ? (
    <img className={`av ${big ? 'xl' : ''}`} src={src} alt="" />
  ) : (
    <span className={`av ${big ? 'xl' : ''}`}>
      <Icon name="user" size={big ? 30 : 18} />
    </span>
  );
};

export function CommunityTag({ tag, theme }) {
  if (!tag) return null;
  const isDucksTheme = theme === 'ducks' || tag === 'HEAVEN';
  return (
    <span className={`comm-tag ${isDucksTheme ? 'ducks' : 'kingdom'}`}>
      <i className="comm-dot" />
      <span>{tag}</span>
    </span>
  );
}

/* ---------- 4. Tela Inicial do Evento (/comunidade/:slug/natal — Natal Mágico) ---------- */
export function Home({ me, ev, communityMeta, letters, onOpen, onWrite, onMission, onBackToCommunity }) {
  const m = ev.missions[Math.max(ev.today, 1) - 1] || ev.missions[0];
  const C = 2 * Math.PI * 42;
  const rest = Math.max(0, 25 - ev.today);
  const commName = communityMeta?.name || 'Comunidade';
  const commTag = communityMeta?.tag || 'EVENTO';
  const commTheme = communityMeta?.theme;

  const eyebrow =
    ev.status === 'before'
      ? 'O evento começa em breve'
      : ev.status === 'ended'
      ? 'Evento encerrado'
      : rest === 0
      ? 'Hoje é Natal!'
      : `Faltam ${rest} ${rest === 1 ? 'dia' : 'dias'} para o Natal`;

  return (
    <div className="community-hub">
      <section className="glass hot community-hero">
        <div className="comm-hero-top">
          <div>
            <div className="who-name">
              <CommunityTag tag={commTag} theme={commTheme} />
              <span className="badge gold">
                <Icon name="sparkles" size={13} /> Evento Especial · Natal 2026
              </span>
            </div>
            <h1 style={{ margin: '8px 0 4px' }}>Natal Mágico · {commName}</h1>
            <p className="m">Complete missões diárias, pendure cartinhas na árvore e suba no ranking do evento.</p>
          </div>

          <div className="comm-hero-links">
            <button type="button" className="btn ghost" onClick={onBackToCommunity}>
              <Icon name="home" size={16} />
              <span>Comunidade</span>
            </button>
            <a href="#calendario" className="btn ghost">
              <Icon name="calendar" size={16} />
              <span>Calendário</span>
            </a>
            <a href="#galeria" className="btn ghost">
              <Icon name="gallery" size={16} />
              <span>Galeria</span>
            </a>
          </div>
        </div>
      </section>

      <div id="natal-hub" className="home">
        <section className="glass hot">
          <div className="who-name" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Árvore de {commName}</h2>
            <CommunityTag tag={commTag} theme={commTheme} />
          </div>
          <p className="m">
            Pendure uma mensagem para a comunidade. Toque num envelope na árvore para abrir.
          </p>
          <Tree letters={letters} onOpen={onOpen} />

          {letters.length > 0 && (
            <div className="letter-cards">
              {letters.slice(0, 6).map((l, idx) => (
                <button
                  key={l.id ?? idx}
                  type="button"
                  className="letter-card"
                  onClick={() => onOpen?.(l)}
                >
                  <span className="letter-seal">
                    <Icon name="mail" size={14} />
                  </span>
                  <span className="letter-meta">
                    <b className="uname">{l.author || 'Anônimo'}</b>
                    <small>Toque para ler</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="cta">
            <button className="btn red" onClick={onWrite}>
              <Icon name="mail" size={17} />
              <span>Escrever cartinha</span>
            </button>
          </div>
        </section>

        <section className="glass hot today">
          <p className="eyebrow">{eyebrow}</p>
          <div className="hero">
            <svg className="ring" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="rgba(241, 228, 212, 0.16)" />
              <circle
                className="v"
                cx="50"
                cy="50"
                r="42"
                stroke="var(--gold, #F4A51D)"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - me.missionsDone / 25)}
              />
            </svg>
            <div className="ringtxt">
              <b className="big">{me.missionsDone}</b>
              <small>de 25</small>
            </div>
          </div>
          <p className="m center">
            {me.points != null
              ? `${me.points} pontos acumulados`
              : 'Conclua missões para subir no ranking'}
          </p>
          {m && (
            <>
              <h3>
                Dia {m.day} · {m.title}
              </h3>
              <p className="m">{m.objective}</p>
              {m.points != null && <p className="gain">+{m.points} pontos</p>}
              <button
                className={`btn ${m.status === 'done' ? 'pine' : m.status === 'pending' ? 'bronze' : ''}`}
                disabled={m.status === 'locked'}
                onClick={() => onMission(m)}
              >
                {!m ? (
                  'Indisponível'
                ) : m.status === 'done' ? (
                  <>
                    <Icon name="check" size={16} />
                    <span>Missão concluída</span>
                  </>
                ) : m.status === 'pending' ? (
                  <>
                    <Icon name="clock" size={16} />
                    <span>Em análise</span>
                  </>
                ) : (
                  'Abrir missão'
                )}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- Calendário do Advento (Mosaico) ---------- */
export function Calendar({ ev, communityMeta, onMission }) {
  return (
    <section className="glass hot cal-sec">
      <div className="cal-head">
        <p className="eyebrow">
          Dezembro 2026 · {communityMeta?.tag || 'EVENTO'}
        </p>
        <h2>Calendário Mágico</h2>
        <p className="m">
          Desafios exclusivos de {communityMeta?.name || 'Comunidade'}. Uma porta nova se abre a cada dia.
        </p>
      </div>

      <div className="advent-board">
        <div className="advent-grid">
          {ev.missions.map((m) => {
            const cfg = ADVENT_TILES[m.day] || {};
            const classes = [
              'adv-door',
              m.status,
              cfg.theme || 't-dark-stars',
              cfg.slim ? 'is-slim' : '',
              cfg.tall ? 'is-tall' : '',
              cfg.flat ? 'is-flat' : '',
              cfg.wide ? 'is-wide' : '',
              m.day === 25 ? 'is-xmas' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={m.day}
                className={classes}
                style={{ gridColumn: cfg.col, gridRow: cfg.row }}
                disabled={m.status === 'locked'}
                onClick={() => onMission(m)}
                aria-label={`Dia ${m.day}: ${m.title}`}
              >
                <span className="in">
                  <b className="big">
                    {m.status === 'done' ? (
                      <Icon name="star" size={20} />
                    ) : m.points != null ? (
                      `+${m.points}`
                    ) : (
                      <Icon name="sparkles" size={18} />
                    )}
                  </b>
                  <small>
                    {m.status === 'done'
                      ? 'concluída'
                      : m.status === 'pending'
                      ? 'análise'
                      : m.points != null
                      ? 'pts'
                      : 'abrir'}
                  </small>
                </span>

                <span className="lid">
                  {cfg.icon && <TileArt type={cfg.icon} />}
                  <span className={`num ${cfg.badge ? `badge-${cfg.badge}` : ''}`}>{m.day}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Ranking (pódio + lista) ---------- */
export function Ranking({ rk }) {
  const list = rk?.ranking || [];
  const top = [1, 0, 2].map((i) => list[i]).filter(Boolean);
  return (
    <>
      {!list.length && <p className="m">Ninguém pontuou ainda. Seja a primeira pessoa!</p>}
      <div className="podium">
        {top.map((r) => (
          <div key={r.position} className={`pod p${r.position}`}>
            <Avatar u={r} />
            <b className="uname">{r.name}</b>
            <span>{r.points} pts</span>
            <div className="step" style={{ color: MEDAL_COLOR[r.position - 1] }}>
              <Icon name="medal" size={24} />
            </div>
          </div>
        ))}
      </div>
      {list.slice(3).map((r) => (
        <div key={r.position} className="row">
          <span className="pos">{r.position}</span>
          <Avatar u={r} />
          <b className="uname">{r.name}</b>
          <b className="pts">{r.points} pts</b>
        </div>
      ))}
      {rk?.me && (
        <div className="row me">
          <span className="pos">{rk.me.position ?? '—'}</span>
          <span className="av">
            <Icon name="star" size={16} />
          </span>
          <b>Você</b>
          <b className="pts">{rk.me.points} pts</b>
        </div>
      )}
    </>
  );
}

/* ---------- Premiações ---------- */
export function Prizes({ pz, done }) {
  return (
    <>
      {pz.prizes.map((p) => (
        <div key={p.place} className="row">
          <span className="medal" style={{ color: MEDAL_COLOR[p.place - 1] }}>
            <Icon name="medal" size={24} />
          </span>
          <div>
            <b>{p.title}</b>
            <p className="m">{p.reward}</p>
          </div>
        </div>
      ))}
      <h3>Por missões concluídas</h3>
      {pz.milestones.map((k) => {
        const ok = done >= k.missions;
        return (
          <div key={k.missions} className={`row ${ok ? 'ok' : ''}`}>
            <span className="pos" style={ok ? { color: 'var(--gold, #F4A51D)' } : undefined}>
              {ok ? <Icon name="check" size={18} /> : k.missions}
            </span>
            <div>
              <b>{k.title}</b>
              <p className="m">
                {k.missions} missões · {k.reward}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Perfil ---------- */
export function Profile({ me, communityMeta, onLogout }) {
  const [, setTick] = useState(0);
  const storageKey = me?.user?.id ? `avatar_${me.user.id}` : null;
  const hasCustom = Boolean(storageKey && localStorage.getItem(storageKey));

  const changeAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f || !storageKey) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        canvas.getContext('2d').drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        localStorage.setItem(storageKey, canvas.toDataURL('image/jpeg', 0.85));
        setTick((n) => n + 1);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(f);
  };

  const resetAvatar = () => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
    setTick((n) => n + 1);
  };

  return (
    <section className="glass hot">
      <h2>Seu perfil</h2>
      <div className="who">
        <label className="av-edit" title="Trocar foto de perfil">
          <Avatar u={me.user} big />
          <span className="av-badge">
            <Icon name="camera" size={13} />
          </span>
          <input type="file" accept="image/*" onChange={changeAvatar} hidden />
        </label>
        <div>
          <div className="who-name">
            <b className="big uname">{me.user.name}</b>
            <CommunityTag tag={communityMeta?.tag || 'COMUNIDADE'} theme={communityMeta?.theme} />
          </div>
          <p className="m">
            {me.missionsDone} de 25 missões concluídas
            {me.points != null ? ` · ${me.points} pontos` : ''}
          </p>
          <div className="av-actions">
            <label className="link-btn">
              Trocar foto
              <input type="file" accept="image/*" onChange={changeAvatar} hidden />
            </label>
            {hasCustom && (
              <button type="button" className="link-btn" onClick={resetAvatar}>
                Usar foto original
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="bar">
        <i style={{ width: `${(me.missionsDone / 25) * 100}%` }} />
      </div>

      <h3>Conta conectada</h3>
      <div className="row ok">
        <span className="medal">
          <Icon name={me.user.provider === 'discord' ? 'discord' : 'mail'} size={22} />
        </span>
        <div>
          <b>
            {me.user.provider === 'discord'
              ? 'Discord'
              : me.user.provider === 'google'
              ? 'Google'
              : 'E-mail e Senha'}
          </b>
          <p className="m uname">
            <span style={{ color: '#8a943e' }}>●</span> {me.user.email || me.user.name}
          </p>
        </div>
        <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={onLogout}>
          Sair
        </button>
      </div>
    </section>
  );
}

/* ---------- Modais conforme o tipo ---------- */
export function MissionModal({ m, onSubmit }) {
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  if (!m) return null;
  const done = m.status === 'done',
    pend = m.status === 'pending';
  return (
    <>
      <h3>
        Dia {m.day} · {m.title}
      </h3>
      <div className="paper">
        <b>Objetivo:</b> {m.objective}
      </div>
      {m.points != null && <p className="gain">+{m.points} pontos</p>}
      {m.status === 'rejected' && <div className="err">Sua prova anterior foi recusada. Envie outra.</div>}
      {m.needsReview && !done && !pend && (
        <>
          <textarea
            rows="3"
            maxLength="500"
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            placeholder="Conte o que você fez ou cole o link da mensagem"
          />
          <p className="m small">Um admin confere antes de validar a missão.</p>
        </>
      )}
      <div className="acts">
        {done ? (
          <span className="badge pine">
            <Icon name="check" size={14} /> Missão concluída
          </span>
        ) : pend ? (
          <span className="badge bronze">
            <Icon name="clock" size={14} /> Em análise
          </span>
        ) : (
          <button
            className="btn red"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onSubmit(m.day, proof).finally(() => setBusy(false));
            }}
          >
            {m.needsReview ? 'Enviar para análise' : 'Concluir missão'}
          </button>
        )}
      </div>
    </>
  );
}

export function WriteModal({ authorName, onSend }) {
  const [t, setT] = useState('');
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const displayNick = anon ? 'Anônimo' : (authorName || 'Você');

  return (
    <>
      <h3>Escrever cartinha</h3>
      <p className="m">Ela fica pendurada na árvore da comunidade para alguém ler.</p>

      <div className="write-author">
        <Icon name="mail" size={15} />
        <span>Aparecerá na árvore como: <b className="uname">{displayNick}</b></span>
      </div>

      <textarea
        rows="5"
        maxLength="280"
        value={t}
        onChange={(e) => setT(e.target.value)}
        placeholder="Querido desconhecido..."
      />
      <label className="chk">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Enviar como anônimo
      </label>
      <div className="acts">
        <span className="m small">{t.length}/280</span>
        <button
          className="btn red"
          disabled={busy || t.trim().length < 3}
          onClick={() => {
            setBusy(true);
            onSend(t, anon).finally(() => setBusy(false));
          }}
        >
          Pendurar na árvore
        </button>
      </div>
    </>
  );
}

export const LetterModal = ({ l }) => (
  <>
    <div className="letter-from">
      <Icon name="mail" size={15} />
      <span>Cartinha de <b className="uname">{l.author || 'Anônimo'}</b></span>
    </div>
    <h3>Uma cartinha para você</h3>
    <div className="paper">
      {l.text}
      <br />
      <br />
      <i className="uname" style={{ color: '#A81E23', fontWeight: 700 }}>— {l.author || 'Anônimo'}</i>
    </div>
  </>
);

/* ---------- Galeria de Artes ---------- */
export function GalleryPage({ items = [], me, communityMeta, isAdmin, onOpenForm, onReview, onInspect }) {
  const [filter, setFilter] = useState('approved');

  const userId = me?.user?.id;
  const approved = items.filter((item) => item.status === 'approved');
  const pending = items.filter((item) => item.status === 'pending');
  const myPending = pending.filter((item) => item.authorId === userId);

  const list = isAdmin && filter === 'pending' ? pending : approved;

  return (
    <section className="glass hot gal-page">
      <div className="tree-head">
        <div>
          <p className="eyebrow">Exposição da Comunidade</p>
          <div className="who-name">
            <h2 style={{ margin: 0 }}>Galeria da Comunidade</h2>
            <CommunityTag tag={communityMeta?.tag || 'COMUNIDADE'} theme={communityMeta?.theme} />
          </div>
          <p className="m">
            Compartilhe suas artes, fotos e criações. Todas as publicações passam pela aprovação dos administradores.
          </p>
        </div>

        <button className="btn red" onClick={onOpenForm}>
          <Icon name="upload" size={17} />
          <span>Enviar arte</span>
        </button>
      </div>

      {isAdmin && (
        <div className="seg gal-tabs">
          <button className={filter === 'approved' ? 'on' : ''} onClick={() => setFilter('approved')}>
            <Icon name="sparkles" size={15} />
            <span>Aprovadas ({approved.length})</span>
          </button>
          <button className={filter === 'pending' ? 'on' : ''} onClick={() => setFilter('pending')}>
            <Icon name="clock" size={15} />
            <span>Pendentes ({pending.length})</span>
          </button>
        </div>
      )}

      {!isAdmin && myPending.length > 0 && (
        <div className="gal-notice">
          <Icon name="clock" size={16} />
          <span>
            Você tem <b>{myPending.length}</b> {myPending.length === 1 ? 'arte aguardando' : 'artes aguardando'} aprovação da equipe.
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <p className="m center pad">
          {filter === 'pending'
            ? 'Nenhuma arte aguardando moderação no momento.'
            : 'Nenhuma arte publicada ainda. Seja o primeiro a enviar!'}
        </p>
      ) : (
        <div className="gal-grid">
          {list.map((art) => (
            <article key={art.id} className="gal-card">
              <div className="gal-thumb" onClick={() => onInspect?.(art)}>
                <img src={art.imageUrl} alt={art.title} loading="lazy" />
                {art.status === 'pending' && (
                  <span className="badge bronze gal-status">
                    <Icon name="clock" size={13} /> Pendente
                  </span>
                )}
              </div>

              <div className="gal-body">
                <h3>{art.title}</h3>
                {art.message && <p className="m">{art.message}</p>}

                <div className="gal-foot">
                  <small className="m uname">Por {art.authorName || 'Participante'}</small>

                  {isAdmin && art.status === 'pending' && (
                    <div className="gal-mod">
                      <button
                        className="btn pine btn-sm"
                        onClick={() => onReview?.(art.id, 'approved')}
                        title="Aprovar publicação"
                      >
                        <Icon name="check" size={14} />
                        <span>Aprovar</span>
                      </button>
                      <button
                        className="btn ghost btn-sm"
                        onClick={() => onReview?.(art.id, 'rejected')}
                        title="Recusar publicação"
                      >
                        <Icon name="x" size={14} />
                        <span>Recusar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Modal: Enviar Arte para Galeria ---------- */
export function GalleryModal({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setPreview(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(f);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!preview || !title.trim() || sending) return;
    setSending(true);
    try {
      await onSubmit({
        title: title.trim(),
        message: message.trim(),
        imageUrl: preview,
        file,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send}>
      <p className="eyebrow">Galeria da Comunidade</p>
      <h3>Enviar nova arte</h3>
      <p className="m">Sua imagem ficará visível na galeria assim que for aprovada por um administrador.</p>

      <label className="gal-drop">
        <input type="file" accept="image/*" onChange={handleFile} hidden />
        {preview ? (
          <img src={preview} alt="Prévia da arte" className="gal-preview" />
        ) : (
          <span className="gal-drop-hint">
            <Icon name="camera" size={26} />
            <span>Clique para selecionar uma imagem</span>
          </span>
        )}
      </label>

      <input
        type="text"
        className="inp"
        placeholder="Título da arte"
        maxLength={80}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <textarea
        rows={3}
        placeholder="Mensagem ou descrição sobre a sua arte..."
        maxLength={300}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="acts">
        <button type="submit" className="btn red" disabled={!preview || !title.trim() || sending}>
          {sending ? 'Enviando...' : 'Enviar para aprovação'}
        </button>
      </div>
    </form>
  );
}

/* ---------- Modal: Visualizar Arte Ampliada ---------- */
export function GalleryInspectModal({ art }) {
  if (!art) return null;
  return (
    <div className="gal-inspect">
      <img src={art.imageUrl} alt={art.title} />
      <h3>{art.title}</h3>
      {art.message && <p className="m">{art.message}</p>}
      <p className="small m uname">Enviado por {art.authorName || 'Participante'}</p>
    </div>
  );
}

/* ---------- Página de Regras ---------- */
export function RulesPage() {
  return (
    <section className="glass hot">
      <p className="eyebrow">Regulamento</p>
      <h2>Regras</h2>
      <div id="rules-content" className="empty-slot" />
    </section>
  );
}

/* ---------- Página de Suporte ---------- */
export function SupportPage() {
  return (
    <section className="glass hot">
      <p className="eyebrow">Atendimento</p>
      <h2>Suporte</h2>
      <div id="support-bot-container" className="bot-slot" />
    </section>
  );
}