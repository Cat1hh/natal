import React, { useState } from 'react';
import { Icon } from '../../icons.jsx';
import { getCommunityBasePath } from '../../api.js';
import { VulporaLogo } from '../../components/SharedUI.jsx';

function sanitizeReturnTo(raw, fallback) {
  if (!raw || typeof raw !== 'string') return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}

export function Login({ erro, isPortal = true, onNotify }) {
  const [screen, setScreen] = useState('login');
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState('');
  const [formErr, setFormErr] = useState('');

  const defaultTarget = isPortal ? '/comunidade' : getCommunityBasePath();
  const queryReturnTo =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('returnTo')
      : null;
  const targetAfterLogin = sanitizeReturnTo(queryReturnTo, defaultTarget);
  const returnTo = encodeURIComponent(targetAfterLogin);

  const oauthErrMsg =
    erro === 'google'
      ? 'Não foi possível entrar com o Google. Tente novamente.'
      : erro === 'google_config'
      ? 'Login com Google ainda não configurado no servidor.'
      : erro === 'discord'
      ? 'Não foi possível entrar com o Discord. Tente novamente.'
      : erro === 'discord_config'
      ? 'Login com Discord ainda não configurado no servidor.'
      : erro === 'access_denied'
      ? 'Autorização cancelada. Tente novamente para continuar.'
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

  const handleOAuthClick = (e, provider) => {
    if (busy || oauthBusy) {
      e.preventDefault();
      return;
    }
    setFormErr('');
    setOauthBusy(provider);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy || oauthBusy) return;
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

  const renderOAuthButtons = (compact = false) => (
    <div className={`vp-oauth-row ${compact ? 'is-compact' : ''}`}>
      <a
        className={`vp-oauth-btn google ${oauthBusy === 'google' ? 'is-loading' : ''}`}
        href={`/auth/google?returnTo=${returnTo}`}
        onClick={(e) => handleOAuthClick(e, 'google')}
        aria-label="Continuar com Google"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z" />
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
          <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.9 7.4 24 12 24z" />
        </svg>
        <span>{oauthBusy === 'google' ? 'Conectando...' : 'Google'}</span>
      </a>

      <a
        className={`vp-oauth-btn discord ${oauthBusy === 'discord' ? 'is-loading' : ''}`}
        href={`/auth/discord?returnTo=${returnTo}`}
        onClick={(e) => handleOAuthClick(e, 'discord')}
        aria-label="Continuar com Discord"
      >
        <Icon name="discord" size={20} />
        <span>{oauthBusy === 'discord' ? 'Conectando...' : 'Discord'}</span>
      </a>
    </div>
  );

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

            <div className="vp-divider">
              <span>acesso rápido</span>
            </div>

            {renderOAuthButtons(true)}
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

              <button type="submit" className="vp-pill-btn primary" disabled={busy || Boolean(oauthBusy)}>
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

            {renderOAuthButtons()}

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