import React, { useState } from 'react';
import { Icon } from '../../icons.jsx';
import { Avatar, CommunityTag } from '../../components/SharedUI.jsx';

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