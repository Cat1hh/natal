import React from 'react';
import { Icon } from '../icons.jsx';

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

export function RulesPage() {
  return (
    <section className="glass hot">
      <p className="eyebrow">Regulamento</p>
      <h2>Regras</h2>
      <div id="rules-content" className="empty-slot" />
    </section>
  );
}

export function SupportPage() {
  return (
    <section className="glass hot">
      <p className="eyebrow">Atendimento</p>
      <h2>Suporte</h2>
      <div id="support-bot-container" className="bot-slot" />
    </section>
  );
}