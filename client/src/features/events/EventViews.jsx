import React, { useState } from 'react';
import { Icon } from '../../icons.jsx';
import { Avatar, CommunityTag } from '../../components/SharedUI.jsx';
import { Tree } from './natal/Tree.jsx';

const MEDAL_COLOR = ['#F4A51D', '#E2D8CE', '#C87D3B'];

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

export function Home({ me = {}, ev = {}, communityMeta, letters = [], onOpen, onWrite, onMission, onBackToCommunity }) {
  const missions = ev?.missions || [];
  const today = ev?.today || 1;
  const missionsDone = me?.missionsDone || 0;
  const m = missions[Math.max(today, 1) - 1] || missions[0];
  const C = 2 * Math.PI * 42;
  const rest = Math.max(0, 25 - today);
  const commName = communityMeta?.name || 'Comunidade';
  const commTag = communityMeta?.tag || 'EVENTO';
  const commTheme = communityMeta?.theme;

  const eyebrow =
    ev?.status === 'before'
      ? 'O evento começa em breve'
      : ev?.status === 'ended'
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
                strokeDashoffset={C * (1 - missionsDone / 25)}
              />
            </svg>
            <div className="ringtxt">
              <b className="big">{missionsDone}</b>
              <small>de 25</small>
            </div>
          </div>
          <p className="m center">
            {me?.points != null
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

export function Calendar({ ev = {}, communityMeta, onMission }) {
  const missions = ev?.missions || [];
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
          {missions.map((m) => {
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

export function Ranking({ rk, isCommunity = false }) {
  const isUnlocked = isCommunity || new Date() >= new Date(2026, 11, 26);

  if (!isUnlocked) {
    return (
      <div className="rk-locked">
        <span className="rk-locked-ico" aria-hidden="true">
          <Icon name="clock" size={22} />
        </span>
        <b>Ranking do evento oculto</b>
        <p className="m">
          O pódio e a classificação do evento serão revelados apenas no dia <b>26 de dezembro</b>.
        </p>
      </div>
    );
  }

  const list = rk?.ranking || [];
  const top = [1, 0, 2].map((i) => list[i]).filter(Boolean);

  return (
    <div className="rk-wrap">
      {!list.length && <p className="m">Ninguém pontuou ainda. Seja a primeira pessoa!</p>}

      {top.length > 0 && (
        <div className="podium" role="list" aria-label="Pódio dos 3 primeiros lugares">
          {top.map((r) => {
            const pos = r.position;
            const color = MEDAL_COLOR[pos - 1] || '#F4A51D';

            return (
              <div key={pos} role="listitem" className={`pod p${pos}`}>
                <div className="pod-top">
                  {pos === 1 && (
                    <span className="pod-crown" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 5l4.5 11h11L22 5l-5.5 5.5L12 4l-4.5 6.5L2 5zm3 14h14v2H5v-2z" />
                      </svg>
                    </span>
                  )}

                  <div className="pod-av-wrap">
                    <Avatar u={r} />
                    <span className="pod-rank-pin">{pos}º</span>
                  </div>

                  <b className="pod-name uname" title={r.name}>
                    {r.name}
                  </b>
                </div>

                <div className="step" style={{ '--medal': color }}>
                  <span className="step-place">{pos}º</span>
                  <span className="step-pts">
                    <Icon name="medal" size={14} />
                    <span>{r.points} pts</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {list.slice(3).length > 0 && (
        <div className="rk-list">
          {list.slice(3).map((r) => (
            <div key={r.position} className="row">
              <span className="pos">{r.position}º</span>
              <Avatar u={r} />
              <b className="uname">{r.name}</b>
              <b className="pts">{r.points} pts</b>
            </div>
          ))}
        </div>
      )}

      {rk?.me && (
        <div className="row me">
          <span className="pos">{rk.me.position != null ? `${rk.me.position}º` : '—'}</span>
          <span className="av">
            <Icon name="star" size={16} />
          </span>
          <b>Você</b>
          <b className="pts">{rk.me.points} pts</b>
        </div>
      )}
    </div>
  );
}

export function Prizes({ pz = {}, done = 0 }) {
  const prizes = pz?.prizes || [];
  const milestones = pz?.milestones || [];
  return (
    <>
      {prizes.map((p) => (
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
      {milestones.map((k) => {
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