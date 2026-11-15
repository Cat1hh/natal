import React, { useState } from 'react';
import { Tree } from './tree.jsx';
import { Icon } from './icons.jsx';

const MEDAL_COLOR = ['#F4A51D', '#E2D8CE', '#C87D3B'];

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
          <path d="M8 32 Q20 20 32 8 M14 26 L11 18 M14 26 L22 28 M20 20 L17 12 M20 20 L28 22 M26 14 L23 7 M26 14 L33 16" stroke="#F4A51D" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'snowflake':
      return (
        <svg className="t-art lg" viewBox="0 0 60 60" aria-hidden="true">
          <g stroke="#F1E4D4" strokeWidth="1.8" strokeLinecap="round" fill="none">
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
          <path d="M20 5 L24 15 L35 16 L26 23 L29 34 L20 28 L11 34 L14 23 L5 16 L16 15 Z" fill="none" stroke="#F4A51D" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'tree':
      return (
        <svg className="t-art tall-art" viewBox="0 0 50 80" aria-hidden="true">
          <path d="M25 6 L27 11 L32 11 L28 14 L29 19 L25 16 L21 19 L22 14 L18 11 L23 11 Z" fill="#F4A51D" />
          <polygon points="25,18 14,34 36,34" fill="#F4A51D" />
          <polygon points="25,28 11,48 39,48" fill="#F4A51D" />
          <polygon points="25,40 8,64 42,64" fill="#F4A51D" />
          <rect x="22" y="64" width="6" height="9" fill="#A46227" />
        </svg>
      );
    case 'bell':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 7 C13 7 10 13 10 21 L7 27 L33 27 L30 21 C30 13 27 7 20 7 Z" fill="#F4A51D" />
          <circle cx="20" cy="30" r="3.2" fill="#F1E4D4" />
        </svg>
      );
    case 'baubles':
      return (
        <svg className="t-art" viewBox="0 0 44 40" aria-hidden="true">
          <line x1="14" y1="2" x2="14" y2="12" stroke="#F1E4D4" strokeWidth="1.2" />
          <circle cx="14" cy="20" r="8" fill="#F4A51D" />
          <line x1="30" y1="2" x2="30" y2="8" stroke="#F1E4D4" strokeWidth="1.2" />
          <circle cx="30" cy="14" r="6" fill="#F1E4D4" />
        </svg>
      );
    case 'holly':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M12 28 Q10 16 22 14 Q24 24 12 28 Z M20 28 Q24 18 34 22 Q30 31 20 28 Z" fill="#F4A51D" />
          <circle cx="18" cy="28" r="2.4" fill="#A81E23" />
          <circle cx="22" cy="30" r="2.4" fill="#A81E23" />
        </svg>
      );
    case 'sprig':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M10 30 Q22 22 30 8" stroke="#F1E4D4" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="17" cy="19" r="2.5" fill="#F1E4D4" />
          <circle cx="25" cy="22" r="2.5" fill="#F1E4D4" />
          <circle cx="24" cy="12" r="2.5" fill="#F1E4D4" />
        </svg>
      );
    case 'bow':
      return (
        <svg className="t-art" viewBox="0 0 44 40" aria-hidden="true">
          <path d="M22 16 C14 8 6 12 10 20 C13 24 19 20 22 16 Z M22 16 C30 8 38 12 34 20 C31 24 25 20 22 16 Z" fill="#F1E4D4" />
          <path d="M20 18 L13 32 M24 18 L31 32" stroke="#F1E4D4" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'gift':
      return (
        <svg className="t-art" viewBox="0 0 40 40" aria-hidden="true">
          <rect x="9" y="15" width="22" height="17" rx="2" fill="#F1E4D4" />
          <rect x="7" y="11" width="26" height="5" rx="1.5" fill="#F4A51D" />
          <rect x="18" y="11" width="4" height="21" fill="#A81E23" />
        </svg>
      );
    case 'finials':
      return (
        <svg className="t-art lg" viewBox="0 0 54 60" aria-hidden="true">
          <line x1="18" y1="2" x2="18" y2="10" stroke="#F1E4D4" strokeWidth="1.2" />
          <path d="M18 10 C25 20 25 38 18 52 C11 38 11 20 18 10 Z" fill="#F4A51D" />
          <line x1="36" y1="2" x2="36" y2="8" stroke="#F1E4D4" strokeWidth="1.2" />
          <path d="M36 8 C42 17 42 32 36 44 C30 32 30 17 36 8 Z" fill="#F4A51D" />
        </svg>
      );
    default:
      return null;
  }
}

export const Avatar = ({ u, big }) =>
  u?.avatar ? (
    <img className={`av ${big ? 'xl' : ''}`} src={u.avatar} alt="" />
  ) : (
    <span className={`av ${big ? 'xl' : ''}`}>
      <Icon name="user" size={big ? 30 : 18} />
    </span>
  );

/* ---------- Login ---------- */
export function Login({ erro }) {
  return (
    <section className="glass hot login">
      <Tree letters={Array(7).fill({})} />
      <div>
        <p className="eyebrow">25 dias · missões · prêmios</p>
        <h1>Entre para acender a sua luz</h1>
        <p className="m">
          Faça login com o Discord para participar das missões, subir no ranking e deixar cartinhas na árvore.
        </p>
        {erro && (
          <div className="err">
            {erro.length > 20 ? erro : 'Não foi possível entrar com o Discord. Tente novamente.'}
          </div>
        )}
        <a className="btn dc big" href="/auth/discord">
          <Icon name="discord" size={20} />
          <span>Entrar com Discord</span>
        </a>
        <p className="m small">Usamos só o seu nome e o avatar. Nunca postamos nada por você.</p>
      </div>
    </section>
  );
}

/* ---------- Início ---------- */
export function Home({ me, ev, letters, onOpen, onWrite, onMission }) {
  const m = ev.missions[Math.max(ev.today, 1) - 1] || ev.missions[0];
  const C = 2 * Math.PI * 42;
  const rest = Math.max(0, 25 - ev.today);

  const eyebrow =
    ev.status === 'before'
      ? 'O evento começa em breve'
      : ev.status === 'ended'
      ? 'Evento encerrado'
      : rest === 0
      ? 'Hoje é Natal!'
      : `Faltam ${rest} ${rest === 1 ? 'dia' : 'dias'} para o Natal`;

  return (
    <div className="home">
      <section className="glass hot">
        <h2>A Árvore das Cartinhas</h2>
        <p className="m">Pendure uma mensagem para alguém que precisa ler. Toque num envelope ou nick para abrir.</p>
        <Tree letters={letters} onOpen={onOpen} />

        {letters.length > 0 && (
          <div className="letter-tags">
            {letters.slice(0, 8).map((l, idx) => (
              <button
                key={l.id ?? idx}
                type="button"
                className="letter-pill"
                onClick={() => onOpen?.(l)}
              >
                <Icon name="mail" size={13} />
                <span>{l.author || 'Anônimo'}</span>
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
              stroke="#F4A51D"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - me.missionsDone / 25)}
            />
          </svg>
          <div className="ringtxt">
            <b className="big">{me.missionsDone}</b>
            <small>de 25</small>
          </div>
        </div>
        <p className="m center">{me.points} pontos acumulados</p>
        {m && (
          <>
            <h3>
              Dia {m.day} · {m.title}
            </h3>
            <p className="m">{m.objective}</p>
            <p className="gain">+{m.points} pontos</p>
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
  );
}

/* ---------- Calendário do Advento (Mosaico) ---------- */
export function Calendar({ ev, onMission }) {
  return (
    <section className="glass hot">
      <h2>Dezembro 2026 · Calendário Mágico</h2>
      <p className="m">Uma porta nova se abre a cada dia. Passe o mouse ou toque para espiar a missão.</p>

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
                    {m.status === 'done' ? <Icon name="star" size={20} /> : `+${m.points}`}
                  </b>
                  <small>{m.status === 'done' ? 'concluída' : m.status === 'pending' ? 'análise' : 'pts'}</small>
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
  const top = [1, 0, 2].map((i) => rk.ranking[i]).filter(Boolean);
  return (
    <>
      {!rk.ranking.length && <p className="m">Ninguém pontuou ainda. Seja a primeira pessoa!</p>}
      <div className="podium">
        {top.map((r) => (
          <div key={r.position} className={`pod p${r.position}`}>
            <Avatar u={r} />
            <b>{r.name}</b>
            <span>{r.points} pts</span>
            <div className="step" style={{ color: MEDAL_COLOR[r.position - 1] }}>
              <Icon name="medal" size={24} />
            </div>
          </div>
        ))}
      </div>
      {rk.ranking.slice(3).map((r) => (
        <div key={r.position} className="row">
          <span className="pos">{r.position}</span>
          <Avatar u={r} />
          <b>{r.name}</b>
          <b className="pts">{r.points} pts</b>
        </div>
      ))}
      {rk.me && (
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
            <span className="pos" style={ok ? { color: '#F4A51D' } : undefined}>
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
export function Profile({ me, rk, onLogout }) {
  const pos = rk?.me?.position;
  return (
    <section className="glass hot">
      <h2>Seu perfil</h2>
      <div className="who">
        <Avatar u={me.user} big />
        <div>
          <b className="big">{me.user.name}</b>
          <p className="m">
            {me.points} pontos · {me.missionsDone} missões · {pos ? `#${pos} no ranking` : 'sem posição ainda'}
          </p>
        </div>
      </div>
      <div className="bar">
        <i style={{ width: `${(me.missionsDone / 25) * 100}%` }} />
      </div>
      <h3>Discord</h3>
      <div className="row ok">
        <span className="medal">
          <Icon name="discord" size={22} />
        </span>
        <div>
          <b>Conectado</b>
          <p className="m">
            <span style={{ color: '#8a943e' }}>●</span> {me.user.name}
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
      <p className="gain">+{m.points} pontos</p>
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
          <p className="m small">Um admin confere antes de os pontos entrarem.</p>
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

// 2. Substitua WriteModal e LetterModal:
export function WriteModal({ authorName, onSend }) {
  const [t, setT] = useState('');
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const displayNick = anon ? 'Anônimo' : (authorName || 'Você');

  return (
    <>
      <h3>Escrever cartinha</h3>
      <p className="m">Ela fica pendurada na árvore para alguém ler.</p>

      <div className="write-author">
        <Icon name="mail" size={15} />
        <span>Aparecerá na árvore como: <b>{displayNick}</b></span>
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
      <span>Cartinha de <b>{l.author || 'Anônimo'}</b></span>
    </div>
    <h3>Uma cartinha para você</h3>
    <div className="paper">
      {l.text}
      <br />
      <br />
      <i style={{ color: '#A81E23', fontWeight: 700 }}>— {l.author || 'Anônimo'}</i>
    </div>
  </>
);

/* ---------- Galeria de Artes ---------- */
export function GalleryPage({ items = [], me, isAdmin, onOpenForm, onReview, onInspect }) {
  const [filter, setFilter] = useState('approved');

  const userId = me?.user?.id || me?.user?._id || me?.user?.discordId;
  const approved = items.filter((item) => item.status === 'approved');
  const pending = items.filter((item) => item.status === 'pending');
  const myPending = pending.filter((item) => item.authorId === userId);

  const list = isAdmin && filter === 'pending' ? pending : approved;

  return (
    <section className="glass hot gal-page">
      <div className="tree-head">
        <div>
          <p className="eyebrow">Exposição de Natal</p>
          <h2>Galeria da Comunidade</h2>
          <p className="m">
            Compartilhe suas artes, fotos e criações natalinas. Todas as publicações passam pela aprovação dos administradores.
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
                  <small className="m">Por {art.authorName || 'Participante'}</small>

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
    reader.onload = () => setPreview(String(reader.result || ''));
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
      <p className="eyebrow">Galeria de Natal</p>
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
      <p className="small m">Enviado por {art.authorName || 'Participante'}</p>
    </div>
  );
}

/* ---------- Página de Regras (vazia para definir depois) ---------- */
export function RulesPage() {
  return (
    <section className="glass hot">
      <p className="eyebrow">O Festival</p>
      <h2>Regras</h2>
      <div id="rules-content" className="empty-slot" />
    </section>
  );
}

/* ---------- Página de Suporte (gancho para integração com Bot) ---------- */
export function SupportPage() {
  return (
    <section className="glass hot">
      <p className="eyebrow">Atendimento</p>
      <h2>Suporte</h2>
      {/* Insira aqui o embed, script ou botão de integração do seu bot */}
      <div id="support-bot-container" className="bot-slot" />
    </section>
  );
}