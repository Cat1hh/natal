import React from 'react';
import { Avatar, VulporaLogo } from '../../components/SharedUI.jsx';
import { CommunitiesHub } from './CommunitiesHub.jsx';

export function PortalLayout({ user, communities, onSelectCommunity, onLogout }) {
  return (
    <div className="vulpora-portal-shell">
      <div className="vulpora-waves" aria-hidden="true" />
      <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
        <header className="portal-topbar">
          <VulporaLogo compact />
          <div className="topbar-right">
            <div className="chip vp-chip">
              <Avatar u={user} />
              <span className="uname">{user.name}</span>
            </div>
            <button type="button" className="btn ghost btn-sm" onClick={onLogout}>
              Sair
            </button>
          </div>
        </header>

        <main>
          <CommunitiesHub
            user={user}
            communities={communities}
            onSelect={onSelectCommunity}
          />
        </main>
      </div>
    </div>
  );
}