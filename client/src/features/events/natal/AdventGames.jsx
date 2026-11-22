import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../icons.jsx';

/* -------------------------------------------------------------------------- */
/* Configuração                                                               */
/* -------------------------------------------------------------------------- */

/**
 * false = sem dicas. Esconde os textos de apoio que entregam ou resumem a resposta
 * (códigos montados, contadores ao lado do botão, destaque de peça no lugar certo etc.).
 * Mude para true se quiser tudo de volta.
 */
const SHOW_HINTS = false;

/* -------------------------------------------------------------------------- */
/* Funções puras (sem React)                                                  */
/* -------------------------------------------------------------------------- */
// <pure>

const normalizeUpper = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const lettersOnly = (s = '') => normalizeUpper(s).replace(/[^A-Z]/g, '');

// Texto livre que entra em payloads separados por "|": tira "|" e quebras de linha.
const safe = (s = '') =>
  String(s ?? '')
    .replace(/[|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ducksSuffix = (isHeaven, link) => (isHeaven && String(link).trim() ? `|ducks=${safe(link)}` : '');

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---- Caça-palavras ---- */

const WS_SIZE = 12;
const WS_DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
];

const WS_WORDS = {
  '2-heaven': ['NEVE', 'OURO', 'ESTRELA', 'LAÇO'],
  '2-kingdom': ['RABANADA', 'ESTRELA', 'NEVE', 'OURO'],
  '14-heaven': ['ÁRVORE', 'NEVE', 'JOGO', 'OURO'],
  '14-kingdom': ['LAÇO', 'URSO', 'ANJO', 'RABANADA'],
};

function buildWordSearch(words, seedKey) {
  const rand = mulberry32(hashSeed(seedKey));
  const grid = Array.from({ length: WS_SIZE }, () => Array(WS_SIZE).fill(''));

  const fits = (chars, r0, c0, dr, dc) => {
    const r1 = r0 + dr * (chars.length - 1);
    const c1 = c0 + dc * (chars.length - 1);
    if (r1 < 0 || r1 >= WS_SIZE || c1 < 0 || c1 >= WS_SIZE) return false;
    return chars.every((ch, i) => {
      const cur = grid[r0 + dr * i][c0 + dc * i];
      return !cur || cur === ch;
    });
  };
  const put = (chars, r0, c0, dr, dc) =>
    chars.forEach((ch, i) => {
      grid[r0 + dr * i][c0 + dc * i] = ch;
    });

  words.forEach((word) => {
    const chars = [...word.normalize('NFC')];
    for (let attempt = 0; attempt < 500; attempt++) {
      const [dr, dc] = WS_DIRS[Math.floor(rand() * WS_DIRS.length)];
      const r0 = Math.floor(rand() * WS_SIZE);
      const c0 = Math.floor(rand() * WS_SIZE);
      if (fits(chars, r0, c0, dr, dc)) {
        put(chars, r0, c0, dr, dc);
        return;
      }
    }
    // Plano B (não deve acontecer): primeira linha em que a palavra cabe.
    for (let r = 0; r < WS_SIZE; r++) {
      for (let c = 0; c + chars.length <= WS_SIZE; c++) {
        if (fits(chars, r, c, 0, 1)) {
          put(chars, r, c, 0, 1);
          return;
        }
      }
    }
  });

  const filler = 'AAAAEEEEIIIOOOUUSSRRNNTTLLCCMMDDPPVVBBGGFFHJQXZ';
  for (let r = 0; r < WS_SIZE; r++) {
    for (let c = 0; c < WS_SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = filler[Math.floor(rand() * filler.length)];
    }
  }
  return grid;
}

// Células da linha reta entre a e b (8 direções). null se não for uma linha reta.
function lineCells(a, b) {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  if (len === 0) return null;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  return Array.from({ length: len + 1 }, (_, i) => [a[0] + sr * i, a[1] + sc * i]);
}

/* ---- Encontre as diferenças ---- */

const DIFF_ICONS = ['❄️', '✨', '🎄', '🔔', '🕯️', '⭐', '🎀', '🎁', '🦌', '🍪'];
const DIFF_SPOTS = {
  heaven: ['1,2', '2,7', '4,4', '6,9', '8,3', '10,6'],
  kingdom: ['1,8', '3,2', '5,6', '7,4', '8,9', '10,1'],
};

function buildDiffBoards(kind) {
  const rand = mulberry32(hashSeed(`diff-${kind}`));
  const base = Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => Math.floor(rand() * DIFF_ICONS.length))
  );
  const alt = base.map((row) => row.slice());
  DIFF_SPOTS[kind].forEach((id, k) => {
    const [r, c] = id.split(',').map((n) => Number(n) - 1);
    // Deslocamento de 1 a 8 (nunca 0 nem 10): o símbolo trocado é sempre diferente do original.
    alt[r][c] = (base[r][c] + 1 + ((k * 3) % 8)) % DIFF_ICONS.length;
  });
  return { base, alt };
}

const sortIds = (ids) =>
  [...ids].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ar - br || ac - bc;
  });

// </pure>

/* -------------------------------------------------------------------------- */
/* Estilo próprio dos jogos                                                   */
/* Cores explícitas em tudo: nada depende do CSS global do evento, então      */
/* nenhum texto fica "invisível" sobre fundo parecido.                        */
/* -------------------------------------------------------------------------- */

const CSS = `
.ag{--g:#F4A51D;--c:#F1E4D4;--ink:#140c08;--red:#C42B31;--pine:#3B7D5A;--bd:rgba(255,255,255,.16);
  display:grid;gap:12px;padding:12px;border-radius:14px;background:rgba(12,9,20,.96);color:var(--c);
  border:1px solid rgba(244,165,29,.25);font-size:14px;line-height:1.45;text-align:left}
.ag *{box-sizing:border-box}
.ag p{margin:0}
.ag :focus-visible{outline:2px solid var(--g);outline-offset:2px}
.ag-sub{color:rgba(241,228,212,.75);font-size:12.5px}
.ag-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ag-between{justify-content:space-between}
.ag-col{display:grid;gap:8px}
.ag-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ag-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ag-card{background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:12px;padding:10px;color:var(--c)}
.ag-label{display:block;margin-bottom:4px;font-size:12.5px;font-weight:700;color:var(--c)}
.ag-input{display:block;width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(241,228,212,.3);
  background:rgba(255,255,255,.08);color:var(--c);font:inherit}
.ag-input::placeholder{color:rgba(241,228,212,.5)}
textarea.ag-input{resize:vertical;min-height:72px}
.ag-btn{min-height:40px;padding:8px 12px;border-radius:10px;border:1px solid rgba(241,228,212,.32);
  background:rgba(255,255,255,.08);color:var(--c);font:inherit;font-weight:700;cursor:pointer;
  transition:background .15s,transform .1s}
a.ag-btn{display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.ag-btn:hover:not(:disabled){background:rgba(255,255,255,.16)}
.ag-btn:active:not(:disabled){transform:scale(.97)}
.ag-btn[aria-pressed="true"]{background:var(--g);border-color:var(--g);color:var(--ink)}
.ag-btn.go{background:var(--red);border-color:var(--red);color:#fff}
.ag-btn.go:hover:not(:disabled){background:#d8353b}
.ag-btn.sm{min-height:32px;padding:4px 9px;font-size:13px}
.ag-btn:disabled{opacity:.45;cursor:not-allowed}
.ag-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:700;
  border:1px solid rgba(241,228,212,.35);background:rgba(255,255,255,.07);color:var(--c)}
.ag-chip.ok{background:rgba(59,125,90,.55);border-color:#6fcf97;color:#fff}
.ag-chip.bad{background:rgba(196,43,49,.55);border-color:#ff7b80;color:#fff}
.ag-chip.gold{background:rgba(244,165,29,.2);border-color:var(--g);color:var(--g)}
.ag-err{padding:8px 10px;border-radius:10px;background:rgba(196,43,49,.28);border:1px solid #ff7b80;color:#ffe3e4}
.ag-ok{padding:8px 10px;border-radius:10px;background:rgba(59,125,90,.35);border:1px solid #6fcf97;color:#e6fff0}
.ag-q{display:block;margin-bottom:6px;font-weight:800;color:var(--c)}

/* caça-palavras */
.ag-wl{display:flex;gap:6px;flex-wrap:wrap}
.ag-w{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;border:1px solid rgba(241,228,212,.35);
  background:rgba(255,255,255,.07);color:var(--c);font-weight:800;letter-spacing:.04em}
.ag-w.done{text-decoration:line-through;color:#fff}
.ag-w.done.f0{background:#3B7D5A;border-color:#3B7D5A}
.ag-w.done.f1{background:#C42B31;border-color:#C42B31}
.ag-w.done.f2{background:#4B6FD6;border-color:#4B6FD6}
.ag-w.done.f3{background:#B8791A;border-color:#B8791A}
.ag-ws{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:2px;padding:6px;border-radius:12px;
  background:rgba(0,0,0,.4);border:1px solid rgba(244,165,29,.3);user-select:none;touch-action:manipulation}
.ag-ws-cell{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:5px;
  background:rgba(255,255,255,.08);color:var(--c);font:inherit;font-weight:800;font-size:clamp(10px,2.9vw,15px);cursor:pointer}
.ag-ws-cell.start{background:var(--g);color:var(--ink)}
.ag-ws-cell.f0{background:#3B7D5A;color:#fff}
.ag-ws-cell.f1{background:#C42B31;color:#fff}
.ag-ws-cell.f2{background:#4B6FD6;color:#fff}
.ag-ws-cell.f3{background:#B8791A;color:#fff}

/* memória */
.ag-mem{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.ag-mem-card{min-height:72px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:var(--c);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit;font-size:11px;font-weight:800;
  cursor:pointer;transition:background .15s,border-color .15s}
.ag-mem-card.open{border-color:var(--g);background:rgba(244,165,29,.25)}
.ag-mem-card.done{border-color:#6fcf97;background:rgba(59,125,90,.55);cursor:default}
.ag-mem-card span.big{font-size:22px}

/* classificação */
.ag-sector{display:grid;gap:6px;align-content:start}
.ag-chips{display:flex;gap:6px;flex-wrap:wrap;min-height:34px}

/* vitral */
.ag-vt{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:min(100%,300px);margin:0 auto;padding:6px;border-radius:12px;background:#0b1022}
.ag-vt-tile{position:relative;aspect-ratio:1/1;padding:0;border:2px solid transparent;border-radius:6px;overflow:hidden;background:#0b1022;cursor:pointer}
.ag-vt-tile.sel{border-color:var(--g);box-shadow:0 0 0 2px var(--g) inset}
.ag-vt-tile svg{display:block;width:100%;height:100%}
.ag-vt-tile .num{position:absolute;left:4px;top:4px;padding:1px 6px;border-radius:6px;background:rgba(0,0,0,.7);color:#fff;font-size:12px;font-weight:800}
.ag-vt-tile.right{border-color:#6fcf97}
.ag-thumb{width:84px;height:84px;border-radius:8px;overflow:hidden;border:1px solid var(--bd);flex:none}
.ag-thumb svg{display:block;width:100%;height:100%}

/* forca */
.ag-hm-slots{display:flex;justify-content:center;gap:6px;flex-wrap:wrap}
.ag-hm-slot{width:28px;height:38px;display:flex;align-items:center;justify-content:center;border-bottom:3px solid var(--g);
  font-weight:900;font-size:19px;color:var(--c)}
.ag-keys{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.ag-key{min-width:34px;min-height:36px;padding:2px 6px}
.ag-key.hit{background:var(--pine);border-color:#6fcf97;color:#fff}
.ag-key.miss{background:rgba(196,43,49,.6);border-color:#ff7b80;color:#fff}
.ag-lives{display:flex;gap:3px;font-size:18px}

/* sudoku */
.ag-sd{display:grid;grid-template-columns:repeat(6,1fr);width:min(100%,320px);margin:0 auto;border:2px solid var(--g);
  border-radius:10px;overflow:hidden;background:rgba(0,0,0,.35)}
.ag-sd-cell{aspect-ratio:1/1;padding:0;border:0;border-right:1px solid rgba(255,255,255,.16);border-bottom:1px solid rgba(255,255,255,.16);
  background:transparent;color:var(--c);font:inherit;font-size:clamp(17px,5vw,23px);font-weight:800;cursor:pointer}
.ag-sd-cell.rel{background:rgba(255,255,255,.09)}
.ag-sd-cell.given{color:var(--g);background:rgba(244,165,29,.16);cursor:default}
.ag-sd-cell.sel{background:rgba(244,165,29,.4);color:#fff}
.ag-sd-cell.bR{border-right:2px solid var(--g)}
.ag-sd-cell.bB{border-bottom:2px solid var(--g)}

/* cruzadinha */
.ag-cw{display:grid;gap:4px}
.ag-cw-clue{font-size:13px;color:var(--c)}
.ag-cw-row{position:relative;display:flex;gap:3px;width:max-content;max-width:100%;cursor:text}
.ag-cw-box{width:27px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(241,228,212,.4);
  border-radius:6px;background:rgba(255,255,255,.07);color:var(--c);font-weight:900}
.ag-cw-box.key{background:rgba(244,165,29,.3);border-color:var(--g);color:#fff}
.ag-cw-row:focus-within .ag-cw-box{border-color:var(--g)}
.ag-cw-input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:text}

/* diferenças */
.ag-df{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:2px;padding:6px;border-radius:10px;
  background:rgba(0,0,0,.4);border:1px solid rgba(244,165,29,.3)}
.ag-df-cell{aspect-ratio:1/1;padding:0;border-radius:5px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);
  color:var(--c);font:inherit;font-size:clamp(11px,3.3vw,17px);line-height:1;cursor:pointer}
.ag-df-cell[disabled]{cursor:default;opacity:1}
.ag-df-cell.pick{background:#C42B31;border-color:var(--g);box-shadow:0 0 0 1px var(--g) inset}

/* criptograma */
.ag-cr{display:flex;flex-wrap:wrap;gap:10px 18px}
.ag-cr-word{display:flex;gap:4px}
.ag-cr-col{display:flex;flex-direction:column;align-items:center;gap:3px}
.ag-cr-c{font-weight:900;font-size:16px;color:var(--g)}
.ag-cr-in{width:30px;height:36px;padding:0;text-align:center;font-weight:900;text-transform:uppercase}

/* anagramas / rota */
.ag-tiles{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.ag-tile{display:inline-flex;width:28px;height:34px;align-items:center;justify-content:center;border-radius:7px;
  background:var(--g);color:var(--ink);font-weight:900}
.ag-tl{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ag-tl-hour{display:inline-block;min-width:42px;font-weight:900;color:var(--g)}

@media (prefers-reduced-motion:reduce){.ag *{transition:none!important;animation:none!important}}
`;

/* -------------------------------------------------------------------------- */
/* Peças compartilhadas                                                       */
/* -------------------------------------------------------------------------- */

function DucksProofBox({ value, onChange, optional = true }) {
  return (
    <label>
      <span className="ag-label">
        Link ou print da comprovação no Ducks {optional ? '(opcional agora · prazo 24h)' : '(obrigatório)'}
      </span>
      <input
        className="ag-input"
        type="text"
        maxLength={240}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cole o link do post no Ducks (sem revelar senhas ou respostas)"
      />
    </label>
  );
}

function SubmitBar({ busy, disabled, label = 'Enviar resposta', busyLabel = 'Validando...', onClick, extraInfo }) {
  return (
    <div className="ag-row ag-between">
      {SHOW_HINTS && extraInfo ? <span className="ag-sub">{extraInfo}</span> : <span />}
      <button type="button" className="ag-btn go" disabled={busy || disabled} onClick={onClick}>
        {busy ? busyLabel : label}
      </button>
    </div>
  );
}

function Choice({ active, onClick, children }) {
  return (
    <button type="button" className="ag-btn" aria-pressed={Boolean(active)} onClick={onClick}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 1 — Perfil de dezembro                                                 */
/* -------------------------------------------------------------------------- */

const D1_ITEMS = [
  ['Gorro de Noelvet', '🎅'],
  ['Estrela Dourada', '⭐'],
  ['Guirlanda de Pinho', '🌿'],
  ['Floco de Neve', '❄️'],
  ['Cachecol Carmesim', '🧣'],
];

function Day1ProfileGame({ isHeaven, busy, onSend }) {
  const [nick, setNick] = useState('');
  const [ornament, setOrnament] = useState(D1_ITEMS[0][0]);
  const [link, setLink] = useState('');

  const emoji = D1_ITEMS.find(([name]) => name === ornament)?.[1] ?? '✨';
  const canSubmit = isHeaven ? link.trim().length >= 5 : nick.trim().length >= 2;

  const handleSend = () => {
    onSend?.(isHeaven ? `DUCKS_PROOF:${link.trim()}` : `VULPORA_CARD|nick=${safe(nick)}|item=${ornament}`);
  };

  return (
    <div className="ag-col">
      {isHeaven ? (
        <>
          <p className="ag-sub">
            Personalize foto ou capa do seu perfil Ducks com um elemento natalino e publique com <b>#AdventoHeaven01</b>.
          </p>
          <input
            className="ag-input"
            type="text"
            maxLength={260}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Cole o link da publicação/captura com #AdventoHeaven01..."
            aria-label="Link da publicação"
          />
        </>
      ) : (
        <>
          <p className="ag-sub">Monte seu cartão de perfil natalino na VULPORA escolhendo um adorno festivo.</p>
          <input
            className="ag-input"
            type="text"
            maxLength={40}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Seu nome ou arroba no cartão..."
            aria-label="Nome no cartão"
          />
          <div className="ag-row">
            {D1_ITEMS.map(([name, icon]) => (
              <Choice key={name} active={ornament === name} onClick={() => setOrnament(name)}>
                {icon} {name}
              </Choice>
            ))}
          </div>
          <div className="ag-card ag-row ag-between">
            <div>
              <b>{nick.trim() || 'Viajante Kingdom'}</b>
              <p className="ag-sub">Adorno: {ornament} · Natal 2026</p>
            </div>
            <span style={{ fontSize: 34 }} aria-hidden="true">{emoji}</span>
          </div>
        </>
      )}
      <SubmitBar busy={busy} disabled={!canSubmit} label="Enviar para revisão" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dias 2 e 14 — Caça-palavras 12×12                                          */
/* -------------------------------------------------------------------------- */

function WordSearchGame({ day, isHeaven, busy, onSend }) {
  const key = `${day}-${isHeaven ? 'heaven' : 'kingdom'}`;
  const words = WS_WORDS[key] || WS_WORDS['2-kingdom'];
  const grid = useMemo(() => buildWordSearch(words, `ws-${key}`), [words, key]);

  const [start, setStart] = useState(null);
  const [found, setFound] = useState({});
  const [note, setNote] = useState('');
  const [password, setPassword] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const wordOfCell = useMemo(() => {
    const map = {};
    Object.entries(found).forEach(([idx, cells]) => cells.forEach(([r, c]) => (map[`${r}-${c}`] = idx)));
    return map;
  }, [found]);

  const foundCount = Object.keys(found).length;
  const allFound = foundCount === words.length;
  const cleanPass = lettersOnly(password);

  const onCell = (r, c) => {
    if (allFound) return;
    setNote('');
    if (!start) {
      setStart([r, c]);
      return;
    }
    if (start[0] === r && start[1] === c) {
      setStart(null);
      return;
    }
    const cells = lineCells(start, [r, c]);
    if (!cells) {
      setStart([r, c]);
      return;
    }
    const text = normalizeUpper(cells.map(([rr, cc]) => grid[rr][cc]).join(''));
    const reversed = [...text].reverse().join('');
    const idx = words.findIndex((w, i) => !found[i] && (normalizeUpper(w) === text || normalizeUpper(w) === reversed));
    setStart(null);
    if (idx >= 0) setFound((prev) => ({ ...prev, [idx]: cells }));
    else setNote('Essa sequência não é uma das palavras da lista.');
  };

  const handleSend = () => onSend?.(`${cleanPass}${ducksSuffix(isHeaven, ducksLink)}`);

  return (
    <div className="ag-col">
      {SHOW_HINTS && (
        <p className="ag-sub">
          Junte a 1ª letra de cada palavra, na ordem da lista, para formar a senha.
        </p>
      )}

      <div className="ag-card">
        <div className="ag-row ag-between" style={{ marginBottom: 6 }}>
          <b>Palavras escondidas</b>
          <span className={`ag-chip ${allFound ? 'ok' : ''}`}>
            {foundCount}/{words.length}
          </span>
        </div>
        <div className="ag-wl">
          {words.map((w, i) => (
            <span key={w} className={`ag-w ${found[i] ? `done f${i}` : ''}`}>
              {i + 1}. {w}
            </span>
          ))}
        </div>
      </div>

      <div
        className="ag-ws"
        role="grid"
        aria-label="Tabuleiro de caça-palavras. Toque na primeira e na última letra de uma palavra."
      >
        {grid.map((row, r) =>
          row.map((ch, c) => {
            const w = wordOfCell[`${r}-${c}`];
            const isStart = start && start[0] === r && start[1] === c;
            const cls = ['ag-ws-cell', w !== undefined ? `f${w}` : '', isStart ? 'start' : ''].filter(Boolean).join(' ');
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={cls}
                onClick={() => onCell(r, c)}
                aria-label={`Linha ${r + 1}, coluna ${c + 1}: ${ch}`}
              >
                {ch}
              </button>
            );
          })
        )}
      </div>

      {note && <div className="ag-err" role="status">{note}</div>}

      {allFound ? (
        <>
          <div className="ag-ok">Todas as palavras encontradas!</div>
          <label>
            <span className="ag-label">Senha</span>
            <input
              className="ag-input"
              type="text"
              maxLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              autoComplete="off"
            />
          </label>
          {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
        </>
      ) : (
        <p className="ag-sub">Toque na primeira e na última letra de cada palavra para marcá-la.</p>
      )}

      <SubmitBar
        busy={busy}
        disabled={!allFound || cleanPass.length !== 4}
        label="Validar senha"
        extraInfo={`Encontradas: ${foundCount}/${words.length}`}
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 3 — Memória dos símbolos (8 pares, máx. 24 jogadas)                    */
/* -------------------------------------------------------------------------- */

const MEMORY_SYMBOLS = {
  heaven: [
    { icon: '🔔', label: 'SINO' },
    { icon: '🎅', label: 'GORRO' },
    { icon: '❄️', label: 'NEVE' },
    { icon: '⭐', label: 'ESTRELA' },
    { icon: '🎀', label: 'LAÇO' },
    { icon: '🕯️', label: 'VELA' },
    { icon: '🎁', label: 'PRESENTE' },
    { icon: '🍬', label: 'BENGALA' },
  ],
  kingdom: [
    { icon: '🦌', label: 'RENA' },
    { icon: '✉️', label: 'CARTA' },
    { icon: '🧤', label: 'LUVA' },
    { icon: '🎄', label: 'PINHEIRO' },
    { icon: '✨', label: 'LUZ' },
    { icon: '🌨️', label: 'FLOCO' },
    { icon: '🧦', label: 'BOTA' },
    { icon: '🍪', label: 'BISCOITO' },
  ],
};

const MEMORY_MAX = 24;

function buildDeck(symbols) {
  const arr = symbols.flatMap((item, idx) => [
    { uid: `${idx}-a`, pairId: idx, icon: item.icon, label: item.label },
    { uid: `${idx}-b`, pairId: idx, icon: item.icon, label: item.label },
  ]);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function MemoryGame({ isHeaven, busy, onSend }) {
  const symbols = isHeaven ? MEMORY_SYMBOLS.heaven : MEMORY_SYMBOLS.kingdom;
  const [deck, setDeck] = useState(() => buildDeck(symbols));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState({});
  const [attempts, setAttempts] = useState(0);
  const [ducksLink, setDucksLink] = useState('');
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const matchedCount = Object.keys(matched).length;
  const completed = matchedCount === 8;
  // Falhou: gastou as 24 jogadas e ainda não achou todos os pares.
  const failed = !completed && attempts >= MEMORY_MAX && flipped.length === 0;

  const reset = () => {
    clearTimeout(timer.current);
    setDeck(buildDeck(symbols));
    setFlipped([]);
    setMatched({});
    setAttempts(0);
  };

  const handleFlip = (index) => {
    if (failed || completed || flipped.length === 2) return;
    const card = deck[index];
    if (!card || matched[card.pairId] || flipped.includes(index)) return;

    const next = [...flipped, index];
    setFlipped(next);
    if (next.length < 2) return;

    setAttempts((n) => n + 1);
    const [i1, i2] = next;
    if (deck[i1].pairId === deck[i2].pairId) {
      setMatched((prev) => ({ ...prev, [deck[i1].pairId]: true }));
      setFlipped([]);
    } else {
      timer.current = setTimeout(() => setFlipped([]), 700);
    }
  };

  const handleSend = () => onSend?.(`MEMORY_8_PAIRS|attempts=${attempts}${ducksSuffix(isHeaven, ducksLink)}`);

  return (
    <div className="ag-col">
      <p className="ag-sub">Encontre os 8 pares natalinos em até {MEMORY_MAX} jogadas.</p>

      <div className="ag-row ag-between">
        <span className="ag-chip gold">Pares: {matchedCount}/8</span>
        <span className={`ag-chip ${failed ? 'bad' : ''}`}>
          Jogadas: {attempts}/{MEMORY_MAX}
        </span>
      </div>

      <div className="ag-mem">
        {deck.map((card, idx) => {
          const isMatched = Boolean(matched[card.pairId]);
          const isOpen = isMatched || flipped.includes(idx);
          return (
            <button
              key={card.uid}
              type="button"
              className={`ag-mem-card ${isMatched ? 'done' : isOpen ? 'open' : ''}`}
              onClick={() => handleFlip(idx)}
              aria-label={isOpen ? card.label : 'Carta virada para baixo'}
            >
              {isOpen ? (
                <>
                  <span className="big">{card.icon}</span>
                  <span>{card.label}</span>
                </>
              ) : (
                <span className="big" style={{ color: '#F4A51D' }}>✦</span>
              )}
            </button>
          );
        })}
      </div>

      {failed && (
        <div className="ag-err" role="alert">
          As {MEMORY_MAX} jogadas acabaram. Reinicie as cartas para tentar novamente.
        </div>
      )}

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}

      <div className="ag-row ag-between">
        <button type="button" className="ag-btn" onClick={reset}>
          Reiniciar cartas
        </button>
        <button type="button" className="ag-btn go" disabled={busy || !completed || failed} onClick={handleSend}>
          {busy ? 'Registrando...' : 'Concluir jogo da memória'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dias 4 e 15 — Classificação em 3 setores                                   */
/* -------------------------------------------------------------------------- */

const SORTER_CONFIG = {
  '4-heaven': {
    sectors: ['TECIDOS', 'PAPEL', 'PRESENTES'],
    items: ['laço', 'meia', 'cachecol', 'cartão', 'carta', 'boneca', 'carrinho', 'livro'],
  },
  '4-kingdom': {
    sectors: ['COZINHA', 'DECORAÇÃO', 'INVERNO'],
    items: ['biscoito', 'caneca', 'bolo', 'estrela', 'guirlanda', 'sino', 'luva', 'gorro'],
  },
  '15-heaven': {
    sectors: ['ENFEITES', 'DOCES', 'ROUPAS'],
    items: ['bola', 'estrela', 'guirlanda', 'festão', 'panetone', 'rabanada', 'biscoito', 'bengala doce', 'gorro', 'luva', 'cachecol', 'suéter'],
  },
  '15-kingdom': {
    sectors: ['CARTAS', 'LUZES', 'PRESENTES'],
    items: ['envelope', 'selo', 'pergaminho', 'cartão', 'vela', 'pisca-pisca', 'lanterna', 'estrela', 'caixa', 'laço', 'boneco', 'livro'],
  },
};

function SorterGame({ day, isHeaven, busy, onSend }) {
  const key = `${day}-${isHeaven ? 'heaven' : 'kingdom'}`;
  const cfg = SORTER_CONFIG[key] || SORTER_CONFIG['4-kingdom'];
  const [selected, setSelected] = useState(cfg.items[0]);
  const [placed, setPlaced] = useState({});
  const [ducksLink, setDucksLink] = useState('');

  const pool = cfg.items.filter((it) => !placed[it]);
  const allPlaced = pool.length === 0;

  const putIn = (sector) => {
    if (!selected || placed[selected]) return;
    const next = { ...placed, [selected]: sector };
    setPlaced(next);
    setSelected(cfg.items.find((it) => !next[it]) ?? null);
  };

  const takeOut = (item) => {
    setPlaced((prev) => {
      const next = { ...prev };
      delete next[item];
      return next;
    });
    setSelected(item);
  };

  const handleSend = () => {
    const serialized = cfg.items.map((it) => `${it}:${placed[it]}`).join(',');
    onSend?.(`${serialized}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  return (
    <div className="ag-col">
      <p className="ag-sub">Escolha um item e toque no setor onde ele fica. Toque num item já colocado para tirá-lo.</p>

      <div className="ag-card">
        <b style={{ display: 'block', marginBottom: 6 }}>Itens para classificar</b>
        <div className="ag-chips">
          {pool.length === 0 && <span className="ag-sub">Todos os itens foram colocados.</span>}
          {pool.map((it) => (
            <Choice key={it} active={selected === it} onClick={() => setSelected(it)}>
              {it}
            </Choice>
          ))}
        </div>
      </div>

      <div className="ag-grid3">
        {cfg.sectors.map((sec) => {
          const inside = cfg.items.filter((it) => placed[it] === sec);
          return (
            <div key={sec} className="ag-card ag-sector">
              <button type="button" className="ag-btn sm" onClick={() => putIn(sec)} disabled={!selected}>
                {sec}
              </button>
              <div className="ag-chips">
                {inside.map((it) => (
                  <button key={it} type="button" className="ag-chip" onClick={() => takeOut(it)} title="Tirar deste setor">
                    {it} ✕
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={!allPlaced}
        label="Confirmar classificação"
        extraInfo={`${cfg.items.length - pool.length}/${cfg.items.length} itens organizados`}
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dias 5 e 19 — Textos com validação de tamanho e palavras-chave             */
/* -------------------------------------------------------------------------- */

const XMAS_EXPRESSIONS = ['NATAL', 'BOAS FESTAS', 'FELIZ', 'NOEL', 'ANO NOVO', 'DEZEMBRO'];

function GuidedTextGame({ day, isHeaven, busy, onSend }) {
  const [text, setText] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const isDay5 = day === 5;
  const minLen = isDay5 ? 100 : 40;
  const maxLen = isDay5 ? 600 : 300;
  const community = isHeaven ? 'HEAVEN' : 'KINGDOM';
  const requiredWords = isDay5 ? ['NOELVET', community] : [community];

  const clean = text.trim();
  const upper = normalizeUpper(clean);
  const hasKeywords = requiredWords.every((w) => upper.includes(w));
  const hasXmasExpr = isDay5 ? true : XMAS_EXPRESSIONS.some((w) => upper.includes(w));
  const lenOk = clean.length >= minLen && clean.length <= maxLen;

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `\n[Ducks: ${ducksLink.trim()}]` : '';
    onSend?.(`${clean}${suffix}`);
  };

  return (
    <div className="ag-col">
      <div className="ag-row">
        <span className={`ag-chip ${lenOk ? 'ok' : ''}`}>
          Tamanho: {clean.length}/{minLen}–{maxLen}
        </span>
        {requiredWords.map((w) => (
          <span key={w} className={`ag-chip ${upper.includes(w) ? 'ok' : ''}`}>
            Obrigatória: {w}
          </span>
        ))}
        {!isDay5 && <span className={`ag-chip ${hasXmasExpr ? 'ok' : ''}`}>Expressão de Natal</span>}
      </div>

      <textarea
        className="ag-input"
        rows={isDay5 ? 5 : 4}
        maxLength={maxLen}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Seu texto"
        placeholder={
          isDay5
            ? `Escreva sua carta ao Noelvet (${minLen} a ${maxLen} caracteres)...`
            : `Escreva sua mensagem (${minLen} a ${maxLen} caracteres) mencionando ${community} e uma expressão de Natal...`
        }
      />

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={!lenOk || !hasKeywords || !hasXmasExpr}
        label="Enviar para revisão"
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 6 — Enigma dos sinos (3 respostas numéricas)                           */
/* -------------------------------------------------------------------------- */

function Day6RiddleGame({ isHeaven, busy, onSend }) {
  const [vals, setVals] = useState(['', '', '']);
  const [ducksLink, setDucksLink] = useState('');

  const questions = isHeaven
    ? ['1) Sequência: 2, 5, 9, 14, 20, ?', '2) Sequência: 1, 2, 4, 7, 11, ?', '3) 3 sinos tocam 2 vezes cada; total de toques?']
    : ['1) Sequência: 3, 6, 12, 21, 33, ?', '2) Sequência: 2, 4, 7, 11, 16, ?', '3) 4 renas recebem 3 laços cada; total?'];

  const code = vals.map((v) => v.replace(/\D/g, '')).join('-');
  const ready = vals.every((v) => v.trim());

  const setAt = (i, v) => setVals((prev) => prev.map((old, idx) => (idx === i ? v.replace(/\D/g, '') : old)));

  return (
    <div className="ag-col">
      {questions.map((q, i) => (
        <label key={q}>
          <span className="ag-label">{q}</span>
          <input
            className="ag-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={vals[i]}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder="Número"
          />
        </label>
      ))}
      {SHOW_HINTS && <p className="ag-sub">Código montado: <b>{code || '?-?-?'}</b></p>}
      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={!ready}
        label="Validar enigma"
        onClick={() => onSend?.(`${code}${ducksSuffix(isHeaven, ducksLink)}`)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dias 7 e 16 — Atalho integrado para Árvore e Galeria                       */
/* -------------------------------------------------------------------------- */

function PortalFeatureMission({ day, isHeaven, busy, onSend }) {
  const [region, setRegion] = useState('base');
  const [titleOrMsg, setTitleOrMsg] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const isTree = day === 7;
  const href = isTree ? '#arvore' : '#galeria';
  const scenario = isHeaven ? 'Bosque da Heaven' : 'Castelo Kingdom';

  const handleSend = () => {
    const base = isTree
      ? `TREE|scenario=${scenario}|region=${region}|msg=${safe(titleOrMsg)}`
      : `GALLERY|theme=${isHeaven ? 'Um Natal na Heaven' : 'O castelo da The Kingdom no Natal'}|title=${safe(titleOrMsg)}`;
    onSend?.(`${base}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  return (
    <div className="ag-col">
      <div className="ag-row">
        <a href={href} className="ag-btn">
          <Icon name={isTree ? 'tree' : 'gallery'} size={16} />
          <span>{isTree ? `Abrir ${scenario}` : 'Abrir Galeria de Natal'}</span>
        </a>
      </div>

      {isTree && (
        <div className="ag-row">
          {['esquerda', 'base', 'direita'].map((r) => (
            <Choice key={r} active={region === r} onClick={() => setRegion(r)}>
              Região: {r}
            </Choice>
          ))}
        </div>
      )}

      <input
        className="ag-input"
        type="text"
        maxLength={120}
        value={titleOrMsg}
        onChange={(e) => setTitleOrMsg(e.target.value)}
        aria-label={isTree ? 'Mensagem do enfeite' : 'Título da arte'}
        placeholder={
          isTree
            ? 'Mensagem do enfeite (até 120 caracteres) ou nome do PNG enviado...'
            : 'Título e créditos da sua arte enviada na Galeria...'
        }
      />

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={titleOrMsg.trim().length < 3}
        label="Registrar participação para análise"
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 8 — Vitral em pedaços 3×3 (monte a imagem)                             */
/* -------------------------------------------------------------------------- */

function VitralArt() {
  return (
    <g stroke="#0b1022" strokeWidth="3" strokeLinejoin="round">
      <rect x="0" y="0" width="300" height="300" fill="#16224a" stroke="none" />
      <polygon points="0,0 130,0 70,95 0,80" fill="#23459a" />
      <polygon points="130,0 300,0 300,120 200,75" fill="#1c3a85" />
      <polygon points="0,80 70,95 40,210 0,200" fill="#1a3170" />
      <polygon points="300,120 260,230 300,260" fill="#23459a" />
      <rect x="0" y="262" width="300" height="38" fill="#e8f0ff" />
      <ellipse cx="60" cy="268" rx="70" ry="14" fill="#cfe0ff" />
      <ellipse cx="245" cy="270" rx="75" ry="13" fill="#d9e6ff" />
      <circle cx="48" cy="46" r="26" fill="#f4e7a1" />
      <circle cx="60" cy="40" r="21" fill="#23459a" stroke="none" />
      <polygon
        points="150,14 156.47,31.1 174.73,31.97 160.46,43.4 165.28,61.03 150,51 134.72,61.03 139.54,43.4 125.27,31.97 143.53,31.1"
        fill="#F4A51D"
      />
      <rect x="136" y="232" width="28" height="36" fill="#8a5a2b" />
      <polygon points="150,66 104,140 196,140" fill="#2f8a55" />
      <polygon points="150,104 90,188 210,188" fill="#2a7a4b" />
      <polygon points="150,146 72,236 228,236" fill="#236b40" />
      <circle cx="128" cy="124" r="9" fill="#C42B31" />
      <circle cx="171" cy="152" r="8" fill="#F4A51D" />
      <circle cx="112" cy="205" r="9" fill="#5aa9ff" />
      <circle cx="190" cy="214" r="9" fill="#C42B31" />
      <circle cx="146" cy="186" r="7" fill="#f4f1e8" />
      <circle cx="100" cy="170" r="7" fill="#F4A51D" />
      <rect x="232" y="228" width="46" height="36" fill="#C42B31" />
      <rect x="251" y="228" width="8" height="36" fill="#F4A51D" stroke="none" />
      <polygon points="255,228 240,214 252,212" fill="#F4A51D" />
      <polygon points="255,228 270,214 258,212" fill="#F4A51D" />
      {[
        [30, 120],
        [262, 64],
        [236, 150],
        [62, 168],
        [272, 196],
        [24, 232],
        [205, 40],
        [96, 92],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#f4f8ff" stroke="none" />
      ))}
    </g>
  );
}

function VitralPuzzleGame({ isHeaven, busy, onSend }) {
  const [tiles, setTiles] = useState([4, 2, 7, 1, 9, 5, 8, 3, 6]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [moves, setMoves] = useState(0);
  const [ducksLink, setDucksLink] = useState('');

  const solved = tiles.every((n, i) => n === i + 1);

  const handleTileClick = (idx) => {
    if (solved) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
      return;
    }
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      return;
    }
    const copy = [...tiles];
    [copy[selectedIdx], copy[idx]] = [copy[idx], copy[selectedIdx]];
    setTiles(copy);
    setSelectedIdx(null);
    setMoves((m) => m + 1);
  };

  const handleSend = () =>
    onSend?.(`VITRAL:${tiles.join('-')}|moves=${moves}${ducksSuffix(isHeaven, ducksLink)}`);

  return (
    <div className="ag-col">
      <div className="ag-row" style={{ flexWrap: 'nowrap' }}>
        <div className="ag-thumb" aria-hidden="true">
          <svg viewBox="0 0 300 300">
            <VitralArt />
          </svg>
        </div>
        <p className="ag-sub">Modelo do vitral. Toque em duas peças para trocá-las até montar a imagem.</p>
      </div>

      <div className="ag-vt">
        {tiles.map((num, idx) => {
          const row = Math.floor((num - 1) / 3);
          const col = (num - 1) % 3;
          const right = SHOW_HINTS && num === idx + 1;
          return (
            <button
              key={idx}
              type="button"
              className={`ag-vt-tile ${selectedIdx === idx ? 'sel' : ''} ${right ? 'right' : ''}`}
              onClick={() => handleTileClick(idx)}
              aria-label={`Peça da posição ${idx + 1}`}
            >
              <svg viewBox={`${col * 100} ${row * 100} 100 100`} aria-hidden="true">
                <VitralArt />
              </svg>
              {SHOW_HINTS && <span className="num">{num}</span>}
            </button>
          );
        })}
      </div>

      {solved && <div className="ag-ok">Vitral montado!</div>}

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={!solved}
        label="Enviar montagem do vitral"
        extraInfo={`Ordem atual: ${tiles.join(' ')} (${moves} trocas)`}
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 9 — Perfil de festa (bio 20–120 caracteres + captura)                  */
/* -------------------------------------------------------------------------- */

function Day9BioGame({ isHeaven, busy, onSend }) {
  const [bio, setBio] = useState('');
  const [proof, setProof] = useState('');

  const keyword = isHeaven ? 'HEAVEN' : 'KINGDOM';
  const clean = bio.trim();
  const hasKeyword = normalizeUpper(clean).includes(keyword);
  const lenOk = clean.length >= 20 && clean.length <= 120;

  return (
    <div className="ag-col">
      <div className="ag-row">
        <span className={`ag-chip ${lenOk ? 'ok' : ''}`}>{clean.length}/20–120 caracteres</span>
        <span className={`ag-chip ${hasKeyword ? 'ok' : ''}`}>Inclui {keyword}</span>
      </div>
      <textarea
        className="ag-input"
        rows={3}
        maxLength={120}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        aria-label="Sua bio"
        placeholder={`Crie sua frase natalina mencionando ${keyword}...`}
      />
      <input
        className="ag-input"
        type="text"
        maxLength={240}
        value={proof}
        onChange={(e) => setProof(e.target.value)}
        aria-label="Comprovação"
        placeholder={isHeaven ? 'Link/print da sua bio no Ducks...' : 'Link/print da sua bio Discord ou cartão de perfil...'}
      />
      <SubmitBar
        busy={busy}
        disabled={!lenOk || !hasKeyword || proof.trim().length < 3}
        label="Enviar para análise"
        onClick={() => onSend?.(`BIO:${safe(clean)}|PROOF:${safe(proof)}`)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 10 — Quiz do festival (5 perguntas)                                    */
/* -------------------------------------------------------------------------- */

const QUIZ_DAY_10 = {
  heaven: [
    { q: '1. Qual plataforma concentra as comprovações da Heaven?', opts: ['Ducks', 'Telegram', 'Twitch'] },
    { q: '2. Qual o cenário oficial da Árvore da Heaven?', opts: ['Bosque da Heaven', 'Salão Cristalino', 'Vale Gelado'] },
    { q: '3. Qual é o horário diário de abertura das portas (Brasília)?', opts: ['00:00', '12:00', '18:00'] },
    { q: '4. Qual o prazo máximo para comprovar no Ducks após concluir?', opts: ['24 horas', '72 horas', '7 dias'] },
    { q: '5. Quantas atividades aprovadas garantem a lembrança?', opts: ['3 atividades', '10 atividades', '25 atividades'] },
  ],
  kingdom: [
    { q: '1. Onde os participantes da The Kingdom enviam as atividades?', opts: ['Diretamente na VULPORA', 'Em canal público do Discord', 'Por e-mail'] },
    { q: '2. Qual o cenário oficial da Árvore da The Kingdom?', opts: ['Castelo Kingdom', 'Salão Real', 'Vila do Norte'] },
    { q: '3. Qual é o horário diário de abertura das portas (Brasília)?', opts: ['00:00', '09:00', '21:00'] },
    { q: '4. Quando o Rank provisório é aberto ao público?', opts: ['25/12 às 00h', '01/12 às 00h', '31/12 às 23h'] },
    { q: '5. Quantas atividades aprovadas garantem a lembrança?', opts: ['3 atividades', '12 atividades', '20 atividades'] },
  ],
};

function QuizDay10Game({ isHeaven, busy, onSend }) {
  const qs = isHeaven ? QUIZ_DAY_10.heaven : QUIZ_DAY_10.kingdom;
  const [answers, setAnswers] = useState({});
  const [ducksLink, setDucksLink] = useState('');

  const allAnswered = qs.every((_, idx) => Boolean(answers[idx]));

  const handleSend = () => {
    const serialized = qs.map((_, i) => `${i + 1}:${answers[i]}`).join('|');
    onSend?.(`QUIZ10|${serialized}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  return (
    <div className="ag-col">
      {qs.map((item, idx) => (
        <div key={item.q} className="ag-card">
          <span className="ag-q">{item.q}</span>
          <div className="ag-row">
            {item.opts.map((opt) => (
              <Choice key={opt} active={answers[idx] === opt} onClick={() => setAnswers((prev) => ({ ...prev, [idx]: opt }))}>
                {opt}
              </Choice>
            ))}
          </div>
        </div>
      ))}
      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar busy={busy} disabled={!allAnswered} label="Enviar respostas do quiz" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 11 — Caça às pistas (3 fragmentos ocultos no portal)                   */
/* -------------------------------------------------------------------------- */

function Day11ClueHuntGame({ isHeaven, busy, onSend }) {
  const [parts, setParts] = useState(['', '', '']);
  const [ducksLink, setDucksLink] = useState('');

  const combined = lettersOnly(parts.join(''));
  const setAt = (i, v) => setParts((prev) => prev.map((old, idx) => (idx === i ? v : old)));

  return (
    <div className="ag-col">
      <p className="ag-sub">Explore o evento para encontrar os 3 fragmentos ocultos.</p>
      <div className="ag-grid3">
        {parts.map((value, i) => (
          <label key={i}>
            <span className="ag-label">Fragmento 0{i + 1}</span>
            <input
              className="ag-input"
              type="text"
              maxLength={5}
              value={value}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={`${i + 1}º trecho`}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {SHOW_HINTS && <p className="ag-sub">Palavra formada: <b>{combined || '---'}</b></p>}
      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={combined.length < 4}
        label="Validar palavra-chave"
        onClick={() => onSend?.(`${combined}${ducksSuffix(isHeaven, ducksLink)}`)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 12 — Forca natalina (máx. 8 erros)                                     */
/* -------------------------------------------------------------------------- */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const HANGMAN_MAX_ERRORS = 8;

function Day12HangmanGame({ isHeaven, busy, onSend }) {
  const secretWord = isHeaven ? 'GUIRLANDA' : 'PRESEPIO';
  const wordLength = secretWord.length;

  const [tried, setTried] = useState([]);
  const [typedWord, setTypedWord] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const wrongCount = tried.filter((ch) => !secretWord.includes(ch)).length;
  const slots = secretWord.split('').map((ch) => (tried.includes(ch) ? ch : ''));
  const allRevealed = slots.every(Boolean);
  const failed = !allRevealed && wrongCount >= HANGMAN_MAX_ERRORS;

  const cleanTyped = lettersOnly(typedWord);
  const finalWord = cleanTyped.length === wordLength ? cleanTyped : allRevealed ? secretWord : '';

  const guess = (ch) => {
    if (failed || allRevealed) return;
    setTried((prev) => (prev.includes(ch) ? prev : [...prev, ch]));
  };

  const reset = () => {
    setTried([]);
    setTypedWord('');
  };

  const handleSend = () => onSend?.(`${finalWord}|letters=${tried.join('')}${ducksSuffix(isHeaven, ducksLink)}`);

  return (
    <div className="ag-col">
      <div className="ag-row ag-between">
        <span className="ag-lives" aria-label={`${wrongCount} erros de ${HANGMAN_MAX_ERRORS}`}>
          {Array.from({ length: HANGMAN_MAX_ERRORS }).map((_, i) => (
            <span key={i} aria-hidden="true">{i < wrongCount ? '💧' : '❄️'}</span>
          ))}
        </span>
        <span className={`ag-chip ${failed ? 'bad' : ''}`}>
          Erros: {wrongCount}/{HANGMAN_MAX_ERRORS}
        </span>
      </div>

      <div className="ag-hm-slots" aria-label="Palavra secreta">
        {slots.map((ch, i) => (
          <span key={i} className="ag-hm-slot">{ch}</span>
        ))}
      </div>

      <div className="ag-keys">
        {ALPHABET.map((ch) => {
          const used = tried.includes(ch);
          const hit = used && secretWord.includes(ch);
          const miss = used && !secretWord.includes(ch);
          return (
            <button
              key={ch}
              type="button"
              disabled={used || failed || allRevealed}
              onClick={() => guess(ch)}
              className={`ag-btn ag-key ${hit ? 'hit' : ''} ${miss ? 'miss' : ''}`}
            >
              {ch}
            </button>
          );
        })}
      </div>

      {failed && (
        <div className="ag-err" role="alert">
          Você chegou ao limite de erros. Reinicie a forca para tentar novamente.
        </div>
      )}

      <input
        className="ag-input"
        type="text"
        maxLength={wordLength}
        value={typedWord}
        onChange={(e) => setTypedWord(e.target.value)}
        aria-label="Palavra completa"
        placeholder="Ou digite a palavra completa (sem acentos)..."
        autoComplete="off"
      />

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}

      <div className="ag-row ag-between">
        <button type="button" className="ag-btn" onClick={reset}>
          Reiniciar forca
        </button>
        <button
          type="button"
          className="ag-btn go"
          disabled={busy || failed || finalWord.length !== wordLength}
          onClick={handleSend}
        >
          {busy ? 'Validando...' : 'Enviar palavra da forca'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 13 — Sudoku de inverno 6×6 (blocos 2×3)                                */
/* As soluções são únicas e resolvíveis só por lógica (conferido por script). */
/* -------------------------------------------------------------------------- */

const SUDOKU_GIVENS = {
  heaven: [
    [1, 0, 0, 4, 0, 6],
    [0, 5, 6, 0, 2, 0],
    [2, 0, 4, 0, 6, 0],
    [0, 6, 0, 2, 0, 4],
    [0, 2, 0, 6, 4, 0],
    [6, 0, 5, 0, 0, 2],
  ],
  // Mesma solução de antes, com menos números já preenchidos (mais desafio).
  kingdom: [
    [0, 0, 3, 0, 5, 0],
    [4, 0, 0, 1, 0, 3],
    [2, 0, 0, 5, 6, 0],
    [5, 0, 1, 0, 0, 0],
    [3, 4, 5, 0, 0, 2],
    [0, 1, 0, 0, 4, 0],
  ],
};

function Day13SudokuGame({ isHeaven, busy, onSend }) {
  const initial = isHeaven ? SUDOKU_GIVENS.heaven : SUDOKU_GIVENS.kingdom;
  const [grid, setGrid] = useState(() => initial.map((r) => [...r]));
  const [sel, setSel] = useState(() => {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (initial[r][c] === 0) return [r, c];
    return [0, 0];
  });
  const [ducksLink, setDucksLink] = useState('');

  const setNumber = (n) => {
    const [r, c] = sel;
    if (initial[r][c] !== 0) return;
    setGrid((prev) => prev.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? n : v))));
  };

  const onKeyDown = (e) => {
    if (/^[1-6]$/.test(e.key)) {
      setNumber(Number(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      setNumber(0);
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const [r, c] = sel;
      const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      const dc = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      setSel([Math.min(5, Math.max(0, r + dr)), Math.min(5, Math.max(0, c + dc))]);
    }
  };

  const isFull = grid.every((row) => row.every((v) => v >= 1 && v <= 6));

  const handleSend = () => {
    const flat = grid.map((r) => r.join('')).join('-');
    onSend?.(`SUDOKU6:${flat}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  const sameBlock = (r, c) => Math.floor(r / 2) === Math.floor(sel[0] / 2) && Math.floor(c / 3) === Math.floor(sel[1] / 3);

  return (
    <div className="ag-col">
      <p className="ag-sub">Preencha com 1 a 6 sem repetir em linha, coluna e bloco (2×3). Use o teclado ou os botões.</p>

      <div className="ag-sd" onKeyDown={onKeyDown} role="grid" aria-label="Sudoku 6 por 6">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const locked = initial[r][c] !== 0;
            const active = sel[0] === r && sel[1] === c;
            const related = !active && (sel[0] === r || sel[1] === c || sameBlock(r, c));
            const cls = [
              'ag-sd-cell',
              locked ? 'given' : '',
              active ? 'sel' : related ? 'rel' : '',
              c === 2 ? 'bR' : '',
              r === 1 || r === 3 ? 'bB' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={cls}
                onClick={() => setSel([r, c])}
                aria-label={`Linha ${r + 1}, coluna ${c + 1}${locked ? ', número fixo' : ''}: ${val || 'vazio'}`}
              >
                {val || ''}
              </button>
            );
          })
        )}
      </div>

      <div className="ag-row" style={{ justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} type="button" className="ag-btn sm" style={{ minWidth: 38 }} onClick={() => setNumber(n)}>
            {n}
          </button>
        ))}
        <button type="button" className="ag-btn sm" onClick={() => setNumber(0)}>
          Limpar
        </button>
      </div>

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar busy={busy} disabled={!isFull} label="Validar Sudoku 6×6" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 17 — Cruzadinha (9 horizontais -> coluna dourada de 9 letras)          */
/* -------------------------------------------------------------------------- */

// len = nº de letras da resposta; key = posição (0 = 1ª) da letra que vai para a coluna dourada.
const CROSSWORD = {
  heaven: [
    { clue: 'Precipitação branca de inverno', len: 4, key: 0 },
    { clue: 'Astro que brilha no topo da árvore', len: 7, key: 6 },
    { clue: 'Veículo do Noelvet puxado por renas', len: 5, key: 0 },
    { clue: 'Mensageiro celeste com asas', len: 4, key: 0 },
    { clue: 'Fita decorativa amarrada nos presentes', len: 4, key: 0 },
    { clue: 'Enfeite sonoro dourado de Natal', len: 4, key: 1 },
    { clue: 'Guia oficial do festival de Natal', len: 7, key: 0 },
    { clue: 'Metal precioso das estrelas', len: 4, key: 0 },
    { clue: 'Onde Noelvet guarda os presentes', len: 4, key: 0 },
  ],
  kingdom: [
    { clue: 'Árvore símbolo do Natal', len: 8, key: 0 },
    { clue: 'Animal que puxa o trenó', len: 4, key: 0 },
    { clue: 'Luz no topo da árvore', len: 7, key: 0 },
    { clue: 'Toca anunciando a festa', len: 4, key: 0 },
    { clue: 'Adorno pendurado nos galhos', len: 7, key: 0 },
    { clue: 'Flocos brancos de inverno', len: 4, key: 0 },
    { clue: 'Veículo do Noelvet na neve', len: 5, key: 0 },
    { clue: 'Onde vai a cartinha', len: 8, key: 0 },
    { clue: 'Marca colada na correspondência', len: 4, key: 0 },
  ],
};

function CrosswordRow({ n, item, value, onChange }) {
  return (
    <div className="ag-cw">
      <div className="ag-cw-clue">
        <b>{n}.</b> {item.clue}
      </div>
      <label className="ag-cw-row">
        {Array.from({ length: item.len }).map((_, i) => (
          <span key={i} className={`ag-cw-box ${i === item.key ? 'key' : ''}`}>
            {value[i] ?? ''}
          </span>
        ))}
        <input
          className="ag-cw-input"
          type="text"
          value={value}
          maxLength={item.len}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label={`Resposta da pista ${n}`}
          onChange={(e) => onChange(lettersOnly(e.target.value).slice(0, item.len))}
        />
      </label>
    </div>
  );
}

function Day17CrosswordGame({ isHeaven, busy, onSend }) {
  const items = isHeaven ? CROSSWORD.heaven : CROSSWORD.kingdom;
  const [rows, setRows] = useState(() => Array(items.length).fill(''));
  const [ducksLink, setDucksLink] = useState('');

  // A coluna dourada se monta sozinha com a letra marcada de cada resposta.
  const vertical = items.map((item, i) => rows[i][item.key] ?? '').join('');

  const handleSend = () => onSend?.(`${vertical}|rows=${rows.join(',')}${ducksSuffix(isHeaven, ducksLink)}`);

  return (
    <div className="ag-col">
      <p className="ag-sub">Resolva as pistas. As casas douradas formam a palavra da coluna central.</p>

      {items.map((item, i) => (
        <CrosswordRow
          key={item.clue}
          n={i + 1}
          item={item}
          value={rows[i]}
          onChange={(v) => setRows((prev) => prev.map((old, idx) => (idx === i ? v : old)))}
        />
      ))}

      <div className="ag-card">
        <span className="ag-label">Coluna dourada</span>
        <div className="ag-row" style={{ gap: 3 }} aria-live="polite">
          {Array.from({ length: items.length }).map((_, i) => (
            <span key={i} className="ag-cw-box key">{vertical[i] ?? ''}</span>
          ))}
        </div>
      </div>

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar busy={busy} disabled={vertical.length !== items.length} label="Validar cruzadinha" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 18 — Encontre as diferenças (10×10, 6 diferenças)                      */
/* -------------------------------------------------------------------------- */

function Day18SpotDiffGame({ isHeaven, busy, onSend }) {
  const kind = isHeaven ? 'heaven' : 'kingdom';
  const { base, alt } = useMemo(() => buildDiffBoards(kind), [kind]);
  const [picked, setPicked] = useState([]);
  const [ducksLink, setDucksLink] = useState('');

  const toggle = (r, c) => {
    const id = `${r + 1},${c + 1}`;
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  const handleSend = () => onSend?.(`DIFF6:${sortIds(picked).join(';')}${ducksSuffix(isHeaven, ducksLink)}`);

  const board = (cells, clickable) => (
    <div>
      <b style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
        {clickable ? `Imagem B — marque as diferenças (${picked.length}/6)` : 'Imagem A — original'}
      </b>
      <div className="ag-df">
        {cells.map((row, r) =>
          row.map((iconIdx, c) => {
            const id = `${r + 1},${c + 1}`;
            const on = clickable && picked.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`ag-df-cell ${on ? 'pick' : ''}`}
                disabled={!clickable}
                aria-pressed={clickable ? on : undefined}
                aria-label={`Linha ${r + 1}, coluna ${c + 1}`}
                onClick={clickable ? () => toggle(r, c) : undefined}
              >
                {DIFF_ICONS[iconIdx]}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="ag-col">
      <p className="ag-sub">Compare as duas imagens e toque nas 6 casas diferentes da Imagem B.</p>
      <div className="ag-col">
        {board(base, false)}
        {board(alt, true)}
      </div>
      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={picked.length !== 6}
        label="Confirmar 6 diferenças"
        extraInfo={`Selecionadas: ${sortIds(picked).join(' · ') || 'nenhuma'}`}
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 20 — Criptograma do Noelvet                                            */
/* -------------------------------------------------------------------------- */

function Day20CryptogramGame({ isHeaven, busy, onSend }) {
  const cipher = isHeaven ? 'D HVWUHOD JXLD R UHLQR' : 'S REXEP YRI E OMRKHSQ';
  const words = cipher.split(' ');
  const cipherLetters = useMemo(() => [...new Set(lettersOnly(cipher).split(''))], [cipher]);

  const [map, setMap] = useState({});
  const [ducksLink, setDucksLink] = useState('');
  const boxRef = useRef(null);

  const complete = cipherLetters.every((c) => map[c]);
  const decoded = words.map((w) => [...w].map((c) => map[c] || '').join('')).join(' ');

  const onLetter = (cipherChar, e) => {
    const ch = lettersOnly(e.target.value).slice(-1);
    setMap((prev) => ({ ...prev, [cipherChar]: ch }));
    if (ch && boxRef.current) {
      const inputs = [...boxRef.current.querySelectorAll('.ag-cr-in')];
      inputs[inputs.indexOf(e.target) + 1]?.focus();
    }
  };

  const handleSend = () => onSend?.(`${normalizeUpper(decoded).replace(/\s+/g, ' ').trim()}${ducksSuffix(isHeaven, ducksLink)}`);

  return (
    <div className="ag-col">
      <p className="ag-sub">Decifre a frase: cada letra de cima corresponde a uma letra de baixo. Letras iguais valem o mesmo.</p>

      <div className="ag-card">
        <div className="ag-cr" ref={boxRef}>
          {words.map((w, wi) => (
            <div key={wi} className="ag-cr-word">
              {[...w].map((c, ci) => (
                <div key={ci} className="ag-cr-col">
                  <span className="ag-cr-c" aria-hidden="true">{c}</span>
                  <input
                    className="ag-input ag-cr-in"
                    type="text"
                    value={map[c] || ''}
                    maxLength={2}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-label={`Letra decifrada de ${c}`}
                    onChange={(e) => onLetter(c, e)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar busy={busy} disabled={!complete} label="Validar frase" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 21 — Bingo dos elfos (cartela 3×3)                                     */
/* -------------------------------------------------------------------------- */

const BINGO_CELLS = {
  heaven: [
    'Mês do Advento?',
    'Total de portas?',
    'Cenário Heaven?',
    'Plataforma Heaven?',
    'Pontos nível Fácil?',
    'Pontos nível Média?',
    'Pontos nível Difícil?',
    'Pausa após 5 erros?',
    'Dia do Rank?',
  ],
  kingdom: [
    'Mês do Advento?',
    'Total de portas?',
    'Cenário Kingdom?',
    'Comunidade Discord?',
    'Pontos nível Fácil?',
    'Pontos nível Média?',
    'Pontos nível Difícil?',
    'Pausa após 5 erros?',
    'Dia do Rank?',
  ],
};

function Day21BingoGame({ isHeaven, busy, onSend }) {
  const cells = isHeaven ? BINGO_CELLS.heaven : BINGO_CELLS.kingdom;
  const [vals, setVals] = useState(Array(9).fill(''));
  const [ducksLink, setDucksLink] = useState('');

  const filledCount = vals.filter((v) => v.trim().length > 0).length;

  const handleSend = () => {
    const serialized = vals.map((v, i) => `${i + 1}:${normalizeUpper(v).trim()}`).join('|');
    onSend?.(`BINGO9|${serialized}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  return (
    <div className="ag-col">
      <div className="ag-grid3">
        {cells.map((label, idx) => (
          <label key={label} className="ag-card">
            <span className="ag-label">{label}</span>
            <input
              className="ag-input"
              type="text"
              maxLength={24}
              value={vals[idx]}
              onChange={(e) => setVals((prev) => prev.map((old, i) => (i === idx ? e.target.value : old)))}
              placeholder="Resposta"
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={filledCount < 3}
        label="Enviar cartela de bingo"
        extraInfo={`${filledCount}/9 casas preenchidas`}
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 22 — Palavras embaralhadas (6 anagramas)                               */
/* -------------------------------------------------------------------------- */

function Day22AnagramGame({ isHeaven, busy, onSend }) {
  const scrambled = isHeaven
    ? ['EROVRA', 'ONIS', 'EVEN', 'ALERTSE', 'OCAL', 'ALEV']
    : ['ANER', 'ORROG', 'ATRAC', 'OTIOCSIB', 'AVUL', 'OCOLF'];

  const [answers, setAnswers] = useState(Array(6).fill(''));
  const [ducksLink, setDucksLink] = useState('');

  const ready = answers.every((a) => a.trim().length >= 3);

  const handleSend = () => {
    const joined = answers.map((a) => lettersOnly(a)).join(',');
    onSend?.(`${joined}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  return (
    <div className="ag-col">
      <div className="ag-grid2">
        {scrambled.map((word, idx) => (
          <label key={word} className="ag-card">
            <span className="ag-label">Anagrama {idx + 1}</span>
            <span className="ag-tiles" aria-label={word}>
              {[...word].map((ch, i) => (
                <span key={i} className="ag-tile" aria-hidden="true">{ch}</span>
              ))}
            </span>
            <input
              className="ag-input"
              type="text"
              maxLength={14}
              value={answers[idx]}
              onChange={(e) => setAnswers((prev) => prev.map((old, i) => (i === idx ? e.target.value : old)))}
              placeholder="Palavra sem acento"
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar busy={busy} disabled={!ready} label="Validar 6 palavras" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 23 — Rotas de entrega (18h às 21h)                                     */
/* -------------------------------------------------------------------------- */

function Day23DeliveryRouteGame({ isHeaven, busy, onSend }) {
  const initialItems = isHeaven ? ['DOCE', 'SINO', 'LAÇO', 'LIVRO'] : ['ESTRELA', 'NEVE', 'CARTA', 'PRESENTE'];
  const clues = isHeaven
    ? ['• O LAÇO abre a rota às 18h.', '• O SINO sai antes do DOCE.', '• O LIVRO é entregue logo após o DOCE (21h).']
    : ['• A CARTA sai às 18h.', '• O PRESENTE sai antes da ESTRELA.', '• A NEVE fecha a rota às 21h.'];
  const hours = ['18h', '19h', '20h', '21h'];

  const [order, setOrder] = useState(initialItems);
  const [ducksLink, setDucksLink] = useState('');

  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    const copy = [...order];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setOrder(copy);
  };

  const handleSend = () => {
    const normalized = order.map((x) => normalizeUpper(x)).join(',');
    onSend?.(`${normalized}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  return (
    <div className="ag-col">
      <div className="ag-card">
        {clues.map((line) => (
          <p key={line} style={{ margin: '2px 0' }}>{line}</p>
        ))}
      </div>

      {order.map((item, idx) => (
        <div key={item} className="ag-card ag-tl">
          <span>
            <span className="ag-tl-hour">{hours[idx]}</span> {item}
          </span>
          <span className="ag-row" style={{ gap: 6 }}>
            <button type="button" className="ag-btn sm" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label={`Subir ${item}`}>
              ↑
            </button>
            <button
              type="button"
              className="ag-btn sm"
              disabled={idx === order.length - 1}
              onClick={() => move(idx, 1)}
              aria-label={`Descer ${item}`}
            >
              ↓
            </button>
          </span>
        </div>
      ))}

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar busy={busy} label="Confirmar rota de entregas" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 24 — A última busca (número + número + letra)                          */
/* -------------------------------------------------------------------------- */

function Day24FinalQuestGame({ isHeaven, busy, onSend }) {
  const [steps, setSteps] = useState(['', '', '']);
  const [ducksLink, setDucksLink] = useState('');

  const token = `${steps[0].replace(/\D/g, '')}${steps[1].replace(/\D/g, '')}${lettersOnly(steps[2])}`;
  const setAt = (i, v) => setSteps((prev) => prev.map((old, idx) => (idx === i ? v : old)));

  const labels = isHeaven
    ? ['1. Letras de SINO', '2. Valor de 2 + 5', '3. Inicial de Noelvet']
    : ['1. Letras de RENA', '2. Valor de 3 + 5', '3. Inicial de Kingdom'];

  return (
    <div className="ag-col">
      <div className="ag-grid3">
        {labels.map((label, i) => (
          <label key={label}>
            <span className="ag-label">{label}</span>
            <input
              className="ag-input"
              type="text"
              inputMode={i === 2 ? 'text' : 'numeric'}
              maxLength={i === 2 ? 1 : 2}
              value={steps[i]}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={i === 2 ? 'Letra' : 'Nº'}
              autoComplete="off"
            />
          </label>
        ))}
      </div>
      {SHOW_HINTS && <p className="ag-sub">Senha final montada: <b>{token || '---'}</b></p>}
      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={token.length < 3}
        label="Validar senha final"
        onClick={() => onSend?.(`${token}${ducksSuffix(isHeaven, ducksLink)}`)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 25 — Desejos de Natal (quiz de 3 perguntas + saudação 30–200 chars)   */
/* -------------------------------------------------------------------------- */

function Day25FinaleGame({ isHeaven, busy, onSend }) {
  const questions = isHeaven
    ? [
        { q: '1. Quantos dias teve o Calendário do Advento 2026?', opts: ['25 dias', '24 dias', '31 dias'] },
        { q: '2. Qual cenário recebeu os enfeites da Heaven?', opts: ['Bosque da Heaven', 'Vale Aurora', 'Torre Norte'] },
        { q: '3. Quem guiou as cartas e desafios do festival?', opts: ['Noelvet', 'Grinch', 'Papai Coelho'] },
      ]
    : [
        { q: '1. Quantos dias teve o Calendário do Advento 2026?', opts: ['25 dias', '24 dias', '30 dias'] },
        { q: '2. Qual cenário recebeu os enfeites da The Kingdom?', opts: ['Castelo Kingdom', 'Salão Real', 'Praça Central'] },
        { q: '3. Quem visitou o castelo da The Kingdom no Dia 5?', opts: ['Noelvet', 'Merlin', 'Artur'] },
      ];

  const [qAns, setQAns] = useState({});
  const [greeting, setGreeting] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const keyword = isHeaven ? 'HEAVEN' : 'KINGDOM';
  const clean = greeting.trim();
  const hasKeyword = normalizeUpper(clean).includes(keyword);
  const lenOk = clean.length >= 30 && clean.length <= 200;
  const quizOk = questions.every((_, i) => Boolean(qAns[i]));

  const handleSend = () => {
    const qStr = questions.map((_, i) => `${i + 1}:${qAns[i]}`).join(',');
    onSend?.(`FINALE25|quiz=${qStr}|greeting=${safe(clean)}${ducksSuffix(isHeaven, ducksLink)}`);
  };

  return (
    <div className="ag-col">
      {questions.map((item, idx) => (
        <div key={item.q} className="ag-card">
          <span className="ag-q">{item.q}</span>
          <div className="ag-row">
            {item.opts.map((opt) => (
              <Choice key={opt} active={qAns[idx] === opt} onClick={() => setQAns((prev) => ({ ...prev, [idx]: opt }))}>
                {opt}
              </Choice>
            ))}
          </div>
        </div>
      ))}

      <div className="ag-col">
        <div className="ag-row">
          <span className={`ag-chip ${lenOk ? 'ok' : ''}`}>Saudação: {clean.length}/30–200</span>
          <span className={`ag-chip ${hasKeyword ? 'ok' : ''}`}>Menciona {keyword}</span>
        </div>
        <textarea
          className="ag-input"
          rows={3}
          maxLength={200}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          aria-label="Sua saudação"
          placeholder={`Escreva sua saudação final de Natal mencionando ${keyword} (30 a 200 caracteres)...`}
        />
      </div>

      {isHeaven && <DucksProofBox value={ducksLink} onChange={setDucksLink} />}
      <SubmitBar
        busy={busy}
        disabled={!quizOk || !lenOk || !hasKeyword}
        label="Concluir Dia 25 · Desejos de Natal"
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dispatcher principal para os 25 dias                                       */
/* -------------------------------------------------------------------------- */

function renderGame(d, instanceKey, props) {
  switch (d) {
    case 1:
      return <Day1ProfileGame key={instanceKey} {...props} />;
    case 2:
    case 14:
      return <WordSearchGame key={instanceKey} {...props} />;
    case 3:
      return <MemoryGame key={instanceKey} {...props} />;
    case 4:
    case 15:
      return <SorterGame key={instanceKey} {...props} />;
    case 5:
    case 19:
      return <GuidedTextGame key={instanceKey} {...props} />;
    case 6:
      return <Day6RiddleGame key={instanceKey} {...props} />;
    case 7:
    case 16:
      return <PortalFeatureMission key={instanceKey} {...props} />;
    case 8:
      return <VitralPuzzleGame key={instanceKey} {...props} />;
    case 9:
      return <Day9BioGame key={instanceKey} {...props} />;
    case 10:
      return <QuizDay10Game key={instanceKey} {...props} />;
    case 11:
      return <Day11ClueHuntGame key={instanceKey} {...props} />;
    case 12:
      return <Day12HangmanGame key={instanceKey} {...props} />;
    case 13:
      return <Day13SudokuGame key={instanceKey} {...props} />;
    case 17:
      return <Day17CrosswordGame key={instanceKey} {...props} />;
    case 18:
      return <Day18SpotDiffGame key={instanceKey} {...props} />;
    case 20:
      return <Day20CryptogramGame key={instanceKey} {...props} />;
    case 21:
      return <Day21BingoGame key={instanceKey} {...props} />;
    case 22:
      return <Day22AnagramGame key={instanceKey} {...props} />;
    case 23:
      return <Day23DeliveryRouteGame key={instanceKey} {...props} />;
    case 24:
      return <Day24FinalQuestGame key={instanceKey} {...props} />;
    case 25:
      return <Day25FinaleGame key={instanceKey} {...props} />;
    default:
      return null;
  }
}

export function AdventDayGame({ day, community, isHeaven = false, busy = false, onSend }) {
  const d = Number(day) || 1;
  const slug = String(community || '').trim().toLowerCase();
  const heavenMode = slug ? slug === 'heaven' || slug === 'ducks' : Boolean(isHeaven);
  const instanceKey = `${d}-${heavenMode ? 'heaven' : 'kingdom'}`;

  const game = renderGame(d, instanceKey, { day: d, isHeaven: heavenMode, busy, onSend });
  if (!game) return null;

  return (
    <div className="ag">
      <style>{CSS}</style>
      {game}
    </div>
  );
}