import React, { useRef, useState } from 'react';
import { Tree } from './Tree.jsx';
import { Icon } from '../../../icons.jsx';
import { CommunityTag } from '../../../components/SharedUI.jsx';

const MAX_PNG_BYTES = 5 * 1024 * 1024; // 5 MB
const REGIONS = [
  { id: 'esquerda', label: 'Esquerda' },
  { id: 'base', label: 'Base' },
  { id: 'direita', label: 'Direita' },
];

function detectHeaven(communityMeta) {
  const hint = [
    communityMeta?.slug,
    communityMeta?.tag,
    communityMeta?.name,
    typeof window !== 'undefined' ? window.location.pathname : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return hint.includes('heaven') || hint.includes('heavem') || hint.includes('ducks');
}

function checkPngTransparency(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const w = Math.min(img.width || 128, 256);
        const h = Math.min(img.height || 128, 256);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let hasAlpha = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 250) {
            hasAlpha = true;
            break;
          }
        }
        URL.revokeObjectURL(url);
        resolve(hasAlpha);
      } catch {
        URL.revokeObjectURL(url);
        resolve(true);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

export function TreePage({
  me = {},
  letters = [],
  ornaments = [],
  communityMeta,
  onOpen,
  onWrite,
  onSubmitOrnament,
}) {
  const [page, setPage] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const [region, setRegion] = useState('base');
  const [mode, setMode] = useState('message'); // 'message' | 'png'
  const [caption, setCaption] = useState('');
  const [pngFile, setPngFile] = useState(null);
  const [pngPreview, setPngPreview] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const isHeaven = detectHeaven(communityMeta);
  const scenarioName = isHeaven ? 'Bosque da Heaven' : 'Castelo Kingdom';
  const clueFragment = isHeaven ? 'ZE' : 'TRE';

  const safeLetters = Array.isArray(letters) ? letters : [];
  const total = safeLetters.length;
  const pages = Math.max(1, Math.ceil(total / 12));
  const current = page % pages;
  const visible = safeLetters.slice(current * 12, current * 12 + 12);

  const openRandom = () => {
    if (!total) return;
    const pick = safeLetters[Math.floor(Math.random() * total)];
    onOpen?.(pick);
  };

  const handleFileChange = async (e) => {
    setErrorMsg('');
    setStatusMsg('');
    const file = e.target.files?.[0];
    if (!file) {
      setPngFile(null);
      setPngPreview('');
      return;
    }

    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      setErrorMsg('Envie apenas arquivo no formato PNG (.png) com fundo transparente.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PNG_BYTES) {
      setErrorMsg('O arquivo PNG ultrapassa o limite máximo de 5 MB.');
      e.target.value = '';
      return;
    }

    const transparent = await checkPngTransparency(file);
    if (!transparent) {
      setErrorMsg('O PNG precisa ter fundo transparente (canal alfa sem fundo sólido).');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPngFile(file);
      setPngPreview(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleOrnamentSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');

    const cleanCaption = caption.trim();
    if (mode === 'message' && cleanCaption.length < 3) {
      setErrorMsg('Escreva uma mensagem de 3 a 120 caracteres para o enfeite.');
      return;
    }
    if (mode === 'png' && !pngFile) {
      setErrorMsg('Selecione um personagem em PNG transparente (até 5 MB).');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        day: 7,
        scenario: scenarioName,
        region,
        mode,
        text: cleanCaption,
        file: pngFile,
        imageUrl: pngPreview || undefined,
        author: me?.user?.name || 'Participante',
      };

      if (typeof onSubmitOrnament === 'function') {
        await onSubmitOrnament(payload);
      }

      setStatusMsg(
        isHeaven
          ? `Enviado para aprovação da equipe no cenário ${scenarioName} (${region}). Lembre-se de comprovar no Ducks em até 24h sem revelar senhas!`
          : `Enviado para aprovação da equipe no cenário ${scenarioName} (${region}). Ficará visível na árvore assim que for aprovado!`
      );
      setCaption('');
      setPngFile(null);
      setPngPreview('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setErrorMsg(err?.message || 'Não foi possível enviar o enfeite. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass hot tree-page">
      <div className="tree-head">
        <div>
          <p className="eyebrow">
            Árvore Comunitária · {communityMeta?.tag || 'COMUNIDADE'}
          </p>
          <div className="who-name">
            <h2 style={{ margin: 0 }}>{scenarioName}</h2>
            <CommunityTag tag={communityMeta?.tag} theme={communityMeta?.theme} />
          </div>
          <p className="m">
            Escolha uma região (<b>esquerda</b>, <b>base</b> ou <b>direita</b>) para enviar um enfeite com mensagem (até 120 caracteres) ou um personagem em <b>PNG transparente (até 5 MB)</b>.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span className="badge gold">
            <Icon name="mail" size={14} />
            <span>{total} {total === 1 ? 'enfeite aprovado' : 'enfeites aprovados'}</span>
          </span>
          <span className="badge" title="Placa da Árvore · Fragmento 02/03 da Caça às pistas">
            Placa da Árvore · Pista 02/03: <b>{clueFragment}</b>
          </span>
        </div>
      </div>

      <div className="tree-stage">
        <Tree
          letters={visible}
          ornaments={ornaments}
          isHeaven={isHeaven}
          onOpen={onOpen}
        />
      </div>

      <p className="m small center" style={{ marginTop: 6, opacity: 0.85 }}>
        Exibição pública condicionada à aprovação da equipe.{' '}
        {isHeaven
          ? 'Participantes da Heaven devem registrar a comprovação no Ducks em até 24h.'
          : 'Participantes da The Kingdom enviam diretamente pela VULPORA.'}
      </p>

      {visible.length > 0 && (
        <div className="letter-tags" aria-label="Enfeites e mensagens aprovadas">
          {visible.map((l, idx) => (
            <button
              key={l.id ?? idx}
              type="button"
              className="letter-pill"
              onClick={() => onOpen?.(l)}
              title={`Ler mensagem de ${l.author || 'Anônimo'}`}
            >
              <Icon name="mail" size={14} />
              <span>{l.author || 'Anônimo'}</span>
            </button>
          ))}
        </div>
      )}

      {!total && (
        <p className="m center">A árvore ainda aguarda os primeiros enfeites aprovados. Envie o seu!</p>
      )}

      <div className="tree-actions">
        <button className="btn red" onClick={onWrite}>
          <Icon name="mail" size={17} />
          <span>Escrever enfeite rápido</span>
        </button>

        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setShowComposer((v) => !v);
            setErrorMsg('');
            setStatusMsg('');
          }}
        >
          <Icon name="sparkles" size={17} />
          <span>{showComposer ? 'Fechar envio por região' : 'Enviar por região / PNG'}</span>
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

      {showComposer && (
        <form
          onSubmit={handleOrnamentSubmit}
          className="paper"
          style={{ marginTop: 16, display: 'grid', gap: 12 }}
        >
          <div className="who-name" style={{ justifyContent: 'space-between' }}>
            <b>Decorar {scenarioName} (Dia 7 · Árvore comunitária)</b>
            <span className="m small">Aprovação obrigatória</span>
          </div>

          <div>
            <label className="m small" style={{ display: 'block', marginBottom: 6 }}>
              1. Região do cenário:
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`btn ${region === r.id ? 'red' : 'ghost'}`}
                  onClick={() => setRegion(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="m small" style={{ display: 'block', marginBottom: 6 }}>
              2. Tipo de envio:
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${mode === 'message' ? 'red' : 'ghost'}`}
                onClick={() => setMode('message')}
              >
                Enfeite com mensagem (até 120 chars)
              </button>
              <button
                type="button"
                className={`btn ${mode === 'png' ? 'red' : 'ghost'}`}
                onClick={() => setMode('png')}
              >
                Personagem PNG transparente (até 5 MB)
              </button>
            </div>
          </div>

          {mode === 'message' ? (
            <div>
              <textarea
                rows={3}
                maxLength={120}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={`Escreva sua mensagem para o cenário ${scenarioName} (máx. 120 caracteres)...`}
              />
              <p className="m small" style={{ marginTop: 4 }}>{caption.length}/120 caracteres</p>
            </div>
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,.png"
                onChange={handleFileChange}
              />
              <p className="m small" style={{ marginTop: 4 }}>
                Somente <b>.png com fundo transparente</b> · Tamanho máximo: <b>5 MB</b>.
              </p>
              <input
                type="text"
                maxLength={120}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Legenda opcional para o seu personagem (até 120 caracteres)"
                style={{ marginTop: 6 }}
              />
              {pngPreview && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={pngPreview}
                    alt="Pré-visualização do personagem PNG"
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: 'contain',
                      borderRadius: 8,
                      background: 'repeating-conic-gradient(#222 0% 25%, #333 0% 50%) 50% / 12px 12px',
                    }}
                  />
                  <span className="m small">PNG transparente validado ({(pngFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
              )}
            </div>
          )}

          {errorMsg && <div className="err" role="alert">{errorMsg}</div>}
          {statusMsg && <div className="badge pine">{statusMsg}</div>}

          <div className="acts">
            <button type="submit" className="btn red" disabled={busy}>
              {busy ? 'Enviando...' : 'Enviar para aprovação da equipe'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}