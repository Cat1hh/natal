import React from 'react';
import { Avatar, CommunityTag } from '../../components/SharedUI.jsx';
import { CommunityPage } from './CommunityPage.jsx';

export function CommunityLayout({
  me,
  rk,
  activeMeta,
  commTag,
  communitySlug,
  navigateTo,
  onLogout,
  onNotify,
}) {
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
            <button type="button" className="btn ghost btn-sm" onClick={onLogout}>
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
            onNotify={onNotify}
          />
        </main>
      </div>
    </div>
  );
}