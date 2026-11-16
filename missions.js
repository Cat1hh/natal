// [título, objetivo, pontos, verificação]
//
// Verificação automática (o servidor confere sozinho):
//   login   -> basta estar logado
//   discord -> basta ter o Discord conectado (o login já é pelo Discord)
//   letter  -> ter escrito ao menos 1 cartinha
//   reads3  -> ter lido 3 cartinhas de outras pessoas
//   count10 -> ter concluído 10 missões antes desta
//
// Verificação manual:
//   review  -> a pessoa envia uma prova (texto/link) e um admin aprova ou recusa
export const COMMUNITY_META = {
  ducks: { tag: 'DUCKS', name: 'Ducks' },
  kingdom: { tag: 'THE KINGDOM', name: 'The Kingdom' },
};

// Cada item: [título, objetivo, pontos, verificação ('login' | 'discord' | 'letter' | 'reads3' | 'count10' | 'review')]
export const MISSIONS_BY_COMMUNITY = {
  ducks: [
    ['Primeiro Passo na Neve', 'Entre no festival e acenda sua primeira luz da Ducks.', 50, 'login'],
    ['Cartinha da Ducks', 'Pendure uma cartinha na árvore exclusiva da Ducks.', 80, 'letter'],
    ['Leitor Atento', 'Leia 3 cartinhas penduradas na árvore da Ducks.', 80, 'reads3'],
    // ... complete até o Dia 25 da Ducks
  ],

  kingdom: [
    ['Portões do Reino', 'Entre no festival e acenda sua primeira luz na The Kingdom.', 50, 'login'],
    ['Pergaminho Real', 'Pendure uma cartinha na árvore exclusiva da The Kingdom.', 80, 'letter'],
    ['Mensageiro do Reino', 'Leia 3 cartinhas penduradas na árvore da The Kingdom.', 80, 'reads3'],
    // ... complete até o Dia 25 da The Kingdom
  ],
};

// Fallback caso algum dia ainda não tenha sido preenchido
export const MISSIONS = MISSIONS_BY_COMMUNITY.ducks;

export const PRIZES_BY_COMMUNITY = {
  ducks: [
    // { place: 1, title: '1º Lugar · Ducks', reward: '...' },
  ],
  kingdom: [
    // { place: 1, title: '1º Lugar · The Kingdom', reward: '...' },
  ],
};

export const PRIZES = PRIZES_BY_COMMUNITY.ducks;
export const MILESTONES = [];