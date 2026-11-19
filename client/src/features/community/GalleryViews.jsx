import React, { useState } from 'react';
import { Icon } from '../../icons.jsx';
import { CommunityTag } from '../../components/SharedUI.jsx';

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