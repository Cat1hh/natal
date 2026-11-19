import React from 'react';
import { Tree } from './Tree.jsx';
import { Icon } from '../../../icons.jsx';
import { CommunityTag } from '../../../components/SharedUI.jsx';

export function TreePage({ letters = [], communityMeta, onOpen, onWrite }) {
  const [page, setPage] = useState(0);
  const total = letters.length;
  const pages = Math.max(1, Math.ceil(total / 12));
  const current = page % pages;
  const visible = letters.slice(current * 12, current * 12 + 12);

  const openRandom = () => {
    if (!total) return;
    const pick = letters[Math.floor(Math.random() * total)];
    onOpen?.(pick);
  };

  return (
    <section className="glass hot tree-page">
      <div className="tree-head">
        <div>
          <p className="eyebrow">
            Correio de Natal · {communityMeta?.tag || 'COMUNIDADE'}
          </p>
          <div className="who-name">
            <h2 style={{ margin: 0 }}>Árvore de {communityMeta?.name || 'Comunidade'}</h2>
            <CommunityTag tag={communityMeta?.tag} theme={communityMeta?.theme} />
          </div>
          <p className="m">
            Toque em qualquer envelope pendurado nos galhos para ler uma mensagem ou deixe a sua.
          </p>
        </div>
        <span className="badge gold">
          <Icon name="mail" size={14} />
          <span>{total} {total === 1 ? 'cartinha' : 'cartinhas'}</span>
        </span>
      </div>

      <div className="tree-stage">
        <Tree letters={visible} onOpen={onOpen} />
      </div>

      {visible.length > 0 && (
        <div className="letter-tags" aria-label="Cartinhas penduradas">
          {visible.map((l, idx) => (
            <button
              key={l.id ?? idx}
              type="button"
              className="letter-pill"
              onClick={() => onOpen?.(l)}
              title={`Ler cartinha de ${l.author || 'Anônimo'}`}
            >
              <Icon name="mail" size={14} />
              <span>{l.author || 'Anônimo'}</span>
            </button>
          ))}
        </div>
      )}

      {!total && (
        <p className="m center">A árvore ainda está sem cartinhas. Seja a primeira pessoa a pendurar uma!</p>
      )}

      <div className="tree-actions">
        <button className="btn red" onClick={onWrite}>
          <Icon name="mail" size={17} />
          <span>Escrever cartinha</span>
        </button>
        {total > 0 && (
          <button className="btn ghost" onClick={openRandom}>
            <Icon name="sparkles" size={17} />
            <span>Ler aleatória</span>
          </button>
        )}
        {total > 12 && (
          <button className="btn ghost" onClick={() => setPage((p) => p + 1)}>
            <Icon name="refresh" size={16} />
            <span>Ver outras ({current + 1}/{pages})</span>
          </button>
        )}
      </div>
    </section>
  );
}