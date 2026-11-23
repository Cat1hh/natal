/* VULPORA — protótipo integrado (Beta 1.0: The Kingdom & Heavem + Perfil Social + Evento de Natal + OAuth Google/Discord).
   ISOLADO: Modifica apenas a div #app, preservando o global.css e styles.css. */
(() => {
  'use strict';
  const KEY = 'vulpora-integrada-v1',
    $ = s => document.querySelector(s),
    $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const attr = esc,
    dateNow = () => new Date().toISOString(),
    uid = () => Math.random().toString(36).slice(2, 10),
    clone = v => JSON.parse(JSON.stringify(v));
  let authUser = null;
  let authLoaded = false;
  let pendingAvatarDataUrl = null;
  let adminSelectedDoor = 1;
  const color = v => /^#[0-9a-f]{6}$/i.test(String(v)) ? v : '#56348f';

  const STUDIO_FONT = {
    Georgia: 'Georgia,serif',
    Arial: 'Arial,system-ui,sans-serif',
    Trebuchet: '"Trebuchet MS",Arial,sans-serif',
    System: 'system-ui,sans-serif'
  };
  const studioSessions = new Map();

  function setScreenAttr(screen) {
    if (screen) document.documentElement.dataset.screen = screen;
    else delete document.documentElement.dataset.screen;
  }

  function motionPaused() {
    try { return localStorage.getItem('vulpora-motion-paused') === '1'; } catch { return false; }
  }

  function rgb(hex) {
    const c = color(hex).slice(1);
    return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
  }

  function luminance(hex) {
    const l = rgb(hex).map(v => {
      v /= 255;
      return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    });
    return .2126 * l[0] + .7152 * l[1] + .0722 * l[2];
  }

  function contrastRatio(a, b) {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  }

  function inkFor(bg) {
    return contrastRatio('#ffffff', bg) >= contrastRatio('#10121b', bg) ? '#ffffff' : '#10121b';
  }

  function cssTheme(t) {
    const p = color(t.primary), s = color(t.secondary), a = color(t.accent);
    return [
      `--ct:${p}`,
      `--cs:${s}`,
      `--ca:${a}`,
      `--ct-rgb:${rgb(p).join(',')}`,
      `--cs-rgb:${rgb(s).join(',')}`,
      `--ca-rgb:${rgb(a).join(',')}`,
      `--ci:${inkFor(p)}`,
      `--csi:${inkFor(s)}`,
      `--cai:${inkFor(a)}`,
      `--cf:${STUDIO_FONT[t.font] || STUDIO_FONT.Arial}`
    ].join(';');
  }

  function nearestAccent(accent, bg) {
    const base = rgb(accent),
      target = inkFor(bg) === '#ffffff' ? [255, 255, 255] : [0, 0, 0];
    for (let i = 0; i <= 100; i++) {
      let a = i / 100;
      let candidate = '#' + base.map((v, j) => Math.round(v * (1 - a) + target[j] * a).toString(16).padStart(2, '0')).join('');
      if (contrastRatio(candidate, bg) >= 4.6) return candidate;
    }
    return inkFor(bg);
  }

  function isTheKingdom(c) {
    if (!c) return false;
    const id = String(c.id || '').toLowerCase().trim();
    const slug = String(c.slug || '').toLowerCase().trim();
    const name = String(c.name || '').toLowerCase().trim();
    return (
      id === 'the-kingdom' ||
      id === 'thekingdom' ||
      id === 'kingdom' ||
      slug === 'the-kingdom' ||
      slug === 'thekingdom' ||
      slug === 'kingdom' ||
      name === 'the kingdom' ||
      name === 'kingdom'
    );
  }

  function isHeavem(c) {
    if (!c) return false;
    const id = String(c.id || '').toLowerCase().trim();
    const slug = String(c.slug || '').toLowerCase().trim();
    const name = String(c.name || '').toLowerCase().trim();
    return ['heavem', 'heaven', 'ducks'].includes(id) ||
      ['heavem', 'heaven', 'ducks'].includes(slug) || ['heavem', 'heaven'].includes(name);
  }

  function normalizeCommunityTheme(c) {
    if (!c) return c;
    if (isTheKingdom(c)) {
      c.theme = {
        ...(c.theme || {}),
        primary: '#09090b',
        secondary: '#18090c',
        accent: '#dc2626',
        symbol: c.theme?.symbol || '♛'
      };
      c.draft = null;
    }
    return c;
  }

  function studioFor(c) {
    if (!studioSessions.has(c.id)) studioSessions.set(c.id, {
      theme: clone(c.draft || c.theme),
      modules: clone(c.draftModules || c.modules || []),
      dirty: false,
      device: 'desktop'
    });
    return studioSessions.get(c.id);
  }

  function readStudioForm(form) {
    const c = getCommunity(form?.dataset.id);
    if (!c) return null;
    const session = studioFor(c),
      v = formData(form);
    session.theme = {
      ...session.theme,
      primary: color(v.primary),
      secondary: color(v.secondary),
      accent: color(v.accent),
      font: STUDIO_FONT[v.font] ? v.font : 'Arial',
      symbol: String(v.symbol || '').slice(0, 8),
      hero: String(v.hero || '').slice(0, 100),
      subtitle: String(v.subtitle || '').slice(0, 220)
    };
    session.dirty = true;
    return session;
  }

  const games = [
    ['Memória', 'Jogo da memória', '🃏', 'memoria'], ['Memória', 'Sequência luminosa', '💡', 'sequencia'],
    ['Memória', 'Encontre as diferenças', '🔎'], ['Memória', 'Observação relâmpago', '👁️'],
    ['Memória', 'Reproduza o padrão', '🧩'], ['Memória', 'Identifique a mudança', '🔄'],
    ['Reflexo', 'Clique no alvo', '🎯'], ['Reflexo', 'Teste de reação', '⚡', 'reacao'],
    ['Reflexo', 'Desvie dos obstáculos', '🚀'], ['Reflexo', 'Pegue os objetos', '💎'],
    ['Reflexo', 'Ritmo visual', '🎵'], ['Reflexo', 'Corrida de precisão', '🏁'],
    ['Lógica', 'Quebra-cabeça de imagem', '🧩'], ['Lógica', 'Labirinto', '🌀'],
    ['Lógica', 'Sudoku compacto', '🔢'], ['Lógica', 'Organize a sequência', '📐'],
    ['Lógica', 'Conecte os pontos', '🔗'], ['Lógica', 'Quebra-cabeça deslizante', '🔲'],
    ['Lógica', 'Ligue os circuitos', '🔌'], ['Palavras', 'Quiz de alternativas', '❓', 'quiz'],
    ['Palavras', 'Verdadeiro ou falso', '✔️'], ['Palavras', 'Forca', '🔤'],
    ['Palavras', 'Palavra embaralhada', '🔀', 'palavra'], ['Palavras', 'Adivinhe a imagem', '🖼️'],
    ['Palavras', 'Linha do tempo', '⌛'], ['Enigmas', 'Código secreto', '🔐'],
    ['Enigmas', 'Caça-palavras', '🔠'], ['Enigmas', 'Enigma com pistas', '🕯️'],
    ['Enigmas', 'Caminho de escolhas', '🧭'], ['Enigmas', 'Caça ao tesouro', '🗺️'],
    ['Enigmas', 'Palavras cruzadas', '📝']
  ];
  const gameDemoTypes = ['memoria', 'sequencia', 'reacao', 'quiz', 'palavra'];

  /* =========================================================
     CONFIGURAÇÃO E REGRAS DO EVENTO DE NATAL (25 FASES + ÁRVORE)
     ========================================================= */
  const NATAL_YEAR = 2026;
  const NATAL_MONTH = 12; // Dezembro
  const NATAL_TOTAL_DOORS = 25;
  const NATAL_PRE_EVENT_TABS = ['inicio', 'arvore'];

  const DEFAULT_NATAL_DOORS = Array.from({ length: NATAL_TOTAL_DOORS }, (_, idx) => {
    const day = idx + 1;
    const gameCycle = ['memoria', 'quiz', 'reacao', 'palavra', 'sequencia'];
    const gameNames = {
      memoria: 'Jogo da memória',
      quiz: 'Quiz de alternativas',
      reacao: 'Teste de reação',
      palavra: 'Palavra embaralhada',
      sequencia: 'Sequência luminosa'
    };
    const isSpecial = day === 1 || day === 12 || day === 24 || day === 25;
    const demoKey = gameCycle[idx % gameCycle.length];
    return {
      day,
      title: day === 1
        ? 'Portal de Abertura do Advento'
        : day === 24
          ? 'Véspera Estelar do Reino'
          : day === 25
            ? 'Grande Celebração de Natal'
            : `Fase ${String(day).padStart(2, '0')} · Desafio de Inverno`,
      description: isSpecial
        ? 'Fase especial do Calendário do Advento com recompensa bônus para os guardiões do reino.'
        : `Complete o desafio do dia ${String(day).padStart(2, '0')}/12 para somar pontos e avançar no Advento.`,
      gameType: demoKey,
      gameLabel: gameNames[demoKey],
      points: isSpecial ? 100 : 50,
      requiresApproval: day % 5 === 0
    };
  });

  const DEFAULT_NATAL_SYSTEM = {
    scheduleMode: 'auto', // 'auto' | 'locked' | 'manual' | 'test_all'
    manualDay: 0,
    doors: clone(DEFAULT_NATAL_DOORS),
    treeOrnaments: [
      {
        id: 'orn-1',
        authorName: 'Luna',
        authorHandle: 'luna',
        community: 'The Kingdom',
        icon: '⭐',
        message: 'Que a luz deste Natal guie todos os aventureiros do reino!',
        status: 'aprovada',
        createdAt: '2026-11-20T18:00:00.000Z'
      },
      {
        id: 'orn-2',
        authorName: 'Raven',
        authorHandle: 'raven',
        community: 'The Kingdom',
        icon: '❄️',
        message: 'Deixando meu cristal de neve na árvore antes da abertura das portas!',
        status: 'aprovada',
        createdAt: '2026-11-21T14:30:00.000Z'
      }
    ],
    submissions: [],
    participants: [
      { handle: 'luna', name: 'Luna', community: 'The Kingdom', points: 250, completedDoors: [], approvedCount: 2, banned: false },
      { handle: 'raven', name: 'Raven', community: 'The Kingdom', points: 200, completedDoors: [], approvedCount: 1, banned: false },
      { handle: 'noah', name: 'Noah', community: 'The Kingdom', points: 150, completedDoors: [], approvedCount: 1, banned: false }
    ]
  };

  function getBrasiliaDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map(p => [p.type, Number(p.value)]));
    return { year: map.year, month: map.month, day: map.day };
  }

  function isEventAdmin(c = null) {
    if (!authUser) return false;
    if (authUser.role === 'ADM' || authUser.role === 'ADMIN' || authUser.role === 'STAFF' || authUser.isAdmin) return true;
    if (c && canManageCommunity(c.id)) return true;
    return false;
  }

  function resolveNatalSchedule() {
    const cfg = state.natalSystem || DEFAULT_NATAL_SYSTEM;
    const mode = cfg.scheduleMode || 'auto';

    if (mode === 'locked') {
      return { isPreEvent: true, maxUnlockedDay: 0, mode: 'locked', label: 'Pré-evento travado (Só Início e Árvore)' };
    }
    if (mode === 'test_all') {
      return { isPreEvent: false, maxUnlockedDay: NATAL_TOTAL_DOORS, mode: 'test_all', label: 'Modo Teste (25 fases liberadas)' };
    }
    if (mode === 'manual') {
      const day = Math.max(0, Math.min(NATAL_TOTAL_DOORS, Number(cfg.manualDay) || 0));
      return {
        isPreEvent: day === 0,
        maxUnlockedDay: day,
        mode: 'manual',
        label: day === 0 ? 'Simulação: Pré-evento (0/25)' : `Simulação: Liberado até Dia ${day}/25`
      };
    }

    const br = getBrasiliaDateParts();
    if (br.year < NATAL_YEAR || (br.year === NATAL_YEAR && br.month < NATAL_MONTH)) {
      return { isPreEvent: true, maxUnlockedDay: 0, mode: 'auto', label: 'Pré-evento · Fases bloqueadas até 01/12' };
    }
    if (br.year > NATAL_YEAR) {
      return { isPreEvent: false, maxUnlockedDay: NATAL_TOTAL_DOORS, mode: 'auto', label: 'Todas as 25 fases liberadas' };
    }

    const maxUnlockedDay = Math.min(NATAL_TOTAL_DOORS, Math.max(0, br.day));
    return {
      isPreEvent: false,
      maxUnlockedDay,
      mode: 'auto',
      label: `Advento Ativo · Liberado até ${String(maxUnlockedDay).padStart(2, '0')}/12`
    };
  }

  function canAccessNatalTab(tab, c = null) {
    if (isEventAdmin(c)) return true;
    const schedule = resolveNatalSchedule();
    if (schedule.isPreEvent) return NATAL_PRE_EVENT_TABS.includes(tab);
    return tab !== 'admin';
  }

  function isNatalDoorUnlocked(day, c = null) {
    if (isEventAdmin(c)) return true;
    const schedule = resolveNatalSchedule();
    return !schedule.isPreEvent && day >= 1 && day <= schedule.maxUnlockedDay;
  }

  function getOrCreateNatalParticipant() {
    if (!authUser) return null;
    const handle = sanitizeHandle(state.user.handle || authUser.name, 'viajante');
    let p = state.natalSystem.participants.find(x => x.handle === handle);
    if (!p) {
      p = {
        handle,
        name: state.user.name || authUser.name || 'Viajante',
        community: 'The Kingdom',
        points: 0,
        completedDoors: [],
        approvedCount: 0,
        banned: false
      };
      state.natalSystem.participants.push(p);
    } else {
      p.name = state.user.name || p.name;
    }
    return p;
  }

  const DEFAULT_MEMBERS = [
    { handle: 'luna', name: 'Luna', role: 'Organizadora', bio: 'Guardiã das estrelas e criadora de eventos sazonais.', avatarUrl: '', accentColor: '#ec4899', cover: '#3b0764', surfaceColor: '#190b28', followers: 214, communities: ['the-kingdom', 'heavem'] },
    { handle: 'raven', name: 'Raven', role: 'Explorador', bio: 'Colecionador de insígnias raras e desafios noturnos.', avatarUrl: '', accentColor: '#ef4444', cover: '#27090d', surfaceColor: '#160a0d', followers: 163, communities: ['the-kingdom'] },
    { handle: 'noah', name: 'Noah', role: 'Arquiteto', bio: 'Construindo histórias e mundos colaborativos.', avatarUrl: '', accentColor: '#06b6d4', cover: '#082f49', surfaceColor: '#0b1929', followers: 119, communities: ['the-kingdom', 'heavem'] },
    { handle: 'mika', name: 'Mika', role: 'Artista', bio: 'Ilustrando personagens, emblemas e cenários mágicos.', avatarUrl: '', accentColor: '#f59e0b', cover: '#451a03', surfaceColor: '#1c1108', followers: 142, communities: ['heavem'] }
  ];

  const DEFAULT_COMMUNITIES = [
    {
      id: 'the-kingdom',
      name: 'The Kingdom',
      description: 'Um reino de encontros, conquistas e histórias compartilhadas.',
      owner: 'VULPORA',
      status: 'ativa',
      visibility: 'publica',
      entry: 'livre',
      members: 128,
      theme: {
        primary: '#09090b',
        secondary: '#18090c',
        accent: '#dc2626',
        font: 'Georgia',
        hero: 'O reino espera por você',
        subtitle: 'Onde cada membro faz parte de uma grande história.',
        symbol: '♛',
        cover: ''
      },
      draft: null,
      modules: ['Mensagem de boas-vindas', 'Próximos eventos', 'Mural do reino'],
      team: [{ name: 'Luna', role: 'Organizadora' }]
    },
    {
      id: 'heavem',
      name: 'Heavem',
      description: 'Um santuário etéreo para imaginar, compartilhar e explorar novas experiências.',
      owner: 'VULPORA',
      status: 'ativa',
      visibility: 'publica',
      entry: 'livre',
      members: 84,
      theme: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#38bdf8',
        font: 'Arial',
        hero: 'Bem-vindo a Heavem',
        subtitle: 'Um universo celestial que brilha com suas próprias histórias.',
        symbol: '✧',
        cover: ''
      },
      draft: null,
      modules: ['Boas-vindas', 'Eventos em destaque', 'Mural celestial'],
      team: [{ name: 'Luna', role: 'Organizadora' }]
    }
  ];

  const START = {
    user: {
      name: 'Visitante',
      handle: 'viajante',
      bio: 'Explorando mundos e experiências interativas.',
      discord: '',
      ducks: '',
      kyodo: '',
      avatarUrl: '',
      cover: '#36194e',
      accentColor: '#a855f7',
      surfaceColor: '#160d29',
      followers: ['luna', 'raven'],
      following: ['luna']
    },
    communities: clone(DEFAULT_COMMUNITIES),
    events: [{
      id: 'natal-2026', communityId: 'the-kingdom', name: 'Natal do Reino 2026', description: 'Um Natal especial com Árvore Comunitária e 25 fases liberadas dia a dia no Calendário do Advento.', status: 'publicado', type: 'temporario', date: '2026-12-01T00:00', symbol: '❄️', games: ['Jogo da memória', 'Quiz de alternativas'], prizes: ['Emblema do Advento', 'Título Guardião do Natal', 'Lembrança Oficial (3+ fases aprovadas)']
    }, {
      id: 'coroa', communityId: 'the-kingdom', name: 'Torneio da Coroa', description: 'Desafios de velocidade e lógica para os aventureiros do reino.', status: 'rascunho', type: 'temporario', date: '2026-12-10T18:00', symbol: '♜', games: ['Teste de reação'], prizes: []
    }, {
      id: 'heavem-festival', communityId: 'heavem', name: 'Festival Celestial', description: 'Experiências criativas e encontros sob o céu de Heavem.', status: 'publicado', type: 'temporario', date: '2026-12-07T19:00', symbol: '🌟', games: ['Quiz de alternativas'], prizes: ['Emblema Estelar']
    }],
    activities: [
      { id: 'at1', eventId: 'natal-2026', title: 'Abertura do Advento · Dia 01', type: 'Desafio', release: '2026-12-01T00:00', timezone: 'America/Sao_Paulo' },
      { id: 'at2', eventId: 'natal-2026', title: 'Memória natalina · Dia 05', type: 'Jogo', game: 'Jogo da memória', release: '2026-12-05T00:00', timezone: 'America/Sao_Paulo' },
      { id: 'at3', eventId: 'natal-2026', title: 'Caça aos presentes · Dia 10', type: 'Desafio', release: '2026-12-10T00:00', timezone: 'America/Sao_Paulo' }
    ],
    requests: [], audit: [], messages: [], scores: [], featureFlags: {},
    directoryUsers: clone(DEFAULT_MEMBERS),
    visitedCommunities: [],
    natalSystem: clone(DEFAULT_NATAL_SYSTEM)
  };

  let state;
  try {
    state = JSON.parse(localStorage.getItem(KEY)) || clone(START);
    if (!Array.isArray(state.communities)) throw Error('Invalid');
    state.user = { ...clone(START.user), ...(state.user || {}) };
    if (!Array.isArray(state.user.followers)) state.user.followers = ['luna', 'raven'];
    if (!Array.isArray(state.user.following)) state.user.following = ['luna'];
    if (!Array.isArray(state.directoryUsers)) state.directoryUsers = clone(DEFAULT_MEMBERS);
    if (!Array.isArray(state.visitedCommunities)) state.visitedCommunities = [];
    if (!state.natalSystem || !Array.isArray(state.natalSystem.doors)) {
      state.natalSystem = clone(DEFAULT_NATAL_SYSTEM);
    } else {
      state.natalSystem = {
        ...clone(DEFAULT_NATAL_SYSTEM),
        ...state.natalSystem,
        doors: state.natalSystem.doors.length === 25 ? state.natalSystem.doors : clone(DEFAULT_NATAL_DOORS)
      };
    }

    state.communities = state.communities.filter(c => !['aurora'].includes(c.id));
    for (const def of DEFAULT_COMMUNITIES) {
      if (!state.communities.some(c => c.id === def.id || (def.id === 'the-kingdom' && isTheKingdom(c)) || (def.id === 'heavem' && isHeavem(c)))) {
        state.communities.push(clone(def));
      }
    }
    state.directoryUsers.forEach(m => {
      if (Array.isArray(m.communities)) {
        m.communities = m.communities.map(cid => cid === 'aurora' ? 'heavem' : cid);
      }
    });
    state.events.forEach(ev => {
      if (ev.communityId === 'aurora') ev.communityId = 'heavem';
    });
    state.communities.forEach(normalizeCommunityTheme);
  } catch { state = clone(START); }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('Armazenamento local cheio. Use imagens menores.'); }
  }

  function sanitizeHandle(raw, fallback = 'viajante') {
    const clean = String(raw || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]+/g, '')
      .slice(0, 30);
    return clean || fallback;
  }

  function syncAuthToUser() {
    if (!authUser) return;
    const remoteAvatar = authUser.avatarUrl || authUser.avatar;
    if (authUser.name && (state.user.name === 'Visitante' || !state.user.customizedName)) {
      state.user.name = authUser.name;
    }
    if (remoteAvatar && !state.user.avatarUrl) {
      state.user.avatarUrl = remoteAvatar;
    }
    if ((!state.user.handle || state.user.handle === 'viajante') && authUser.name) {
      state.user.handle = sanitizeHandle(authUser.name, 'viajante');
    }
    if (authUser.provider === 'discord' && authUser.name && !state.user.discord) {
      state.user.discord = authUser.name;
    }
    if (state.user.avatarUrl) authUser.avatarUrl = state.user.avatarUrl;
    if (state.user.name) authUser.name = state.user.name;
  }

  function upsertSelfInDirectory(communityId = null) {
    if (!authUser) return null;
    const u = state.user;
    const handle = sanitizeHandle(u.handle, 'viajante');
    u.handle = handle;
    let entry = state.directoryUsers.find(x => x.isSelf || x.handle === handle);
    if (!entry) {
      entry = {
        handle,
        name: u.name,
        role: authUser.role === 'ADM' ? 'Administrador' : 'Membro',
        bio: u.bio,
        avatarUrl: u.avatarUrl || '',
        accentColor: color(u.accentColor || '#a855f7'),
        cover: color(u.cover || '#36194e'),
        surfaceColor: color(u.surfaceColor || '#160d29'),
        followers: u.followers.length,
        communities: [],
        isSelf: true
      };
      state.directoryUsers.unshift(entry);
    } else {
      entry.handle = handle;
      entry.name = u.name;
      entry.bio = u.bio;
      entry.avatarUrl = u.avatarUrl || '';
      entry.accentColor = color(u.accentColor || '#a855f7');
      entry.cover = color(u.cover || '#36194e');
      entry.surfaceColor = color(u.surfaceColor || '#160d29');
      entry.followers = u.followers.length;
      entry.isSelf = true;
    }
    if (communityId && !entry.communities.includes(communityId)) {
      entry.communities.push(communityId);
    }
    return entry;
  }

  function ensureUserInCommunity(c) {
    if (!authUser || !c) return;
    upsertSelfInDirectory(c.id);
    if (!state.visitedCommunities.includes(c.id)) {
      state.visitedCommunities.push(c.id);
      c.members = (c.members || 0) + 1;
      const commMembers = state.directoryUsers.filter(m => !m.isSelf && m.communities.includes(c.id));
      const newFollower = commMembers.find(m => !state.user.followers.includes(m.handle));
      if (newFollower) {
        state.user.followers.push(newFollower.handle);
        upsertSelfInDirectory(c.id);
        setTimeout(() => {
          toast(`${newFollower.name} (@${newFollower.handle}) começou a seguir você em ${c.name}!`);
        }, 700);
      }
      persist();
    }
  }

  function isFollowing(handle) {
    return Array.isArray(state.user.following) && state.user.following.includes(handle);
  }

  function toggleFollow(handle) {
    if (!authUser) {
      toast('Entre na sua conta para seguir membros.');
      location.hash = '#/login';
      return;
    }
    const target = state.directoryUsers.find(m => m.handle === handle);
    if (!target || target.isSelf || handle === state.user.handle) return;
    if (isFollowing(handle)) {
      state.user.following = state.user.following.filter(h => h !== handle);
      target.followers = Math.max(0, (target.followers || 1) - 1);
      toast(`Você deixou de seguir ${target.name}.`);
    } else {
      state.user.following.push(handle);
      target.followers = (target.followers || 0) + 1;
      toast(`Você agora segue ${target.name}!`);
    }
    persist();
    route();
  }

  const getCommunity = id => normalizeCommunityTheme(
      state.communities.find(x =>
        x.id === id ||
        (isTheKingdom(x) && ['the-kingdom', 'kingdom', 'thekingdom'].includes(id)) ||
        (isHeavem(x) && ['heavem', 'heaven', 'ducks'].includes(id))
      )
    ),
    getEvent = id => state.events.find(x => x.id === id),
    activeEvent = ev => ev?.status === 'publicado' || ev?.status === 'em andamento';
  const commLink = (id, tab = 'inicio') => `#/comunidade/${encodeURIComponent(id)}/${tab}`,
    manageLink = (id, tab = 'visao') => `#/gerenciar/${encodeURIComponent(id)}/${tab}`,
    eventLink = (id, tab = 'inicio') => `#/evento/${encodeURIComponent(id)}/${tab}`,
    userLink = handle => `#/usuario/${encodeURIComponent(handle)}`,
    portalLink = page => `#/portal/${page}`;

  const fmtDate = iso => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso.includes('Z') ? iso : iso + '-03:00'));
    } catch { return esc(iso); }
  };

  const activityReady = a => new Date() >= new Date((a.release || '2099-01-01T00:00') + '-03:00');
  const statusTag = s => `<span class="tag ${['ativa', 'publicado', 'aprovada', 'liberada', 'concluida'].includes(s) ? 'green' : ['recusada', 'suspensa', 'bloqueada'].includes(s) ? 'red' : 'gold'}">${esc(s)}</span>`;
  const iconButton = (action, label, extra = '') => `<button class="btn btn-outline btn-sm" data-action="${action}" ${extra}>${label}</button>`;

  function toast(msg) {
    const node = $('#toast');
    if (!node) return;
    node.innerHTML = `✦ ${esc(msg)}`;
    node.classList.add('show');
    clearTimeout(window.__toast);
    window.__toast = setTimeout(() => node.classList.remove('show'), 3400);
  }

  function isProtectedRoute(root) { return root === 'perfil' || root === 'gerenciar' || root === 'admin'; }
  function canManageCommunity(id) {
    const community = getCommunity(id);
    return authUser?.role === 'ADM' || authUser?.role === 'ADMIN' || (authUser?.role === 'STAFF' && community?.ownerId === authUser.id);
  }

  function guardRoute(root, id) {
    if (!isProtectedRoute(root)) return true;
    if (!authLoaded) return false;
    if (!authUser) {
      location.hash = '#/login';
      return false;
    }
    if (root === 'perfil') return true;
    if (root === 'gerenciar') {
      if (canManageCommunity(id)) return true;
      toast('Apenas organizadores e administradores podem gerenciar este universo.');
      location.hash = commLink(id || 'the-kingdom', 'inicio');
      return false;
    }
    if (root === 'admin') {
      if (authUser?.role === 'ADM' || authUser?.role === 'ADMIN' || authUser?.role === 'STAFF') return true;
      toast('Acesso restrito à administração VULPORA.');
      location.hash = '#/perfil';
      return false;
    }
    return true;
  }

  function audit(message) {
    state.audit.unshift({ id: uid(), message, actor: authUser?.name || 'Sistema', date: dateNow() });
    persist();
  }

  function logo() {
    return '<img src="/assets/logo-vulpora.png" alt="Ícone oficial da VULPORA" style="filter: drop-shadow(0 0 12px rgba(206, 109, 255, 0.6));">';
  }

  function crumbs(items) {
    return `<div class="crumb">${items.map((i, j) => j ? ` / ${i[1] ? `<a href="${i[1]}">${esc(i[0])}</a>` : esc(i[0])}` : `<a href="${i[1]}">${esc(i[0])}</a>`).join('')}</div>`;
  }

  function portalStyles() {
    return `<style id="vulpora-portal-polish">
      .topbar {
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        background: rgba(11, 7, 22, 0.78);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .navlinks a {
        position: relative;
        transition: color 0.2s ease, background 0.2s ease;
      }
      .navlinks a.active::after {
        content: "";
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 4px;
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, #c084fc, #f4a51d);
        box-shadow: 0 0 10px rgba(206, 109, 255, 0.75);
      }
      .hero-redesign { position: relative; overflow: hidden; }
      .hero-redesign .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(168, 85, 247, 0.14);
        border: 1px solid rgba(216, 180, 254, 0.26);
        box-shadow: 0 0 24px rgba(168, 85, 247, 0.18);
      }
      .stats-glass {
        background: linear-gradient(135deg, rgba(24, 14, 44, 0.82), rgba(14, 9, 28, 0.88));
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 50px rgba(4, 2, 12, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(16px);
      }
      .stats-glass .stat-card { transition: transform 0.25s ease; }
      .stats-glass .stat-card:hover { transform: translateY(-2px); }
      .stats-glass .stat-number {
        background: linear-gradient(135deg, #ffffff 10%, #e9d5ff 55%, #fcd34d 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .card-feature {
        position: relative;
        overflow: hidden;
        background: linear-gradient(160deg, rgba(26, 16, 46, 0.72), rgba(13, 8, 25, 0.85));
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
      }
      .card-feature::before {
        content: "";
        position: absolute;
        top: 0;
        left: 20%;
        right: 20%;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(206, 109, 255, 0.85), rgba(244, 165, 29, 0.8), transparent);
        opacity: 0;
        transition: opacity 0.28s ease;
      }
      .card-feature:hover {
        transform: translateY(-5px);
        border-color: rgba(206, 109, 255, 0.34);
        box-shadow: 0 22px 45px rgba(8, 4, 20, 0.65), 0 0 28px rgba(168, 85, 247, 0.14);
      }
      .card-feature:hover::before { opacity: 1; }
      .feature-icon-wrapper {
        box-shadow: 0 0 24px rgba(168, 85, 247, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      }
      .vp-steps-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
        gap: 18px;
      }
      .vp-step-card {
        position: relative;
        padding: 24px;
        border-radius: 18px;
        background: rgba(19, 11, 34, 0.66);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: border-color 0.25s ease, transform 0.25s ease;
      }
      .vp-step-card:hover {
        transform: translateY(-3px);
        border-color: rgba(244, 165, 29, 0.35);
      }
      .vp-step-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #fcd34d;
        background: rgba(244, 165, 29, 0.12);
        border: 1px solid rgba(244, 165, 29, 0.3);
        margin-bottom: 14px;
      }
      .community-directory-card {
        background: linear-gradient(170deg, rgba(22, 13, 39, 0.85), rgba(12, 7, 22, 0.94));
        border: 1px solid rgba(255, 255, 255, 0.09);
        transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
      }
      .community-directory-card:hover {
        transform: translateY(-5px);
        border-color: rgba(255, 255, 255, 0.22);
        box-shadow: 0 24px 48px rgba(4, 2, 12, 0.7);
      }
      .cta-redesign {
        background:
          radial-gradient(circle at 18% 20%, rgba(168, 85, 247, 0.24), transparent 52%),
          radial-gradient(circle at 82% 80%, rgba(244, 165, 29, 0.16), transparent 52%),
          rgba(18, 10, 34, 0.86);
        border: 1px solid rgba(216, 180, 254, 0.22);
        box-shadow: 0 24px 60px rgba(5, 2, 15, 0.65);
      }
    </style>`;
  }

  function eventStyles() {
    return `<style id="vulpora-event-styles">
      .natal-shell {
        min-height: 100vh;
        background:
          radial-gradient(circle at 15% 8%, rgba(168, 30, 35, 0.28), transparent 44%),
          radial-gradient(circle at 85% 16%, rgba(244, 165, 29, 0.14), transparent 46%),
          #14080c;
        color: #f1e4d4;
      }
      .natal-layout {
        display: grid;
        grid-template-columns: 270px minmax(0, 1fr);
        gap: 24px;
        width: min(1240px, 100% - 32px);
        margin: 0 auto;
        padding: 20px 0 64px;
        align-items: start;
      }
      .natal-sidebar {
        position: sticky;
        top: 18px;
        padding: 22px 18px;
        border-radius: 22px;
        background: linear-gradient(180deg, #3b0b12 0%, #24060b 55%, #160407 100%);
        border: 1px solid rgba(244, 165, 29, 0.34);
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(244, 165, 29, 0.22);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .natal-side-head {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .natal-side-emblem {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        font-size: 22px;
        background: radial-gradient(circle, rgba(244, 165, 29, 0.26), rgba(168, 30, 35, 0.7));
        border: 1px solid rgba(244, 165, 29, 0.55);
      }
      .natal-side-nav {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .natal-side-nav a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 11px 14px;
        border-radius: 13px;
        font-size: 13.5px;
        font-weight: 700;
        color: #e6d5c5;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }
      .natal-side-nav a:hover {
        background: rgba(168, 30, 35, 0.35);
        color: #f1e4d4;
      }
      .natal-side-nav a.active {
        background: linear-gradient(135deg, rgba(185, 32, 38, 0.88), rgba(122, 18, 23, 0.7));
        border-color: rgba(244, 165, 29, 0.7);
        color: #ffffff;
        box-shadow: 0 6px 18px rgba(168, 30, 35, 0.4);
      }
      .natal-side-nav a.is-locked {
        opacity: 0.46;
        cursor: not-allowed;
      }
      .natal-side-nav a.is-locked:hover {
        background: transparent;
        color: #cbb8a6;
      }
      .natal-progress-box {
        padding: 14px;
        border-radius: 15px;
        background: rgba(168, 30, 35, 0.28);
        border: 1px solid rgba(244, 165, 29, 0.32);
      }
      .natal-progress-bar {
        height: 8px;
        border-radius: 999px;
        background: rgba(18, 4, 7, 0.65);
        overflow: hidden;
        margin-top: 8px;
      }
      .natal-progress-bar > span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #dc2626, #f4a51d);
        border-radius: 999px;
      }
      .natal-hero {
        position: relative;
        padding: 36px 32px;
        border-radius: 24px;
        background:
          radial-gradient(circle at 86% 20%, rgba(244, 165, 29, 0.22), transparent 50%),
          linear-gradient(135deg, #2d0911 0%, #16060a 100%);
        border: 1px solid rgba(244, 165, 29, 0.35);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        margin-bottom: 24px;
      }
      .natal-card {
        padding: 24px;
        border-radius: 20px;
        background: rgba(28, 12, 18, 0.9);
        border: 1px solid rgba(244, 165, 29, 0.24);
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
      }
      .natal-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 11px 20px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }
      .natal-btn-gold {
        background: linear-gradient(135deg, #f4a51d, #d97706);
        color: #1a070b;
        box-shadow: 0 8px 22px rgba(244, 165, 29, 0.32);
      }
      .natal-btn-gold:hover { transform: translateY(-2px); filter: brightness(1.06); }
      .natal-btn-red {
        background: linear-gradient(135deg, #b91c1c, #7f1d1d);
        color: #fff;
        border-color: rgba(244, 165, 29, 0.45);
      }
      .natal-btn-red:hover { transform: translateY(-2px); border-color: #f4a51d; }
      .natal-btn-outline {
        background: rgba(255, 255, 255, 0.05);
        color: #f1e4d4;
        border-color: rgba(244, 165, 29, 0.32);
      }
      .natal-btn-outline:hover { background: rgba(244, 165, 29, 0.14); border-color: #f4a51d; }
      .natal-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 11px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        background: rgba(244, 165, 29, 0.14);
        border: 1px solid rgba(244, 165, 29, 0.35);
        color: #f4a51d;
      }
      .natal-tag.is-green {
        background: rgba(34, 197, 94, 0.16);
        border-color: rgba(34, 197, 94, 0.4);
        color: #86efac;
      }
      .natal-tag.is-red {
        background: rgba(239, 68, 68, 0.16);
        border-color: rgba(239, 68, 68, 0.4);
        color: #fca5a5;
      }
      .advent-doors-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px;
      }
      .door-tile {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        padding: 16px 14px;
        border-radius: 16px;
        text-align: left;
        cursor: pointer;
        background: linear-gradient(155deg, rgba(62, 14, 22, 0.92), rgba(26, 9, 14, 0.96));
        border: 1px solid rgba(244, 165, 29, 0.42);
        color: #f1e4d4;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .door-tile:hover {
        transform: translateY(-3px);
        border-color: #f4a51d;
        box-shadow: 0 12px 26px rgba(0, 0, 0, 0.45);
      }
      .door-tile.is-locked {
        opacity: 0.48;
        cursor: not-allowed;
        background: rgba(16, 6, 9, 0.72);
        border: 1px dashed rgba(244, 165, 29, 0.22);
      }
      .door-tile.is-locked:hover {
        transform: none;
        border-color: rgba(244, 165, 29, 0.22);
        box-shadow: none;
      }
      .door-tile.is-done {
        background: linear-gradient(155deg, rgba(20, 62, 42, 0.85), rgba(14, 28, 22, 0.95));
        border-color: rgba(74, 222, 128, 0.55);
      }
      .tree-stage {
        position: relative;
        padding: 28px 20px;
        border-radius: 22px;
        text-align: center;
        background:
          radial-gradient(circle at 50% 25%, rgba(244, 165, 29, 0.22), transparent 55%),
          radial-gradient(circle at 50% 65%, rgba(22, 101, 52, 0.28), transparent 65%),
          rgba(20, 8, 12, 0.92);
        border: 1px solid rgba(244, 165, 29, 0.34);
      }
      .tree-visual {
        font-size: 92px;
        line-height: 1;
        filter: drop-shadow(0 0 24px rgba(244, 165, 29, 0.55));
        margin-bottom: 10px;
      }
      .ornament-chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin-top: 18px;
      }
      .ornament-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(168, 30, 35, 0.35);
        border: 1px solid rgba(244, 165, 29, 0.42);
        font-size: 12.5px;
      }
      @media (max-width: 920px) {
        .natal-layout { grid-template-columns: 1fr; }
        .natal-sidebar { position: static; }
        .advent-doors-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    </style>`;
  }

  function profileThemeStyles(u) {
    const accent = color(u.accentColor || '#a855f7');
    const cover = color(u.cover || '#36194e');
    const surface = color(u.surfaceColor || '#160d29');
    const accentRgb = rgb(accent).join(',');
    const coverRgb = rgb(cover).join(',');
    const surfaceRgb = rgb(surface).join(',');
    const accentInk = inkFor(accent);

    return `<style id="vulpora-profile-theme">
      .vulpora-responsive-layout, .public-profile-shell {
        --vp-accent: ${accent};
        --vp-accent-rgb: ${accentRgb};
        --vp-accent-ink: ${accentInk};
        --vp-cover: ${cover};
        --vp-cover-rgb: ${coverRgb};
        --vp-surface: ${surface};
        --vp-surface-rgb: ${surfaceRgb};
      }
      .vulpora-responsive-layout .banner-wave-bg,
      .public-profile-shell .banner-wave-bg {
        background:
          radial-gradient(circle at 22% 30%, rgba(var(--vp-accent-rgb), 0.55), transparent 56%),
          radial-gradient(circle at 82% 70%, rgba(var(--vp-cover-rgb), 0.9), transparent 60%),
          linear-gradient(135deg, var(--vp-cover), #0b0614 85%) !important;
      }
      .vulpora-responsive-layout .profile-glass-container,
      .public-profile-shell .profile-glass-container {
        background: rgba(var(--vp-surface-rgb), 0.78) !important;
        border-color: rgba(var(--vp-accent-rgb), 0.28) !important;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 36px rgba(var(--vp-accent-rgb), 0.14) !important;
      }
      .vulpora-responsive-layout .avatar-glass-wrapper,
      .public-profile-shell .avatar-glass-wrapper {
        border-color: var(--vp-accent) !important;
        box-shadow: 0 0 28px rgba(var(--vp-accent-rgb), 0.45) !important;
      }
      .vulpora-responsive-layout .avatar-edit-badge,
      .vulpora-responsive-layout .btn-primary-glow,
      .public-profile-shell .btn-primary-glow {
        background: var(--vp-accent) !important;
        color: var(--vp-accent-ink) !important;
        border-color: transparent !important;
        box-shadow: 0 8px 24px rgba(var(--vp-accent-rgb), 0.42) !important;
      }
      .vulpora-responsive-layout .tab-item.active,
      .public-profile-shell .tab-item.active {
        color: #ffffff !important;
        border-bottom-color: var(--vp-accent) !important;
        text-shadow: 0 0 14px rgba(var(--vp-accent-rgb), 0.65);
      }
      .vulpora-responsive-layout .stat-item strong,
      .public-profile-shell .stat-item strong,
      .vulpora-responsive-layout .handle-text,
      .public-profile-shell .handle-text {
        color: var(--vp-accent) !important;
      }
      .vulpora-responsive-layout .glass-card,
      .public-profile-shell .glass-card {
        background: rgba(var(--vp-surface-rgb), 0.68) !important;
        border-color: rgba(var(--vp-accent-rgb), 0.2) !important;
      }
      .vulpora-responsive-layout .side-nav-item.active,
      .vulpora-responsive-layout .b-nav-item.active {
        color: var(--vp-accent) !important;
        border-color: rgba(var(--vp-accent-rgb), 0.35) !important;
      }
      .avatar-upload-box {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        padding: 14px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(var(--vp-accent-rgb), 0.45);
      }
      .avatar-upload-preview {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid var(--vp-accent);
        display: flex;
        align-items: center;
        justify-content: center;
        background: #140926;
        font-size: 26px;
        font-weight: 800;
        color: #fff;
        flex-shrink: 0;
      }
      .avatar-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
      .profile-color-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .profile-preset-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.05);
        color: #f3f4f6;
        font-size: 12px;
        cursor: pointer;
      }
      .profile-preset-btn span {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }
      .profile-color-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
      }
      .profile-color-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .profile-color-item input[type="color"] {
        width: 36px;
        height: 30px;
        border: none;
        background: transparent;
        cursor: pointer;
      }
    </style>`;
  }

  function portalHeader(active) {
    const tabs = [['inicio', 'Início'], ['comunidades', 'Comunidades'], ['contato', 'Contato']];
    const displayAvatar = authUser ? (state.user.avatarUrl || authUser.avatarUrl) : '';
    const displayName = authUser ? (state.user.name || authUser.name) : '';
    const account = authUser
      ? `<a class="profile-link" href="#/perfil">${displayAvatar ? `<img src="${attr(displayAvatar)}" alt="" class="profile-avatar">` : `<span class="profile-avatar profile-initial">${esc(displayName?.[0]?.toUpperCase() || 'U')}</span>`}${esc(displayName)}</a>`
      : '<a class="top-link" href="#/login">Entrar</a><a class="btn btn-primary btn-sm" href="#/cadastro">Criar conta</a>';
    return `<header class="topbar"><div class="topbar-inner"><a class="brand" href="${portalLink('inicio')}">${logo()}<span>VULPORA<small>UNIVERSOS INTERATIVOS</small></span></a><nav class="navlinks" id="portal-nav">${tabs.map(([k, v]) => `<a class="${active === k ? 'active' : ''}" href="${portalLink(k)}">${v}</a>`).join('')}</nav><div class="top-actions">${account}<button class="mobile-toggle" type="button" data-action="menu" data-target="portal-nav" aria-controls="portal-nav" aria-expanded="false" aria-label="Abrir menu">☰</button></div></div></header>`;
  }

  function footer() {
    return `<footer class="portal-footer">
      <div class="container">
        <div class="portal-footer-main">
          <div class="portal-footer-brand">
            <a class="brand portal-footer-logo" href="${portalLink('inicio')}">${logo()}<span>VULPORA<small>UNIVERSOS INTERATIVOS</small></span></a>
            <p>Explore comunidades vivas, eventos memoráveis e experiências que aproximam pessoas.</p>
            <span class="portal-footer-status"><i></i> Beta 1.0 · Universos oficiais ativos</span>
          </div>
          <div class="portal-footer-links">
            <h3>Explorar</h3>
            <a href="${portalLink('inicio')}">Início</a>
            <a href="${portalLink('comunidades')}">Comunidades</a>
            <a href="${commLink('the-kingdom')}">The Kingdom</a>
            <a href="${commLink('heavem')}">Heavem</a>
          </div>
          <div class="portal-footer-links">
            <h3>VULPORA</h3>
            <a href="${portalLink('comunidades')}">Encontrar uma comunidade</a>
            <a href="${portalLink('contato')}">Fale conosco</a>
            <a href="#/login">Acessar conta</a>
          </div>
          <div class="portal-footer-callout">
            <span class="eyebrow">ENCONTRE SEU ESPAÇO</span>
            <strong>Descubra as comunidades da Beta 1.0.</strong>
            <a class="btn btn-gold btn-sm" href="${portalLink('comunidades')}">Explorar comunidades <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div class="portal-footer-bottom">
          <span>© 2026 VULPORA. Todos os direitos reservados.</span>
          <span>Beta 1.0 · Feito para comunidades com imaginação.</span>
        </div>
      </div>
    </footer>`;
  }

  function layoutPortal(content, tab = '') {
    setScreenAttr(null);
    const app = $('#app');
    app.className = motionPaused() ? 'waves-paused' : '';
    app.style.cssText = '';
    app.innerHTML = `${portalStyles()}<div class="shell">${portalHeader(tab)}<main>${content}</main>${footer()}</div>`;
  }

  function communityHeader(c, tab = 'inicio', managing = false) {
    const displayAvatar = authUser ? (state.user.avatarUrl || authUser.avatarUrl) : '';
    const displayName = authUser ? (state.user.name || authUser.name) : '';
    const account = authUser
      ? `<a class="community-exit profile-link" href="#/perfil">${displayAvatar ? `<img src="${attr(displayAvatar)}" alt="" class="profile-avatar">` : `<span class="profile-avatar profile-initial">${esc(displayName?.[0]?.toUpperCase() || 'U')}</span>`}${esc(displayName)}</a>`
      : '<a class="community-exit" href="#/login">↗ Entrar</a>';

    return `
      <header class="community-header">
        <div class="community-header-inner">
          <a class="community-brand" href="${commLink(c.id)}">
            <span class="emblem">${esc(c.theme.symbol)}</span>
            <span class="community-brand-text">
              <strong>${esc(c.name)}</strong>
              <small>UNIVERSO VULPORA</small>
            </span>
          </a>
          <nav class="community-links" id="comm-nav" aria-label="Navegação da comunidade">
            ${[['inicio', 'Início'], ['eventos', 'Eventos'], ['membros', 'Membros'], ['ranking', 'Ranking']]
              .map(([k, label]) => `<a class="${tab === k && !managing ? 'active' : ''}" href="${commLink(c.id, k)}">${label}</a>`)
              .join('')}
            ${canManageCommunity(c.id) ? `<a class="${managing ? 'active' : ''}" href="${manageLink(c.id)}">Gerenciamento</a>` : ''}
          </nav>
          <div class="community-header-actions">
            ${account}
            <button class="mobile-toggle" type="button" data-action="menu" data-target="comm-nav" aria-controls="comm-nav" aria-expanded="false" aria-label="Abrir menu">☰</button>
          </div>
        </div>
      </header>
    `;
  }

  function moduleIcon(m) {
    const v = String(m || '').toLowerCase();
    if (v.includes('evento')) return '❄️';
    if (v.includes('mural')) return '💬';
    if (v.includes('calend')) return '📅';
    if (v.includes('rank')) return '🏆';
    return '✦';
  }

  function communityMembersList(c) {
    return state.directoryUsers.filter(m => m.communities.includes(c.id));
  }

  function memberCard(m) {
    const accent = color(m.accentColor || '#a855f7');
    const following = isFollowing(m.handle);
    const isMe = m.isSelf || (authUser && m.handle === state.user.handle);
    const avatarHtml = m.avatarUrl
      ? `<img src="${attr(m.avatarUrl)}" alt="${attr(m.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : `<span>${esc(m.name?.[0]?.toUpperCase() || 'U')}</span>`;

    return `
      <article class="card" style="border-top:2px solid ${accent};display:flex;flex-direction:column;justify-content:space-between;gap:14px">
        <div class="row" style="gap:14px;align-items:center">
          <a href="${userLink(m.handle)}" style="width:54px;height:54px;border-radius:50%;border:2px solid ${accent};box-shadow:0 0 18px ${accent}55;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;background:#140926;color:#fff;flex-shrink:0;text-decoration:none">
            ${avatarHtml}
          </a>
          <div style="min-width:0;flex:1">
            <div class="row between" style="gap:8px">
              <a href="${userLink(m.handle)}" style="font-weight:800;font-size:17px;color:#fff;text-decoration:none">${esc(m.name)}</a>
              <span class="tag" style="border-color:${accent}66;color:${accent}">${isMe ? 'Você' : esc(m.role || 'Membro')}</span>
            </div>
            <div class="mini-note">@${esc(m.handle)} · ${m.followers || 0} seguidores</div>
          </div>
        </div>
        <p style="margin:0;font-size:14px">${esc(m.bio || 'Explorando este universo na VULPORA.')}</p>
        <div class="row between wrap" style="gap:8px">
          <a class="btn btn-outline btn-sm" href="${userLink(m.handle)}">Ver perfil ↗</a>
          ${isMe
            ? `<a class="btn btn-primary btn-sm" href="#/perfil/editar">Personalizar perfil</a>`
            : `<button type="button" class="btn ${following ? 'btn-outline' : 'btn-primary'} btn-sm" data-action="toggle-follow" data-handle="${attr(m.handle)}">${following ? 'Seguindo ✓' : '+ Seguir'}</button>`}
        </div>
      </article>
    `;
  }

  function publicCommunity(c, tab) {
    normalizeCommunityTheme(c);
    if (c.status !== 'ativa') {
      return layoutCommunity(
        c,
        `<div class="container">${pageHead('COMUNIDADE EM PREPARAÇÃO', 'Este espaço ainda não foi ativado', 'A equipe da comunidade poderá acessá-lo pelo painel de gestão.')}<a class="btn btn-comm-outline" href="${portalLink('comunidades')}">Voltar às comunidades</a></div>`,
        tab
      );
    }

    if (authUser) ensureUserInCommunity(c);

    const events = state.events.filter(e => e.communityId === c.id && activeEvent(e));
    const members = communityMembersList(c);
    let content = '';

    const presenceNotice = authUser
      ? `<div class="notice-box mb">✦ Você está conectado como <strong>${esc(state.user.name)}</strong> (@${esc(state.user.handle)}) em ${esc(c.name)}.</div>`
      : '';

    if (tab === 'inicio') {
      const bannerImage = c.theme.cover || c.imageUrl;
      content = `
        <section class="community-banner-section">
          <div class="container">
            <div class="community-banner-4x3">
              ${bannerImage
                ? `<img src="${attr(bannerImage)}" alt="Banner da comunidade ${attr(c.name)}">`
                : `<div class="community-banner-placeholder">
                    <span>${esc(c.theme.symbol)}</span>
                    <small>${esc(c.name)}</small>
                  </div>`}
            </div>
          </div>
        </section>

        <section class="community-hero">
          <div class="community-hero-glow" aria-hidden="true"></div>
          <div class="container">
            <div class="community-kicker">${esc(c.theme.symbol)} Bem-vindo a ${esc(c.name)}</div>
            <h1 class="community-hero-title">${esc(c.theme.hero)}</h1>
            <p class="community-hero-sub">${esc(c.theme.subtitle)}</p>
            <div class="hero-actions">
              <a class="btn-comm-primary" href="${commLink(c.id, 'eventos')}">Explorar eventos →</a>
              <a class="btn-comm-outline" href="${commLink(c.id, 'membros')}">Membros (${members.length})</a>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="container">
            ${presenceNotice}
            <div class="section-head">
              <div>
                <span class="community-kicker">NOSSO ESPAÇO</span>
                <h2 class="community-section-heading">Bem-vindo à comunidade</h2>
                <p class="community-section-desc">${esc(c.description)}</p>
              </div>
              <span class="comm-member-pill">◉ ${c.members || 0} membros</span>
            </div>

            <div class="comm-modules-grid">
              ${(c.modules || []).map((m, i) => `
                <article class="comm-module-card">
                  <div class="comm-module-top">
                    <span class="comm-module-index">MÓDULO ${String(i + 1).padStart(2, '0')}</span>
                    <span class="comm-module-icon">${moduleIcon(m)}</span>
                  </div>
                  <h3>${esc(m)}</h3>
                  <p>${moduleText(m, c, events)}</p>
                </article>
              `).join('') || emptyState('Nenhum módulo foi adicionado.')}
            </div>
          </div>
        </section>

        <section class="section" style="padding-top:0">
          <div class="container">
            <div class="section-head">
              <div>
                <span class="community-kicker">AGENDA DO UNIVERSO</span>
                <h2 class="community-section-heading">Próximos eventos</h2>
              </div>
              <a class="btn-comm-outline" href="${commLink(c.id, 'eventos')}">Ver todos →</a>
            </div>
            <div class="grid grid-2">
              ${events.map(e => eventCard(e)).join('') || '<p class="community-section-desc">Em breve, novos eventos por aqui.</p>'}
            </div>
          </div>
        </section>
        <section class="section" style="padding-top:0">
          <div class="container">
            <div class="section-head">
              <div>
                <span class="community-kicker">COMUNIDADE VIVA</span>
                <h2 class="community-section-heading">Membros ativos</h2>
              </div>
              <a class="btn-comm-outline" href="${commLink(c.id, 'membros')}">Ver todos →</a>
            </div>
            <div class="grid grid-3">
              ${members.slice(0, 3).map(memberCard).join('')}
            </div>
          </div>
        </section>
      `;
    } else if (tab === 'membros') {
      content = `
        <div class="container">
          ${crumbs([['Portal', portalLink('inicio')], [c.name, commLink(c.id)], ['Membros', null]])}
          ${pageHead('EXPLORADORES DE ' + c.name.toUpperCase(), 'Membros da comunidade', 'Visite perfis personalizados e siga outros participantes deste universo.')}
          ${presenceNotice}
          <div class="grid grid-3 mb">${members.map(memberCard).join('') || emptyState('Nenhum membro ativo listado ainda.')}</div>
        </div>
      `;
    } else if (tab === 'eventos') {
      content = `
        <div class="container">
          ${crumbs([['Meu perfil', '#/perfil'], [c.name, commLink(c.id)], ['Eventos', null]])}
          ${pageHead('ACONTECE EM ' + c.name.toUpperCase(), 'Eventos da comunidade', 'Atividades e experiências criadas especialmente para este espaço.')}
          <div class="grid grid-2 mb">${events.map(eventCard).join('') || emptyState('Nenhum evento publicado ainda.')}</div>
        </div>
      `;
    } else if (tab === 'ranking') {
      content = `
        <div class="container">
          ${crumbs([['Meu perfil', '#/perfil'], [c.name, commLink(c.id)], ['Ranking', null]])}
          ${pageHead('CONQUISTAS DE ' + c.name.toUpperCase(), 'Ranking da comunidade', 'Classificação dos participantes mais ativos neste universo.')}
          <div class="split mb">
            <div class="card"><h3>Classificação geral</h3>${ranking()}</div>
            <div class="card">
              <div class="feature-icon">🏆</div>
              <h3>Conquistas e recompensas</h3>
              <p>O sistema de ranking agrega resultados de missões, desafios e eventos da comunidade.</p>
              <div class="note">Participe dos eventos publicados para somar pontos no universo ${esc(c.name)}.</div>
            </div>
          </div>
        </div>
      `;
    } else {
      content = `<div class="container">${pageHead('ESPAÇO DA COMUNIDADE', c.name)}</div>`;
    }

    layoutCommunity(c, content, tab);
  }

  function layoutCommunity(c, content, tab = '', managing = false) {
    setScreenAttr(null);
    normalizeCommunityTheme(c);
    const t = c.theme;
    const app = $('#app');
    const communitySlug = isTheKingdom(c) ? 'the-kingdom' : esc(c.id);
    app.className = '';
    app.style.cssText = '';
    app.innerHTML = `<div class="community-shell" data-community="${communitySlug}" style="${cssTheme(t)}">${communityHeader(c, tab, managing)}<main>${content}</main><footer class="community-footer"><div class="container"><span>${esc(c.theme.symbol)} ${esc(c.name)} · Espaço independente</span><a href="${portalLink('inicio')}" class="platform">Desenvolvido com VULPORA ↗</a></div></footer></div>`;
  }

  function pageHead(kicker, title, sub = '') {
    return `<div class="page-title"><div class="eyebrow">✦ ${esc(kicker)}</div><h1 class="shimmer-title">${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
  }

  function emptyState(msg) {
    return `<div class="empty">✧ ${esc(msg)}</div>`;
  }

  /* =========================================================
     AUTENTICAÇÃO (EMAIL/SENHA + GOOGLE OAUTH + DISCORD OAUTH)
     ========================================================= */
  const OAUTH_ERRORS = {
    google: 'Não foi possível autenticar com o Google. Tente novamente.',
    google_config: 'Login com Google ainda não configurado no servidor.',
    discord: 'Não foi possível autenticar com o Discord. Tente novamente.',
    discord_config: 'Login com Discord ainda não configurado no servidor.',
    access_denied: 'Acesso negado. Você cancelou a autorização.',
    state: 'Sessão de login expirada. Tente novamente.'
  };

  function authPage(mode = 'login', queryError = '') {
    setScreenAttr(null);
    const isRegister = mode === 'cadastro';
    const initialError = queryError ? (OAUTH_ERRORS[queryError] || 'Erro ao autenticar sua conta.') : '';
    const returnTo = encodeURIComponent('/#/perfil');

    return `
      <div class="auth-page auth-page-neon">
        <style>
          .oauth-stack {
            display: grid;
            gap: 10px;
            margin-top: 14px;
          }
          .oauth-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
          }
          .oauth-btn:hover {
            transform: translateY(-2px);
          }
          .oauth-btn-google {
            background: #ffffff;
            color: #111827;
            border: 1px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
          }
          .oauth-btn-google:hover {
            background: #f9fafb;
            box-shadow: 0 10px 26px rgba(255, 255, 255, 0.18);
          }
          .oauth-btn-discord {
            background: #5865F2;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: 0 8px 22px rgba(88, 101, 242, 0.36);
          }
          .oauth-btn-discord:hover {
            background: #4752C4;
            box-shadow: 0 10px 28px rgba(88, 101, 242, 0.5);
          }
        </style>
        <div class="auth-orbit auth-orbit-one"></div>
        <div class="auth-orbit auth-orbit-two"></div>
        <section class="auth-card-neon">
          <a class="auth-back" href="${portalLink('inicio')}" aria-label="Voltar ao portal">←</a>
          <div class="auth-brand">
            <img src="/assets/logo-vulpora.png" alt="VULPORA">
            <span>VULPORA · UNIVERSOS INTERATIVOS</span>
          </div>
          <h1>${isRegister ? 'Criar conta' : 'Seu perfil está visível'}</h1>
          <p>${isRegister ? 'Inicie sua jornada e explore as comunidades da Beta 1.0.' : 'Entre no seu universo e continue sua aventura.'}</p>

          <div class="oauth-stack">
            <a class="oauth-btn oauth-btn-google" href="/auth/google?returnTo=${returnTo}">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
                <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.8z"/>
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"/>
              </svg>
              <span>Continuar com Google</span>
            </a>
            <a class="oauth-btn oauth-btn-discord" href="/auth/discord?returnTo=${returnTo}">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Continuar com Discord</span>
            </a>
          </div>

          <div class="auth-divider">ou com e-mail</div>

          <form id="form-auth" data-mode="${mode}" class="auth-form auth-form-animated">
            ${isRegister ? `<label>Nome de exibição<input name="name" required maxlength="50" placeholder="Seu nome mágico"></label>` : ''}
            <label>E-mail<input type="email" name="email" required placeholder="voce@universo.com"></label>
            <label>Senha<input type="password" name="password" required minlength="6" placeholder="••••••••"></label>
            <div id="auth-error" class="auth-error" ${initialError ? '' : 'hidden'}>${esc(initialError)}</div>
            <button type="submit" class="auth-submit-button">
              <span class="auth-button-label">${isRegister ? 'Despertar conta ✦' : 'Entrar no portal ✦'}</span>
            </button>
          </form>

          <div class="auth-links" style="margin-top:14px">
            <span>${isRegister ? 'Já possui uma conta?' : 'Ainda não tem conta?'}</span>
            <a class="auth-link-gold" href="${isRegister ? '#/login' : '#/cadastro'}">${isRegister ? 'Entrar agora' : 'Criar conta'}</a>
          </div>
          <small class="auth-terms">Ao continuar, você concorda com os termos do universo VULPORA.</small>
        </section>
      </div>
    `;
  }

  /* =========================================================
     PÁGINA INICIAL
     ========================================================= */
  function portalHome() {
    const visible = state.communities.filter(c => c.visibility === 'publica' && c.status === 'ativa');
    const publishedEvents = state.events.filter(activeEvent).length;

    return `
      <section class="hero hero-redesign">
        <div class="hero-bg-glow"></div>
        <div class="container">
          <div class="hero-copy">
            <div class="hero-badge">
              <span class="badge-dot"></span> BETA 1.0 · UNIVERSOS INTERATIVOS
            </div>
            <h1 class="shimmer-title">
              Cada comunidade merece um <span class="neon-gradient-text">universo único.</span>
            </h1>
            <p class="hero-subtitle">
              Explore os universos oficiais da Beta 1.0, personalize seu perfil e participe de eventos sazonais com a comunidade.
            </p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-glow" href="${portalLink('comunidades')}">
                ✦ Explorar comunidades
              </a>
              <a class="btn btn-outline" href="${authUser ? '#/perfil' : '#/cadastro'}">
                ${authUser ? 'Meu perfil ↗' : 'Criar conta ↗'}
              </a>
            </div>
            <div class="hero-meta">
              <span>🍃 Design vivo</span>
              <span class="meta-divider"></span>
              <span>🌙 Ritmo natural</span>
              <span class="meta-divider"></span>
              <span>🔮 Perfis personalizáveis</span>
            </div>
          </div>

          <div class="hero-art">
            <div class="logo-orb-wrapper">
              <div class="orb-ring ring-1"></div>
              <div class="orb-ring ring-2"></div>
              <img src="/assets/logo-vulpora.png" alt="VULPORA Logo" class="floating-logo">
            </div>
            <div class="float-note one">
              <strong>The Kingdom & Heavem</strong>
              <small>Comunidades ativas</small>
            </div>
            <div class="float-note two">
              <strong>Eventos Vivos</strong>
              <small>Liberação programada</small>
            </div>
          </div>
        </div>
        <button class="motion-toggle" type="button" data-action="toggle-motion" aria-pressed="${motionPaused()}">
          ${motionPaused() ? 'Ativar movimento' : 'Pausar movimento'}
        </button>
      </section>

      <div class="container">
        <div class="stats-glass">
          <div class="stat-card">
            <span class="stat-number">${visible.length}</span>
            <span class="stat-label">Universos ativos</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${publishedEvents}</span>
            <span class="stat-label">Eventos em destaque</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">100%</span>
            <span class="stat-label">Perfil personalizável</span>
          </div>
        </div>
      </div>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <span class="eyebrow">EXPLORE O ECOSSISTEMA</span>
              <h2>Viva experiências em cada universo</h2>
              <p>Ferramentas orgânicas para elevar a experiência dos membros na Beta 1.0.</p>
            </div>
          </div>

          <div class="grid grid-3">
            <article class="card card-feature">
              <div class="feature-icon-wrapper"><span class="feature-icon">♛</span></div>
              <h3>Comunidades Vivas</h3>
              <p>Identidade própria, painéis translúcidos e atmosferas únicas em The Kingdom e Heavem.</p>
              <div class="card-footer-tag">✦ Universos oficiais</div>
            </article>

            <article class="card card-feature">
              <div class="feature-icon-wrapper"><span class="feature-icon">✦</span></div>
              <h3>Eventos Fluidos</h3>
              <p>Acompanhe a liberação de missões, desafios e surpresas diárias em cada temporada.</p>
              <div class="card-footer-tag">◷ Agenda automatizada</div>
            </article>

            <article class="card card-feature">
              <div class="feature-icon-wrapper"><span class="feature-icon">🏆</span></div>
              <h3>Perfis & Conexões</h3>
              <p>Personalize sua foto e paleta do perfil, entre nas comunidades e conecte-se com outros membros.</p>
              <div class="card-footer-tag">✧ Identidade social</div>
            </article>
          </div>
        </div>
      </section>

      <section class="section" style="padding-top:0">
        <div class="container">
          <div class="section-head">
            <div>
              <span class="eyebrow">JORNADA SIMPLES</span>
              <h2>Como funciona a Beta 1.0</h2>
              <p>Entre nos universos cadastrados, personalize sua identidade e participe dos desafios.</p>
            </div>
            <a class="btn btn-outline btn-sm" href="${portalLink('comunidades')}">Ver comunidades →</a>
          </div>
          <div class="vp-steps-grid">
            <article class="vp-step-card">
              <span class="vp-step-num">01</span>
              <h3>Entre em uma comunidade</h3>
              <p>Acesse The Kingdom ou Heavem como membro e fique visível para outros exploradores.</p>
            </article>
            <article class="vp-step-card">
              <span class="vp-step-num">02</span>
              <h3>Personalize seu perfil</h3>
              <p>Adicione sua foto, escolha as cores do seu layout e siga outros participantes.</p>
            </article>
            <article class="vp-step-card">
              <span class="vp-step-num">03</span>
              <h3>Participe dos eventos</h3>
              <p>Complete desafios sazonais, suba no ranking e desbloqueie recompensas exclusivas.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section" style="padding-top:0">
        <div class="container">
          <div class="section-head">
            <div>
              <span class="eyebrow">UNIVERSOS CADASTRADOS</span>
              <h2>Comunidades da Beta 1.0</h2>
              <p>Escolha um universo abaixo para entrar, conhecer os membros e participar dos eventos.</p>
            </div>
            <a class="btn btn-outline btn-sm" href="${portalLink('comunidades')}">Ver todas →</a>
          </div>
          <div class="communities-grid">
            ${visible.map(communityCard).join('')}
          </div>
        </div>
      </section>

      <div class="container mb">
        <section class="card cta-redesign">
          <span class="eyebrow">COMECE SUA JORNADA</span>
          <h2 class="shimmer-title" style="font-size:clamp(26px,4vw,40px);margin:10px 0 14px">Pronto para explorar The Kingdom e Heavem?</h2>
          <p style="max-width:560px;margin:0 auto 24px">Crie sua conta, personalize seu perfil e entre nos universos ativos da Beta 1.0.</p>
          <a class="btn btn-primary btn-lg btn-glow" href="${authUser ? '#/perfil' : '#/cadastro'}">
            ${authUser ? 'Acessar meu perfil ↗' : 'Criar conta gratuitamente ✦'}
          </a>
        </section>
      </div>
    `;
  }

  /* =========================================================
     DIRETÓRIO DE COMUNIDADES
     ========================================================= */
  function communityCard(c) {
    normalizeCommunityTheme(c);
    const image = c.imageUrl || c.theme.cover;
    const coverBg = `linear-gradient(145deg, ${color(c.theme.secondary)}, ${color(c.theme.primary)})`;
    const isJoined = authUser && state.visitedCommunities.includes(c.id);
    const statusLabel = isJoined || c.membershipStatus === 'active'
      ? `<span class="community-status is-active">● Membro ativo</span>`
      : c.membershipStatus === 'pending'
        ? `<span class="community-status is-pending">◷ Solicitação enviada</span>`
        : c.membershipStatus === 'blocked'
          ? `<span class="community-status is-blocked">✕ Entrada não aprovada</span>`
          : `<span class="community-status">Entrada ${esc(c.entry)}</span>`;

    const action = isJoined || c.membershipStatus === 'active' || c.entry === 'livre'
      ? `<a class="btn btn-primary btn-sm" href="${commLink(c.id)}">Entrar ↗</a>`
      : c.membershipStatus === 'pending' || c.membershipStatus === 'blocked'
        ? ''
        : authUser
          ? `<button class="btn btn-primary btn-sm" data-action="request-membership" data-community="${attr(c.id)}">Solicitar entrada ↗</button>`
          : `<a class="btn btn-primary btn-sm" href="#/cadastro">Cadastrar-se ↗</a>`;

    return `
      <article class="community-directory-card" style="border-top:2px solid ${color(c.theme.accent)}">
        <div class="community-directory-cover" style="background:${coverBg}">
          ${image ? `<img src="${attr(image)}" alt="Capa de ${attr(c.name)}">` : `<span style="color:${color(c.theme.accent)}">${esc(c.theme.symbol)}</span>`}
        </div>
        <div class="community-directory-body">
          <div class="community-directory-heading">
            <div>
              ${statusTag(c.status)}
              <h2>${esc(c.name)}</h2>
            </div>
            <span class="community-member-count">◉ ${c.members || 0} membros</span>
          </div>
          <p>${esc(c.description)}</p>
          <div class="community-directory-actions">
            ${action}
            ${statusLabel}
          </div>
        </div>
      </article>
    `;
  }

  async function syncRemoteCommunities() {
    try {
      const response = await fetch('/api/communities/public');
      if (!response.ok) return;
      const remote = await response.json();
      if (!Array.isArray(remote)) return;
      remote.forEach(normalizeCommunityTheme);
      const ids = new Set(remote.map(c => c.id));
      const hasRemoteKingdom = remote.some(isTheKingdom);
      const hasRemoteHeavem = remote.some(isHeavem);
      state.communities = [
        ...state.communities.filter(c =>
          !ids.has(c.id) &&
          !(hasRemoteKingdom && isTheKingdom(c)) &&
          !(hasRemoteHeavem && isHeavem(c))
        ),
        ...remote
      ];
      const remoteEvents = remote.flatMap(c => c.events || []);
      const eventIds = new Set(remoteEvents.map(event => event.id));
      state.events = [...state.events.filter(event => !eventIds.has(event.id)), ...remoteEvents];
    } catch (error) { console.error('Não foi possível carregar comunidades do servidor:', error); }
  }

  function portalCommunities() {
    const active = state.communities.filter(c => c.visibility === 'publica' && c.status === 'ativa');
    return `
      <div class="communities-page">
        <a class="dashboard-back" href="${portalLink('inicio')}">← Voltar ao portal</a>
        <div class="eyebrow">✦ BETA 1.0 · UNIVERSOS CADASTRADOS</div>
        <h1 class="shimmer-title">Comunidades</h1>
        <p>Entre em <strong>The Kingdom</strong> ou <strong>Heavem</strong> para participar de eventos e se conectar com outros membros.</p>
        <div class="communities-grid">
          ${active.map(communityCard).join('') || emptyState('Nenhuma comunidade pública disponível.')}
        </div>
      </div>
    `;
  }

  function portalCreate() {
    return `<div class="container">${pageHead('BETA 1.0 · UNIVERSOS OFICIAIS', 'Criação de comunidades indisponível', 'Durante o Beta 1.0 da VULPORA, usuários não podem criar novas comunidades.')}<div class="card mb"><div class="feature-icon">🔒</div><h3>Funcionalidade desativada na Beta</h3><p>Apenas as comunidades oficiais cadastradas (<strong>The Kingdom</strong> e <strong>Heavem</strong>) estão abertas nesta versão. Entre nelas para personalizar seu perfil e interagir com outros membros.</p><a class="btn btn-primary" href="${portalLink('comunidades')}">Explorar comunidades ↗</a></div></div>`;
  }

  function portalContact() {
    return `<div class="container">${pageHead('FALE COM A EQUIPE', 'Contato', 'Dúvidas sobre comunidades, eventos ou personalização? Envie sua mensagem.')}<div class="split mb"><div class="card"><h3>Envie uma mensagem</h3><form id="form-contact"><div class="field"><label>Seu nome</label><input name="name" required value="${attr(state.user.name)}"></div><div class="field"><label>Assunto</label><select name="subject"><option>Comunidades</option><option>Eventos</option><option>Personalização</option><option>Outros</option></select></div><div class="field"><label>Mensagem</label><textarea name="message" required maxlength="1200" placeholder="Como podemos ajudar?"></textarea></div><button class="btn btn-primary">Enviar mensagem</button></form></div><div class="card"><div class="feature-icon">✉</div><h3>Estamos construindo a VULPORA</h3><p>Sua mensagem é validada pelo backend e encaminhada para a equipe responsável.</p><div class="note">Beta 1.0 — agradecemos seu feedback sobre The Kingdom e Heavem.</div></div></div></div>`;
  }

  /* =========================================================
     PERFIL RESPONSIVO (CONECTADO: FOTO + CORES + SEGUIDORES)
     ========================================================= */
  function profile(tab = 'posts') {
    setScreenAttr(null);
    syncAuthToUser();
    upsertSelfInDirectory();
    const u = state.user;
    const joinedCommunities = state.communities.filter(c => state.visitedCommunities.includes(c.id));
    const availableCommunities = state.communities.filter(c => c.visibility === 'publica' && c.status === 'ativa');

    const activeAvatar = pendingAvatarDataUrl !== null ? pendingAvatarDataUrl : u.avatarUrl;
    const avatarHtml = activeAvatar
      ? `<img src="${attr(activeAvatar)}" alt="Avatar de ${attr(u.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : `<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;background:#140926;color:#fff">${esc(u.name[0]?.toUpperCase() || 'V')}</div>`;

    const followersList = (u.followers || []).map(h => state.directoryUsers.find(m => m.handle === h) || { handle: h, name: h, bio: 'Membro da comunidade VULPORA.' });

    let tabContent = '';

    if (tab === 'posts') {
      tabContent = `
        <div class="fade-in">
          <article class="glass-card post-card">
            <div class="post-author-row">
              <div class="post-avatar" style="display:flex;align-items:center;justify-content:center;background:#1a0d30;font-weight:800;overflow:hidden;">
                ${u.avatarUrl ? `<img src="${attr(u.avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover">` : esc(u.name[0]?.toUpperCase() || 'V')}
              </div>
              <div class="post-author-details">
                <strong>${esc(u.name)} <span>👑</span></strong>
                <span class="post-time">@${esc(u.handle)} · 2h</span>
              </div>
            </div>
            <p class="post-body">Explorando The Kingdom e Heavem na Beta 1.0 da VULPORA! ✨🔮</p>
            <div class="post-image-placeholder"></div>
            <div class="post-interactions">
              <button type="button" class="active">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                128
              </button>
              <button type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                24
              </button>
            </div>
          </article>
        </div>
      `;
    } else if (tab === 'sobre') {
      tabContent = `
        <div class="fade-in desktop-grid-2">
          <div class="glass-card">
            <div class="card-header"><h3>Sobre mim</h3></div>
            <p class="card-desc">${esc(u.bio) || 'Explorando universos interativos na VULPORA.'}</p>
            <div class="tags-container">
              <span>✦ Explorador Beta</span>
              <span>❄️ Eventos</span>
              <span>♛ Comunidades</span>
            </div>
          </div>
          <div class="glass-card">
            <div class="card-header"><h3>Interesses & Conexões</h3></div>
            <div class="interests-grid">
              <div class="interest-hex"><span class="emoji">💬</span><span>${esc(u.discord || 'Discord não vinculado')}</span></div>
              <div class="interest-hex"><span class="emoji">🦆</span><span>${esc(u.ducks || 'Ducks não vinculado')}</span></div>
              <div class="interest-hex"><span class="emoji">♛</span><span>The Kingdom</span></div>
              <div class="interest-hex"><span class="emoji">✧</span><span>Heavem</span></div>
            </div>
          </div>
          <div class="glass-card full-width">
            <div class="card-header">
              <h3>Seguidores (${followersList.length})</h3>
              <a class="btn-glass-outline" href="${userLink(u.handle)}">Ver perfil público ↗</a>
            </div>
            <div class="collections-grid">
              ${followersList.map(f => `
                <div class="collection-card">
                  <div class="c-avatar" style="background:${color(f.cover || '#36194e')};color:#fff;overflow:hidden">
                    ${f.avatarUrl ? `<img src="${attr(f.avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover">` : esc(f.name?.[0]?.toUpperCase() || 'U')}
                  </div>
                  <div class="c-info">
                    <strong>${esc(f.name)}</strong>
                    <span>@${esc(f.handle)}</span>
                  </div>
                  <a class="c-action" href="${userLink(f.handle)}">Ver perfil ↗</a>
                </div>
              `).join('') || emptyState('Entre em uma comunidade para que outros membros possam seguir você.')}
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'colecoes') {
      tabContent = `
        <div class="fade-in">
          <div class="glass-card">
            <div class="card-header">
              <h3>Comunidades da Beta 1.0 (${availableCommunities.length})</h3>
              <a class="btn-glass-outline" href="${portalLink('comunidades')}">Ver diretório ↗</a>
            </div>
            <div class="collections-grid">
              ${availableCommunities.map(c => {
                const joined = state.visitedCommunities.includes(c.id);
                return `
                  <div class="collection-card">
                    <div class="c-avatar" style="background:${color(c.theme.secondary)};color:${color(c.theme.accent)}">${esc(c.theme.symbol)}</div>
                    <div class="c-info">
                      <strong>${esc(c.name)}</strong>
                      <span>${joined ? 'Membro ativo' : 'Disponível'} · ${c.members || 0} membros</span>
                    </div>
                    <a class="c-action" href="${commLink(c.id)}">${joined ? 'Entrar ↗' : 'Participar ↗'}</a>
                    ${canManageCommunity(c.id) ? `<a class="c-action" href="${manageLink(c.id)}">Gerenciar</a>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'editar') {
      tabContent = `
        <div class="fade-in">
          <div class="glass-card">
            <div class="card-header">
              <h3>Personalizar Perfil</h3>
              <a class="btn-glass-outline" href="${userLink(u.handle)}">Prévia pública ↗</a>
            </div>
            <form id="form-profile" class="glass-form">
              <div class="form-group">
                <label>Foto de perfil</label>
                <div class="avatar-upload-box">
                  <div class="avatar-upload-preview" id="profile-avatar-preview">
                    ${activeAvatar ? `<img src="${attr(activeAvatar)}" alt="Prévia">` : esc(u.name[0]?.toUpperCase() || 'V')}
                  </div>
                  <div style="flex:1;min-width:200px">
                    <input type="file" id="profile-avatar-input" name="avatarFile" accept="image/png,image/jpeg,image/webp,image/gif">
                    <small style="display:block;margin-top:6px;opacity:.75">PNG, JPG, WebP ou GIF. Redimensionada automaticamente para seu perfil.</small>
                    ${activeAvatar ? `<button type="button" class="btn-glass-outline" data-action="remove-avatar" style="margin-top:8px;padding:6px 12px;font-size:12px">Remover foto</button>` : ''}
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Cores do layout do perfil</label>
                <div class="profile-color-presets" role="group" aria-label="Temas rápidos do perfil">
                  <button type="button" class="profile-preset-btn" data-action="profile-preset" data-accent="#a855f7" data-cover="#36194e" data-surface="#160d29"><span style="background:#a855f7"></span>Roxo Místico</button>
                  <button type="button" class="profile-preset-btn" data-action="profile-preset" data-accent="#ef4444" data-cover="#3b0712" data-surface="#180a0e"><span style="background:#ef4444"></span>Carmesim</button>
                  <button type="button" class="profile-preset-btn" data-action="profile-preset" data-accent="#06b6d4" data-cover="#082f49" data-surface="#0b1726"><span style="background:#06b6d4"></span>Ciano Astral</button>
                  <button type="button" class="profile-preset-btn" data-action="profile-preset" data-accent="#f59e0b" data-cover="#451a03" data-surface="#1b1209"><span style="background:#f59e0b"></span>Ouro Solar</button>
                  <button type="button" class="profile-preset-btn" data-action="profile-preset" data-accent="#10b981" data-cover="#064e3b" data-surface="#0a1c17"><span style="background:#10b981"></span>Esmeralda</button>
                  <button type="button" class="profile-preset-btn" data-action="profile-preset" data-accent="#ec4899" data-cover="#500724" data-surface="#1d0b15"><span style="background:#ec4899"></span>Rosa Neon</button>
                </div>
                <div class="profile-color-grid">
                  <label class="profile-color-item">
                    <span>Cor de destaque</span>
                    <input type="color" name="accentColor" value="${color(u.accentColor || '#a855f7')}">
                  </label>
                  <label class="profile-color-item">
                    <span>Cor do banner</span>
                    <input type="color" name="cover" value="${color(u.cover || '#36194e')}">
                  </label>
                  <label class="profile-color-item">
                    <span>Fundo dos cartões</span>
                    <input type="color" name="surfaceColor" value="${color(u.surfaceColor || '#160d29')}">
                  </label>
                </div>
              </div>

              <div class="form-group"><label>Nome de exibição</label><input required name="name" maxlength="50" value="${attr(u.name)}"></div>
              <div class="form-group"><label>Usuário (@handle)</label><input name="handle" required maxlength="30" value="${attr(u.handle)}"></div>
              <div class="form-group"><label>Biografia</label><textarea name="bio" maxlength="250" rows="3">${esc(u.bio)}</textarea></div>
              <div class="form-group"><label>Discord</label><input name="discord" placeholder="Seu usuário no Discord" value="${attr(u.discord)}"></div>
              <div class="form-group"><label>Ducks</label><input name="ducks" placeholder="@usuario" value="${attr(u.ducks)}"></div>
              <button class="btn-primary-glow" type="submit">Salvar alterações ✦</button>
            </form>
          </div>
        </div>
      `;
    }

    return `
      ${profileThemeStyles(u)}
      <div class="vulpora-magic-bg"></div>
      <div class="vulpora-responsive-layout">
        
        <aside class="desktop-sidebar hide-on-mobile">
          <div class="sidebar-brand">
            <img src="/assets/logo-vulpora.png" alt="VULPORA">
            <span class="shimmer-title">VULPORA</span>
          </div>
          <nav class="sidebar-nav">
            <a href="#/portal/inicio" class="side-nav-item">
              <span>⌂</span> Início
            </a>
            <a href="#/portal/comunidades" class="side-nav-item">
              <span>♛</span> Comunidades
            </a>

            <a href="#/perfil" class="side-nav-item active">
              <span>✦</span> Meu Perfil
            </a>
            ${(authUser?.role === 'ADM' || authUser?.role === 'ADMIN' || authUser?.role === 'STAFF') ? `<a href="#/admin/inicio" class="side-nav-item"><span>⚙</span> Administração</a>` : ''}
          </nav>
          <div class="sidebar-footer">
            <button type="button" class="btn-logout" data-action="logout">
              <span>↗</span> Sair da conta
            </button>
          </div>
        </aside>

        <main class="profile-main-content">
          <div class="profile-glass-container">
            
            <div class="profile-banner-area">
              <div class="banner-wave-bg"></div>
              <div class="mobile-top-header hide-on-desktop">
                <a href="#/portal/inicio" class="icon-btn-glass" aria-label="Voltar">←</a>
                <a href="#/perfil/editar" class="icon-btn-glass" aria-label="Configurações">⚙</a>
              </div>
            </div>

            <section class="profile-user-info-section">
              <div class="profile-avatar-row">
                <div class="avatar-glass-wrapper">
                  <div class="avatar-circle">${avatarHtml}</div>
                  <a href="#/perfil/editar" class="avatar-edit-badge" title="Alterar foto e cores">✎</a>
                </div>
                <div class="profile-actions-desktop hide-on-mobile">
                  <a href="#/perfil/editar" class="btn-glass-outline">🎨 Foto & Cores</a>
                  <a href="${userLink(u.handle)}" class="btn-glass-outline">👁 Perfil público</a>
                </div>
              </div>

              <div class="profile-details-text">
                <h1 class="shimmer-title">${esc(u.name)} <span style="font-size:22px">👑</span></h1>
                <p class="handle-text">@${esc(u.handle)}</p>
                <p class="bio-text">${esc(u.bio) || 'Apaixonado por RPG, arte e comunidades criativas. ✨'}</p>
              </div>

              <div class="profile-stats-grid">
                <div class="stat-item"><strong>${(u.followers || []).length}</strong><span>Seguidores</span></div>
                <div class="stat-item"><strong>${(u.following || []).length}</strong><span>Seguindo</span></div>
                <div class="stat-item"><strong>${joinedCommunities.length}</strong><span>Comunidades</span></div>
              </div>
            </section>

            <nav class="profile-tabs-nav">
              <a href="#/perfil/posts" class="tab-item ${tab === 'posts' ? 'active' : ''}">Posts</a>
              <a href="#/perfil/sobre" class="tab-item ${tab === 'sobre' ? 'active' : ''}">Sobre & Seguidores</a>
              <a href="#/perfil/colecoes" class="tab-item ${tab === 'colecoes' ? 'active' : ''}">Comunidades</a>
              <a href="#/perfil/editar" class="tab-item ${tab === 'editar' ? 'active' : ''}">Foto & Cores</a>
            </nav>

            <div class="profile-tab-content">
              ${tabContent}
            </div>
          </div>
        </main>

        <nav class="mobile-bottom-nav hide-on-desktop">
          <a href="#/portal/inicio" class="b-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Início</span>
          </a>
          <a href="#/portal/comunidades" class="b-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="16" cy="11" r="3"/><path d="M18 21v-2a4 4 0 0 0-3-3.87"/></svg>
            <span>Explorar</span>
          </a>
          <div class="b-nav-center">
            <a href="#/perfil" class="center-orb" aria-label="Portal VULPORA">
              <img src="/assets/logo-vulpora.png" alt="Vulpora">
            </a>
          </div>
          <a href="#/perfil/editar" class="b-nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Editar</span>
          </a>
          <a href="#/perfil" class="b-nav-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Perfil</span>
          </a>
        </nav>

      </div>
    `;
  }

  /* =========================================================
     PERFIL PÚBLICO DE MEMBRO (PARA SEGUIR / SER SEGUIDO)
     ========================================================= */
  function publicUserProfile(handle) {
    if (authUser) upsertSelfInDirectory();
    const target = state.directoryUsers.find(m => m.handle.toLowerCase() === String(handle || '').toLowerCase());
    if (!target) {
      layoutPortal(`<div class="container">${pageHead('MEMBRO NÃO ENCONTRADO', 'Perfil indisponível', 'Este viajante ainda não apareceu em nenhuma comunidade.')}<a class="btn btn-primary" href="${portalLink('comunidades')}">Explorar comunidades</a></div>`);
      return;
    }

    const isMe = target.isSelf || (authUser && target.handle === state.user.handle);
    const following = isFollowing(target.handle);
    const sharedComms = (target.communities || []).map(cid => getCommunity(cid)).filter(Boolean);
    const avatarHtml = target.avatarUrl
      ? `<img src="${attr(target.avatarUrl)}" alt="${attr(target.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : `<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;background:#140926;color:#fff">${esc(target.name?.[0]?.toUpperCase() || 'U')}</div>`;

    const body = `
      ${profileThemeStyles(target)}
      <div class="container public-profile-shell" style="padding-top:24px;padding-bottom:48px">
        ${crumbs([['Portal', portalLink('inicio')], ['Comunidades', portalLink('comunidades')], [target.name, null]])}
        <div class="profile-glass-container" style="max-width:860px;margin:16px auto 0;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.12)">
          <div class="profile-banner-area" style="height:170px;position:relative">
            <div class="banner-wave-bg" style="position:absolute;inset:0"></div>
          </div>

          <section class="profile-user-info-section">
            <div class="profile-avatar-row">
              <div class="avatar-glass-wrapper">
                <div class="avatar-circle">${avatarHtml}</div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                ${isMe
                  ? `<a href="#/perfil/editar" class="btn-primary-glow" style="padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700">🎨 Editar foto & cores</a>
                     <button type="button" class="btn-glass-outline" data-action="copy-profile-link" data-handle="${attr(target.handle)}">🔗 Copiar link</button>`
                  : `<button type="button" class="${following ? 'btn-glass-outline' : 'btn-primary-glow'}" data-action="toggle-follow" data-handle="${attr(target.handle)}" style="padding:10px 22px;border-radius:999px;font-weight:700;cursor:pointer">${following ? 'Seguindo ✓' : '+ Seguir membro'}</button>`}
              </div>
            </div>

            <div class="profile-details-text">
              <h1 class="shimmer-title">${esc(target.name)} <span class="tag" style="vertical-align:middle">${esc(target.role || 'Membro')}</span></h1>
              <p class="handle-text">@${esc(target.handle)}</p>
              <p class="bio-text">${esc(target.bio || 'Explorando universos interativos na VULPORA.')}</p>
            </div>

            <div class="profile-stats-grid">
              <div class="stat-item"><strong>${target.followers || 0}</strong><span>Seguidores</span></div>
              <div class="stat-item"><strong>${sharedComms.length}</strong><span>Comunidades</span></div>
            </div>
          </section>

          <div class="profile-tab-content">
            <div class="glass-card">
              <div class="card-header"><h3>Comunidades em que participa</h3></div>
              <div class="collections-grid">
                ${sharedComms.map(c => `
                  <div class="collection-card">
                    <div class="c-avatar" style="background:${color(c.theme.secondary)};color:${color(c.theme.accent)}">${esc(c.theme.symbol)}</div>
                    <div class="c-info">
                      <strong>${esc(c.name)}</strong>
                      <span>${c.members || 0} membros</span>
                    </div>
                    <a class="c-action" href="${commLink(c.id)}">Entrar ↗</a>
                  </div>
                `).join('') || emptyState('Nenhuma comunidade pública vinculada.')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    layoutPortal(body, 'comunidades');
  }

  function moduleText(m, c, events) {
    let v = m.toLowerCase();
    if (v.includes('evento')) return `${events.length} evento(s) publicados. Acompanhe novidades, horários e desafios.`;
    if (v.includes('mural')) return 'Um lugar para compartilhar momentos, histórias e conquistas da comunidade.';
    if (v.includes('boas') || v.includes('bem')) return `Faça parte do universo ${esc(c.name)} e conheça nossos próximos encontros.`;
    if (v.includes('calend')) return 'Atividades liberadas conforme o calendário programado pela equipe.';
    return 'Um espaço criado e organizado pela equipe da comunidade.';
  }

  function eventCard(e) {
    return `<article class="card"><div class="row between"><span class="tag">${esc(e.symbol)} Evento</span>${statusTag(e.status)}</div><h3 style="font-size:24px;margin:15px 0 8px">${esc(e.name)}</h3><p>${esc(e.description)}</p><div class="row between wrap"><span class="muted" style="font-size:11px">◷ ${fmtDate(e.date)}</span><a class="btn btn-primary btn-sm" href="${eventLink(e.id)}">Abrir evento →</a></div></article>`;
  }

  function ranking(entries) {
    const demo = entries || [['Luna', '985'], ['Raven', '910'], ['Noah', '840'], ['Mika', '785'], ['Sol', '740']];
    return demo.map(([name, n], i) => `<div class="rank-row"><span class="badge-num">${i + 1}</span><span class="avatar">${name[0]}</span><span>${name}</span><strong>${n} <small>pts</small></strong></div>`).join('');
  }

  function sidebar(c, tab) {
    let links = [['visao', '◉ Visão geral'], ['estudio', '✦ Estúdio visual'], ['eventos', '◇ Gerenciar eventos'], ['programacao', '◷ Programação'], ['equipe', '♙ Equipe e permissões'], ['solicitacoes', '☷ Solicitações']];
    return `<aside class="sidebar"><h3>Gerenciar ${esc(c.name)}</h3>${links.map(([k, label]) => `<a href="${manageLink(c.id, k)}" class="${tab === k ? 'active' : ''}">${label}</a>`).join('')}<hr><a href="${commLink(c.id)}">↗ Ver site da comunidade</a><a href="#/perfil">← Meu perfil</a></aside>`;
  }

  function manage(c, tab) {
    if (!c) { layoutPortal('<div class="container"><div class="empty">Comunidade não encontrada.</div></div>'); return; }
    let body = '';
    const events = state.events.filter(e => e.communityId === c.id), req = state.requests.filter(r => r.communityId === c.id);
    if (tab === 'visao') body = `<div class="section-head"><div><span class="eyebrow">PAINEL DE GESTÃO</span><h2>Olá, equipe ${esc(c.name)}!</h2><p>Gerencie seu espaço sem sair da experiência da comunidade.</p></div>${statusTag(c.status)}</div><div class="grid grid-3 mb"><div class="card metric"><strong>${c.members}</strong><span>Membros</span></div><div class="card metric"><strong>${events.length}</strong><span>Eventos criados</span></div><div class="card metric"><strong>${state.activities.filter(a => events.some(e => e.id === a.eventId)).length}</strong><span>Atividades programadas</span></div></div><div class="grid grid-2"><div class="card"><h3>Identidade visual</h3><p>Seu site público tem tema independente. Alterações no Estúdio são preparadas como rascunho e publicadas explicitamente.</p><a class="btn btn-primary btn-sm" href="${manageLink(c.id, 'estudio')}">Abrir Estúdio ↗</a></div><div class="card"><h3>Eventos e atividades</h3><p>Crie novos eventos, organize desafios e escolha o dia e horário de liberação de cada atividade.</p><a class="btn btn-outline btn-sm" href="${manageLink(c.id, 'eventos')}">Gerenciar eventos →</a></div></div>`;
    else if (tab === 'estudio') {
      const session = studioFor(c), t = session.theme, mods = session.modules;
      const contrast = contrastRatio(t.accent, t.primary), ratio = contrast.toFixed(2), pass = contrast >= 4.5, ideal = contrast >= 7;
      const badge = pass ? 'Contraste adequado' : 'Contraste insuficiente';
      body = `<div class="section-head studio-page-head"><div><span class="eyebrow">ESTÚDIO VULPORA · EDITOR VISUAL</span><h2>Crie o visual do seu universo</h2><p>Edite e veja na hora, sem salvar. Rascunhos são privados; só a publicação altera o site público.</p></div><span class="tag gold" id="studio-state-label">${session.dirty ? 'Alterações não salvas' : c.draft ? 'Rascunho salvo' : 'Visual publicado'}</span></div>
 <div class="studio-toolbar"><span class="studio-live-dot" aria-hidden="true" style="animation: pulse-glow 1.5s infinite alternate;"></span><strong>Prévia ao vivo</strong><span class="studio-toolbar-description">As alterações são mostradas enquanto você digita</span><div class="studio-toolbar-actions"><button type="button" class="btn btn-outline btn-sm" data-action="studio-reset" data-id="${attr(c.id)}">Descartar edição</button><button type="button" class="btn btn-outline btn-sm" data-action="studio-full-preview" data-id="${attr(c.id)}">↗ Prévia em tela cheia</button></div></div>
 <div class="studio-layout studio-redesign"><div class="studio-editor"><form id="form-studio" class="studio-controls" data-id="${attr(c.id)}">
 <section class="studio-panel"><div class="studio-panel-head"><span class="studio-step">01</span><div><h3>Identidade e cores</h3><p>Altere as cores e acompanhe a legibilidade automaticamente.</p></div></div>
 <div class="studio-presets" role="group" aria-label="Paletas sugeridas"><button type="button" class="palette-preset" data-action="studio-preset" data-id="${attr(c.id)}" data-preset="reino" title="Preto, Vermelho e Branco"><span style="background:#09090b"></span><span style="background:#dc2626"></span><span style="background:#ffffff"></span><small>Reino</small></button><button type="button" class="palette-preset" data-action="studio-preset" data-id="${attr(c.id)}" data-preset="noite" title="Noturno elegante"><span style="background:#131628"></span><span style="background:#28385b"></span><span style="background:#e7c98a"></span><small>Noite</small></button><button type="button" class="palette-preset" data-action="studio-preset" data-id="${attr(c.id)}" data-preset="bosque" title="Floresta"><span style="background:#122722"></span><span style="background:#25453b"></span><span style="background:#b7edca"></span><small>Bosque</small></button><button type="button" class="palette-preset" data-action="studio-preset" data-id="${attr(c.id)}" data-preset="lilas" title="Violeta"><span style="background:#211331"></span><span style="background:#422657"></span><span style="background:#f2c9ff"></span><small>Lilás</small></button><button type="button" class="palette-preset" data-action="studio-preset" data-id="${attr(c.id)}" data-preset="claro" title="Tema claro"><span style="background:#f7f5f0"></span><span style="background:#ebe5d7"></span><span style="background:#5d317e"></span><small>Claro</small></button></div>
 <div class="studio-color-grid"><div class="field studio-color-field"><label for="studio-primary">Fundo principal</label><div class="color-control"><input id="studio-primary" type="color" name="primary" value="${color(t.primary)}"><input class="hex-readout" aria-label="Código hexadecimal do fundo principal" data-color-for="primary" maxlength="7" value="${color(t.primary)}" spellcheck="false"></div></div><div class="field studio-color-field"><label for="studio-secondary">Superfícies e menu</label><div class="color-control"><input id="studio-secondary" type="color" name="secondary" value="${color(t.secondary)}"><input class="hex-readout" aria-label="Código hexadecimal das superfícies" data-color-for="secondary" maxlength="7" value="${color(t.secondary)}" spellcheck="false"></div></div><div class="field studio-color-field"><label for="studio-accent">Cor de destaque</label><div class="color-control"><input id="studio-accent" type="color" name="accent" value="${color(t.accent)}"><input class="hex-readout" aria-label="Código hexadecimal da cor de destaque" data-color-for="accent" maxlength="7" value="${color(t.accent)}" spellcheck="false"></div></div></div>
 <div class="contrast-panel" id="studio-contrast" aria-live="polite"><div class="contrast-sample" id="contrast-sample" style="background:${color(t.primary)};color:${color(t.accent)}">Aa</div><div class="contrast-copy"><strong id="contrast-title">${badge}</strong><span id="contrast-value">${ratio}:1 · ${ideal ? 'AAA para texto normal' : pass ? 'AA para texto normal' : 'Abaixo de AA para texto normal'}</span><p id="contrast-hint">${pass ? 'A cor de destaque é legível sobre o fundo principal.' : 'O texto de destaque pode ficar difícil de ler sobre o fundo principal.'}</p></div><button type="button" class="btn btn-outline btn-sm" id="contrast-fix" data-action="studio-fix-contrast" data-id="${attr(c.id)}" ${pass ? 'disabled' : ''}>Corrigir</button></div>
 </section>
 <section class="studio-panel"><div class="studio-panel-head"><span class="studio-step">02</span><div><h3>Textos e tipografia</h3><p>Escolha os títulos e a linguagem visual do espaço.</p></div></div><div class="form-grid"><div class="field"><label for="studio-font">Fonte do site</label><select id="studio-font" name="font"><option value="Georgia" ${t.font === 'Georgia' ? 'selected' : ''}>Clássica · Georgia</option><option value="Arial" ${t.font === 'Arial' ? 'selected' : ''}>Moderna · Arial</option><option value="Trebuchet" ${t.font === 'Trebuchet' ? 'selected' : ''}>Humanista · Trebuchet</option><option value="System" ${t.font === 'System' ? 'selected' : ''}>Sistema · Sem serifa</option></select></div><div class="field"><label for="studio-symbol">Emblema</label><input id="studio-symbol" name="symbol" maxlength="8" value="${attr(t.symbol)}" placeholder="✦"></div></div><div class="field"><label for="studio-hero">Título principal</label><input id="studio-hero" name="hero" maxlength="100" value="${attr(t.hero)}" placeholder="Dê boas-vindas ao seu universo"></div><div class="field"><label for="studio-subtitle">Subtítulo da capa</label><textarea id="studio-subtitle" name="subtitle" maxlength="220">${esc(t.subtitle)}</textarea></div></section>
 <section class="studio-panel"><div class="studio-panel-head"><span class="studio-step">03</span><div><h3>Imagem da capa</h3><p>Use uma imagem própria. A prévia mostra a mudança imediatamente.</p></div></div><div class="field"><label for="studio-cover">Enviar imagem</label><input id="studio-cover" type="file" name="coverFile" accept="image/png,image/jpeg,image/webp,image/gif"><small>PNG, JPG, WebP ou GIF de até 450 KB nesta demonstração. Armazenamento local.</small></div><button type="button" class="btn btn-outline btn-sm" data-action="studio-remove-cover" data-id="${attr(c.id)}">Remover imagem da capa</button></section>
 <div class="studio-save-row"><div class="studio-save-info"><strong>Alterações do Estúdio</strong><span>Veja antes de salvar. Publicar aplica o visual ao site da comunidade.</span></div><div class="row wrap"><button class="btn btn-outline" type="submit">Salvar rascunho</button><button type="button" class="btn btn-primary" data-action="publish-theme" data-id="${attr(c.id)}">Publicar alterações</button></div></div></form>
 <section class="studio-panel studio-modules"><div class="studio-panel-head"><span class="studio-step">04</span><div><h3>Blocos da página</h3><p>Organize as seções de acordo com as necessidades da comunidade.</p></div></div><div id="module-list">${mods.map((m, i) => `<div class="studio-module-row"><span class="module-number">${String(i + 1).padStart(2, '0')}</span><strong>${esc(m)}</strong><div class="row"><button class="module-action" type="button" aria-label="Subir ${attr(m)}" data-action="move-module" data-id="${attr(c.id)}" data-index="${i}" data-direction="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="module-action" type="button" aria-label="Descer ${attr(m)}" data-action="move-module" data-id="${attr(c.id)}" data-index="${i}" data-direction="1" ${i === mods.length - 1 ? 'disabled' : ''}>↓</button><button class="module-action remove" type="button" aria-label="Remover ${attr(m)}" data-action="remove-module" data-id="${attr(c.id)}" data-index="${i}">×</button></div></div>`).join('') || emptyState('Nenhum bloco. Adicione o primeiro abaixo.')}</div><form id="form-module" data-id="${attr(c.id)}"><div class="field"><label>Adicionar módulo</label><select name="module"><option>Boas-vindas</option><option>Próximos eventos</option><option>Calendário de atividades</option><option>Galeria da comunidade</option><option>Ranking em destaque</option><option>Mural de avisos</option></select></div><button type="submit" class="btn btn-outline btn-sm">+ Adicionar à página</button></form></section></div>
 <aside class="studio-preview-column"><div class="studio-preview-shell"><div class="studio-preview-top"><div><span class="eyebrow">VISUALIZAÇÃO INSTANTÂNEA</span><h3>Seu site, enquanto você cria</h3></div><span class="tag green" id="studio-preview-status">Ao vivo</span></div><div class="device-switch" role="group" aria-label="Tamanho da prévia"><button class="device-button ${session.device === 'desktop' ? 'active' : ''}" data-action="studio-device" data-id="${attr(c.id)}" data-device="desktop" type="button">▣ Desktop</button><button class="device-button ${session.device === 'mobile' ? 'active' : ''}" data-action="studio-device" data-id="${attr(c.id)}" data-device="mobile" type="button">▯ Celular</button><button type="button" class="device-button" data-action="studio-full-preview" data-id="${attr(c.id)}">↗ Ampliar</button></div><div id="studio-device-wrap" class="studio-device-wrap ${session.device === 'mobile' ? 'is-mobile' : ''}"><div class="preview-window studio-live-preview" id="studio-preview-window" style="${cssTheme(t)}"><div class="preview-header"><h3 id="studio-preview-brand">${esc(t.symbol)} ${esc(c.name)}</h3><span class="preview-nav">Início &nbsp; Eventos &nbsp; Ranking</span></div><div class="preview-hero ${t.cover ? 'has-cover' : ''}" id="studio-preview-hero" ${t.cover ? `style="background-image:linear-gradient(#000b,#0009),url('${attr(t.cover)}')"` : ''}><span class="preview-eyebrow">BEM-VINDO A ${esc(c.name.toUpperCase())}</span><h2 id="studio-preview-title">${esc(t.hero)}</h2><p id="studio-preview-subtitle">${esc(t.subtitle)}</p><span class="preview-cta">Explorar eventos →</span></div><div class="preview-blocks" id="studio-preview-modules">${mods.map((m, i) => `<div class="preview-module-card"><span>SEÇÃO ${i + 1}</span><strong>${esc(m)}</strong></div>`).join('')}</div><div class="preview-footer">Criado com VULPORA</div></div></div><p class="preview-explainer">Esta prévia é temporária. <strong>Salvar rascunho</strong> guarda o trabalho; <strong>Publicar</strong> atualiza o site público.</p></div><div class="studio-tip"><strong>Controle de contraste</strong><p>A prévia ajusta automaticamente a cor dos textos principais para preservar a leitura em temas claros ou escuros. O destaque continua configurável.</p></div></aside></div>`;
    } else if (tab === 'eventos') body = `<div class="section-head"><div><span class="eyebrow">CENTRAL DE EVENTOS</span><h2>Eventos de ${esc(c.name)}</h2><p>Os eventos nascem dentro da comunidade e têm páginas próprias.</p></div><button class="btn btn-primary btn-sm" data-action="create-event" data-id="${attr(c.id)}">+ Novo evento</button></div>${events.length ? events.map(e => `<article class="list-card"><div class="row between wrap"><div><span class="tag">${esc(e.symbol)} ${esc(e.type)}</span><h3 style="margin-top:12px">${esc(e.name)}</h3><p>${esc(e.description)}</p><small>${fmtDate(e.date)}</small></div><div class="row wrap">${statusTag(e.status)}<a class="btn btn-outline btn-sm" href="${eventLink(e.id)}">Abrir página</a>${e.status === 'rascunho' ? iconButton('submit-event', 'Enviar para aprovação', `data-id="${attr(e.id)}"`) : ''}</div></div></article>`).join('') : emptyState('Nenhum evento criado.')}<div class="card mt"><h3>Cronograma e liberações</h3><p>Defina o dia e horário exato em que cada atividade ou desafio será liberado para os membros do evento.</p><a class="btn btn-outline btn-sm" href="${manageLink(c.id, 'programacao')}">Ir para programação →</a></div>`;
    else if (tab === 'programacao') body = `<div class="section-head"><div><span class="eyebrow">AUTOMAÇÃO DE EVENTOS</span><h2>Programação de atividades</h2><p>Planeje a liberação de desafios e atividades por data e horário.</p></div><button class="btn btn-primary btn-sm" data-action="add-activity" data-id="${attr(c.id)}">+ Programar atividade</button></div><div class="notice-box mb">Esta agenda mostra a disponibilidade calculada no navegador (fuso de São Paulo). No produto real, o bloqueio será validado por API e servidor, inclusive em links diretos.</div><div class="card"><h3>Agenda da comunidade</h3><div class="timeline">${state.activities.filter(a => events.some(e => e.id === a.eventId)).sort((a, b) => a.release.localeCompare(b.release)).map(a => { const e = getEvent(a.eventId); return `<div class="time-row"><div class="time-label"><strong>${fmtDate(a.release)}</strong>${esc(a.timezone || 'America/Sao_Paulo')}</div><div><b>${esc(a.title)}</b><div class="mini-note">${esc(e?.name || 'Evento')} · ${esc(a.type)}</div></div>${statusTag(activityReady(a) ? 'liberada' : 'programada')}</div>`; }).join('') || emptyState('Nenhuma atividade agendada.')}</div></div>`;
    else if (tab === 'equipe') body = `<div class="section-head"><div><span class="eyebrow">ACESSO E PERMISSÕES</span><h2>Equipe da comunidade</h2><p>Gerencie integrantes e suas funções.</p></div><span class="tag gold">Acesso demo</span></div><div class="card mb"><h3>Integrantes atuais</h3>${c.team.map(t => `<div class="list-card"><div class="row between"><strong>${esc(t.name)}</strong><span class="tag">${esc(t.role)}</span></div></div>`).join('')}<form id="form-team" data-id="${attr(c.id)}"><div class="form-grid"><div class="field"><label>Nome do integrante (demo)</label><input name="name" maxlength="50" required placeholder="Ex.: Alex"></div><div class="field"><label>Função</label><select name="role"><option>Administrador</option><option>Organizador</option><option>Designer</option><option>Moderador</option><option>Membro</option></select></div></div><button class="btn btn-outline">Adicionar integrante fictício</button></form></div><div class="note">Papéis cadastrados aqui são apenas ilustrativos. O beta de produção exigirá convites reais, permissões por recurso e verificação no servidor.</div>`;
    else if (tab === 'solicitacoes') body = `<div class="section-head"><div><span class="eyebrow">FLUXO DE APROVAÇÕES</span><h2>Minhas solicitações</h2><p>Acompanhe os pedidos enviados à equipe VULPORA.</p></div><a class="btn btn-outline btn-sm" href="${manageLink(c.id)}">Voltar ao painel</a></div><div class="card">${req.map(r => `<div class="list-card"><div class="row between"><strong>${esc(r.title)}</strong>${statusTag(r.status)}</div><small>${esc(r.type)}</small>${r.comment ? `<p>Comentário: ${esc(r.comment)}</p>` : ''}</div>`).join('') || emptyState('Nenhuma solicitação enviada.')}</div>`;
    else body = emptyState('Seção não encontrada.');

    body = `<div class="auth-orbit auth-orbit-one" style="top: 15%; left: 5%;"></div><div class="auth-orbit auth-orbit-two" style="bottom: 10%; right: 5%;"></div>` + body;

    const content = `<div class="container">${crumbs([['Meu perfil', '#/perfil'], [c.name, commLink(c.id)], ['Gerenciamento', null]])}<div class="workspace">${sidebar(c, tab)}<div class="content-panel">${body}</div></div></div>`;
    layoutCommunity(c, content, '', true);
  }

  /* =========================================================
     EVENTO DE NATAL 2026 (INÍCIO + ÁRVORE LIBERADOS; 25 FASES POR DATA; PAINEL ADMIN)
     ========================================================= */
  function renderNatalAdminView(e, c) {
    const cfg = state.natalSystem;
    const schedule = resolveNatalSchedule();
    const pendingOrnaments = cfg.treeOrnaments.filter(o => o.status === 'pendente');
    const pendingSubs = cfg.submissions.filter(s => s.status === 'pendente');
    const door = cfg.doors.find(d => d.day === Number(adminSelectedDoor)) || cfg.doors[0];

    return `
      <div class="fade-in">
        <div class="natal-hero">
          <div class="row between wrap">
            <div>
              <span class="natal-tag">🛡️ ADMINISTRAÇÃO DO EVENTO</span>
              <h1 style="margin:10px 0 6px;font-size:clamp(1.6rem,3vw,2.3rem);color:#fff">Painel Admin · ${esc(e.name)}</h1>
              <p style="margin:0;color:#cbb8a6">Controle de liberação das 25 fases, moderação da Árvore Comunitária, participantes e auditoria.</p>
            </div>
            <span class="natal-tag is-green">${esc(schedule.label)}</span>
          </div>
        </div>

        <div class="natal-card mb">
          <div class="row between wrap mb">
            <div>
              <h3 style="margin:0 0 4px;color:#fff">🗓️ Controle de Fases & Liberação por Data</h3>
              <p class="mini-note" style="margin:0">No modo <strong>Automático</strong>, antes de 01/12 apenas <strong>Início</strong> e <strong>Árvore</strong> ficam acessíveis. De 01/12 a 25/12, cada fase abre à 00h00 (Brasília).</p>
            </div>
            <span class="natal-tag">Modo atual: ${esc(cfg.scheduleMode.toUpperCase())}</span>
          </div>

          <form id="form-natal-schedule" data-event="${attr(e.id)}" class="grid grid-2">
            <div class="field" style="margin:0">
              <label>Regra de Liberação das Fases</label>
              <select name="scheduleMode">
                <option value="auto" ${cfg.scheduleMode === 'auto' ? 'selected' : ''}>Automático (1º a 25/12 · 00h Brasília)</option>
                <option value="locked" ${cfg.scheduleMode === 'locked' ? 'selected' : ''}>Bloqueio Pré-Evento (Apenas Início e Árvore)</option>
                <option value="manual" ${cfg.scheduleMode === 'manual' ? 'selected' : ''}>Simular Dia Específico (Trava dias futuros)</option>
                <option value="test_all" ${cfg.scheduleMode === 'test_all' ? 'selected' : ''}>Modo Teste (Todas as 25 fases liberadas)</option>
              </select>
            </div>
            <div class="field" style="margin:0">
              <label>Dia Simulado (0 a 25 · usado no modo "Simular Dia")</label>
              <div class="row">
                <input type="number" name="manualDay" min="0" max="25" value="${Number(cfg.manualDay) || 0}">
                <button type="submit" class="natal-btn natal-btn-gold">Salvar Regra</button>
              </div>
            </div>
          </form>
        </div>

        <div class="grid grid-2 mb">
          <div class="natal-card">
            <div class="row between wrap mb">
              <h3 style="margin:0;color:#fff">🎄 Moderação da Árvore</h3>
              <span class="natal-tag">${pendingOrnaments.length} pendentes</span>
            </div>
            ${cfg.treeOrnaments.length ? cfg.treeOrnaments.map(o => `
              <div class="list-card" style="background:rgba(14,5,8,0.65);border-color:rgba(244,165,29,0.2)">
                <div class="row between wrap">
                  <div>
                    <strong>${esc(o.icon)} ${esc(o.authorName)}</strong> <small class="muted">(@${esc(o.authorHandle)})</small>
                    <p style="margin:6px 0;font-size:13px">${esc(o.message)}</p>
                  </div>
                  ${statusTag(o.status)}
                </div>
                <div class="row wrap mt">
                  ${o.status !== 'aprovada' ? `<button type="button" class="natal-btn natal-btn-gold" style="padding:6px 12px;font-size:12px" data-action="natal-mod-ornament" data-id="${attr(o.id)}" data-decision="aprovada">Aprovar</button>` : ''}
                  ${o.status !== 'recusada' ? `<button type="button" class="natal-btn natal-btn-outline" style="padding:6px 12px;font-size:12px" data-action="natal-mod-ornament" data-id="${attr(o.id)}" data-decision="recusada">Recusar</button>` : ''}
                  <button type="button" class="natal-btn natal-btn-red" style="padding:6px 12px;font-size:12px" data-action="natal-del-ornament" data-id="${attr(o.id)}">Remover</button>
                </div>
              </div>
            `).join('') : emptyState('Nenhum enfeite enviado ainda.')}
          </div>

          <div class="natal-card">
            <div class="row between wrap mb">
              <h3 style="margin:0;color:#fff">📬 Entregas de Fases (Revisão)</h3>
              <span class="natal-tag">${pendingSubs.length} pendentes</span>
            </div>
            ${cfg.submissions.length ? cfg.submissions.map(s => `
              <div class="list-card" style="background:rgba(14,5,8,0.65);border-color:rgba(244,165,29,0.2)">
                <div class="row between wrap">
                  <div>
                    <strong>Dia ${String(s.day).padStart(2, '0')} · ${esc(s.authorName)}</strong>
                    <p style="margin:6px 0;font-size:13px">${esc(s.answer)}</p>
                  </div>
                  ${statusTag(s.status)}
                </div>
                ${s.status === 'pendente' ? `
                  <div class="row wrap mt">
                    <button type="button" class="natal-btn natal-btn-gold" style="padding:6px 12px;font-size:12px" data-action="natal-mod-sub" data-id="${attr(s.id)}" data-decision="aprovada">Aprovar (+pts)</button>
                    <button type="button" class="natal-btn natal-btn-outline" style="padding:6px 12px;font-size:12px" data-action="natal-mod-sub" data-id="${attr(s.id)}" data-decision="recusada">Recusar</button>
                  </div>
                ` : ''}
              </div>
            `).join('') : emptyState('Nenhuma entrega aguardando revisão.')}
          </div>
        </div>

        <div class="natal-card mb">
          <div class="row between wrap mb">
            <div>
              <h3 style="margin:0 0 4px;color:#fff">🎁 Configurar Conteúdo das 25 Fases</h3>
              <p class="mini-note" style="margin:0">Edite o título, desafio e pontos de qualquer dia do Advento.</p>
            </div>
            <div class="row">
              <label class="mini-note" for="admin-door-picker">Selecionar dia:</label>
              <select id="admin-door-picker" data-action="natal-select-door" style="padding:8px 12px;border-radius:10px;background:#12060a;color:#fff;border:1px solid rgba(244,165,29,0.35)">
                ${cfg.doors.map(d => `<option value="${d.day}" ${d.day === door.day ? 'selected' : ''}>Dia ${String(d.day).padStart(2, '0')}/12 · ${esc(d.title)}</option>`).join('')}
              </select>
            </div>
          </div>

          <form id="form-natal-door" data-day="${door.day}">
            <div class="grid grid-2">
              <div class="field">
                <label>Título da Fase (Dia ${String(door.day).padStart(2, '0')}/12)</label>
                <input name="title" required maxlength="80" value="${attr(door.title)}">
              </div>
              <div class="field">
                <label>Minigame / Tipo de Desafio</label>
                <select name="gameType">
                  <option value="memoria" ${door.gameType === 'memoria' ? 'selected' : ''}>Jogo da memória</option>
                  <option value="quiz" ${door.gameType === 'quiz' ? 'selected' : ''}>Quiz de alternativas</option>
                  <option value="reacao" ${door.gameType === 'reacao' ? 'selected' : ''}>Teste de reação</option>
                  <option value="palavra" ${door.gameType === 'palavra' ? 'selected' : ''}>Palavra embaralhada</option>
                  <option value="sequencia" ${door.gameType === 'sequencia' ? 'selected' : ''}>Sequência luminosa</option>
                  <option value="resposta" ${door.gameType === 'resposta' ? 'selected' : ''}>Resposta / Missão com aprovação</option>
                </select>
              </div>
            </div>
            <div class="grid grid-2">
              <div class="field">
                <label>Descrição / Enunciado</label>
                <input name="description" required maxlength="220" value="${attr(door.description)}">
              </div>
              <div class="field">
                <label>Pontuação da Fase</label>
                <input type="number" name="points" min="10" max="1000" value="${Number(door.points) || 50}">
              </div>
            </div>
            <button type="submit" class="natal-btn natal-btn-gold">Salvar Fase ${String(door.day).padStart(2, '0')}</button>
          </form>
        </div>

        <div class="grid grid-2">
          <div class="natal-card">
            <h3 style="margin:0 0 12px;color:#fff">👥 Participantes & Pontuação</h3>
            ${cfg.participants.map(p => `
              <div class="list-card row between wrap" style="background:rgba(14,5,8,0.65);border-color:rgba(244,165,29,0.2)">
                <div>
                  <strong>${esc(p.name)}</strong> <small class="muted">(@${esc(p.handle)})</small>
                  <div class="mini-note">${p.points} pts · ${p.completedDoors.length}/25 fases · ${p.approvedCount || 0} aprovadas ${p.banned ? '· ⛔ Bloqueado' : ''}</div>
                </div>
                <div class="row wrap">
                  <button type="button" class="natal-btn natal-btn-outline" style="padding:5px 10px;font-size:11px" data-action="natal-adjust-pts" data-handle="${attr(p.handle)}" data-delta="50">+50 pts</button>
                  <button type="button" class="natal-btn natal-btn-outline" style="padding:5px 10px;font-size:11px" data-action="natal-adjust-pts" data-handle="${attr(p.handle)}" data-delta="-50">-50 pts</button>
                  <button type="button" class="natal-btn natal-btn-red" style="padding:5px 10px;font-size:11px" data-action="natal-toggle-ban" data-handle="${attr(p.handle)}">${p.banned ? 'Desbloquear' : 'Bloquear'}</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="natal-card">
            <h3 style="margin:0 0 12px;color:#fff">📋 Registro de Auditoria</h3>
            ${state.audit.slice(0, 8).map(log => `
              <div class="list-card" style="background:rgba(14,5,8,0.65);border-color:rgba(244,165,29,0.2)">
                <strong style="font-size:13px">${esc(log.message)}</strong>
                <div class="mini-note">${esc(log.actor || 'Equipe')} · ${fmtDate(log.date)}</div>
              </div>
            `).join('') || emptyState('Nenhuma ação administrativa registrada ainda.')}
          </div>
        </div>
      </div>
    `;
  }

  function publicEvent(e, requestedTab = 'inicio') {
    if (!e) { layoutPortal('<div class="container"><div class="empty">Evento não encontrado.</div></div>'); return; }
    const c = getCommunity(e.communityId);
    if (!c) { layoutPortal('<div class="container"><div class="empty">Comunidade do evento não encontrada.</div></div>'); return; }

    setScreenAttr('event');
    const adminUser = isEventAdmin(c);
    const schedule = resolveNatalSchedule();
    const cfg = state.natalSystem;
    const me = getOrCreateNatalParticipant();
    const completedCount = me ? me.completedDoors.length : 0;
    const progressPct = Math.round((completedCount / NATAL_TOTAL_DOORS) * 100);

    let tab = requestedTab === 'atividades' ? 'calendario' : (requestedTab || 'inicio');
    const validTabs = ['inicio', 'arvore', 'calendario', 'ranking', 'premios', 'admin'];
    if (!validTabs.includes(tab)) tab = 'inicio';

    if (!canAccessNatalTab(tab, c)) {
      toast('🔒 Fases bloqueadas! Por enquanto apenas Início e Árvore estão liberados.');
      tab = 'inicio';
    }

    const navItems = [
      { key: 'inicio', label: 'Início', icon: '🏠' },
      { key: 'arvore', label: 'Árvore', icon: '🎄' },
      { key: 'calendario', label: 'Fases (Advento)', icon: '📅' },
      { key: 'ranking', label: 'Ranking', icon: '🏆' },
      { key: 'premios', label: 'Premiações', icon: '🎁' }
    ];
    if (adminUser) {
      navItems.push({ key: 'admin', label: 'Painel Admin', icon: '🛡️' });
    }

    const approvedOrnaments = cfg.treeOrnaments.filter(o => o.status === 'aprovada');
    let mainBody = '';

    if (tab === 'inicio') {
      mainBody = `
        <div class="fade-in">
          <section class="natal-hero">
            <div class="row between wrap mb">
              <span class="natal-tag">${esc(e.symbol)} ${esc(c.name.toUpperCase())} · NATAL 2026</span>
              <span class="natal-tag ${schedule.isPreEvent ? '' : 'is-green'}">${schedule.isPreEvent ? '🔒 Pré-evento · Início & Árvore liberados' : `✨ ${esc(schedule.label)}`}</span>
            </div>
            <h1 class="shimmer-title" style="font-size:clamp(2rem,4vw,3rem);margin:8px 0 12px">${esc(e.name)}</h1>
            <p style="max-width:640px;color:#e6d5c5;font-size:15.5px;line-height:1.65;margin:0 0 22px">${esc(e.description)}</p>
            <div class="row wrap">
              <a class="natal-btn natal-btn-gold" href="${eventLink(e.id, 'arvore')}">🎄 Decorar a Árvore →</a>
              ${!schedule.isPreEvent || adminUser
                ? `<a class="natal-btn natal-btn-red" href="${eventLink(e.id, 'calendario')}">📅 Ver 25 Fases</a>`
                : `<button type="button" class="natal-btn natal-btn-outline" data-action="natal-locked-notice">🔒 Fases liberam em 01/12</button>`}
              ${adminUser ? `<a class="natal-btn natal-btn-outline" href="${eventLink(e.id, 'admin')}">🛡️ Painel Admin</a>` : ''}
            </div>
          </section>

          <div class="grid grid-3 mb">
            <div class="natal-card">
              <div class="feature-icon" style="background:rgba(244,165,29,0.14);border-color:rgba(244,165,29,0.35)">🎄</div>
              <h3 style="color:#fff">Árvore Comunitária</h3>
              <p style="color:#cbb8a6">Já está aberta! Envie seu enfeite e mensagem de Natal para decorar a árvore oficial de ${esc(c.name)}.</p>
              <a class="natal-btn natal-btn-outline mt" href="${eventLink(e.id, 'arvore')}">Acessar Árvore ↗</a>
            </div>

            <div class="natal-card">
              <div class="feature-icon" style="background:rgba(168,30,35,0.28);border-color:rgba(244,165,29,0.35)">📅</div>
              <h3 style="color:#fff">25 Fases do Advento</h3>
              <p style="color:#cbb8a6">${schedule.isPreEvent
                ? 'As 25 fases estão bloqueadas e serão liberadas uma por dia de 01/12 a 25/12 às 00h00 (Brasília).'
                : `Atualmente liberadas até o dia ${String(schedule.maxUnlockedDay).padStart(2, '0')}/12. Complete as fases do dia!`}</p>
              ${!schedule.isPreEvent || adminUser
                ? `<a class="natal-btn natal-btn-outline mt" href="${eventLink(e.id, 'calendario')}">Abrir Calendário ↗</a>`
                : `<span class="natal-tag mt">🔒 Abertura em 01/12 · 00h BRT</span>`}
            </div>

            <div class="natal-card">
              <div class="feature-icon" style="background:rgba(244,165,29,0.14);border-color:rgba(244,165,29,0.35)">🎁</div>
              <h3 style="color:#fff">Recompensas & Lembrança</h3>
              <p style="color:#cbb8a6">Participe das fases quando abrirem: 3 fases aprovadas garantem a lembrança oficial do evento.</p>
              <span class="natal-tag mt">${e.prizes.length} recompensas cadastradas</span>
            </div>
          </div>

          <div class="natal-card">
            <h3 style="margin:0 0 8px;color:#fff">📜 Como funciona o cronograma</h3>
            <p style="margin:0;color:#cbb8a6;line-height:1.65">
- <strong>Fase de Preparação (agora):</strong> Apenas as páginas <strong>Início</strong> e <strong>Árvore</strong> estão abertas para todos os membros.<br>
- <strong>Liberação Diária (01/12 a 25/12):</strong> À meia-noite (horário de Brasília) de cada dia, uma nova fase do Calendário do Advento é desbloqueada automaticamente. Fases futuras permanecem trancadas até sua data oficial.
            </p>
          </div>
        </div>
      `;
    } else if (tab === 'arvore') {
      mainBody = `
        <div class="fade-in">
          <div class="tree-stage mb">
            <span class="natal-tag mb">🎄 ÁRVORE COMUNITÁRIA · LIBERADA</span>
            <div class="tree-visual" aria-hidden="true">🎄</div>
            <h2 class="shimmer-title" style="margin:0 0 8px;font-size:clamp(1.6rem,3vw,2.2rem)">Árvore de Natal de ${esc(c.name)}</h2>
            <p style="max-width:560px;margin:0 auto;color:#e6d5c5">Cada enfeite aprovado pela equipe ilumina a árvore da comunidade durante toda a temporada.</p>

            <div class="ornament-chips">
              ${approvedOrnaments.map(o => `
                <div class="ornament-chip" title="${attr(o.message)}">
                  <span>${esc(o.icon)}</span>
                  <strong>${esc(o.authorName)}:</strong>
                  <span>${esc(o.message)}</span>
                </div>
              `).join('') || '<span class="mini-note">Seja o primeiro a pendurar um enfeite na árvore!</span>'}
            </div>
          </div>

          <div class="grid grid-2">
            <div class="natal-card">
              <h3 style="margin:0 0 8px;color:#fff">✨ Pendurar meu enfeite</h3>
              <p class="mini-note mb">Seu enfeite passa pela moderação do Painel Admin antes de aparecer para todos na árvore.</p>
              ${authUser ? `
                <form id="form-natal-ornament" data-event="${attr(e.id)}">
                  <div class="field">
                    <label>Escolha o enfeite</label>
                    <select name="icon">
                      <option value="⭐">⭐ Estrela Dourada</option>
                      <option value="🔔">🔔 Sino de Natal</option>
                      <option value="❄️">❄️ Cristal de Neve</option>
                      <option value="🎁">🎁 Presente Real</option>
                      <option value="🕯️">🕯️ Vela Carmesim</option>
                      <option value="🦌">🦌 Rena Guardiã</option>
                    </select>
                  </div>
                  <div class="field">
                    <label>Mensagem ou desejo de Natal</label>
                    <textarea name="message" required maxlength="140" rows="3" placeholder="Escreva sua mensagem para a árvore da comunidade..."></textarea>
                  </div>
                  <button type="submit" class="natal-btn natal-btn-gold">Enviar enfeite para a Árvore 🎄</button>
                </form>
              ` : `
                <p style="color:#cbb8a6">Entre na sua conta VULPORA para pendurar um enfeite na árvore.</p>
                <a class="natal-btn natal-btn-gold" href="#/login">Entrar para participar ↗</a>
              `}
            </div>

            <div class="natal-card">
              <h3 style="margin:0 0 12px;color:#fff">🌟 Enfeites na Árvore (${approvedOrnaments.length})</h3>
              ${approvedOrnaments.map(o => `
                <div class="list-card" style="background:rgba(14,5,8,0.65);border-color:rgba(244,165,29,0.22)">
                  <div class="row between">
                    <strong>${esc(o.icon)} ${esc(o.authorName)}</strong>
                    <span class="mini-note">@${esc(o.authorHandle)}</span>
                  </div>
                  <p style="margin:6px 0 0;font-size:13.5px;color:#e6d5c5">${esc(o.message)}</p>
                </div>
              `).join('') || emptyState('Nenhum enfeite aprovado ainda.')}
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'calendario') {
      mainBody = `
        <div class="fade-in">
          <div class="natal-hero">
            <div class="row between wrap">
              <div>
                <span class="natal-tag">📅 CALENDÁRIO DO ADVENTO · 25 FASES</span>
                <h2 class="shimmer-title" style="margin:10px 0 6px;font-size:clamp(1.6rem,3vw,2.2rem)">Fases do Natal 2026</h2>
                <p style="margin:0;color:#e6d5c5">Cada porta abre automaticamente às 00h00 (horário de Brasília) no seu dia correspondente de dezembro.</p>
              </div>
              <span class="natal-tag is-green">${esc(schedule.label)}</span>
            </div>
          </div>

          <div class="advent-doors-grid">
            ${cfg.doors.map(door => {
              const unlocked = isNatalDoorUnlocked(door.day, c);
              const done = Boolean(me && me.completedDoors.includes(door.day));
              const dateLabel = `${String(door.day).padStart(2, '0')}/12`;
              return `
                <button
                  type="button"
                  class="door-tile ${unlocked ? 'is-open' : 'is-locked'} ${done ? 'is-done' : ''}"
                  data-action="natal-open-door"
                  data-day="${door.day}"
                  ${!unlocked ? `title="Libera em ${dateLabel} às 00:00 (Brasília)"` : ''}
                >
                  <div class="row between" style="width:100%">
                    <span class="natal-tag" style="padding:2px 8px;font-size:10px">DIA ${String(door.day).padStart(2, '0')}</span>
                    <span>${done ? '✅' : unlocked ? '🎁' : '🔒'}</span>
                  </div>
                  <strong style="font-size:14px;color:#fff;margin-top:4px">${esc(door.title)}</strong>
                  <span class="mini-note">${dateLabel} · ${door.points} pts</span>
                  <span style="font-size:11px;font-weight:700;color:${done ? '#86efac' : unlocked ? '#f4a51d' : '#cbb8a6'}">
                    ${done ? 'Concluída' : unlocked ? 'Liberada · Jogar' : `Bloqueada (${dateLabel})`}
                  </span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if (tab === 'ranking') {
      const sorted = [...cfg.participants].sort((a, b) => b.points - a.points);
      mainBody = `
        <div class="fade-in">
          <div class="natal-card">
            <span class="natal-tag mb">🏆 CLASSIFICAÇÃO DO EVENTO</span>
            <h2 style="margin:6px 0 16px;color:#fff">Ranking · ${esc(e.name)}</h2>
            ${sorted.map((p, i) => `
              <div class="rank-row" style="background:rgba(168,30,35,0.18);border:1px solid rgba(244,165,29,0.2)">
                <span class="badge-num" style="background:rgba(244,165,29,0.2);color:#f4a51d">${i + 1}</span>
                <span class="avatar">${esc(p.name[0]?.toUpperCase() || 'U')}</span>
                <div>
                  <strong>${esc(p.name)}</strong>
                  <div class="mini-note">${p.completedDoors.length}/25 fases concluídas</div>
                </div>
                <strong style="margin-left:auto;color:#f4a51d">${p.points} <small>pts</small></strong>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (tab === 'premios') {
      mainBody = `
        <div class="fade-in">
          <div class="natal-card mb">
            <span class="natal-tag mb">🎁 RECOMPENSAS OFICIAIS</span>
            <h2 style="margin:6px 0 16px;color:#fff">Premiações · ${esc(e.name)}</h2>
            <div class="grid grid-3">
              ${e.prizes.map((p, i) => `
                <div class="list-card" style="background:rgba(14,5,8,0.65);border-color:rgba(244,165,29,0.28)">
                  <div class="feature-icon" style="background:rgba(244,165,29,0.14);border-color:rgba(244,165,29,0.35)">🎁</div>
                  <h3 style="color:#fff;margin:8px 0">${esc(typeof p === 'string' ? p : p.name)}</h3>
                  <p class="mini-note">${esc(typeof p === 'string' ? `Recompensa oficial ${i + 1} do Advento.` : p.description || '')}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'admin') {
      mainBody = renderNatalAdminView(e, c);
    }

    const app = $('#app');
    app.className = '';
    app.style.cssText = '';
    app.innerHTML = `
      ${eventStyles()}
      <div class="natal-shell">
        <header class="topbar">
          <div class="topbar-inner">
            ${crumbs([['VULPORA', portalLink('inicio')], [c.name, commLink(c.id)], [e.name, null]])}
            <div class="top-actions">
              ${authUser
                ? `<a class="profile-link" href="#/perfil">${esc(state.user.name)}</a>`
                : `<a class="natal-btn natal-btn-gold" style="padding:7px 14px;font-size:12px" href="#/login">Entrar</a>`}
            </div>
          </div>
        </header>

        <div class="natal-layout">
          <aside class="natal-sidebar">
            <div class="natal-side-head">
              <div class="natal-side-emblem">${esc(e.symbol)}</div>
              <div>
                <strong style="display:block;color:#fff;font-size:15px">${esc(e.name)}</strong>
                <small style="color:#f4a51d;font-size:11px;font-weight:700">${esc(c.name)}</small>
              </div>
            </div>

            <nav class="natal-side-nav" aria-label="Navegação do Evento de Natal">
              ${navItems.map(item => {
                const allowed = canAccessNatalTab(item.key, c);
                const active = tab === item.key;
                return `
                  <a href="${eventLink(e.id, item.key)}"
                     data-action="natal-nav"
                     data-event="${attr(e.id)}"
                     data-tab="${item.key}"
                     class="${active ? 'active' : ''} ${!allowed ? 'is-locked' : ''}"
                     ${!allowed ? 'aria-disabled="true" title="Fase bloqueada até 01/12"' : ''}>
                    <span>${item.icon} ${item.label}</span>
                    ${!allowed ? '<small>🔒</small>' : ''}
                  </a>
                `;
              }).join('')}
            </nav>

            <div class="natal-progress-box">
              <div class="row between">
                <span style="font-size:12px;font-weight:700;color:#f1e4d4">Progresso Advento</span>
                <strong style="font-size:12px;color:#f4a51d">${completedCount}/25</strong>
              </div>
              <div class="natal-progress-bar"><span style="width:${progressPct}%"></span></div>
              <small class="mini-note" style="display:block;margin-top:6px">
                ${schedule.isPreEvent ? '🔒 Fases bloqueadas até 01/12' : `Liberado até dia ${String(schedule.maxUnlockedDay).padStart(2, '0')}/12`}
              </small>
            </div>

            <div class="side-foot">
              <a class="natal-btn natal-btn-outline" style="width:100%" href="${commLink(c.id)}">← Voltar para ${esc(c.name)}</a>
            </div>
          </aside>

          <main>${mainBody}</main>
        </div>
      </div>
    `;
  }

  function openNatalDoorModal(day) {
    const c = getCommunity('the-kingdom');
    if (!isNatalDoorUnlocked(day, c)) {
      const dateLabel = `${String(day).padStart(2, '0')}/12`;
      toast(`🔒 Fase bloqueada! A Fase ${day} abre no dia ${dateLabel} às 00:00 (Brasília).`);
      return;
    }

    const door = state.natalSystem.doors.find(d => d.day === day);
    if (!door) return;

    const me = getOrCreateNatalParticipant();
    if (me?.banned) {
      toast('⛔ Sua participação neste evento está suspensa pela moderação.');
      return;
    }

    const alreadyDone = Boolean(me && me.completedDoors.includes(day));
    const dateLabel = `${String(day).padStart(2, '0')}/12/2026`;

    const actionHtml = !authUser
      ? `<p>Entre na sua conta para jogar esta fase e registrar seus pontos no Advento.</p><a class="btn btn-primary" href="#/login">Entrar na conta ↗</a>`
      : alreadyDone
        ? `<div class="notice-box">✅ Você já concluiu a Fase ${String(day).padStart(2, '0')} e garantiu <strong>+${door.points} pts</strong>!</div>`
        : door.gameType === 'resposta'
          ? `
            <form id="form-natal-door-submit" data-day="${day}">
              <div class="field">
                <label>Sua resposta / entrega da missão</label>
                <textarea name="answer" required maxlength="300" rows="3" placeholder="Escreva sua resposta para validação da equipe..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Enviar resposta (+${door.points} pts)</button>
            </form>
          `
          : `
            <div class="row wrap">
              <button type="button" class="btn btn-primary" data-action="natal-play-door-game" data-day="${day}" data-game="${attr(door.gameType)}">
                ▶ Iniciar Desafio (${esc(door.gameLabel || 'Minigame')})
              </button>
              <button type="button" class="btn btn-outline" data-action="natal-complete-door" data-day="${day}">
                ✓ Concluir Fase (+${door.points} pts)
              </button>
            </div>
          `;

    modal(
      `Fase ${String(day).padStart(2, '0')} · ${door.title}`,
      `
        <div class="row between wrap mb">
          <span class="tag gold">📅 Liberação oficial: ${dateLabel} · 00h Brasília</span>
          <span class="tag green">+${door.points} pontos</span>
        </div>
        <p style="margin-bottom:18px;line-height:1.6">${esc(door.description)}</p>
        ${actionHtml}
      `
    );
  }

  function admin(tab) {
    const pending = state.requests.filter(r => r.status === 'em análise'), all = state.requests;
    const schedule = resolveNatalSchedule();
    const pendingOrnaments = state.natalSystem.treeOrnaments.filter(o => o.status === 'pendente').length;
    let content = '';
    if (tab === 'solicitacoes') content = `<div class="section-head"><div><span class="eyebrow">FILA ÚNICA</span><h2>Solicitações recebidas</h2><p>Revisão por um administrador autorizado, com registro de decisões.</p></div><span class="tag gold">${pending.length} pendentes</span></div><div class="card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Solicitação</th><th>Tipo</th><th>Estado</th><th>Decisão</th></tr></thead><tbody>${all.map(r => `<tr><td><b>${esc(r.title)}</b><br><small>${esc(r.communityId || '—')}</small></td><td>${esc(r.type)}</td><td>${statusTag(r.status)}</td><td>${r.status === 'em análise' ? `<div class="row wrap"><button class="btn btn-primary btn-sm" data-action="decide-request" data-id="${attr(r.id)}" data-decision="aprovada">Aprovar</button><button class="btn btn-outline btn-sm" data-action="decide-request" data-id="${attr(r.id)}" data-decision="ajustes solicitados">Pedir ajustes</button></div>` : '—'}</td></tr>`).join('') || '<tr><td colspan="4">Ainda não há solicitações para analisar.</td></tr>'}</tbody></table></div></div>`;
    else if (tab === 'comunidades') content = `<div class="section-head"><div><span class="eyebrow">PLATAFORMA</span><h2>Comunidades cadastradas</h2></div></div><div class="grid grid-2">${state.communities.map(c => `<div class="card"><div class="row between"><h3>${esc(c.name)}</h3>${statusTag(c.status)}</div><p>${esc(c.description)}</p><div class="row wrap"><a class="btn btn-outline btn-sm" href="${commLink(c.id)}">Abrir espaço</a><a class="btn btn-outline btn-sm" href="${manageLink(c.id)}">Gestão demo</a></div></div>`).join('')}</div>`;
    else if (tab === 'auditoria') content = `<div class="section-head"><div><span class="eyebrow">RASTREABILIDADE</span><h2>Histórico de ações</h2><p>Registros das interações administrativas realizadas.</p></div></div><div class="card">${state.audit.map(x => `<div class="list-card"><strong>${esc(x.message)}</strong><p>${esc(x.actor || 'Equipe')} · ${fmtDate(x.date)}</p></div>`).join('') || '<p>Nenhuma ação registrada.</p>'}</div>`;
    else content = `<div class="section-head"><div><span class="eyebrow">ADMINISTRAÇÃO VULPORA</span><h2>Central de controle</h2><p>Visão geral da equipe responsável pela plataforma e pelo Evento de Natal.</p></div></div><div class="grid grid-3 mb"><div class="card metric"><strong>${state.communities.length}</strong><span>Comunidades</span></div><div class="card metric"><strong>${pendingOrnaments}</strong><span>Enfeites pendentes</span></div><div class="card metric"><strong>${pending.length}</strong><span>Solicitações pendentes</span></div></div><div class="grid grid-2"><div class="card"><h3>🎄 Painel Admin · Natal 2026</h3><p>Status atual: <strong>${esc(schedule.label)}</strong>. Gerencie o bloqueio das fases, aprove enfeites da Árvore e edite os 25 dias.</p><a class="btn btn-primary btn-sm" href="${eventLink('natal-2026', 'admin')}">Abrir Painel do Natal ↗</a></div><div class="card"><h3>Fila de aprovações</h3><p>Reúna os pedidos e mantenha um histórico das decisões.</p><a class="btn btn-outline btn-sm" href="#/admin/solicitacoes">Analisar solicitações ↗</a></div></div>`;
    const side = `<aside class="sidebar"><h3>VULPORA / Equipe</h3>${[['inicio', '◉ Visão geral'], ['solicitacoes', '☷ Solicitações'], ['comunidades', '♛ Comunidades'], ['auditoria', '◷ Auditoria']].map(([k, v]) => `<a class="${tab === k ? 'active' : ''}" href="#/admin/${k}">${v}</a>`).join('')}<a href="${eventLink('natal-2026', 'admin')}">🎄 Painel Admin Natal</a><hr><a href="#/perfil">← Meu perfil</a></aside>`;

    content = `<div class="auth-orbit auth-orbit-one" style="top: 20%; left: -2%;"></div>` + content;
    layoutPortal(`<div class="container">${crumbs([['Portal', portalLink('inicio')], ['Administração', null]])}<div class="workspace">${side}<div class="content-panel">${content}</div></div></div>`);
  }

  function route() {
    const rawHash = location.hash.replace(/^#\/?/, '') || 'portal/inicio';
    const [rawPath, rawQuery = ''] = rawHash.split('?');
    const parts = rawPath.split('/').filter(Boolean).map(part => {
      try { return decodeURIComponent(part); } catch { return part; }
    });
    const query = new URLSearchParams(rawQuery);
    const [root, p1, p2] = parts;
    closeModal();
    try {
      if (root === 'login' || root === 'cadastro') {
        const oauthError = query.get('erro') || '';
        const app = $('#app');
        app.className = '';
        app.style.cssText = '';
        app.innerHTML = authPage(root, oauthError);
        if (oauthError) {
          toast(OAUTH_ERRORS[oauthError] || 'Falha na autenticação.');
          history.replaceState(null, '', `#/${root}`);
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      if (!guardRoute(root, p1)) {
        if (!authLoaded) $('#app').innerHTML = '<div class="loading">Verificando sessão...</div>';
        return;
      }
      if (!root || root === 'portal') {
        if (p1 === 'criar') {
          layoutPortal(portalCreate(), 'comunidades');
        } else {
          const tab = ['inicio', 'comunidades', 'contato'].includes(p1) ? p1 : 'inicio';
          layoutPortal(({ inicio: portalHome, comunidades: portalCommunities, contato: portalContact })[tab](), tab);
        }
      } else if (root === 'perfil') {
        pendingAvatarDataUrl = null;
        const app = $('#app');
        app.className = '';
        app.style.cssText = '';
        app.innerHTML = profile(p1 || 'posts');
      } else if (root === 'usuario') {
        publicUserProfile(p1);
      } else if (root === 'comunidade') {
        const c = getCommunity(p1);
        c ? publicCommunity(c, p2 || 'inicio') : layoutPortal('<div class="container"><div class="empty">Comunidade não encontrada.</div></div>');
      } else if (root === 'gerenciar') manage(getCommunity(p1), p2 || 'visao');
      else if (root === 'evento') publicEvent(getEvent(p1 || 'natal-2026'), p2 || 'inicio');
      else if (root === 'admin') admin(p1 || 'inicio');
      else layoutPortal(portalHome(), 'inicio');
    } catch (err) {
      console.error(err);
      layoutPortal(`<div class="container">${pageHead('ALGO DEU ERRADO', 'Não foi possível abrir esta seção', 'Tente voltar à página principal.')}<a class="btn btn-primary" href="${portalLink('inicio')}">Voltar ao portal</a></div>`);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function closeModal() {
    const root = $('#modal-root');
    if (root) root.innerHTML = '';
    clearTimeout(gameTimer);
  }

  function modal(title, body, wide = false) {
    $('#modal-root').innerHTML = `<div class="modal-scrim" data-close="1"><div class="auth-orbit auth-orbit-one"></div><div class="auth-orbit auth-orbit-two"></div><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${attr(title)}"><div class="modal-head"><h2>✦ ${esc(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="Fechar">✕</button></div>${body}</section></div>`;
  }

  function createEventModal(cid) {
    const c = getCommunity(cid);
    if (!c) return;
    modal('Criar evento', `<p>O evento ficará vinculado ao universo <strong>${esc(c.name)}</strong>.</p><form id="form-event" data-id="${attr(cid)}"><div class="field"><label>Nome do evento</label><input name="name" required maxlength="90" placeholder="Ex.: Festival do Reino"></div><div class="field"><label>Descrição</label><textarea name="description" required maxlength="500" placeholder="O que vai acontecer?"></textarea></div><div class="form-grid"><div class="field"><label>Tipo</label><select name="type"><option value="temporario">Temporário</option><option value="permanente">Permanente</option><option value="recorrente">Recorrente</option></select></div><div class="field"><label>Início planejado (São Paulo)</label><input type="datetime-local" required name="date" value="2026-12-15T19:00"></div></div><button class="btn btn-primary">Criar evento em rascunho</button></form>`);
  }

  function addActivityModal(cid) {
    const events = state.events.filter(e => e.communityId === cid);
    if (!events.length) { toast('Crie um evento antes de programar uma atividade.'); return; }
    modal('Programar atividade', `<p>Configure a data/hora de liberação no fuso <strong>America/Sao_Paulo</strong>.</p><form id="form-activity" data-id="${attr(cid)}"><div class="field"><label>Evento</label><select name="eventId">${events.map(e => `<option value="${attr(e.id)}">${esc(e.name)}</option>`).join('')}</select></div><div class="field"><label>Título da atividade</label><input name="title" required maxlength="100" placeholder="Ex.: Desafio das estrelas"></div><div class="form-grid"><div class="field"><label>Tipo</label><select name="type"><option>Desafio</option><option>Jogo</option><option>Enquete</option><option>Página</option><option>Anúncio</option></select></div><div class="field"><label>Liberação (São Paulo)</label><input type="datetime-local" name="release" required value="2026-12-15T19:00"></div></div><div class="field"><label>Desafio associado (opcional)</label><select name="game"><option value="">Nenhum</option>${games.map(g => `<option>${esc(g[1])}</option>`).join('')}</select></div><button class="btn btn-primary">Salvar programação</button></form>`);
  }

  function newRequest(type, title, communityId, eventId) {
    const r = { id: uid(), type, title, communityId, eventId, status: 'em análise', created: dateNow(), comment: '' };
    state.requests.push(r); audit(`Solicitação enviada: ${type} — ${title}`); return r;
  }

  function submitEvent(id) {
    const e = getEvent(id);
    if (!e) return;
    if (state.requests.some(r => r.type === 'evento' && r.eventId === id && r.status === 'em análise')) return toast('Evento já está em análise.');
    e.status = 'em análise'; newRequest('evento', e.name, e.communityId, e.id); toast('Evento enviado para análise.'); route();
  }

  function decide(id, decision) {
    const r = state.requests.find(x => x.id === id);
    if (!r || r.status !== 'em análise') return;
    r.status = decision; r.comment = decision === 'ajustes solicitados' ? 'Revise as configurações e envie novamente.' : 'Aprovado na demonstração.';
    if (r.type === 'comunidade') { const c = getCommunity(r.communityId); if (c) c.status = decision === 'aprovada' ? 'ativa' : 'rascunho'; }
    if (r.type === 'evento') { const e = getEvent(r.eventId); if (e) e.status = decision === 'aprovada' ? 'publicado' : 'rascunho'; }
    audit(`${decision}: ${r.type} — ${r.title}`); toast(`Solicitação: ${decision}.`); route();
  }

  function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
  function slugify(value) { return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || uid(); }

  function compressAvatar(file, maxDim = 280) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida.'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/webp', 0.84));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function applyLiveProfileColors(form) {
    if (!form) return;
    const v = formData(form);
    const previewTheme = {
      accentColor: color(v.accentColor || state.user.accentColor),
      cover: color(v.cover || state.user.cover),
      surfaceColor: color(v.surfaceColor || state.user.surfaceColor)
    };
    const oldStyle = $('#vulpora-profile-theme');
    if (oldStyle) oldStyle.outerHTML = profileThemeStyles(previewTheme);
  }

  function completeNatalDoorForCurrentUser(day) {
    const c = getCommunity('the-kingdom');
    if (!isNatalDoorUnlocked(day, c)) {
      toast(`🔒 Fase ${day} ainda está bloqueada!`);
      return;
    }
    const door = state.natalSystem.doors.find(d => d.day === day);
    const me = getOrCreateNatalParticipant();
    if (!door || !me) return;
    if (me.banned) {
      toast('⛔ Sua participação neste evento está suspensa.');
      return;
    }
    if (!me.completedDoors.includes(day)) {
      me.completedDoors.push(day);
      me.points += Number(door.points) || 50;
      me.approvedCount = (me.approvedCount || 0) + 1;
      persist();
      toast(`🎉 Fase ${String(day).padStart(2, '0')} concluída! +${door.points} pts adicionados.`);
    }
    closeModal();
    route();
  }

  async function handleSubmit(form) {
    if (form.id === 'form-auth') {
      const values = formData(form);
      const endpoint = form.dataset.mode === 'cadastro' ? '/auth/register' : '/auth/login';
      const btn = form.querySelector('button[type="submit"]');
      form.classList.add('is-submitting');
      if (btn) btn.disabled = true;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(values)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || 'Não foi possível autenticar.');
        if (!data.user?.id) throw new Error('Resposta inválida do servidor. Tente novamente.');
        authUser = data.user;
        syncAuthToUser();
        upsertSelfInDirectory();
        persist();
        toast('Bem-vindo à VULPORA!');
        location.hash = '#/perfil';
      } catch (err) {
        const errBox = $('#auth-error');
        if (errBox) { errBox.textContent = err.message; errBox.hidden = false; }
        else toast(err.message);
      } finally {
        form.classList.remove('is-submitting');
        if (btn) btn.disabled = false;
      }
      return;
    }

    if (form.id === 'form-natal-ornament') {
      if (!authUser) { location.hash = '#/login'; return; }
      const v = formData(form);
      state.natalSystem.treeOrnaments.unshift({
        id: 'orn-' + uid(),
        authorName: state.user.name,
        authorHandle: state.user.handle,
        community: 'The Kingdom',
        icon: String(v.icon || '⭐').slice(0, 4),
        message: String(v.message || '').trim().slice(0, 140),
        status: 'pendente',
        createdAt: dateNow()
      });
      persist();
      toast('🎄 Enfeite enviado! Ele aparecerá na árvore assim que um admin aprovar.');
      route();
      return;
    }

    if (form.id === 'form-natal-schedule') {
      const c = getCommunity('the-kingdom');
      if (!isEventAdmin(c)) { toast('Apenas administradores podem alterar o cronograma.'); return; }
      const v = formData(form);
      state.natalSystem.scheduleMode = ['auto', 'locked', 'manual', 'test_all'].includes(v.scheduleMode) ? v.scheduleMode : 'auto';
      state.natalSystem.manualDay = Math.max(0, Math.min(25, Number(v.manualDay) || 0));
      audit(`Natal 2026: modo de cronograma alterado para "${state.natalSystem.scheduleMode}" (dia=${state.natalSystem.manualDay})`);
      toast('Regra de liberação das fases atualizada!');
      route();
      return;
    }

    if (form.id === 'form-natal-door') {
      const c = getCommunity('the-kingdom');
      if (!isEventAdmin(c)) { toast('Apenas administradores podem editar fases.'); return; }
      const day = Number(form.dataset.day);
      const door = state.natalSystem.doors.find(d => d.day === day);
      if (!door) return;
      const v = formData(form);
      const labels = {
        memoria: 'Jogo da memória',
        quiz: 'Quiz de alternativas',
        reacao: 'Teste de reação',
        palavra: 'Palavra embaralhada',
        sequencia: 'Sequência luminosa',
        resposta: 'Missão com aprovação'
      };
      door.title = String(v.title || door.title).slice(0, 80);
      door.description = String(v.description || door.description).slice(0, 220);
      door.gameType = v.gameType || door.gameType;
      door.gameLabel = labels[door.gameType] || 'Desafio';
      door.points = Math.max(10, Math.min(1000, Number(v.points) || 50));
      audit(`Natal 2026: Fase ${String(day).padStart(2, '0')} editada (${door.title})`);
      toast(`Fase ${String(day).padStart(2, '0')} salva com sucesso!`);
      route();
      return;
    }

    if (form.id === 'form-natal-door-submit') {
      if (!authUser) { location.hash = '#/login'; return; }
      const day = Number(form.dataset.day);
      const c = getCommunity('the-kingdom');
      if (!isNatalDoorUnlocked(day, c)) { toast('Fase bloqueada.'); return; }
      const v = formData(form);
      state.natalSystem.submissions.unshift({
        id: 'sub-' + uid(),
        day,
        authorName: state.user.name,
        authorHandle: state.user.handle,
        answer: String(v.answer || '').trim().slice(0, 300),
        status: 'pendente',
        createdAt: dateNow()
      });
      persist();
      closeModal();
      toast('📬 Resposta enviada para revisão da administração!');
      route();
      return;
    }

    if (form.id === 'form-create') {
      toast('A criação de comunidades está desativada na Beta 1.0.');
      return;
    }

    if (['form-profile', 'form-studio', 'form-module', 'form-event', 'form-activity'].includes(form.id)) {
      if (!authLoaded || !authUser) { location.hash = '#/login'; return; }
      if (form.id !== 'form-profile' && !canManageCommunity(form.dataset.id)) { location.hash = '#/login'; return; }
    }

    const values = formData(form), id = form.dataset.id;
    if (form.id === 'form-profile') {
      const cleanHandle = sanitizeHandle(values.handle, state.user.handle || 'viajante');
      const nextAvatar = pendingAvatarDataUrl !== null ? pendingAvatarDataUrl : state.user.avatarUrl;
      state.user = {
        ...state.user,
        name: String(values.name || state.user.name).slice(0, 50),
        customizedName: true,
        handle: cleanHandle,
        bio: String(values.bio || '').slice(0, 250),
        discord: String(values.discord || '').slice(0, 80),
        ducks: String(values.ducks || '').slice(0, 80),
        accentColor: color(values.accentColor || state.user.accentColor),
        cover: color(values.cover || state.user.cover),
        surfaceColor: color(values.surfaceColor || state.user.surfaceColor),
        avatarUrl: nextAvatar
      };
      if (authUser) {
        authUser.name = state.user.name;
        authUser.avatarUrl = state.user.avatarUrl;
      }
      pendingAvatarDataUrl = null;
      upsertSelfInDirectory();
      persist();
      audit('Perfil e cores personalizados');
      toast('Foto e cores do perfil salvos!');
      route();
    } else if (form.id === 'form-contact') {
      try {
        const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: values.name, subject: values.subject, message: values.message }) });
        if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || 'Não foi possível enviar a mensagem.'); }
        state.messages.unshift({ id: uid(), name: values.name, subject: values.subject, message: values.message, date: dateNow() });
        audit('Mensagem de contato enviada para a API'); toast('Mensagem enviada com sucesso!'); form.reset();
      } catch (error) { console.error(error); toast(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.'); }
    } else if (form.id === 'form-studio') {
      const c = getCommunity(id); if (!c) return;
      const session = readStudioForm(form);
      c.draft = clone(session.theme); c.draftModules = clone(session.modules); session.dirty = false;
      audit(`Rascunho visual salvo: ${c.name}`); toast('Rascunho salvo. Sua prévia já funcionava antes de salvar.'); route();
    } else if (form.id === 'form-module') {
      const c = getCommunity(id); if (!c) return;
      readStudioForm($('#form-studio')); const session = studioFor(c);
      session.modules.push(String(values.module).slice(0, 80)); session.dirty = true;
      toast('Bloco adicionado à prévia, ainda não publicado.'); route();
    } else if (form.id === 'form-event') {
      const e = { id: slugify(values.name) + '-' + uid().slice(0, 4), communityId: id, name: values.name.slice(0, 90), description: values.description.slice(0, 500), status: 'rascunho', type: values.type, date: values.date, symbol: '✦', games: [], prizes: [] };
      state.events.push(e); audit(`Evento criado: ${e.name}`); toast('Evento criado em rascunho.'); route();
    } else if (form.id === 'form-activity') {
      const a = { id: uid(), eventId: values.eventId, title: values.title.slice(0, 100), type: values.type, game: values.game, release: values.release, timezone: 'America/Sao_Paulo' };
      state.activities.push(a); audit(`Atividade programada: ${a.title} em ${fmtDate(a.release)}`); toast('Atividade programada (simulação local).'); route();
    } else if (form.id === 'form-team') {
      const c = getCommunity(id); if (!c) return;
      c.team.push({ name: values.name, role: values.role }); audit(`Integrante demo adicionado em ${c.name}`); toast('Integrante adicionado (demo).'); route();
    }
  }

  const studioPresets = {
    reino: { primary: '#09090b', secondary: '#18090c', accent: '#dc2626' },
    noite: { primary: '#131628', secondary: '#28385b', accent: '#e7c98a' },
    bosque: { primary: '#122722', secondary: '#25453b', accent: '#b7edca' },
    lilas: { primary: '#211331', secondary: '#422657', accent: '#f2c9ff' },
    claro: { primary: '#f7f5f0', secondary: '#ebe5d7', accent: '#5d317e' }
  };

  function refreshStudioPreview(c) {
    const form = $('#form-studio'); if (!form || form.dataset.id !== c.id) return;
    const session = readStudioForm(form), t = session.theme, prev = $('#studio-preview-window'); if (!prev) return;
    prev.style.cssText = cssTheme(t);
    const header = $('#studio-preview-brand'); if (header) header.textContent = `${t.symbol} ${c.name}`;
    $('#studio-preview-title').textContent = t.hero; $('#studio-preview-subtitle').textContent = t.subtitle;
    const hero = $('#studio-preview-hero'); hero.style.backgroundImage = t.cover ? `linear-gradient(#000b,#0009),url("${t.cover}")` : ''; hero.classList.toggle('has-cover', Boolean(t.cover));
    const ratio = contrastRatio(t.accent, t.primary), pass = ratio >= 4.5, superPass = ratio >= 7;
    $('#studio-contrast').classList.toggle('contrast-alert', !pass); $('#contrast-sample').style.cssText = `background:${color(t.primary)};color:${color(t.accent)}`;
    $('#contrast-title').textContent = pass ? 'Contraste adequado' : 'Contraste insuficiente';
    $('#contrast-value').textContent = `${ratio.toFixed(2)}:1 · ${superPass ? 'AAA para texto normal' : pass ? 'AA para texto normal' : 'Abaixo de AA para texto normal'}`;
    $('#contrast-hint').textContent = pass ? 'A cor de destaque é legível sobre o fundo principal.' : 'O texto de destaque pode ficar difícil de ler sobre o fundo principal.';
    $('#contrast-fix').disabled = pass;
    const label = $('#studio-state-label'); if (label) label.textContent = 'Alterações não salvas';
    for (const input of form.querySelectorAll('input[type="color"]')) {
      const hex = form.querySelector(`[data-color-for="${input.name}"]`); if (hex && document.activeElement !== hex) hex.value = input.value.toUpperCase();
    }
  }

  function fullPreviewHTML(c, session, tab = 'inicio') {
    const t = session.theme, mods = session.modules, events = state.events.filter(e => e.communityId === c.id), theme = cssTheme(t);
    const content = tab === 'inicio' ? `<section class="mock-hero ${t.cover ? 'has-cover' : ''}" ${t.cover ? `style="background-image:linear-gradient(#000b,#0009),url('${attr(t.cover)}')"` : ''}><div class="eyebrow">BEM-VINDO A ${esc(c.name.toUpperCase())}</div><h1>${esc(t.hero)}</h1><p>${esc(t.subtitle)}</p><span class="mock-button">Explorar eventos →</span></section><section class="mock-section"><h2>Bem-vindo à comunidade</h2><p>${esc(c.description)}</p><div class="mock-cards">${mods.map((m, i) => `<article><small>MÓDULO ${i + 1}</small><h3>${esc(m)}</h3><p>${esc(moduleText(m, c, events))}</p></article>`).join('')}</div></section>` : tab === 'eventos' ? `<section class="mock-section"><span class="eyebrow">EVENTOS DA COMUNIDADE</span><h1>Próximos eventos</h1><div class="mock-cards">${events.map(e => `<article><small>EVENTO</small><h3>${esc(e.name)}</h3><p>${esc(e.description)}</p></article>`).join('') || '<p>Em breve, novos eventos.</p>'}</div></section>` : `<section class="mock-section"><span class="eyebrow">RANKING DA COMUNIDADE</span><h1>Conquistas de ${esc(c.name)}</h1><p>Classificação fictícia para visualizar este modelo.</p>${['Luna', 'Raven', 'Noah'].map((n, i) => `<article class="mock-rank">${i + 1}º &nbsp; ${n}</article>`).join('')}</section>`;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;${theme};background:var(--ct);color:var(--ci);font-family:var(--cf)}header{position:sticky;top:0;z-index:2;background:var(--cs);color:var(--csi);padding:20px 5%;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:1px solid currentColor}header b{font-size:23px}nav{font-size:13px;font-weight:700;display:flex;gap:20px;opacity:.9}h1,h2,h3{font-family:var(--cf);line-height:1.15}h1{font-size:clamp(36px,6vw,65px);max-width:800px;margin:15px 0 20px}h2{font-size:30px}h3{margin:8px 0}p{line-height:1.65;opacity:.89}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.13em;color:var(--ca)}.mock-hero{background-size:cover;background-position:center;padding:90px 6%;min-height:390px}.mock-hero p{font-size:18px;max-width:630px}.mock-hero.has-cover,.mock-hero.has-cover p,.mock-hero.has-cover .eyebrow{color:#ffffff}.mock-button{display:inline-block;background:var(--ca);color:var(--cai);padding:12px 19px;border-radius:9px;margin-top:15px;font-size:14px;font-weight:800}.mock-section{padding:42px 6% 72px}.mock-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:17px;margin-top:27px}.mock-cards article,.mock-rank{background:var(--cs);color:var(--csi);padding:23px;border-radius:13px;border:1px solid #8885}.mock-cards small{color:var(--ca);font-weight:900;letter-spacing:.1em}footer{padding:25px 6%;border-top:1px solid #8885;font-size:12px;text-align:right}@media(max-width:540px){header{padding:15px 5%}nav{gap:10px}header b{font-size:18px}.mock-hero{padding:60px 6%}.mock-section{padding-top:25px}}</style></head><body><header><b>${esc(t.symbol)} ${esc(c.name)}</b><nav>Início  Eventos  Ranking</nav></header>${content}<footer>Desenvolvido com VULPORA</footer></body></html>`;
  }

  function openStudioFullPreview(c, tab = 'inicio') {
    const session = studioFor(c);
    const body = `<div class="studio-full-tools"><span class="mini-note">Prévia temporária · Sem publicar</span><div class="row wrap"><button class="device-button ${session.device === 'desktop' ? 'active' : ''}" data-action="studio-modal-device" data-device="desktop" data-id="${attr(c.id)}">Desktop</button><button class="device-button ${session.device === 'mobile' ? 'active' : ''}" data-action="studio-modal-device" data-device="mobile" data-id="${attr(c.id)}">Celular</button></div><div class="row wrap">${[['inicio', 'Início'], ['eventos', 'Eventos'], ['ranking', 'Ranking']].map(([k, n]) => `<button class="device-button ${tab === k ? 'active' : ''}" data-action="studio-modal-tab" data-tab="${k}" data-id="${attr(c.id)}">${n}</button>`).join('')}</div></div><div class="studio-full-frame ${session.device === 'mobile' ? 'is-mobile' : ''}" id="studio-full-frame"><iframe id="studio-full-iframe" sandbox="" title="Prévia de ${attr(c.name)}" loading="eager"></iframe></div>`;
    modal(`Prévia do site · ${c.name}`, body, true);
    const m = $('.modal'); m.classList.add('studio-full-modal');
    $('#studio-full-iframe').srcdoc = fullPreviewHTML(c, session, tab);
  }

  function handleStudioAction(button) {
    const action = button.dataset.action, c = getCommunity(button.dataset.id); if (!c) return;
    const form = $('#form-studio'); if (form) readStudioForm(form);
    const session = studioFor(c);
    if (action === 'studio-device') { session.device = button.dataset.device === 'mobile' ? 'mobile' : 'desktop'; $('#studio-device-wrap')?.classList.toggle('is-mobile', session.device === 'mobile'); $$('.device-switch .device-button[data-device]').forEach(b => b.classList.toggle('active', b.dataset.device === session.device)); return; }
    if (action === 'studio-full-preview') { openStudioFullPreview(c); return; }
    if (action === 'studio-modal-device') { session.device = button.dataset.device === 'mobile' ? 'mobile' : 'desktop'; $('#studio-full-frame')?.classList.toggle('is-mobile', session.device === 'mobile'); $$('.studio-full-tools .device-button[data-device]').forEach(b => b.classList.toggle('active', b.dataset.device === session.device)); return; }
    if (action === 'studio-modal-tab') { openStudioFullPreview(c, button.dataset.tab); return; }
    if (action === 'studio-preset') { const preset = studioPresets[button.dataset.preset]; if (!preset) return; Object.assign(session.theme, preset); session.dirty = true; for (const k of ['primary', 'secondary', 'accent']) { const input = $(`#form-studio [name="${k}"]`); if (input) input.value = preset[k]; } refreshStudioPreview(c); toast('Paleta aplicada somente à prévia.'); return; }
    if (action === 'studio-fix-contrast') { session.theme.accent = nearestAccent(session.theme.accent, session.theme.primary); $('#form-studio [name="accent"]').value = session.theme.accent; refreshStudioPreview(c); toast('Destaque ajustado para contraste de texto AA.'); return; }
    if (action === 'studio-remove-cover') { session.theme.cover = ''; session.dirty = true; refreshStudioPreview(c); toast('Capa removida somente da prévia.'); return; }
    if (action === 'studio-reset') { studioSessions.delete(c.id); toast('Alterações não salvas descartadas.'); route(); return; }
  }

  document.addEventListener('input', e => {
    const target = e.target;
    if (target.closest('#form-profile')) {
      applyLiveProfileColors(target.closest('#form-profile'));
      return;
    }
    if (target.matches('#form-studio [data-color-for]')) {
      const form = target.closest('#form-studio'), value = target.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(value)) { form.querySelector(`[name="${target.dataset.colorFor}"]`).value = value; const c = getCommunity(form.dataset.id); if (c) refreshStudioPreview(c); }
      return;
    }
    const form = target.closest('#form-studio'); if (!form || target.type === 'file') return;
    const c = getCommunity(form.dataset.id); if (c) refreshStudioPreview(c);
  });

  document.addEventListener('change', e => {
    const target = e.target;
    if (target.matches('#form-studio select[name="font"]')) { const form = target.closest('form'), c = getCommunity(form.dataset.id); if (c) refreshStudioPreview(c); }
    if (target.matches('#admin-door-picker')) {
      adminSelectedDoor = Number(target.value) || 1;
      route();
    }
  });

  let gameTimer = null, gameState = {};

  function gameModal(name, natalDay = null) {
    if (!gameDemoTypes.includes(name)) { toast('Esta mecânica está prevista para o beta completo.'); return; }
    gameState = { type: name, natalDay };
    modal(natalDay ? `Desafio da Fase ${String(natalDay).padStart(2, '0')}` : 'Desafio do evento', `<div class="demo-box" id="demo-root"></div>${natalDay ? `<div class="row between wrap mt"><span class="mini-note">Conclua o desafio para validar sua fase.</span><button type="button" class="btn btn-primary btn-sm" data-action="natal-complete-door" data-day="${natalDay}">Registrar Conclusão ✓</button></div>` : '<p class="mini-note mt">Modo demonstração · Sem pontuação oficial ou dados de ranking.</p>'}`);
    renderDemo();
  }

  function renderDemo() {
    const root = $('#demo-root'); if (!root) return;
    const g = gameState;
    if (g.type === 'memoria') {
      if (!g.deck) { const symbols = ['🌙', '🦊', '⭐', '💎']; g.deck = [...symbols, ...symbols].map((emoji, i) => ({ id: i, emoji, shown: false, matched: false })).sort(() => Math.random() - .5); g.moves = 0; g.busy = false; g.first = null; }
      root.innerHTML = `<p>Encontre os quatro pares.</p><div class="row between"><span>Movimentos: ${g.moves}</span><span>${g.deck.filter(x => x.matched).length / 2} / 4 pares</span></div><div class="memory-grid">${g.deck.map((card, i) => `<button class="memory-card ${card.shown || card.matched ? 'revealed' : ''}" data-action="flip-memory" data-index="${i}" ${card.matched ? 'disabled' : ''}>${card.shown || card.matched ? card.emoji : '✦'}</button>`).join('')}</div>${g.deck.every(x => x.matched) ? '<div class="notice-box">Parabéns! Você completou o desafio.</div>' : ''}<button class="btn btn-outline btn-sm" data-action="restart-game">Reiniciar</button>`;
    } else if (g.type === 'quiz') {
      g.step ??= 0; g.correct ??= 0; const questions = [['Qual símbolo aparece na identidade oficial da VULPORA?', ['Coroa', 'Raposa', 'Dragão'], 'Raposa'], ['O que organiza os desafios e surpresas de uma comunidade?', ['Eventos', 'Mensagens privadas', 'Avatares'], 'Eventos'], ['Qual recurso permite abrir atividades automaticamente?', ['Calendário programado', 'Tema do perfil', 'Ranking'], 'Calendário programado']];
      if (g.step >= questions.length) { root.innerHTML = `<div class="feature-icon" style="margin:auto auto 15px">🏆</div><h3>Quiz finalizado!</h3><p>Acertos: ${g.correct} de ${questions.length}</p><button class="btn btn-primary" data-action="restart-game">Jogar novamente</button>`; return; }
      const q = questions[g.step]; root.innerHTML = `<span class="tag">Pergunta ${g.step + 1} de ${questions.length}</span><h3 style="margin:20px 0">${q[0]}</h3>${q[1].map((a, i) => `<button class="quiz-answer" data-action="answer-quiz" data-answer="${attr(a)}">${String.fromCharCode(65 + i)}. ${a}</button>`).join('')}`;
    } else if (g.type === 'reacao') {
      g.phase ??= 'idle'; root.innerHTML = `<p>Espere a área ficar verde. Então clique o mais rápido possível!</p><button class="reaction-pad ${g.phase === 'ready' ? 'ready' : ''}" data-action="reaction-click">${g.phase === 'idle' ? 'Clique para começar' : g.phase === 'waiting' ? 'Espere o sinal...' : g.phase === 'ready' ? 'CLIQUE AGORA!' : g.message}</button><p class="mini-note mt">Apenas uma medição aproximada no navegador.</p><button class="btn btn-outline btn-sm" data-action="restart-game">Reiniciar</button>`;
    } else if (g.type === 'palavra') {
      g.round ??= 0; g.correct ??= 0; const words = ['RAPOSA', 'EVENTO', 'COMUNIDADE'];
      if (g.round >= 3) { root.innerHTML = `<h3>Desafio concluído!</h3><p>Você acertou ${g.correct} de 3 palavras.</p><button class="btn btn-primary" data-action="restart-game">Reiniciar</button>`; return; }
      const w = words[g.round], mix = w === 'RAPOSA' ? 'PASORA' : w === 'EVENTO' ? 'VONETE' : 'DANUMECOID';
      root.innerHTML = `<p>Organize as letras da palavra.</p><h2 style="letter-spacing:.3em;color:#f7c681">${mix}</h2><form id="form-word"><div class="field"><label>Sua resposta</label><input name="answer" required autocomplete="off" maxlength="24" placeholder="Digite a palavra"></div><button class="btn btn-primary">Confirmar resposta</button></form><span class="mini-note">Rodada ${g.round + 1} de 3</span>`;
    } else if (g.type === 'sequencia') {
      g.seq ??= []; g.progress ??= 0; g.round ??= 0; g.phase ??= 'idle'; const colors = ['#cc6cb4', '#67b4de', '#efc475', '#8cd5a9'];
      root.innerHTML = `<p>Observe a sequência de luzes e repita a ordem.</p><div class="row between mb"><span>Rodada ${g.round}</span><span>${g.phase === 'show' ? 'Memorize...' : g.phase === 'play' ? 'Sua vez!' : 'Pronto para começar?'}</span></div><div class="grid grid-2" style="max-width:260px;margin:auto">${colors.map((c, i) => `<button data-action="sequence-tap" data-index="${i}" style="height:92px;border-radius:16px;border:3px solid #ffffff18;background:${c};filter:${g.flash === i ? 'brightness(1.6) saturate(1.5)' : 'brightness(.58)'};transform:${g.flash === i ? 'scale(1.04)' : 'scale(1)'}" aria-label="Cor ${i + 1}"></button>`).join('')}</div><div class="mt"><button class="btn btn-primary" data-action="sequence-start">${g.phase === 'idle' ? 'Iniciar rodada' : 'Reiniciar desafio'}</button></div>`;
    }
  }

  function memoryFlip(index) {
    const g = gameState, c = g.deck[index]; if (g.busy || !c || c.shown || c.matched) return;
    c.shown = true;
    if (g.first === null) { g.first = index; renderDemo(); return; }
    g.moves++;
    if (g.deck[g.first].emoji === c.emoji) { g.deck[g.first].matched = true; c.matched = true; g.first = null; renderDemo(); } else {
      g.busy = true; const first = g.first; renderDemo();
      gameTimer = setTimeout(() => { if (gameState !== g) return; g.deck[first].shown = false; c.shown = false; g.first = null; g.busy = false; renderDemo(); }, 800);
    }
  }

  function sequenceStart() { clearTimeout(gameTimer); gameState.seq = []; gameState.round = 0; sequenceNext(); }
  function sequenceNext() {
    const g = gameState; g.seq.push(Math.floor(Math.random() * 4)); g.round++; g.progress = 0; g.phase = 'show'; let step = 0;
    const show = () => {
      if (gameState !== g) return;
      if (step >= g.seq.length) { g.flash = -1; g.phase = 'play'; renderDemo(); return; }
      g.flash = g.seq[step]; renderDemo();
      gameTimer = setTimeout(() => { g.flash = -1; renderDemo(); gameTimer = setTimeout(() => { step++; show(); }, 220); }, 600);
    };
    show();
  }

  function handleGameAction(btn) {
    const act = btn.dataset.action, g = gameState;
    if (act === 'restart-game') { clearTimeout(gameTimer); gameState = { type: g.type, natalDay: g.natalDay }; renderDemo(); }
    else if (act === 'flip-memory') memoryFlip(+btn.dataset.index);
    else if (act === 'answer-quiz') { const answers = ['Raposa', 'Eventos', 'Calendário programado']; if (btn.dataset.answer === answers[g.step]) g.correct++; g.step++; renderDemo(); }
    else if (act === 'reaction-click') {
      if (g.phase === 'idle' || g.phase === 'done') { g.phase = 'waiting'; g.message = ''; renderDemo(); gameTimer = setTimeout(() => { if (gameState !== g) return; g.phase = 'ready'; g.start = performance.now(); renderDemo(); }, 1200 + Math.random() * 2100); }
      else if (g.phase === 'waiting') { clearTimeout(gameTimer); g.phase = 'done'; g.message = 'Muito cedo! Tente novamente.'; renderDemo(); }
      else if (g.phase === 'ready') { const ms = Math.round(performance.now() - g.start); g.phase = 'done'; g.message = `${ms} ms — ótimo reflexo!`; renderDemo(); }
    } else if (act === 'sequence-start') sequenceStart();
    else if (act === 'sequence-tap' && g.phase === 'play') {
      const n = +btn.dataset.index;
      if (g.seq[g.progress] !== n) { g.phase = 'idle'; toast(`Sequência incorreta. Você chegou à rodada ${g.round}.`); renderDemo(); } else {
        g.progress++;
        if (g.progress === g.seq.length) { g.phase = 'show'; toast('Acertou! Próxima rodada.'); gameTimer = setTimeout(() => sequenceNext(), 1000); }
        renderDemo();
      }
    }
  }

  async function requestMembership(btn) {
    btn.disabled = true;
    try {
      const response = await fetch('/api/communities/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ communityId: btn.dataset.community }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a solicitação.');
      toast('Solicitação enviada. Aguarde a aprovação do STAFF.');
      await syncRemoteCommunities();
      route();
    } catch (error) {
      btn.disabled = false;
      toast(error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.');
    }
  }

  document.addEventListener('submit', e => {
    const form = e.target; if (!form.matches('form')) return;
    e.preventDefault();
    if (form.id === 'form-word') {
      const word = ['RAPOSA', 'EVENTO', 'COMUNIDADE'][gameState.round], answer = formData(form).answer.trim().toUpperCase();
      if (answer === word) { gameState.correct++; toast('Resposta correta!'); } else toast(`A resposta era ${word}.`);
      gameState.round++; renderDemo(); return;
    }
    handleSubmit(form);
  });

  document.addEventListener('click', async e => {
    const button = e.target.closest('[data-action]'); if (!button) return;
    const act = button.dataset.action;

    if (act === 'natal-nav') {
      const tab = button.dataset.tab;
      const c = getCommunity('the-kingdom');
      if (!canAccessNatalTab(tab, c)) {
        e.preventDefault();
        toast('🔒 Fases bloqueadas! Por enquanto apenas Início e Árvore estão liberados.');
      }
      return;
    }
    if (act === 'natal-locked-notice') {
      toast('🔒 As 25 fases serão liberadas dia a dia de 01/12 a 25/12 às 00:00 (Brasília).');
      return;
    }
    if (act === 'natal-open-door') {
      openNatalDoorModal(Number(button.dataset.day));
      return;
    }
    if (act === 'natal-play-door-game') {
      gameModal(button.dataset.game, Number(button.dataset.day));
      return;
    }
    if (act === 'natal-complete-door') {
      completeNatalDoorForCurrentUser(Number(button.dataset.day));
      return;
    }
    if (act === 'natal-mod-ornament') {
      const c = getCommunity('the-kingdom');
      if (!isEventAdmin(c)) return;
      const orn = state.natalSystem.treeOrnaments.find(x => x.id === button.dataset.id);
      if (!orn) return;
      orn.status = button.dataset.decision;
      audit(`Natal 2026: Enfeite de ${orn.authorName} marcado como "${orn.status}"`);
      toast(`Enfeite ${orn.status}!`);
      route();
      return;
    }
    if (act === 'natal-del-ornament') {
      const c = getCommunity('the-kingdom');
      if (!isEventAdmin(c)) return;
      state.natalSystem.treeOrnaments = state.natalSystem.treeOrnaments.filter(x => x.id !== button.dataset.id);
      audit('Natal 2026: Enfeite removido da Árvore');
      toast('Enfeite removido.');
      route();
      return;
    }
    if (act === 'natal-mod-sub') {
      const c = getCommunity('the-kingdom');
      if (!isEventAdmin(c)) return;
      const sub = state.natalSystem.submissions.find(x => x.id === button.dataset.id);
      if (!sub) return;
      sub.status = button.dataset.decision;
      if (sub.status === 'aprovada') {
        const door = state.natalSystem.doors.find(d => d.day === sub.day);
        const part = state.natalSystem.participants.find(p => p.handle === sub.authorHandle);
        if (part && door && !part.completedDoors.includes(sub.day)) {
          part.completedDoors.push(sub.day);
          part.points += Number(door.points) || 50;
          part.approvedCount = (part.approvedCount || 0) + 1;
        }
      }
      audit(`Natal 2026: Entrega Dia ${sub.day} de ${sub.authorName} -> ${sub.status}`);
      toast(`Entrega ${sub.status}!`);
      route();
      return;
    }
    if (act === 'natal-adjust-pts') {
      const c = getCommunity('the-kingdom');
      if (!isEventAdmin(c)) return;
      const p = state.natalSystem.participants.find(x => x.handle === button.dataset.handle);
      if (!p) return;
      const delta = Number(button.dataset.delta) || 0;
      p.points = Math.max(0, p.points + delta);
      audit(`Natal 2026: Pontos de ${p.name} ajustados em ${delta > 0 ? '+' : ''}${delta}`);
      toast(`Pontuação de ${p.name}: ${p.points} pts`);
      route();
      return;
    }
    if (act === 'natal-toggle-ban') {
      const c = getCommunity('the-kingdom');
      if (!isEventAdmin(c)) return;
      const p = state.natalSystem.participants.find(x => x.handle === button.dataset.handle);
      if (!p) return;
      p.banned = !p.banned;
      audit(`Natal 2026: Participante ${p.name} ${p.banned ? 'bloqueado' : 'desbloqueado'}`);
      toast(`${p.name} ${p.banned ? 'bloqueado no evento' : 'desbloqueado'}.`);
      route();
      return;
    }

    if (act === 'menu') { const menu = $('#' + button.dataset.target), open = menu?.classList.toggle('open') ?? false; button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); return; }
    if (act === 'close-modal') { closeModal(); return; }
    if (act === 'logout') {
      try { await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch {}
      authUser = null;
      toast('Sessão encerrada.');
      location.hash = '#/portal/inicio';
      return;
    }
    if (act === 'toggle-follow') {
      toggleFollow(button.dataset.handle);
      return;
    }
    if (act === 'copy-profile-link') {
      const url = `${location.origin}${location.pathname}#/usuario/${encodeURIComponent(button.dataset.handle)}`;
      try { await navigator.clipboard.writeText(url); toast('Link do seu perfil copiado!'); } catch { toast('Compartilhe sua @ na comunidade para receber seguidores!'); }
      return;
    }
    if (act === 'remove-avatar') {
      pendingAvatarDataUrl = '';
      const preview = $('#profile-avatar-preview');
      if (preview) preview.textContent = state.user.name[0]?.toUpperCase() || 'V';
      toast('Foto removida. Clique em "Salvar alterações" para confirmar.');
      return;
    }
    if (act === 'profile-preset') {
      const form = $('#form-profile');
      if (!form) return;
      form.querySelector('[name="accentColor"]').value = button.dataset.accent;
      form.querySelector('[name="cover"]').value = button.dataset.cover;
      form.querySelector('[name="surfaceColor"]').value = button.dataset.surface;
      applyLiveProfileColors(form);
      toast('Paleta aplicada na prévia!');
      return;
    }
    if (['flip-memory', 'answer-quiz', 'reaction-click', 'restart-game', 'sequence-tap', 'sequence-start'].includes(act)) { handleGameAction(button); return; }
    if (act === 'open-game') { gameModal(button.dataset.game); return; }
    if (act === 'planned') { toast('Esta atividade está programada para o evento completo.'); return; }
    if (act === 'request-membership') { requestMembership(button); return; }
    if (act === 'create-event') { if (!canManageCommunity(button.dataset.id)) return location.hash = '#/login'; createEventModal(button.dataset.id); return; }
    if (act === 'add-activity') { if (!canManageCommunity(button.dataset.id)) return location.hash = '#/login'; addActivityModal(button.dataset.id); return; }
    if (act === 'submit-event') { const event = getEvent(button.dataset.id); if (!event || !canManageCommunity(event.communityId)) return location.hash = '#/login'; submitEvent(button.dataset.id); return; }
    if (act === 'decide-request') { if (authUser?.role !== 'ADM') return location.hash = '#/login'; decide(button.dataset.id, button.dataset.decision); return; }
    if (act === 'publish-theme') {
      if (!canManageCommunity(button.dataset.id)) return location.hash = '#/login'; const c = getCommunity(button.dataset.id); if (!c) return;
      const form = $('#form-studio'); if (form) readStudioForm(form);
      const session = studioFor(c); c.theme = clone(session.theme); c.modules = clone(session.modules); c.draft = null; c.draftModules = null; session.dirty = false;
      audit(`Identidade visual e módulos publicados: ${c.name}`); toast('Alterações publicadas! O site da comunidade já foi atualizado.'); route(); return;
    }

    if (act === 'move-module' || act === 'remove-module') {
      const c = getCommunity(button.dataset.id); if (!c) return;
      readStudioForm($('#form-studio')); const session = studioFor(c), idx = +button.dataset.index;
      if (act === 'remove-module') session.modules.splice(idx, 1); else { const dest = idx + (+button.dataset.direction); if (dest < 0 || dest >= session.modules.length) return; [session.modules[idx], session.modules[dest]] = [session.modules[dest], session.modules[idx]]; }
      session.dirty = true; route(); return;
    }
    if (act.startsWith('studio-')) { handleStudioAction(button); return; }

    if (act === 'toggle-motion') {
      const app = $('#app');
      app.classList.toggle('waves-paused');
      const paused = app.classList.contains('waves-paused');
      try { localStorage.setItem('vulpora-motion-paused', paused ? '1' : '0'); } catch {}
      button.textContent = paused ? 'Ativar movimento' : 'Pausar movimento';
      button.setAttribute('aria-pressed', String(paused)); return;
    }
  });

  document.addEventListener('change', async e => {
    const input = e.target;
    if (input.name === 'avatarFile' && input.files?.length) {
      const file = input.files[0];
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        toast('Formato de imagem não permitido.');
        input.value = '';
        return;
      }
      try {
        const compressed = await compressAvatar(file, 280);
        pendingAvatarDataUrl = compressed;
        const preview = $('#profile-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${attr(compressed)}" alt="Prévia">`;
        const mainCircle = $('.profile-avatar-row .avatar-circle');
        if (mainCircle) mainCircle.innerHTML = `<img src="${attr(compressed)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        toast('Foto carregada! Clique em "Salvar alterações" para aplicar.');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Não foi possível processar a foto.');
      }
      return;
    }

    if (input.name !== 'coverFile' || !input.files?.length) return;
    const file = input.files[0];
    if (file.size > 450 * 1024) { toast('A imagem precisa ter no máximo 450 KB.'); input.value = ''; return; }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { toast('Formato de imagem não permitido.'); return; }
    const form = input.closest('form'), c = getCommunity(form?.dataset.id); if (!c) return;
    const reader = new FileReader();
    reader.onload = () => { readStudioForm(form); const session = studioFor(c); session.theme.cover = String(reader.result); session.dirty = true; refreshStudioPreview(c); toast('Capa atualizada na prévia, sem precisar salvar.'); };
    reader.readAsDataURL(file);
  });

  document.addEventListener('click', e => { if (e.target.matches('.modal-scrim[data-close]')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  window.addEventListener('hashchange', route);

  window.VULPORA_DEMO = {
    reset() { if (!confirm('Restaurar dados fictícios e apagar as alterações locais?')) return; state = clone(START); persist(); route(); toast('Dados de demonstração restaurados.'); },
    getState() { return clone(state); }
  };

  function initCursorMagic() {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; let point = null;
    const appWrapper = $('#app');
    window.addEventListener('pointermove', event => {
      point = event;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        appWrapper.style.setProperty('--mouse-x', `${point.clientX}px`);
        appWrapper.style.setProperty('--mouse-y', `${point.clientY}px`);
        appWrapper.classList.add('cursor-magic-active');
        raf = 0;
      });
    }, { passive: true });
  }
  initCursorMagic();

  async function bootstrap() {
    try {
      const response = await fetch('/auth/me', { credentials: 'same-origin' });
      const result = await response.json();
      authUser = result.user;
      syncAuthToUser();
      if (authUser) {
        upsertSelfInDirectory();
        persist();
      }
    } catch (error) { console.error('Não foi possível verificar a sessão:', error); }
    finally {
      authLoaded = true;
      await syncRemoteCommunities();
      if (!location.hash) location.hash = '/portal/inicio';
      route();
    }
  }
  bootstrap();
})();
