const STORAGE_PREFIX = 'vulpora:natal2026:v1';

const normalize = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const stripDucksSuffix = (raw = '') =>
  String(raw)
    .replace(/\|ducks=.*$/i, '')
    .replace(/\n\[Ducks:.*\]$/i, '')
    .trim();

const extractDucksLink = (raw = '') => {
  const m1 = String(raw).match(/\|ducks=([^\s|]+)/i);
  if (m1) return m1[1];
  const m2 = String(raw).match(/\[Ducks:\s*([^\]]+)\]/i);
  if (m2) return m2[1];
  return '';
};

const LEVEL_POINTS = {
  Fácil: 20,
  Média: 35,
  Difícil: 50,
};

export const MISSION_META = {
  1:  { level: 'Fácil',   needsReview: true },
  2:  { level: 'Média',   needsReview: false },
  3:  { level: 'Fácil',   needsReview: false },
  4:  { level: 'Média',   needsReview: false },
  5:  { level: 'Média',   needsReview: true },
  6:  { level: 'Difícil', needsReview: false },
  7:  { level: 'Fácil',   needsReview: true },
  8:  { level: 'Média',   needsReview: false },
  9:  { level: 'Fácil',   needsReview: true },
  10: { level: 'Média',   needsReview: false },
  11: { level: 'Difícil', needsReview: false },
  12: { level: 'Fácil',   needsReview: false },
  13: { level: 'Difícil', needsReview: false },
  14: { level: 'Média',   needsReview: false },
  15: { level: 'Média',   needsReview: false },
  16: { level: 'Média',   needsReview: true },
  17: { level: 'Difícil', needsReview: false },
  18: { level: 'Fácil',   needsReview: false },
  19: { level: 'Fácil',   needsReview: true },
  20: { level: 'Difícil', needsReview: false },
  21: { level: 'Média',   needsReview: false },
  22: { level: 'Fácil',   needsReview: false },
  23: { level: 'Difícil', needsReview: false },
  24: { level: 'Difícil', needsReview: false },
  25: { level: 'Média',   needsReview: true },
};

/* Validação do Sudoku 6x6 (blocos 2x3) */
function isValidSudoku6(flat, isHeaven) {
  const initial = isHeaven
    ? [
        [1, 0, 0, 4, 0, 6],
        [0, 5, 6, 0, 2, 0],
        [2, 0, 4, 0, 6, 0],
        [0, 6, 0, 2, 0, 4],
        [0, 2, 0, 6, 4, 0],
        [6, 0, 5, 0, 0, 2],
      ]
    : [
        [0, 2, 3, 0, 5, 6],
        [4, 0, 6, 1, 0, 3],
        [2, 3, 0, 5, 6, 0],
        [0, 6, 1, 0, 3, 4],
        [3, 0, 5, 6, 0, 2],
        [6, 1, 0, 3, 4, 0],
      ];

  const rows = flat.split('-').map((r) => r.split('').map(Number));
  if (rows.length !== 6 || rows.some((r) => r.length !== 6)) return false;

  const isSet1to6 = (arr) => {
    const s = new Set(arr);
    return s.size === 6 && [1, 2, 3, 4, 5, 6].every((n) => s.has(n));
  };

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (initial[r][c] !== 0 && rows[r][c] !== initial[r][c]) return false;
    }
    if (!isSet1to6(rows[r])) return false;
  }

  for (let c = 0; c < 6; c++) {
    if (!isSet1to6(rows.map((r) => r[c]))) return false;
  }

  for (let br = 0; br < 6; br += 2) {
    for (let bc = 0; bc < 6; bc += 3) {
      const box = [];
      for (let r = br; r < br + 2; r++) {
        for (let c = bc; c < bc + 3; c++) box.push(rows[r][c]);
      }
      if (!isSet1to6(box)) return false;
    }
  }
  return true;
}

/* Validador oficial dos 25 dias */
export function validateMissionAnswer(day, rawPayload, isHeaven = false) {
  const d = Number(day);
  const core = stripDucksSuffix(rawPayload);
  const upper = normalize(core);

  switch (d) {
    case 1: {
      if (isHeaven) {
        const ok = core.startsWith('DUCKS_PROOF:') && core.length > 16;
        return ok
          ? { ok: true, needsReview: true }
          : { ok: false, reason: 'Cole o link válido da publicação/captura no Ducks com #AdventoHeaven01.' };
      }
      const ok = core.startsWith('VULPORA_CARD|') && core.includes('nick=') && core.length >= 24;
      return ok
        ? { ok: true, needsReview: true }
        : { ok: false, reason: 'Preencha seu nome e escolha um adorno natalino para o cartão.' };
    }

    case 2: {
      const expected = isHeaven ? 'NOEL' : 'RENO';
      return upper === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Senha incorreta. Use as 4 letras iniciais na ordem das palavras.' };
    }

    case 3: {
      const m = upper.match(/^MEMORY_8_PAIRS\|ATTEMPTS=(\d+)$/);
      if (!m) return { ok: false, reason: 'Complete os 8 pares no tabuleiro.' };
      const attempts = Number(m[1]);
      return attempts <= 24
        ? { ok: true, needsReview: false }
        : { ok: false, reason: `Limite excedido (${attempts}/24 tentativas). Reinicie e tente novamente.` };
    }

    case 4: {
      const expected = isHeaven
        ? {
            LACO: 'TECIDOS',
            MEIA: 'TECIDOS',
            CACHECOL: 'TECIDOS',
            CARTAO: 'PAPEL',
            CARTA: 'PAPEL',
            BONECA: 'PRESENTES',
            CARRINHO: 'PRESENTES',
            LIVRO: 'PRESENTES',
          }
        : {
            BISCOITO: 'COZINHA',
            CANECA: 'COZINHA',
            BOLO: 'COZINHA',
            ESTRELA: 'DECORACAO',
            GUIRLANDA: 'DECORACAO',
            SINO: 'DECORACAO',
            LUVA: 'INVERNO',
            GORRO: 'INVERNO',
          };

      const entries = upper.split(',').map((pair) => pair.split(':'));
      if (entries.length !== 8) return { ok: false, reason: 'Classifique todos os 8 itens.' };
      const allRight = entries.every(([k, v]) => expected[k] && expected[k] === v);
      return allRight
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Há itens no setor errado. Revise a classificação.' };
    }

    case 5: {
      const len = core.length;
      const req = isHeaven ? ['NOELVET', 'HEAVEN'] : ['NOELVET', 'KINGDOM'];
      const ok = len >= 100 && len <= 600 && req.every((w) => upper.includes(w));
      return ok
        ? { ok: true, needsReview: true }
        : { ok: false, reason: `A carta precisa ter entre 100 e 600 caracteres e incluir ${req.join(' e ')}.` };
    }

    case 6: {
      const expected = isHeaven ? '27-16-6' : '48-22-12';
      return upper === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Sequência numérica incorreta. Confira os três cálculos.' };
    }

    case 7: {
      const ok = core.startsWith('TREE|') && core.includes('msg=') && core.length >= 22;
      return ok
        ? { ok: true, needsReview: true }
        : { ok: false, reason: 'Escolha uma região e escreva a mensagem ou identificador do enfeite.' };
    }

    case 8: {
      return upper.startsWith('VITRAL:1-2-3-4-5-6-7-8-9')
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'O vitral ainda não está na ordem correta de 1 a 9.' };
    }

    case 9: {
      const keyword = isHeaven ? 'HEAVEN' : 'KINGDOM';
      const [bioPart = '', proofPart = ''] = core.split('|PROOF:');
      const bio = bioPart.replace(/^BIO:/i, '').trim();
      const ok =
        bio.length >= 20 &&
        bio.length <= 120 &&
        normalize(bio).includes(keyword) &&
        proofPart.trim().length >= 3;
      return ok
        ? { ok: true, needsReview: true }
        : { ok: false, reason: `Use 20 a 120 caracteres com ${keyword} e anexe o link/print.` };
    }

    case 10: {
      const expected = isHeaven
        ? ['DUCKS', 'BOSQUE DA HEAVEN', '00:00', '24 HORAS', '3 ATIVIDADES']
        : ['DIRETAMENTE NA VULPORA', 'CASTELO KINGDOM', '00:00', '25/12 AS 00H', '3 ATIVIDADES'];
      const parts = upper.replace(/^QUIZ10\|/, '').split('|');
      if (parts.length !== 5) return { ok: false, reason: 'Responda todas as 5 perguntas.' };
      const allRight = expected.every((ans, idx) => parts[idx] === `${idx + 1}:${ans}`);
      return allRight
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Uma ou mais respostas do quiz estão incorretas (necessário 5/5).' };
    }

    case 11: {
      const expected = isHeaven ? 'LUZES' : 'ESTRELA';
      return upper === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Palavra formada pelos 3 fragmentos incorreta.' };
    }

    case 12: {
      const [wordPart = '', lettersPart = ''] = upper.split('|LETTERS=');
      const expected = isHeaven ? 'GUIRLANDA' : 'PRESEPIO';
      const wrongCount = lettersPart
        .split('')
        .filter((ch) => ch && !expected.includes(ch)).length;
      if (wrongCount > 8) {
        return { ok: false, reason: 'Você excedeu o limite de 8 letras erradas na forca.' };
      }
      return wordPart === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Palavra da forca incorreta.' };
    }

    case 13: {
      const flat = upper.replace(/^SUDOKU6:/, '');
      return isValidSudoku6(flat, isHeaven)
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Há números repetidos em alguma linha, coluna ou bloco 2×3.' };
    }

    case 14: {
      const expected = isHeaven ? 'ANJO' : 'LUAR';
      return upper === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Senha das iniciais incorreta.' };
    }

    case 15: {
      const expected = isHeaven
        ? {
            BOLA: 'ENFEITES',
            ESTRELA: 'ENFEITES',
            GUIRLANDA: 'ENFEITES',
            FESTAO: 'ENFEITES',
            PANETONE: 'DOCES',
            RABANADA: 'DOCES',
            BISCOITO: 'DOCES',
            'BENGALA DOCE': 'DOCES',
            GORRO: 'ROUPAS',
            LUVA: 'ROUPAS',
            CACHECOL: 'ROUPAS',
            SUETER: 'ROUPAS',
          }
        : {
            ENVELOPE: 'CARTAS',
            SELO: 'CARTAS',
            PERGAMINHO: 'CARTAS',
            CARTAO: 'CARTAS',
            VELA: 'LUZES',
            'PISCA-PISCA': 'LUZES',
            LANTERNA: 'LUZES',
            ESTRELA: 'LUZES',
            CAIXA: 'PRESENTES',
            LACO: 'PRESENTES',
            BONECO: 'PRESENTES',
            LIVRO: 'PRESENTES',
          };

      const entries = upper.split(',').map((pair) => pair.split(':'));
      if (entries.length !== 12) return { ok: false, reason: 'Organize todos os 12 itens.' };
      const allRight = entries.every(([k, v]) => expected[k] && expected[k] === v);
      return allRight
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Algum item está na categoria incorreta.' };
    }

    case 16: {
      const ok = core.startsWith('GALLERY|') && core.includes('title=') && core.length >= 22;
      return ok
        ? { ok: true, needsReview: true }
        : { ok: false, reason: 'Informe o título e os créditos da arte enviada na Galeria.' };
    }

    case 17: {
      const vertical = upper.split('|')[0];
      const expected = isHeaven ? 'NATALINOS' : 'PRESENTES';
      return vertical === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'A palavra vertical central de 9 letras está incorreta.' };
    }

    case 18: {
      const expectedCoords = isHeaven
        ? ['1,2', '2,7', '4,4', '6,9', '8,3', '10,6']
        : ['1,8', '3,2', '5,6', '7,4', '8,9', '10,1'];
      const rawCoords = upper.replace(/^DIFF6:/, '').split(';').filter(Boolean);
      const set = new Set(rawCoords);
      const ok = set.size === 6 && expectedCoords.every((c) => set.has(c));
      return ok
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Nem todas as 6 diferenças marcadas correspondem às alterações.' };
    }

    case 19: {
      const keyword = isHeaven ? 'HEAVEN' : 'KINGDOM';
      const xmasWords = ['NATAL', 'BOAS FESTAS', 'FELIZ', 'NOEL', 'ANO NOVO', 'DEZEMBRO'];
      const hasXmas = xmasWords.some((w) => upper.includes(w));
      const ok = core.length >= 40 && core.length <= 300 && upper.includes(keyword) && hasXmas;
      return ok
        ? { ok: true, needsReview: true }
        : { ok: false, reason: `Use 40 a 300 caracteres incluindo ${keyword} e uma expressão de Natal.` };
    }

    case 20: {
      const expected = isHeaven ? 'A ESTRELA GUIA O REINO' : 'O NATAL UNE A KINGDOM';
      const cleaned = upper.replace(/\s+/g, ' ');
      return cleaned === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Frase decifrada incorreta. Verifique o deslocamento das letras.' };
    }

    case 21: {
      const accepted = isHeaven
        ? [
            ['DEZEMBRO', '12'],
            ['25', '25 PORTAS'],
            ['BOSQUE DA HEAVEN', 'BOSQUE'],
            ['DUCKS'],
            ['20', '20 PTS', '20 PONTOS'],
            ['35', '35 PTS', '35 PONTOS'],
            ['50', '50 PTS', '50 PONTOS'],
            ['30 MIN', '30', '30 MINUTOS'],
            ['25', '25/12', '25 DE DEZEMBRO'],
          ]
        : [
            ['DEZEMBRO', '12'],
            ['25', '25 PORTAS'],
            ['CASTELO KINGDOM', 'CASTELO', 'CASTELO DA THE KINGDOM'],
            ['THE KINGDOM', 'KINGDOM'],
            ['20', '20 PTS', '20 PONTOS'],
            ['35', '35 PTS', '35 PONTOS'],
            ['50', '50 PTS', '50 PONTOS'],
            ['30 MIN', '30', '30 MINUTOS'],
            ['25', '25/12', '25 DE DEZEMBRO'],
          ];

      const cells = Array(9).fill('');
      upper
        .replace(/^BINGO9\|/, '')
        .split('|')
        .forEach((entry) => {
          const [idxStr, ...rest] = entry.split(':');
          const idx = Number(idxStr) - 1;
          if (idx >= 0 && idx < 9) cells[idx] = rest.join(':').trim();
        });

      const correct = cells.map((val, i) => accepted[i].includes(val));
      const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ];
      const hasBingoLine = lines.some((line) => line.every((i) => correct[i]));
      return hasBingoLine
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Complete corretamente pelo menos uma linha, coluna ou diagonal de 3 casas.' };
    }

    case 22: {
      const expected = isHeaven
        ? 'ARVORE,SINO,NEVE,ESTRELA,LACO,VELA'
        : 'RENA,GORRO,CARTA,BISCOITO,LUVA,FLOCO';
      return upper === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Uma ou mais palavras embaralhadas estão incorretas.' };
    }

    case 23: {
      const expected = isHeaven
        ? 'LACO,SINO,DOCE,LIVRO'
        : 'CARTA,PRESENTE,ESTRELA,NEVE';
      return upper === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'A ordem das entregas (18h às 21h) não bate com as pistas.' };
    }

    case 24: {
      const expected = isHeaven ? '47N' : '48K';
      return upper === expected
        ? { ok: true, needsReview: false }
        : { ok: false, reason: 'Senha final incorreta. Confira as 3 etapas.' };
    }

    case 25: {
      const qPart = core.match(/\|quiz=([^|]+)/i)?.[1] || '';
      const gPart = core.match(/\|greeting=(.*)$/i)?.[1]?.trim() || '';
      const expectedQuiz = isHeaven
        ? '1:25 DIAS,2:BOSQUE DA HEAVEN,3:NOELVET'
        : '1:25 DIAS,2:CASTELO KINGDOM,3:NOELVET';
      const keyword = isHeaven ? 'HEAVEN' : 'KINGDOM';
      const ok =
        normalize(qPart) === expectedQuiz &&
        gPart.length >= 30 &&
        gPart.length <= 200 &&
        normalize(gPart).includes(keyword);
      return ok
        ? { ok: true, needsReview: true }
        : { ok: false, reason: `Acerte as 3 perguntas do quiz e escreva uma saudação (30–200 chars) com ${keyword}.` };
    }

    default:
      return { ok: false, reason: 'Atividade inválida.' };
  }
}

/* Cálculo exato de pontos */
export function calculateMissionScore(day, { errors = 0, submittedAt = Date.now(), openedAt = null } = {}) {
  const meta = MISSION_META[day] || { level: 'Fácil' };
  const basePoints = LEVEL_POINTS[meta.level] || 20;

  const doorOpenMs = new Date(`2026-12-${String(day).padStart(2, '0')}T00:00:00-03:00`).getTime();
  const effectiveOpenMs = submittedAt < doorOpenMs ? (openedAt || submittedAt) : doorOpenMs;
  const elapsedMs = Math.max(0, submittedAt - effectiveOpenMs);

  const daysLate = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const dateBonus = Math.max(1, 25 - daysLate);
  const speedBonus = elapsedMs <= 60 * 60 * 1000 ? 10 : 0;
  const firstTryBonus = errors === 0 ? 25 : 0;

  return {
    basePoints,
    dateBonus,
    speedBonus,
    firstTryBonus,
    totalEarned: basePoints + dateBonus + speedBonus + firstTryBonus,
  };
}

/* Persistência local para testes e sincronização imediata da UI */
const getStorageKey = (isHeaven) => `${STORAGE_PREFIX}:${isHeaven ? 'heaven' : 'kingdom'}`;

export function loadAdventState(isHeaven = false) {
  try {
    const raw = localStorage.getItem(getStorageKey(isHeaven));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    points: 0,
    missions: {},
    sessionOpenedAt: Date.now(),
  };
}

function persistAdventState(isHeaven, state) {
  try {
    localStorage.setItem(getStorageKey(isHeaven), JSON.stringify(state));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('advent:state-updated', { detail: { isHeaven } }));
    }
  } catch {
    /* ignore */
  }
}

export function submitAdventMission(day, payload, isHeaven = false) {
  const d = Number(day);
  const now = Date.now();
  const state = loadAdventState(isHeaven);
  const prev = state.missions[d] || { status: 'open', errors: 0, penaltyApplied: 0, lockedUntil: 0 };

  if (prev.status === 'done' || prev.status === 'pending') {
    return { ok: true, status: prev.status, alreadySubmitted: true, state };
  }

  if (prev.lockedUntil && now < prev.lockedUntil) {
    const mins = Math.ceil((prev.lockedUntil - now) / 60000);
    throw new Error(`Pausa de 30 min ativa após 5 erros neste desafio. Aguarde ${mins} min.`);
  }

  const validation = validateMissionAnswer(d, payload, isHeaven);

  if (!validation.ok) {
    const nextErrors = (prev.errors || 0) + 1;
    const penalty = nextErrors; // -1, -2, -3, -4, -5...
    const lockedUntil = nextErrors >= 5 ? now + 30 * 60 * 1000 : 0;

    state.points = Math.max(0, (state.points || 0) - penalty);
    state.missions[d] = {
      ...prev,
      status: 'open',
      errors: nextErrors,
      penaltyApplied: (prev.penaltyApplied || 0) + penalty,
      lockedUntil,
    };
    persistAdventState(isHeaven, state);

    const lockMsg = lockedUntil ? ' Pausa de 30 minutos ativada (5 erros).' : '';
    throw new Error(`${validation.reason} (-${penalty} pt${penalty > 1 ? 's' : ''}.${lockMsg})`);
  }

  const score = calculateMissionScore(d, {
    errors: prev.errors || 0,
    submittedAt: now,
    openedAt: state.sessionOpenedAt || now,
  });

  const ducksLink = extractDucksLink(payload);

  if (validation.needsReview) {
    state.missions[d] = {
      ...prev,
      status: 'pending',
      payload,
      ducksLink,
      reservedScore: score,
      submittedAt: now,
    };
    persistAdventState(isHeaven, state);
    return { ok: true, status: 'pending', score, state };
  }

  state.points = (state.points || 0) + score.totalEarned;
  state.missions[d] = {
    ...prev,
    status: 'done',
    payload,
    ducksLink,
    earnedPoints: score.totalEarned,
    scoreBreakdown: score,
    completedAt: now,
  };
  persistAdventState(isHeaven, state);
  return { ok: true, status: 'done', score, state };
}

export function approveAllPendingForTest(isHeaven = false) {
  const state = loadAdventState(isHeaven);
  let approvedCount = 0;

  Object.keys(state.missions).forEach((dayKey) => {
    const entry = state.missions[dayKey];
    if (entry?.status === 'pending') {
      const earned = entry.reservedScore?.totalEarned ?? 45;
      state.points = (state.points || 0) + earned;
      state.missions[dayKey] = {
        ...entry,
        status: 'done',
        earnedPoints: earned,
        completedAt: Date.now(),
      };
      approvedCount += 1;
    }
  });

  if (approvedCount > 0) persistAdventState(isHeaven, state);
  return approvedCount;
}

export function resetAdventTestState(isHeaven = false) {
  try {
    localStorage.removeItem(getStorageKey(isHeaven));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('advent:state-updated', { detail: { isHeaven } }));
    }
  } catch {
    /* ignore */
  }
}