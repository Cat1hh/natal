import React, { useMemo, useState } from 'react';
import { Icon } from '../../../icons.jsx';

/* -------------------------------------------------------------------------- */
/* Helpers de normalização e suporte Ducks (Heaven)                           */
/* -------------------------------------------------------------------------- */

const normalizeUpper = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

function DucksProofBox({ isHeaven, ducksLink, setDucksLink, optional = true }) {
  if (!isHeaven) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <label className="m small" style={{ display: 'block', marginBottom: 4 }}>
        Link ou print da comprovação no Ducks {optional ? '(opcional agora · prazo 24h)' : '(obrigatório)'}:
      </label>
      <input
        type="text"
        maxLength={240}
        value={ducksLink}
        onChange={(e) => setDucksLink(e.target.value)}
        placeholder="Cole o link do post no Ducks (sem revelar senhas ou respostas)"
      />
    </div>
  );
}

function SubmitBar({ busy, disabled, label = 'Enviar resposta', onClick, extraInfo }) {
  return (
    <div className="acts" style={{ marginTop: 12 }}>
      {extraInfo ? <span className="m small">{extraInfo}</span> : <span />}
      <button type="button" className="btn red" disabled={busy || disabled} onClick={onClick}>
        {busy ? 'Validando...' : label}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 1 — Perfil de dezembro                                                 */
/* -------------------------------------------------------------------------- */

function Day1ProfileGame({ isHeaven, busy, onSend }) {
  const [nick, setNick] = useState('');
  const [ornament, setOrnament] = useState('Gorro de Noelvet');
  const [link, setLink] = useState('');

  const items = ['Gorro de Noelvet', 'Estrela Dourada', 'Guirlanda de Pinho', 'Floco de Neve', 'Cachecol Carmesim'];
  const canSubmit = isHeaven ? link.trim().length >= 5 : nick.trim().length >= 2;

  const handleSend = () => {
    const payload = isHeaven
      ? `DUCKS_PROOF:${link.trim()}`
      : `VULPORA_CARD|nick=${nick.trim()}|item=${ornament}`;
    onSend(payload);
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {isHeaven ? (
        <>
          <p className="m small">
            Personalize foto ou capa do seu perfil Ducks com um elemento natalino e publique com <b>#AdventoHeaven01</b>.
          </p>
          <input
            type="text"
            maxLength={260}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Cole o link da publicação/captura com #AdventoHeaven01..."
          />
        </>
      ) : (
        <>
          <p className="m small">
            Monte seu cartão de perfil natalino na VULPORA escolhendo um adorno festivo:
          </p>
          <input
            type="text"
            maxLength={40}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Seu nome ou arroba no cartão..."
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {items.map((it) => (
              <button
                key={it}
                type="button"
                className={`btn ${ornament === it ? 'red' : 'ghost'}`}
                onClick={() => setOrnament(it)}
              >
                {it}
              </button>
            ))}
          </div>
          <div className="paper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b>{nick.trim() || 'Viajante Kingdom'}</b>
              <p className="m small" style={{ margin: 0 }}>Adorno: {ornament} · Natal 2026</p>
            </div>
            <span className="badge gold">Cartão Pronto</span>
          </div>
        </>
      )}
      <SubmitBar busy={busy} disabled={!canSubmit} label="Enviar para revisão" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dias 2 e 14 — Caça-palavras 12x12                                          */
/* -------------------------------------------------------------------------- */

const WORD_SEARCH_BOARDS = {
  '2-heaven': {
    words: ['NEVE', 'OURO', 'ESTRELA', 'LACO'],
    grid: [
      'N E V E K M P Q R T Y W',
      'X Z B O U R O L P A S D',
      'Q W E S T R E L A M N B',
      'L A C O V C X Z A S D F',
      'G H J K L P O I U Y T R',
      'E W Q A S D F G H J K L',
      'Z X C V B N M Q W E R T',
      'Y U I O P A S D F G H J',
      'K L Z X C V B N M Q W E',
      'R T Y U I O P A S D F G',
      'H J K L Z X C V B N M Q',
      'W E R T Y U I O P A S D',
    ],
  },
  '2-kingdom': {
    words: ['RABANADA', 'ESTRELA', 'NEVE', 'OURO'],
    grid: [
      'R A B A N A D A K L M P',
      'Q W E S T R E L A Z X C',
      'V B N E V E M Q W E R T',
      'Y U I O U R O P A S D F',
      'G H J K L Z X C V B N M',
      'P O I U Y T R E W Q A S',
      'D F G H J K L Z X C V B',
      'N M Q W E R T Y U I O P',
      'A S D F G H J K L Z X C',
      'V B N M Q W E R T Y U I',
      'O P A S D F G H J K L Z',
      'X C V B N M Q W E R T Y',
    ],
  },
  '14-heaven': {
    words: ['ARVORE', 'NEVE', 'JOGO', 'OURO'],
    grid: [
      'A R V O R E P L K M N B',
      'Q W E R N E V E T Y U I',
      'O P A S D J O G O F G H',
      'J K L Z X C O U R O V B',
      'N M Q W E R T Y U I O P',
      'A S D F G H J K L Z X C',
      'V B N M Q W E R T Y U I',
      'O P A S D F G H J K L Z',
      'X C V B N M Q W E R T Y',
      'U I O P A S D F G H J K',
      'L Z X C V B N M Q W E R',
      'T Y U I O P A S D F G H',
    ],
  },
  '14-kingdom': {
    words: ['LACO', 'URSO', 'ANJO', 'RABANADA'],
    grid: [
      'L A C O T Y U I O P A S',
      'D F U R S O G H J K L Z',
      'X C V B A N J O N M Q W',
      'E R R A B A N A D A T Y',
      'U I O P A S D F G H J K',
      'L Z X C V B N M Q W E R',
      'T Y U I O P A S D F G H',
      'J K L Z X C V B N M Q W',
      'E R T Y U I O P A S D F',
      'G H J K L Z X C V B N M',
      'Q W E R T Y U I O P A S',
      'D F G H J K L Z X C V B',
    ],
  },
};

function WordSearchGame({ day, isHeaven, busy, onSend }) {
  const key = `${day}-${isHeaven ? 'heaven' : 'kingdom'}`;
  const board = WORD_SEARCH_BOARDS[key] || WORD_SEARCH_BOARDS['2-kingdom'];
  const matrix = useMemo(() => board.grid.map((row) => row.split(' ')), [board]);

  const [marked, setMarked] = useState({});
  const [password, setPassword] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const toggleCell = (r, c) => {
    const id = `${r}-${c}`;
    setMarked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cleanPass = normalizeUpper(password).replace(/[^A-Z]/g, '');

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${cleanPass}${suffix}`);
  };

  return (
    <div>
      <p className="m small" style={{ marginBottom: 8 }}>
        Palavras para localizar na ordem: <b>{board.words.join(' → ')}</b>. Clique nas letras no tabuleiro 12×12 para marcar e digite a senha formada pelas iniciais:
      </p>

      <div
        role="grid"
        aria-label="Tabuleiro caça-palavras 12 por 12"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: 3,
          padding: 8,
          borderRadius: 12,
          background: 'rgba(8, 6, 14, 0.75)',
          border: '1px solid rgba(244, 165, 29, 0.25)',
        }}
      >
        {matrix.map((row, r) =>
          row.map((ch, c) => {
            const active = Boolean(marked[`${r}-${c}`]);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => toggleCell(r, c)}
                style={{
                  aspectRatio: '1 / 1',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  background: active ? 'var(--gold, #F4A51D)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#140c08' : '#F1E4D4',
                }}
              >
                {ch}
              </button>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <label className="m small" style={{ display: 'block', marginBottom: 4 }}>
          Senha das iniciais (4 letras, sem espaços):
        </label>
        <input
          type="text"
          maxLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ex.: XXXX"
        />
      </div>

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar
        busy={busy}
        disabled={cleanPass.length < 4}
        label="Validar senha"
        extraInfo={`Marcadas: ${Object.values(marked).filter(Boolean).length} letras`}
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 3 — Memória dos símbolos (8 pares, máx. 24 tentativas)                 */
/* -------------------------------------------------------------------------- */

const MEMORY_SYMBOLS = {
  heaven: ['SINO', 'GORRO', 'NEVE', 'ESTRELA', 'LAÇO', 'VELA', 'PRESENTE', 'BENGALA'],
  kingdom: ['RENA', 'CARTA', 'LUVA', 'PINHEIRO', 'LUZ', 'FLOCO', 'BOTA', 'BISCOITO'],
};

function buildDeck(symbols) {
  const base = symbols.flatMap((label, idx) => [
    { uid: `${idx}-a`, pairId: idx, label },
    { uid: `${idx}-b`, pairId: idx, label },
  ]);
  const arr = [...base];
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

  const matchedCount = Object.keys(matched).length;
  const completed = matchedCount === 8;
  const exceeded = attempts > 24;

  const reset = () => {
    setDeck(buildDeck(symbols));
    setFlipped([]);
    setMatched({});
    setAttempts(0);
  };

  const handleFlip = (index) => {
    if (exceeded || completed || flipped.length === 2) return;
    const card = deck[index];
    if (!card || matched[card.pairId] || flipped.includes(index)) return;

    const next = [...flipped, index];
    setFlipped(next);

    if (next.length === 2) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      const [i1, i2] = next;
      if (deck[i1].pairId === deck[i2].pairId) {
        setMatched((prev) => ({ ...prev, [deck[i1].pairId]: true }));
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 650);
      }
    }
  };

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`MEMORY_8_PAIRS|attempts=${attempts}${suffix}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="badge gold">Pares: {matchedCount}/8</span>
        <span className={`badge ${exceeded ? 'red' : ''}`}>Tentativas: {attempts}/24</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {deck.map((card, idx) => {
          const isOpen = flipped.includes(idx) || Boolean(matched[card.pairId]);
          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleFlip(idx)}
              style={{
                minHeight: 54,
                borderRadius: 10,
                border: isOpen
                  ? '1px solid var(--gold, #F4A51D)'
                  : '1px solid rgba(255,255,255,0.14)',
                background: matched[card.pairId]
                  ? 'rgba(87, 92, 39, 0.55)'
                  : isOpen
                    ? 'rgba(244, 165, 29, 0.2)'
                    : 'rgba(14, 10, 22, 0.85)',
                color: '#F1E4D4',
                fontWeight: 700,
                fontSize: 11,
                cursor: isOpen ? 'default' : 'pointer',
              }}
            >
              {isOpen ? card.label : '✦'}
            </button>
          );
        })}
      </div>

      {exceeded && (
        <div className="err" style={{ marginTop: 10 }}>
          Você ultrapassou o limite de 24 tentativas de par. Reinicie o tabuleiro para tentar novamente.
        </div>
      )}

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />

      <div className="acts" style={{ marginTop: 12 }}>
        <button type="button" className="btn ghost" onClick={reset}>
          Reiniciar cartas
        </button>
        <button
          type="button"
          className="btn red"
          disabled={busy || !completed || exceeded}
          onClick={handleSend}
        >
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
  const [selectedItem, setSelectedItem] = useState(cfg.items[0]);
  const [placed, setPlaced] = useState({});
  const [ducksLink, setDucksLink] = useState('');

  const assignToSector = (sector) => {
    if (!selectedItem) return;
    const next = { ...placed, [selectedItem]: sector };
    setPlaced(next);
    const nextUnplaced = cfg.items.find((it) => !next[it]);
    if (nextUnplaced) setSelectedItem(nextUnplaced);
  };

  const allPlaced = cfg.items.every((it) => Boolean(placed[it]));

  const handleSend = () => {
    const serialized = cfg.items.map((it) => `${it}:${placed[it]}`).join(',');
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${serialized}${suffix}`);
  };

  return (
    <div>
      <p className="m small" style={{ marginBottom: 8 }}>
        1) Selecione um item abaixo e 2) toque no setor correspondente:
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {cfg.items.map((it) => {
          const isSel = selectedItem === it;
          const sec = placed[it];
          return (
            <button
              key={it}
              type="button"
              className={`btn ${isSel ? 'red' : 'ghost'}`}
              onClick={() => setSelectedItem(it)}
            >
              <span>{it}</span>
              {sec && <small style={{ opacity: 0.8 }}> ({sec})</small>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {cfg.sectors.map((sec) => {
          const inside = cfg.items.filter((it) => placed[it] === sec);
          return (
            <button
              key={sec}
              type="button"
              onClick={() => assignToSector(sec)}
              className="paper"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid rgba(244, 165, 29, 0.35)',
              }}
            >
              <b style={{ display: 'block', marginBottom: 6, color: 'var(--gold, #F4A51D)' }}>{sec}</b>
              <p className="m small" style={{ margin: 0 }}>
                {inside.length ? inside.join(', ') : 'Toque para colocar aqui'}
              </p>
            </button>
          );
        })}
      </div>

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar
        busy={busy}
        disabled={!allPlaced}
        label="Confirmar classificação"
        extraInfo={`${Object.keys(placed).length}/${cfg.items.length} itens organizados`}
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
  const requiredWords = isDay5
    ? ['NOELVET', isHeaven ? 'HEAVEN' : 'KINGDOM']
    : [isHeaven ? 'HEAVEN' : 'KINGDOM'];

  const clean = text.trim();
  const upper = normalizeUpper(clean);
  const hasKeywords = requiredWords.every((w) => upper.includes(w));
  const hasXmasExpr = isDay5 ? true : XMAS_EXPRESSIONS.some((w) => upper.includes(w));
  const lenOk = clean.length >= minLen && clean.length <= maxLen;

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `\n[Ducks: ${ducksLink.trim()}]` : '';
    onSend(`${clean}${suffix}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span className={`badge ${lenOk ? 'pine' : ''}`}>
          Tamanho: {clean.length}/{minLen}–{maxLen}
        </span>
        {requiredWords.map((w) => (
          <span key={w} className={`badge ${upper.includes(w) ? 'pine' : ''}`}>
            Obrigatória: {w}
          </span>
        ))}
        {!isDay5 && (
          <span className={`badge ${hasXmasExpr ? 'pine' : ''}`}>
            Expressão de Natal
          </span>
        )}
      </div>

      <textarea
        rows={isDay5 ? 5 : 4}
        maxLength={maxLen}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          isDay5
            ? `Escreva sua carta ao Noelvet (${minLen} a ${maxLen} caracteres)...`
            : `Escreva sua mensagem (${minLen} a ${maxLen} caracteres) mencionando ${isHeaven ? 'HEAVEN' : 'KINGDOM'} e uma expressão de Natal...`
        }
      />

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
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
/* Dia 6 — Enigma dos sinos (3 respostas numéricas separadas por hífen)       */
/* -------------------------------------------------------------------------- */

function Day6RiddleGame({ isHeaven, busy, onSend }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const questions = isHeaven
    ? [
        '1) Sequência: 2, 5, 9, 14, 20, ?',
        '2) Sequência: 1, 2, 4, 7, 11, ?',
        '3) 3 sinos tocam 2 vezes cada; total de toques?',
      ]
    : [
        '1) Sequência: 3, 6, 12, 21, 33, ?',
        '2) Sequência: 2, 4, 7, 11, 16, ?',
        '3) 4 renas recebem 3 laços cada; total?',
      ];

  const code = [a, b, c].map((v) => v.replace(/\D/g, '')).join('-');
  const ready = a.trim() && b.trim() && c.trim();

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${code}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {questions.map((q, i) => {
        const val = i === 0 ? a : i === 1 ? b : c;
        const setter = i === 0 ? setA : i === 1 ? setB : setC;
        return (
          <div key={q}>
            <label className="m small" style={{ display: 'block', marginBottom: 4 }}>{q}</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={val}
              onChange={(e) => setter(e.target.value.replace(/\D/g, ''))}
              placeholder="Número"
            />
          </div>
        );
      })}
      <p className="m small">Código montado: <b>{code || '?-?-?'}</b></p>
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={!ready} label="Validar enigma" onClick={handleSend} />
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
      ? `TREE|scenario=${scenario}|region=${region}|msg=${titleOrMsg.trim()}`
      : `GALLERY|theme=${isHeaven ? 'Um Natal na Heaven' : 'O castelo da The Kingdom no Natal'}|title=${titleOrMsg.trim()}`;
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${base}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={href} className="btn ghost">
          <Icon name={isTree ? 'tree' : 'gallery'} size={16} />
          <span>{isTree ? `Abrir ${scenario} (#arvore)` : 'Abrir Galeria de Natal (#galeria)'}</span>
        </a>
      </div>

      {isTree && (
        <div style={{ display: 'flex', gap: 6 }}>
          {['esquerda', 'base', 'direita'].map((r) => (
            <button
              key={r}
              type="button"
              className={`btn ${region === r ? 'red' : 'ghost'}`}
              onClick={() => setRegion(r)}
            >
              Região: {r}
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        maxLength={120}
        value={titleOrMsg}
        onChange={(e) => setTitleOrMsg(e.target.value)}
        placeholder={
          isTree
            ? 'Mensagem do enfeite (até 120 caracteres) ou nome do PNG enviado...'
            : 'Título e créditos da sua arte enviada na Galeria...'
        }
      />

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
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
/* Dia 8 — Vitral em pedaços 3x3                                              */
/* -------------------------------------------------------------------------- */

const VITRAL_GLYPHS = ['✦', '❄', '★', '🔔', '🕯', '🎄', '🎀', '🎁', '✨'];

function VitralPuzzleGame({ isHeaven, busy, onSend }) {
  const [tiles, setTiles] = useState([4, 2, 7, 1, 9, 5, 8, 3, 6]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [moves, setMoves] = useState(0);
  const [ducksLink, setDucksLink] = useState('');

  const handleTileClick = (idx) => {
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

  const handleSend = () => {
    const order = tiles.join('-');
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`VITRAL:${order}|moves=${moves}${suffix}`);
  };

  return (
    <div>
      <p className="m small" style={{ marginBottom: 8 }}>
        Toque em duas peças para trocá-las de lugar até organizar o vitral 3×3 na ordem <b>1 a 9</b>:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 260, margin: '0 auto' }}>
        {tiles.map((num, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleTileClick(idx)}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: 12,
              border: selectedIdx === idx
                ? '2px solid var(--gold, #F4A51D)'
                : '1px solid rgba(255,255,255,0.16)',
              background: num === idx + 1 ? 'rgba(87, 92, 39, 0.5)' : 'rgba(18, 12, 28, 0.88)',
              color: '#F1E4D4',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18 }}>{VITRAL_GLYPHS[num - 1]}</span>
            <b style={{ fontSize: 13 }}>#{num}</b>
          </button>
        ))}
      </div>

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar
        busy={busy}
        disabled={false}
        label="Enviar montagem do vitral"
        extraInfo={`Ordem atual: ${tiles.join(' ')} (${moves} trocas)`}
        onClick={handleSend}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 9 — Perfil de festa (Bio 20–120 chars + captura)                       */
/* -------------------------------------------------------------------------- */

function Day9BioGame({ isHeaven, busy, onSend }) {
  const [bio, setBio] = useState('');
  const [proof, setProof] = useState('');

  const keyword = isHeaven ? 'HEAVEN' : 'KINGDOM';
  const clean = bio.trim();
  const hasKeyword = normalizeUpper(clean).includes(keyword);
  const lenOk = clean.length >= 20 && clean.length <= 120;

  const handleSend = () => {
    onSend(`BIO:${clean}|PROOF:${proof.trim()}`);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span className={`badge ${lenOk ? 'pine' : ''}`}>{clean.length}/20–120 chars</span>
        <span className={`badge ${hasKeyword ? 'pine' : ''}`}>Inclui {keyword}</span>
      </div>
      <textarea
        rows={3}
        maxLength={120}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder={`Crie sua frase natalina mencionando ${keyword}...`}
      />
      <input
        type="text"
        maxLength={240}
        value={proof}
        onChange={(e) => setProof(e.target.value)}
        placeholder={isHeaven ? 'Link/print da sua bio no Ducks...' : 'Link/print da sua bio Discord ou cartão de perfil...'}
      />
      <SubmitBar busy={busy} disabled={!lenOk || !hasKeyword || proof.trim().length < 3} label="Enviar para análise" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 10 — Quiz do festival (5 perguntas)                                    */
/* -------------------------------------------------------------------------- */

const QUIZ_DAY_10 = {
  heaven: [
    { q: '1. Qual plataforma concentra as comprovações da Heaven?', opts: ['Ducks', 'Telegram', 'Twitch'] },
    { q: '2. Qual o cenário oficial da Árvore da Heaven?', opts: ['Bosque da Heaven', 'Castelo Kingdom', 'Vale Gelado'] },
    { q: '3. Qual é o horário diário de abertura das portas (Brasília)?', opts: ['00:00', '12:00', '18:00'] },
    { q: '4. Qual o prazo máximo para comprovar no Ducks após concluir?', opts: ['24 horas', '72 horas', '7 dias'] },
    { q: '5. Quantas atividades aprovadas garantem a lembrança?', opts: ['3 atividades', '10 atividades', '25 atividades'] },
  ],
  kingdom: [
    { q: '1. Onde os participantes da The Kingdom enviam as atividades?', opts: ['Diretamente na VULPORA', 'Em canal público do Discord', 'Por e-mail'] },
    { q: '2. Qual o cenário oficial da Árvore da The Kingdom?', opts: ['Castelo Kingdom', 'Bosque da Heaven', 'Vila do Norte'] },
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
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`QUIZ10|${serialized}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {qs.map((item, idx) => (
        <div key={item.q} className="paper">
          <b style={{ display: 'block', marginBottom: 6 }}>{item.q}</b>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {item.opts.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`btn ${answers[idx] === opt ? 'red' : 'ghost'}`}
                onClick={() => setAnswers((prev) => ({ ...prev, [idx]: opt }))}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={!allAnswered} label="Enviar respostas do quiz" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 11 — Caça às pistas (3 fragmentos ocultos no portal)                   */
/* -------------------------------------------------------------------------- */

function Day11ClueHuntGame({ isHeaven, busy, onSend }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const combined = normalizeUpper(`${p1}${p2}${p3}`).replace(/[^A-Z]/g, '');

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${combined}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p className="m small">
        Explore as abas do evento para coletar os 3 fragmentos ocultos e uni-los na ordem:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div>
          <label className="m small">1. Rodapé Calendário</label>
          <input type="text" maxLength={5} value={p1} onChange={(e) => setP1(e.target.value)} placeholder="Pista 01" />
        </div>
        <div>
          <label className="m small">2. Placa da Árvore</label>
          <input type="text" maxLength={5} value={p2} onChange={(e) => setP2(e.target.value)} placeholder="Pista 02" />
        </div>
        <div>
          <label className="m small">3. Créditos / Galeria</label>
          <input type="text" maxLength={5} value={p3} onChange={(e) => setP3(e.target.value)} placeholder="Pista 03" />
        </div>
      </div>
      <p className="m small">Palavra formada: <b>{combined || '---'}</b></p>
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={combined.length < 4} label="Validar palavra-chave" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 12 — Forca natalina (máx. 8 erros)                                     */
/* -------------------------------------------------------------------------- */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function Day12HangmanGame({ isHeaven, busy, onSend }) {
  const secretWord = isHeaven ? 'GUIRLANDA' : 'PRESEPIO';
  const wordLength = secretWord.length;

  const [tried, setTried] = useState([]);
  const [typedWord, setTypedWord] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const wrongLetters = tried.filter((ch) => !secretWord.includes(ch));
  const wrongCount = wrongLetters.length;
  const maxErrors = 8;
  const failed = wrongCount > maxErrors;

  const revealedSlots = secretWord.split('').map((ch) => (tried.includes(ch) ? ch : ''));
  const allRevealed = revealedSlots.every(Boolean);

  const cleanTyped = normalizeUpper(typedWord).replace(/[^A-Z]/g, '');
  const finalWord = cleanTyped.length === wordLength ? cleanTyped : allRevealed ? secretWord : cleanTyped;

  const toggleLetter = (ch) => {
    if (failed || allRevealed) return;
    setTried((prev) => (prev.includes(ch) ? prev : [...prev, ch]));
  };

  const resetHangman = () => {
    setTried([]);
    setTypedWord('');
  };

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${finalWord}|letters=${tried.join('')}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="badge gold">{wordLength} letras</span>
        <span className={`badge ${wrongCount >= 6 ? 'red' : ''}`}>
          Erros: {wrongCount}/{maxErrors}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: wordLength }).map((_, i) => {
          const displayChar = cleanTyped[i] || revealedSlots[i] || '';
          return (
            <span
              key={i}
              style={{
                width: 28,
                height: 34,
                borderBottom: '2px solid var(--gold, #F4A51D)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {displayChar}
            </span>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {ALPHABET.map((ch) => {
          const used = tried.includes(ch);
          const isHit = used && secretWord.includes(ch);
          const isMiss = used && !secretWord.includes(ch);
          return (
            <button
              key={ch}
              type="button"
              disabled={used || failed || allRevealed}
              onClick={() => toggleLetter(ch)}
              className={`btn ${isHit ? 'pine' : isMiss ? 'red' : 'ghost'}`}
              style={{ minWidth: 32, padding: '6px 8px' }}
            >
              {ch}
            </button>
          );
        })}
      </div>

      {failed && (
        <div className="err">
          Limite de 8 letras erradas atingido! Reinicie a forca para tentar novamente.
        </div>
      )}

      <input
        type="text"
        maxLength={wordLength}
        value={typedWord}
        onChange={(e) => setTypedWord(e.target.value)}
        placeholder={`Ou digite a palavra completa (${wordLength} letras, sem acentos)...`}
      />

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />

      <div className="acts" style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost" onClick={resetHangman}>
          Reiniciar forca
        </button>
        <button
          type="button"
          className="btn red"
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
/* Dia 13 — Sudoku de inverno 6x6 (blocos 2x3)                                */
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
  kingdom: [
    [0, 2, 3, 0, 5, 6],
    [4, 0, 6, 1, 0, 3],
    [2, 3, 0, 5, 6, 0],
    [0, 6, 1, 0, 3, 4],
    [3, 0, 5, 6, 0, 2],
    [6, 1, 0, 3, 4, 0],
  ],
};

function Day13SudokuGame({ isHeaven, busy, onSend }) {
  const initial = isHeaven ? SUDOKU_GIVENS.heaven : SUDOKU_GIVENS.kingdom;
  const [grid, setGrid] = useState(() => initial.map((r) => [...r]));
  const [sel, setSel] = useState([0, 1]);
  const [ducksLink, setDucksLink] = useState('');

  const setNumber = (n) => {
    const [r, c] = sel;
    if (initial[r][c] !== 0) return;
    setGrid((prev) =>
      prev.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? n : v)))
    );
  };

  const isFull = grid.every((row) => row.every((v) => v >= 1 && v <= 6));

  const handleSend = () => {
    const flat = grid.map((r) => r.join('')).join('-');
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`SUDOKU6:${flat}${suffix}`);
  };

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 3,
          maxWidth: 270,
          margin: '0 auto 10px',
        }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const locked = initial[r][c] !== 0;
            const active = sel[0] === r && sel[1] === c;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => setSel([r, c])}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 6,
                  border: active ? '2px solid var(--gold, #F4A51D)' : '1px solid rgba(255,255,255,0.14)',
                  borderRight: c === 2 ? '2px solid rgba(244, 165, 29, 0.5)' : undefined,
                  borderBottom: r === 1 || r === 3 ? '2px solid rgba(244, 165, 29, 0.5)' : undefined,
                  background: locked ? 'rgba(244, 165, 29, 0.16)' : 'rgba(12, 9, 20, 0.85)',
                  color: locked ? 'var(--gold, #F4A51D)' : '#F1E4D4',
                  fontWeight: 800,
                  cursor: locked ? 'default' : 'pointer',
                }}
              >
                {val || ''}
              </button>
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {[1, 2, 3, 4, 5, 6, 0].map((n) => (
          <button
            key={n}
            type="button"
            className="btn ghost"
            onClick={() => setNumber(n)}
          >
            {n === 0 ? 'Limpar' : n}
          </button>
        ))}
      </div>

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={!isFull} label="Validar Sudoku 6×6" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 17 — Cruzadinhas do castelo (9 horizontais -> vertical de 9 letras)    */
/* -------------------------------------------------------------------------- */

function Day17CrosswordGame({ isHeaven, busy, onSend }) {
  const clues = isHeaven
    ? [
        '1. [N] Precipitação branca de inverno (4 letras)',
        '2. [A] Astro que brilha no topo da árvore (7 letras)',
        '3. [T] Veículo do Noelvet puxado por renas (5 letras)',
        '4. [A] Mensageiro celeste com asas (4 letras)',
        '5. [L] Fita decorativa amarrada nos presentes (4 letras)',
        '6. [I] Enfeite sonoro dourado de Natal (4 letras — 2ª letra)',
        '7. [N] Guia oficial do festival de Natal (7 letras)',
        '8. [O] Metal precioso das estrelas (4 letras)',
        '9. [S] Onde Noelvet guarda os presentes (4 letras)',
      ]
    : [
        '1. [P] Árvore símbolo do Natal (8 letras)',
        '2. [R] Animal que puxa o trenó (4 letras)',
        '3. [E] Luz no topo da árvore (7 letras)',
        '4. [S] Toca anunciando a festa (4 letras)',
        '5. [E] Adorno pendurado nos galhos (7 letras)',
        '6. [N] Flocos brancos de inverno (4 letras)',
        '7. [T] Veículo do Noelvet na neve (5 letras)',
        '8. [E] Onde vai a cartinha (8 letras)',
        '9. [S] Marca colada na correspondência (4 letras)',
      ];

  const [rows, setRows] = useState(Array(9).fill(''));
  const [verticalWord, setVerticalWord] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const cleanVertical = normalizeUpper(verticalWord).replace(/[^A-Z]/g, '');

  const handleSend = () => {
    const h = rows.map((r) => normalizeUpper(r).replace(/[^A-Z]/g, '')).join(',');
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${cleanVertical}|rows=${h}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <p className="m small">
        Resolva as 9 pistas horizontais e una as letras destacadas em <b>[colchetes]</b> de cima para baixo:
      </p>
      {clues.map((c, idx) => (
        <div key={c}>
          <label className="m small">{c}</label>
          <input
            type="text"
            maxLength={12}
            value={rows[idx]}
            onChange={(e) => {
              const copy = [...rows];
              copy[idx] = e.target.value;
              setRows(copy);
            }}
            placeholder={`Horizontal ${idx + 1}`}
          />
        </div>
      ))}
      <div style={{ marginTop: 4 }}>
        <label className="m small"><b>Palavra vertical central (9 letras):</b></label>
        <input
          type="text"
          maxLength={9}
          value={verticalWord}
          onChange={(e) => setVerticalWord(e.target.value)}
          placeholder="Palavra de 9 letras"
        />
      </div>
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={cleanVertical.length !== 9} label="Validar cruzadinha" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 18 — Encontre as diferenças (comparação visual 10x10, 6 diferenças)    */
/* -------------------------------------------------------------------------- */

const DIFF_BASE_ICONS = ['❄', '✦', '🎄', '🔔', '🕯', '★', '🎀', '🎁', '✨', '🦌'];

const DIFF_ALTERATIONS = {
  heaven: {
    '1,2': '★',
    '2,7': '🎁',
    '4,4': '🔔',
    '6,9': '🎀',
    '8,3': '🦌',
    '10,6': '🕯',
  },
  kingdom: {
    '1,8': '🎄',
    '3,2': '🔔',
    '5,6': '🎁',
    '7,4': '★',
    '8,9': '🕯',
    '10,1': '🎀',
  },
};

function Day18SpotDiffGame({ isHeaven, busy, onSend }) {
  const [picked, setPicked] = useState([]);
  const [ducksLink, setDucksLink] = useState('');
  const changes = isHeaven ? DIFF_ALTERATIONS.heaven : DIFF_ALTERATIONS.kingdom;

  const toggleCoord = (r, c) => {
    const id = `${r + 1},${c + 1}`;
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`DIFF6:${picked.join(';')}${suffix}`);
  };

  const renderGrid = (altered) => (
    <div>
      <small className="m small" style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>
        {altered ? 'Ilustração B (clique nas 6 diferenças)' : 'Ilustração A (original)'}
      </small>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
          gap: 2,
          padding: 6,
          borderRadius: 10,
          background: 'rgba(10, 8, 18, 0.82)',
          border: '1px solid rgba(244, 165, 29, 0.25)',
        }}
      >
        {Array.from({ length: 10 }).map((_, r) =>
          Array.from({ length: 10 }).map((__, c) => {
            const id = `${r + 1},${c + 1}`;
            const baseGlyph = DIFF_BASE_ICONS[(r * 3 + c * 7) % DIFF_BASE_ICONS.length];
            const glyph = altered && changes[id] ? changes[id] : baseGlyph;
            const active = altered && picked.includes(id);

            return (
              <button
                key={id}
                type="button"
                disabled={!altered}
                onClick={() => altered && toggleCoord(r, c)}
                title={`Linha ${r + 1}, Coluna ${c + 1}`}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 4,
                  border: active ? '1px solid #F4A51D' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? '#A81E23' : 'rgba(255,255,255,0.04)',
                  color: '#F1E4D4',
                  fontSize: 11,
                  padding: 0,
                  cursor: altered ? 'pointer' : 'default',
                }}
              >
                {glyph}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div>
      <p className="m small" style={{ marginBottom: 8 }}>
        Compare os dois quadros 10×10 e toque nas <b>6 células alteradas</b> na Ilustração B ({picked.length}/6):
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {renderGrid(false)}
        {renderGrid(true)}
      </div>

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar
        busy={busy}
        disabled={picked.length !== 6}
        label="Confirmar 6 diferenças"
        extraInfo={`Selecionadas: ${picked.join(' · ') || 'nenhuma'}`}
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
  const shift = isHeaven ? 3 : 4;
  const [decoded, setDecoded] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const handleSend = () => {
    const clean = normalizeUpper(decoded).replace(/\s+/g, ' ').trim();
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${clean}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="paper" style={{ textAlign: 'center', letterSpacing: '0.14em', fontWeight: 800 }}>
        {cipher}
      </div>
      <p className="m small">
        Dica da cifra: cada letra avançou <b>{shift} posições</b> no alfabeto. Volte {shift} letras para decifrar.
      </p>
      <input
        type="text"
        maxLength={60}
        value={decoded}
        onChange={(e) => setDecoded(e.target.value)}
        placeholder="Escreva a frase decifrada (sem acentos)..."
      />
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={decoded.trim().length < 6} label="Validar frase" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 21 — Bingo dos elfos (cartela 3x3)                                     */
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
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`BINGO9|${serialized}${suffix}`);
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {cells.map((label, idx) => (
          <div key={label} className="paper" style={{ padding: 8 }}>
            <small style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>{label}</small>
            <input
              type="text"
              maxLength={24}
              value={vals[idx]}
              onChange={(e) => {
                const copy = [...vals];
                copy[idx] = e.target.value;
                setVals(copy);
              }}
              placeholder="Resposta"
            />
          </div>
        ))}
      </div>
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
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
    const joined = answers.map((a) => normalizeUpper(a).replace(/[^A-Z]/g, '')).join(',');
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${joined}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {scrambled.map((word, idx) => (
        <div key={word}>
          <label className="m small">
            Anagrama {idx + 1}: <b>{word}</b>
          </label>
          <input
            type="text"
            maxLength={14}
            value={answers[idx]}
            onChange={(e) => {
              const copy = [...answers];
              copy[idx] = e.target.value;
              setAnswers(copy);
            }}
            placeholder="Palavra sem acento"
          />
        </div>
      ))}
      <div style={{ gridColumn: '1 / -1' }}>
        <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
        <SubmitBar busy={busy} disabled={!ready} label="Validar 6 palavras" onClick={handleSend} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 23 — Rotas de entrega (18h às 21h)                                     */
/* -------------------------------------------------------------------------- */

function Day23DeliveryRouteGame({ isHeaven, busy, onSend }) {
  const initialItems = isHeaven
    ? ['DOCE', 'SINO', 'LAÇO', 'LIVRO']
    : ['ESTRELA', 'NEVE', 'CARTA', 'PRESENTE'];
  const clues = isHeaven
    ? [
        '• O LAÇO abre a rota às 18h.',
        '• O SINO sai antes do DOCE.',
        '• O LIVRO é entregue logo após o DOCE (21h).',
      ]
    : [
        '• A CARTA sai às 18h.',
        '• O PRESENTE sai antes da ESTRELA.',
        '• A NEVE fecha a rota às 21h.',
      ];
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
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${normalized}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="paper">
        {clues.map((line) => (
          <p key={line} className="m small" style={{ margin: '2px 0' }}>{line}</p>
        ))}
      </div>

      {order.map((item, idx) => (
        <div
          key={item}
          className="paper"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            <b style={{ color: 'var(--gold, #F4A51D)' }}>{hours[idx]}</b> · {item}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn ghost" disabled={idx === 0} onClick={() => move(idx, -1)}>
              ↑
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={idx === order.length - 1}
              onClick={() => move(idx, 1)}
            >
              ↓
            </button>
          </div>
        </div>
      ))}
      <p className="m small">Sequência: <b>{order.join(', ')}</b></p>
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={false} label="Confirmar rota de entregas" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 24 — A última busca (número + número + letra)                          */
/* -------------------------------------------------------------------------- */

function Day24FinalQuestGame({ isHeaven, busy, onSend }) {
  const [step1, setStep1] = useState('');
  const [step2, setStep2] = useState('');
  const [step3, setStep3] = useState('');
  const [ducksLink, setDucksLink] = useState('');

  const token = `${step1.replace(/\D/g, '')}${step2.replace(/\D/g, '')}${normalizeUpper(step3).replace(/[^A-Z]/g, '')}`;

  const handleSend = () => {
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`${token}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div>
          <label className="m small">{isHeaven ? '1. Letras de SINO' : '1. Letras de RENA'}</label>
          <input type="text" maxLength={2} value={step1} onChange={(e) => setStep1(e.target.value)} placeholder="Nº" />
        </div>
        <div>
          <label className="m small">{isHeaven ? '2. Valor de 2 + 5' : '2. Valor de 3 + 5'}</label>
          <input type="text" maxLength={2} value={step2} onChange={(e) => setStep2(e.target.value)} placeholder="Nº" />
        </div>
        <div>
          <label className="m small">{isHeaven ? '3. Inicial de Noelvet' : '3. Inicial de Kingdom'}</label>
          <input type="text" maxLength={1} value={step3} onChange={(e) => setStep3(e.target.value)} placeholder="Letra" />
        </div>
      </div>
      <p className="m small">Senha final montada: <b>{token || '---'}</b></p>
      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
      <SubmitBar busy={busy} disabled={token.length < 3} label="Validar senha final" onClick={handleSend} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dia 25 — Desejos de Natal (Quiz de 3 perguntas + saudação 30–200 chars)    */
/* -------------------------------------------------------------------------- */

function Day25FinaleGame({ isHeaven, busy, onSend }) {
  const questions = isHeaven
    ? [
        { q: '1. Quantos dias teve o Calendário do Advento 2026?', opts: ['25 dias', '24 dias', '31 dias'] },
        { q: '2. Qual cenário recebeu os enfeites da Heaven?', opts: ['Bosque da Heaven', 'Castelo Kingdom', 'Torre Norte'] },
        { q: '3. Quem guiou as cartas e desafios do festival?', opts: ['Noelvet', 'Grinch', 'Papai Coelho'] },
      ]
    : [
        { q: '1. Quantos dias teve o Calendário do Advento 2026?', opts: ['25 dias', '24 dias', '30 dias'] },
        { q: '2. Qual cenário recebeu os enfeites da The Kingdom?', opts: ['Castelo Kingdom', 'Bosque da Heaven', 'Praça Central'] },
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
    const suffix = isHeaven && ducksLink.trim() ? `|ducks=${ducksLink.trim()}` : '';
    onSend(`FINALE25|quiz=${qStr}|greeting=${clean}${suffix}`);
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {questions.map((item, idx) => (
        <div key={item.q} className="paper">
          <b style={{ display: 'block', marginBottom: 6 }}>{item.q}</b>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {item.opts.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`btn ${qAns[idx] === opt ? 'red' : 'ghost'}`}
                onClick={() => setQAns((prev) => ({ ...prev, [idx]: opt }))}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <span className={`badge ${lenOk ? 'pine' : ''}`}>Saudação: {clean.length}/30–200</span>
          <span className={`badge ${hasKeyword ? 'pine' : ''}`}>Menciona {keyword}</span>
        </div>
        <textarea
          rows={3}
          maxLength={200}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder={`Escreva sua saudação final de Natal mencionando ${keyword} (30 a 200 caracteres)...`}
        />
      </div>

      <DucksProofBox isHeaven={isHeaven} ducksLink={ducksLink} setDucksLink={setDucksLink} />
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

export function AdventDayGame({ day, isHeaven = false, busy = false, onSend }) {
  const d = Number(day) || 1;
  const instanceKey = `${d}-${isHeaven ? 'heaven' : 'kingdom'}`;
  const props = { day: d, isHeaven, busy, onSend };

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