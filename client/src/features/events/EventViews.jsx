import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../icons.jsx';
import { Avatar, CommunityTag } from '../../components/SharedUI.jsx';
import { Tree } from './natal/Tree.jsx';
import { AdventDayGame } from './natal/AdventGames.jsx';
import { isFinaleNow } from './finale.js';

const MEDAL_COLOR = ['#F4A51D', '#E2D8CE', '#C87D3B'];
const TOTAL_DAYS = 25;
const RANK_OPEN_DATE = new Date('2026-12-25T00:00:00-03:00').getTime();

/* Modo de teste: libera todas as 25 missões no Calendário, Home e Modal.
   Altere para false antes de publicar em produção. */
const UNLOCK_ALL_FOR_TEST = true;

/* Rascunho da cartinha: sobrevive a fechar o modal sem querer (Esc, clique fora, F5). */
const DRAFT_KEY = 'natal:letter-draft';
const readDraft = () => {
  try {
    return sessionStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
};
const saveDraft = (value) => {
  try {
    if (value) sessionStorage.setItem(DRAFT_KEY, value);
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* armazenamento indisponível: segue sem rascunho */
  }
};

/* Catálogo oficial dos 25 dias (Natal 2026 — Heaven & The Kingdom) */
const ADVENT_CATALOG = {
  1: {
    title: 'Perfil de dezembro',
    level: 'Fácil',
    basePoints: 20,
    needsReview: true,
    heaven: 'Personalize foto ou capa do seu perfil Ducks usado na Heaven com algum elemento natalino e publique uma montagem/captura com #AdventoHeaven01.',
    kingdom: 'Personalize seu perfil Discord ou crie seu cartão de perfil natalino na VULPORA com pelo menos um elemento natalino. Não é necessário postar no Discord.',
  },
  2: {
    title: 'Caça-palavras: primeira senha',
    level: 'Média',
    basePoints: 35,
    needsReview: false,
    heaven: 'Encontre NEVE, OURO, ESTRELA e LAÇO no tabuleiro 12×12. Insira a senha formada pelas letras iniciais nessa ordem, sem espaços ou acentos.',
    kingdom: 'Encontre RABANADA, ESTRELA, NEVE e OURO no tabuleiro 12×12. Insira a senha formada pelas letras iniciais nessa ordem, sem espaços ou acentos.',
  },
  3: {
    title: 'Memória dos símbolos',
    level: 'Fácil',
    basePoints: 20,
    needsReview: false,
    heaven: 'Vire cartas e encontre os 8 pares (SINO, GORRO, NEVE, ESTRELA, LAÇO, VELA, PRESENTE, BENGALA) antes de ultrapassar 24 tentativas de par.',
    kingdom: 'Vire cartas e encontre os 8 pares (RENA, CARTA, LUVA, PINHEIRO, LUZ, FLOCO, BOTA, BISCOITO) antes de ultrapassar 24 tentativas de par.',
  },
  4: {
    title: 'Oficina de embrulhos',
    level: 'Média',
    basePoints: 35,
    needsReview: false,
    heaven: 'Arraste os 8 objetos para os setores TECIDOS (laço, meia, cachecol), PAPEL (cartão, carta) e PRESENTES (boneca, carrinho, livro).',
    kingdom: 'Arraste os 8 objetos para os setores COZINHA (biscoito, caneca, bolo), DECORAÇÃO (estrela, guirlanda, sino) e INVERNO (luva, gorro).',
  },
  5: {
    title: 'Carta ao Noelvet',
    level: 'Média',
    basePoints: 35,
    needsReview: true,
    heaven: 'Escreva uma carta (100 a 600 caracteres): «Noelvet visitou a Heaven. Conte uma lembrança, faça um pedido simbólico e deseje algo à comunidade». Inclua NOELVET e HEAVEN.',
    kingdom: 'Escreva uma carta (100 a 600 caracteres): «Noelvet chegou ao castelo da The Kingdom. Escreva um desejo para o próximo ano e agradeça a alguém de forma geral». Inclua NOELVET e KINGDOM.',
  },
  6: {
    title: 'Enigma dos sinos',
    level: 'Difícil',
    basePoints: 50,
    needsReview: false,
    heaven: 'Descubra três respostas numéricas e registre separadas por hífen, sem espaços: 1) 2, 5, 9, 14, 20, ? | 2) 1, 2, 4, 7, 11, ? | 3) 3 sinos tocam 2 vezes cada; quantos toques no total?',
    kingdom: 'Descubra três respostas numéricas e registre separadas por hífen, sem espaços: 1) 3, 6, 12, 21, 33, ? | 2) 2, 4, 7, 11, 16, ? | 3) 4 renas recebem 3 laços cada; total?',
  },
  7: {
    title: 'Árvore comunitária',
    level: 'Fácil',
    basePoints: 20,
    needsReview: true,
    heaven: 'Escolha uma região no cenário «Bosque da Heaven» (esquerda, base, direita) e envie um enfeite com mensagem (até 120 caracteres) ou PNG transparente do personagem (até 5 MB).',
    kingdom: 'Escolha uma região no cenário «Castelo Kingdom» (esquerda, base, direita) e envie um enfeite com mensagem (até 120 caracteres) ou PNG transparente do personagem (até 5 MB).',
  },
  8: {
    title: 'Vitral em pedaços',
    level: 'Média',
    basePoints: 35,
    needsReview: false,
    heaven: 'Reorganize as 9 partes do vitral 3×3 «Janela de neve da Heaven» até formar a ordem correta de 1 a 9.',
    kingdom: 'Reorganize as 9 partes do vitral 3×3 «Estrela da torre Kingdom» até formar a ordem correta de 1 a 9.',
  },
  9: {
    title: 'Perfil de festa',
    level: 'Fácil',
    basePoints: 20,
    needsReview: true,
    heaven: 'Crie uma frase natalina curta (20 a 120 caracteres) com referência a HEAVEN e ao Natal para sua bio Ducks e anexe a captura do resultado.',
    kingdom: 'Crie uma frase natalina curta (20 a 120 caracteres) com referência a KINGDOM e ao Natal para sua bio Discord ou cartão de perfil e anexe a captura.',
  },
  10: {
    title: 'Quiz do festival',
    level: 'Média',
    basePoints: 35,
    needsReview: false,
    heaven: 'Responda às cinco perguntas de múltipla escolha sobre o festival da Heaven (necessário acertar 5/5).',
    kingdom: 'Responda às cinco perguntas de múltipla escolha sobre o festival da The Kingdom (necessário acertar 5/5).',
  },
  11: {
    title: 'Caça às pistas',
    level: 'Difícil',
    basePoints: 50,
    needsReview: false,
    heaven: 'Explore o portal e descubra os três fragmentos ocultos (rodapé do Calendário, placa da Árvore e créditos da Galeria) e una-os na ordem 1, 2 e 3.',
    kingdom: 'Explore o portal e descubra os três fragmentos ocultos (rodapé do Calendário, placa da Árvore e créditos da Galeria) e una-os na ordem 1, 2 e 3.',
  },
  12: {
    title: 'Forca natalina',
    level: 'Fácil',
    basePoints: 20,
    needsReview: false,
    heaven: 'Adivinhe a palavra de 9 letras em até 8 letras erradas. Dica: «Enfeite circular pendurado em portas».',
    kingdom: 'Adivinhe a palavra de 8 letras em até 8 letras erradas. Dica: «Cena que representa o nascimento do Natal».',
  },
  13: {
    title: 'Sudoku de inverno',
    level: 'Difícil',
    basePoints: 50,
    needsReview: false,
    heaven: 'Resolva o Sudoku 6×6 da Heaven usando algarismos de 1 a 6 uma vez por linha, coluna e bloco 2×3.',
    kingdom: 'Resolva o Sudoku 6×6 da The Kingdom usando algarismos de 1 a 6 uma vez por linha, coluna e bloco 2×3.',
  },
  14: {
    title: 'Caça-palavras: segunda senha',
    level: 'Média',
    basePoints: 35,
    needsReview: false,
    heaven: 'Encontre ÁRVORE, NEVE, JOGO e OURO no segundo tabuleiro 12×12 e forme a senha com as letras iniciais nessa ordem.',
    kingdom: 'Encontre LAÇO, URSO, ANJO e RABANADA no segundo tabuleiro 12×12 e forme a senha com as letras iniciais nessa ordem.',
  },
  15: {
    title: 'Corrida da oficina',
    level: 'Média',
    basePoints: 35,
    needsReview: false,
    heaven: 'Classifique os 12 itens da Heaven nas categorias ENFEITES, DOCES e ROUPAS antes de encerrar as rodadas.',
    kingdom: 'Classifique os 12 itens da The Kingdom nas categorias CARTAS, LUZES e PRESENTES antes de encerrar as rodadas.',
  },
  16: {
    title: 'Galeria de Natal',
    level: 'Média',
    basePoints: 35,
    needsReview: true,
    heaven: 'Envie uma arte original de Natal com o tema «Um Natal na Heaven» (ao menos um elemento de comunidade + um natalino) e preencha título e créditos.',
    kingdom: 'Envie uma arte original de Natal com o tema «O castelo da The Kingdom no Natal» (ao menos um elemento de reino + um natalino) e preencha título e créditos.',
  },
  17: {
    title: 'Cruzadinhas do castelo',
    level: 'Difícil',
    basePoints: 50,
    needsReview: false,
    heaven: 'Resolva as cinco palavras horizontais da Heaven e use a coluna central contínua para descobrir a palavra vertical de nove letras.',
    kingdom: 'Resolva as cinco palavras horizontais da The Kingdom e use a coluna central contínua para descobrir a palavra vertical de nove letras.',
  },
  18: {
    title: 'Encontre as diferenças',
    level: 'Fácil',
    basePoints: 20,
    needsReview: false,
    heaven: 'Compare as duas ilustrações do salão Heaven na grade 10×10 e toque nas seis alterações.',
    kingdom: 'Compare as duas ilustrações do jardim Kingdom na grade 10×10 e toque nas seis alterações.',
  },
  19: {
    title: 'Mensagem ao Reino',
    level: 'Fácil',
    basePoints: 20,
    needsReview: true,
    heaven: 'Responda em 40 a 300 caracteres: «O que você gostaria de agradecer à Heaven neste ano?» Inclua HEAVEN e uma expressão de Natal.',
    kingdom: 'Responda em 40 a 300 caracteres: «Qual desejo você deixa para a The Kingdom neste Natal?» Inclua KINGDOM e uma expressão de Natal.',
  },
  20: {
    title: 'Criptograma do Noelvet',
    level: 'Difícil',
    basePoints: 50,
    needsReview: false,
    heaven: 'Decifre a frase «D HVWUHOD JXLD R UHLQR» (cada letra avançou 3 posições no alfabeto; volte 3 para decifrar).',
    kingdom: 'Decifre a frase «S REXEP YRI E OMRKHSQ» (cada letra avançou 4 posições no alfabeto; volte 4 para decifrar).',
  },
  21: {
    title: 'Bingo dos elfos',
    level: 'Média',
    basePoints: 35,
    needsReview: false,
    heaven: 'Responda às nove mini-perguntas da cartela 3×3 da Heaven e forme ao menos uma linha de três casas corretas.',
    kingdom: 'Responda às nove mini-perguntas da cartela 3×3 da The Kingdom e forme ao menos uma linha de três casas corretas.',
  },
  22: {
    title: 'Palavras embaralhadas',
    level: 'Fácil',
    basePoints: 20,
    needsReview: false,
    heaven: 'Desembaralhe as seis palavras de Natal da Heaven (EROVRA, ONIS, EVEN, ALERTSE, OCAL, ALEV) sem acentos.',
    kingdom: 'Desembaralhe as seis palavras de Natal da The Kingdom (ANER, ORROG, ATRAC, OTIOCSIB, AVUL, OCOLF) sem acentos.',
  },
  23: {
    title: 'Rotas de entrega',
    level: 'Difícil',
    basePoints: 50,
    needsReview: false,
    heaven: 'Descubra a ordem exata das quatro entregas (18h às 21h) entre DOCE, SINO, LAÇO e LIVRO seguindo as pistas e separe por vírgulas.',
    kingdom: 'Descubra a ordem exata das quatro entregas (18h às 21h) entre ESTRELA, NEVE, CARTA e PRESENTE seguindo as pistas e separe por vírgulas.',
  },
  24: {
    title: 'A última busca',
    level: 'Difícil',
    basePoints: 50,
    needsReview: false,
    heaven: 'Resolva as três etapas (letras de SINO + valor de 2+5 + inicial de Noelvet) e monte a senha final número+número+letra sem espaços.',
    kingdom: 'Resolva as três etapas (letras de RENA + valor de 3+5 + inicial de Kingdom) e monte a senha final número+número+letra sem espaços.',
  },
  25: {
    title: 'Desejos de Natal',
    level: 'Média',
    basePoints: 35,
    needsReview: true,
    heaven: 'Conclua o quiz final de 3 perguntas da Heaven e escreva uma saudação natalina (30 a 200 caracteres) mencionando HEAVEN.',
    kingdom: 'Conclua o quiz final de 3 perguntas da The Kingdom e escreva uma saudação natalina (30 a 200 caracteres) mencionando KINGDOM.',
  },
};

const TEAM_CREDITS = [
  ['Planejamento', 'Organizar o calendário, preparar as regras e conduzir o evento.'],
  ['Criação dos jogos / VULPORA', 'Montar as 25 atividades, controlar as liberações e registrar os pontos.'],
  ['Arte e design', 'Criar a identidade natalina, os jogos visuais, a árvore, a galeria e os cartões de conclusão.'],
  ['Equipe Heaven', 'Orientar as publicações no Ducks e conferir as comprovações dos participantes.'],
  ['Equipe The Kingdom', 'Apoiar quem participa pelo Discord e analisar envios feitos no site.'],
  ['Moderação & Premiações', 'Aprovar conteúdos, resolver dúvidas, avaliar recursos e confirmar recompensas.'],
];

function enrichMission(m = {}, isHeaven = false) {
  const day = Number(m.day) || 1;
  const meta = ADVENT_CATALOG[day] || {};
  const rawStatus = m.status || 'locked';
  const status = UNLOCK_ALL_FOR_TEST && rawStatus === 'locked' ? 'open' : rawStatus;

  return {
    ...m,
    day,
    status,
    title: m.title || meta.title || `Desafio do Dia ${day}`,
    level: m.level || meta.level || 'Fácil',
    points: m.points ?? meta.basePoints ?? 20,
    needsReview: m.needsReview ?? meta.needsReview ?? false,
    objective: m.objective || (isHeaven ? meta.heaven : meta.kingdom) || 'Conclua a atividade do dia na VULPORA.',
  };
}

/* Coordenadas (%) dos 25 botões para o calendário da The Kingdom */
const KINGDOM_HOTSPOTS = {
  1:  { top: '1.5%',  left: '1.5%',  width: '17.5%', height: '18.2%' },
  2:  { top: '1.5%',  left: '20.2%', width: '21.0%', height: '18.2%' },
  3:  { top: '1.5%',  left: '42.4%', width: '38.0%', height: '18.2%' },
  4:  { top: '1.5%',  left: '81.6%', width: '16.9%', height: '18.2%' },

  5:  { top: '21.0%', left: '1.5%',  width: '21.0%', height: '18.2%' },
  6:  { top: '21.0%', left: '23.7%', width: '8.2%',  height: '18.2%' },
  7:  { top: '21.0%', left: '33.1%', width: '10.5%', height: '18.2%' },
  8:  { top: '21.0%', left: '44.8%', width: '17.0%', height: '18.2%' },
  9:  { top: '21.0%', left: '63.0%', width: '17.4%', height: '28.2%' },
  10: { top: '21.0%', left: '81.6%', width: '16.9%', height: '18.2%' },

  11: { top: '40.5%', left: '1.5%',  width: '19.5%', height: '18.2%' },
  12: { top: '40.5%', left: '22.2%', width: '24.8%', height: '18.2%' },
  13: { top: '40.5%', left: '48.2%', width: '13.6%', height: '18.2%' },
  14: { top: '50.4%', left: '63.0%', width: '17.4%', height: '8.3%'  },
  15: { top: '40.5%', left: '81.6%', width: '16.9%', height: '18.2%' },

  16: { top: '60.0%', left: '1.5%',  width: '8.5%',  height: '18.2%' },
  17: { top: '60.0%', left: '11.2%', width: '16.5%', height: '18.2%' },
  18: { top: '60.0%', left: '28.9%', width: '14.7%', height: '18.2%' },
  19: { top: '60.0%', left: '44.8%', width: '17.0%', height: '18.2%' },
  20: { top: '60.0%', left: '63.0%', width: '17.4%', height: '18.2%' },
  21: { top: '60.0%', left: '81.6%', width: '16.9%', height: '18.2%' },

  22: { top: '79.5%', left: '1.5%',  width: '18.2%', height: '19.0%' },
  23: { top: '79.5%', left: '20.9%', width: '17.8%', height: '19.0%' },
  24: { top: '79.5%', left: '39.9%', width: '18.2%', height: '19.0%' },
  25: { top: '79.5%', left: '59.3%', width: '39.2%', height: '19.0%' },
};

/* Coordenadas (%) exatas dos 25 botões para o calendário da Heaven */
const HEAVEN_HOTSPOTS = {
  1:  { top: '1.5%',  left: '1.5%',  width: '19.0%', height: '18.2%' },
  2:  { top: '1.5%',  left: '21.7%', width: '18.8%', height: '18.2%' },
  3:  { top: '1.5%',  left: '41.7%', width: '38.8%', height: '18.2%' },
  4:  { top: '1.5%',  left: '81.7%', width: '16.8%', height: '18.2%' },

  5:  { top: '21.0%', left: '1.5%',  width: '19.0%', height: '18.2%' },
  6:  { top: '21.0%', left: '21.7%', width: '8.5%',  height: '18.2%' },
  7:  { top: '21.0%', left: '31.4%', width: '9.1%',  height: '18.2%' },
  8:  { top: '21.0%', left: '41.7%', width: '18.8%', height: '18.2%' },
  9:  { top: '21.0%', left: '61.7%', width: '18.8%', height: '28.0%' },
  10: { top: '21.0%', left: '81.7%', width: '16.8%', height: '18.2%' },

  11: { top: '40.5%', left: '1.5%',  width: '19.0%', height: '18.2%' },
  12: { top: '40.5%', left: '21.7%', width: '18.8%', height: '18.2%' },
  13: { top: '40.5%', left: '41.7%', width: '18.8%', height: '18.2%' },
  14: { top: '50.3%', left: '61.7%', width: '18.8%', height: '8.4%'  },
  15: { top: '40.5%', left: '81.7%', width: '16.8%', height: '18.2%' },

  16: { top: '60.0%', left: '1.5%',  width: '9.0%',  height: '18.2%' },
  17: { top: '60.0%', left: '11.7%', width: '17.8%', height: '18.2%' },
  18: { top: '60.0%', left: '30.7%', width: '9.8%',  height: '18.2%' },
  19: { top: '60.0%', left: '41.7%', width: '18.8%', height: '18.2%' },
  20: { top: '60.0%', left: '61.7%', width: '18.8%', height: '18.2%' },
  21: { top: '60.0%', left: '81.7%', width: '16.8%', height: '18.2%' },

  22: { top: '79.5%', left: '1.5%',  width: '19.0%', height: '19.0%' },
  23: { top: '79.5%', left: '21.7%', width: '18.8%', height: '19.0%' },
  24: { top: '79.5%', left: '41.7%', width: '18.8%', height: '19.0%' },
  25: { top: '79.5%', left: '61.7%', width: '36.8%', height: '19.0%' },
};

function isHeavenCommunity(communityMeta) {
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

function EventCountdownBanner({ ev, commName, commTag, commTheme, onBackToCommunity }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalDays = ev?.missions?.length || TOTAL_DAYS;
  const parsedStart = ev?.startDate ? new Date(ev.startDate).getTime() : NaN;
  const startMs = Number.isFinite(parsedStart)
    ? parsedStart
    : new Date('2026-12-01T00:00:00-03:00').getTime();

  const dayMs = 24 * 60 * 60 * 1000;
  const endMs = startMs + totalDays * dayMs;

  let phase = 'before';
  let currentDay = 0;
  let targetMs = startMs;

  if (now < startMs) {
    phase = 'before';
    targetMs = startMs;
  } else if (now < endMs) {
    phase = 'active';
    currentDay = Math.floor((now - startMs) / dayMs) + 1;
    targetMs = startMs + currentDay * dayMs;
  } else {
    phase = 'ended';
    currentDay = totalDays;
    targetMs = endMs;
  }

  const diff = Math.max(0, targetMs - now);
  const days = Math.floor(diff / dayMs);
  const hours = Math.floor((diff % dayMs) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  const pad = (n) => String(n).padStart(2, '0');

  const timerBlocks =
    phase === 'before'
      ? [
          ['DIAS', pad(days)],
          ['HORAS', pad(hours)],
          ['MIN', pad(minutes)],
          ['SEG', pad(seconds)],
        ]
      : [
          ['HORAS', pad(hours)],
          ['MINUTOS', pad(minutes)],
          ['SEGUNDOS', pad(seconds)],
        ];

  const statusBadge = UNLOCK_ALL_FOR_TEST
    ? 'Modo Teste · 25 portas liberadas'
    : phase === 'before'
      ? 'Começa em 01/12 às 00:00 (Brasília)'
      : phase === 'active'
        ? currentDay < totalDays
          ? `Dia ${currentDay} ativo · Próxima porta às 00:00`
          : `Dia ${totalDays} ativo · Última porta`
        : 'Todas as 25 portas liberadas';

  const helperText =
    phase === 'before'
      ? 'Contagem regressiva para a abertura da Porta 1. De 1º a 25 de dezembro, uma nova porta abre diariamente à meia-noite (Brasília).'
      : phase === 'active'
        ? currentDay < totalDays
          ? `A porta do Dia ${currentDay + 1} será liberada automaticamente à meia-noite (00:00 BRT). Todas permanecem abertas até 25/12 às 23h59.`
          : 'Reta final! O encerramento do calendário acontece em 25/12 às 23h59 (horário de Brasília).'
        : 'Todos os 25 desafios do Calendário do Advento 2026 já estão disponíveis.';

  return (
    <section
      className="glass hot community-hero"
      style={{
        background: 'linear-gradient(135deg, rgba(28, 12, 18, 0.94), rgba(14, 10, 22, 0.96))',
        border: '1px solid rgba(244, 165, 29, 0.24)',
      }}
    >
      <div className="comm-hero-top" style={{ alignItems: 'center', gap: 20 }}>
        <div style={{ flex: '1 1 300px' }}>
          <div className="who-name">
            <CommunityTag tag={commTag} theme={commTheme} />
            <span className="badge gold">
              <Icon name="clock" size={13} /> {statusBadge}
            </span>
          </div>
          <h1 style={{ margin: '8px 0 4px' }}>Calendário do Advento · {commName}</h1>
          <p className="m">{helperText}</p>
        </div>

        {phase !== 'ended' && (
          <div
            aria-label="Cronômetro do evento"
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {timerBlocks.map(([label, value]) => (
              <div
                key={label}
                style={{
                  minWidth: 72,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'rgba(8, 6, 14, 0.72)',
                  border: '1px solid rgba(244, 165, 29, 0.3)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(22px, 2.6vw, 30px)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--gold, #F4A51D)',
                  }}
                >
                  {value}
                </div>
                <small
                  style={{
                    display: 'block',
                    marginTop: 4,
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    opacity: 0.78,
                  }}
                >
                  {label}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="comm-hero-links" style={{ marginTop: 18 }}>
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
    </section>
  );
}

export function Home({ me = {}, ev = {}, communityMeta, letters = [], onOpen, onWrite, onMission, onBackToCommunity }) {
  const isHeaven = isHeavenCommunity(communityMeta);
  const rawMissions = ev?.missions || [];
  const missions = rawMissions.map((item) => enrichMission(item, isHeaven));
  const total = missions.length || TOTAL_DAYS;
  const today = ev?.today || 1;
  const missionsDone = Math.min(me?.missionsDone || 0, total);
  const todayIdx = Math.min(Math.max(today, 1), Math.max(missions.length, 1)) - 1;
  const m = missions[todayIdx] || enrichMission({ day: today, status: 'open' }, isHeaven);
  const C = 2 * Math.PI * 42;
  const rest = Math.max(0, TOTAL_DAYS - today);
  const commName = communityMeta?.name || 'Comunidade';
  const commTag = communityMeta?.tag || 'EVENTO';
  const commTheme = communityMeta?.theme;

  const eyebrow =
    ev?.status === 'before' && !UNLOCK_ALL_FOR_TEST
      ? 'O evento começa em 1º de dezembro'
      : ev?.status === 'ended' || today > TOTAL_DAYS
      ? 'Evento encerrado'
      : rest === 0
      ? 'Hoje é Natal!'
      : `Faltam ${rest} ${rest === 1 ? 'dia' : 'dias'} para o Natal`;

  return (
    <div className="community-hub">
      <EventCountdownBanner
        ev={ev}
        commName={commName}
        commTag={commTag}
        commTheme={commTheme}
        onBackToCommunity={onBackToCommunity}
      />

      <div id="natal-hub" className="home">
        <section className="glass hot">
          <div className="who-name" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Árvore de {commName}</h2>
            <CommunityTag tag={commTag} theme={commTheme} />
          </div>
          <p className="m">
            {isHeaven
              ? 'Decore o Bosque da Heaven com enfeites, mensagens ou personagens PNG transparente.'
              : 'Decore o Castelo Kingdom com enfeites, mensagens ou personagens PNG transparente.'}
          </p>
          <Tree letters={letters} isHeaven={isHeaven} onOpen={onOpen} />

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
              <span>Escrever mensagem</span>
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
                strokeDashoffset={C * (1 - missionsDone / total)}
              />
            </svg>
            <div className="ringtxt">
              <b className="big">{missionsDone}</b>
              <small>de {total}</small>
            </div>
          </div>
          <p className="m center">
            {me?.points != null
              ? `${me.points} pontos acumulados · ${missionsDone >= 3 ? 'Lembrança garantida!' : '3 aprovadas garantem lembrança'}`
              : 'Conclua missões para subir no ranking'}
          </p>
          {m ? (
            <>
              <h3>
                Dia {m.day} · {m.title}
              </h3>
              <p className="m">{m.objective}</p>
              {m.points != null && <p className="gain">+{m.points} pontos-base ({m.level})</p>}
              <button
                className={`btn ${m.status === 'done' ? 'pine' : m.status === 'pending' ? 'bronze' : ''}`}
                disabled={m.status === 'locked'}
                onClick={() => onMission?.(m)}
              >
                {m.status === 'done' ? (
                  <>
                    <Icon name="check" size={16} />
                    <span>Atividade concluída</span>
                  </>
                ) : m.status === 'pending' ? (
                  <>
                    <Icon name="clock" size={16} />
                    <span>Em análise</span>
                  </>
                ) : m.status === 'locked' ? (
                  'Ainda bloqueada'
                ) : m.status === 'rejected' ? (
                  'Enviar novamente'
                ) : (
                  'Abrir porta do dia'
                )}
              </button>
            </>
          ) : (
            <p className="m center">As atividades ainda não foram carregadas.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export function Calendar({ ev = {}, communityMeta, onMission }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const missions = ev?.missions || [];
  const isHeaven = isHeavenCommunity(communityMeta);

  const hotspots = isHeaven ? HEAVEN_HOTSPOTS : KINGDOM_HOTSPOTS;
  const calendarImage = isHeaven
    ? '/assets/calendario-natal-heaven.jpg'
    : '/assets/calendario-natal.jpg';

  const doors = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const day = i + 1;
    const raw = missions.find((item) => item.day === day) || { day, status: 'locked' };
    return enrichMission(raw, isHeaven);
  });

  const handleSelect = (m) => {
    if (m.status === 'locked') return;
    setSelectedDay(m.day);
    onMission?.(m);
  };

  return (
    <section className="glass hot cal-sec">
      <div className="cal-head">
        <p className="eyebrow">
          1º a 25 de Dezembro de 2026 · {communityMeta?.tag || 'EVENTO'}
        </p>
        <h2>Calendário do Advento</h2>
        <p className="m">
          Toque em uma porta liberada para abrir a atividade de {communityMeta?.name || 'Comunidade'}.
        </p>
      </div>

      <div className={`advent-image-stage ${isHeaven ? 'is-heaven' : ''}`}>
        <img
          src={calendarImage}
          alt={`Calendário do Advento de Natal · ${communityMeta?.name || 'Comunidade'}`}
          className="advent-bg-img"
        />

        <div className="advent-hotspots">
          {doors.map((m) => {
            const spot = hotspots[m.day];
            const isLocked = m.status === 'locked';
            const isDone = m.status === 'done';
            const isPending = m.status === 'pending';
            const isSelected = selectedDay === m.day;
            const dayStr = String(m.day).padStart(2, '0');

            return (
              <button
                key={m.day}
                type="button"
                disabled={isLocked}
                onClick={() => handleSelect(m)}
                style={spot}
                className={[
                  'adv-spot',
                  isLocked ? 'is-locked' : 'is-open',
                  isDone ? 'is-done' : '',
                  isPending ? 'is-pending' : '',
                  isSelected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`Dia ${m.day}: ${m.title} (${m.level}, +${m.points} pts)${isLocked ? ' (bloqueado)' : ''}`}
                title={
                  isLocked
                    ? `Dia ${m.day} · Libera em ${dayStr}/12 às 00:00 (Brasília)`
                    : `Dia ${m.day} · ${m.title} (${m.level} · +${m.points} pts)`
                }
              >
                {isDone && (
                  <span className="adv-spot-badge done" aria-hidden="true">
                    ✓
                  </span>
                )}
                {isPending && (
                  <span className="adv-spot-badge pending" aria-hidden="true">
                    ◷
                  </span>
                )}
                {isLocked && (
                  <span className="adv-spot-lock" aria-hidden="true">
                    🔒
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <footer
        className="m small"
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          opacity: 0.8,
        }}
      >
        <span>
          {isHeaven
            ? 'Heaven (Ducks): publique sua participação sem revelar senhas e anexe o link/print em até 24h.'
            : 'The Kingdom (Discord): atividades e envios registrados diretamente na VULPORA.'}
        </span>
        <span>
          Pista 01/03: <b>{isHeaven ? 'LU' : 'ES'}</b>
        </span>
      </footer>
    </section>
  );
}

export function Ranking({ rk, isCommunity = false, unlocked, isHeaven = false, compact = false }) {
  const isUnlocked = unlocked ?? (isCommunity || isFinaleNow() || Date.now() >= RANK_OPEN_DATE);

  if (!isUnlocked) {
    return (
      <div className="rk-wrap">
        <div className="rk-locked" style={{ marginBottom: 14 }}>
          <span className="rk-locked-ico" aria-hidden="true">
            <Icon name="clock" size={22} />
          </span>
          <b>Classificação aberta em 25/12 às 00h</b>
          <p className="m">
            Até <b>24 de dezembro às 23h59</b>, esta página exibe os agradecimentos e créditos da equipe que construiu o Natal 2026.
          </p>
        </div>

        <div className="rk-list">
          {TEAM_CREDITS.slice(0, compact ? 4 : TEAM_CREDITS.length).map(([role, desc]) => (
            <div key={role} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="pos">✦</span>
              <div>
                <b>{role}</b>
                <p className="m small" style={{ margin: '2px 0 0' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const list = (rk?.ranking || []).map((r, i) => ({ ...r, position: r.position ?? i + 1 }));
  const top = [1, 0, 2].map((i) => list[i]).filter(Boolean);
  const others = list.slice(3);

  return (
    <div className="rk-wrap">
      <p className="m small" style={{ marginBottom: 10 }}>
        Classificação provisória aberta em 25/12 às 00h · Conferência final e contestações de 26 a 28/12.
      </p>

      {!list.length && <p className="m">Ninguém pontuou ainda. Seja a primeira pessoa!</p>}

      {top.length > 0 && (
        <div className="podium" role="list" aria-label="Pódio dos 3 primeiros lugares">
          {top.map((r) => {
            const pos = r.position;
            const color = MEDAL_COLOR[pos - 1] || '#F4A51D';

            return (
              <div key={r.id ?? `${pos}-${r.name}`} role="listitem" className={`pod p${pos}`}>
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

      {others.length > 0 && (
        <div className="rk-list">
          {others.map((r, i) => (
            <div key={r.id ?? `${r.position}-${r.name}-${i}`} className="row">
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

      {!compact && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ margin: '0 0 8px' }}>Créditos da Equipe · Natal 2026</h4>
          <div className="rk-list">
            {TEAM_CREDITS.map(([role, desc]) => (
              <div key={role} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className="pos">✦</span>
                <div>
                  <b>{role}</b>
                  <p className="m small" style={{ margin: '2px 0 0' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="m small" style={{ marginTop: 8, opacity: 0.75 }}>
            Créditos Galeria · Pista 03/03: <b>{isHeaven ? 'S' : 'LA'}</b>
          </p>
        </div>
      )}
    </div>
  );
}

export function Prizes({ pz = {}, done = 0 }) {
  const prizes = pz?.prizes || [];
  const milestones = pz?.milestones || [];

  if (!prizes.length && !milestones.length) {
    return <p className="m">As premiações serão confirmadas conforme disponibilidade e regras de cada plataforma.</p>;
  }

  return (
    <>
      {prizes.map((p, i) => (
        <div key={p.place ?? i} className="row">
          <span className="medal" style={{ color: MEDAL_COLOR[(p.place ?? i + 1) - 1] }}>
            <Icon name="medal" size={24} />
          </span>
          <div>
            <b>{p.title}</b>
            <p className="m">{p.reward}</p>
          </div>
        </div>
      ))}

      {milestones.length > 0 && <h3>Lembrança de participação (3 atividades aprovadas)</h3>}
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
                {k.missions} atividades aprovadas · {k.reward}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function MissionModal({ m, communityMeta, isHeaven: isHeavenProp, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  if (!m) return null;

  const isHeaven = isHeavenProp ?? isHeavenCommunity(communityMeta);
  const enriched = enrichMission(m, isHeaven);

  const done = enriched.status === 'done';
  const pend = enriched.status === 'pending';
  const locked = enriched.status === 'locked';
  const requiresInput = !done && !pend && !locked;

  const handleGameSubmit = async (serializedPayload) => {
    if (lock.current || !serializedPayload) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await onSubmit?.(enriched.day, serializedPayload);
    } catch (e) {
      setError(e?.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <div className="who-name" style={{ marginBottom: 6 }}>
        <span className="badge gold">{enriched.level} · +{enriched.points} pts base</span>
        <span className="badge">{isHeaven ? 'Heaven (Ducks)' : 'The Kingdom (Discord)'}</span>
        {UNLOCK_ALL_FOR_TEST && <span className="badge">Teste ativo</span>}
      </div>
      <h3>
        Dia {enriched.day} · {enriched.title}
      </h3>
      <div className="paper">
        <b>Desafio:</b> {enriched.objective}
      </div>
      <p className="m small" style={{ marginTop: 8 }}>
        Bônus: +25 no dia da abertura (cai 1/dia até +1), +10 nos primeiros 60 min e +25 na 1ª tentativa. Erros confirmados descontam -1, -2, -3... (pausa de 30 min após 5 erros).
      </p>

      {isHeaven && !locked && (
        <p className="m small" style={{ marginTop: 6 }}>
          <b>Comprovação Heaven (Ducks):</b> publique sua participação na Heaven sem revelar senhas ou respostas e cole o link/print abaixo (prazo de até 24h após concluir).
        </p>
      )}
      {!isHeaven && !locked && (
        <p className="m small" style={{ marginTop: 6 }}>
          <b>The Kingdom (Discord):</b> envio direto na VULPORA, sem necessidade de postar no Discord.
        </p>
      )}

      {enriched.status === 'rejected' && <div className="err">Sua comprovação anterior precisa de ajuste. Envie novamente.</div>}
      {error && <div className="err" role="alert">{error}</div>}
      {locked && <p className="m">Esta porta abre em {String(enriched.day).padStart(2, '0')}/12 às 00:00 (horário de Brasília).</p>}

      {requiresInput && (
        <div style={{ marginTop: 12 }}>
          <AdventDayGame
            day={enriched.day}
            isHeaven={isHeaven}
            busy={busy}
            onSend={handleGameSubmit}
          />
        </div>
      )}

      {(done || pend) && (
        <div className="acts" style={{ marginTop: 12 }}>
          {done ? (
            <span className="badge pine">
              <Icon name="check" size={14} /> Atividade concluída
            </span>
          ) : (
            <span className="badge bronze">
              <Icon name="clock" size={14} /> Em revisão pela equipe
            </span>
          )}
        </div>
      )}
    </>
  );
}

export function WriteModal({ authorName, onSend }) {
  const [t, setT] = useState(readDraft);
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const displayNick = anon ? 'Anônimo' : authorName || 'Você';
  const text = t.trim();

  const change = (e) => {
    setT(e.target.value);
    saveDraft(e.target.value);
  };

  const send = async () => {
    if (lock.current || text.length < 3) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await onSend?.(text, anon);
      if (result !== false) saveDraft('');
    } catch (e) {
      setError(e?.message || 'Não foi possível pendurar a mensagem. Tente novamente.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <h3>Pendurar mensagem na Árvore</h3>
      <p className="m">Sua mensagem ficará visível na árvore após aprovação da equipe (até 120 caracteres recomendados para enfeites).</p>

      <div className="write-author">
        <Icon name="mail" size={15} />
        <span>Aparecerá na árvore como: <b className="uname">{displayNick}</b></span>
      </div>

      <textarea
        rows={4}
        maxLength={120}
        value={t}
        onChange={change}
        placeholder="Deixe seus votos de Natal para a comunidade..."
      />
      <label className="chk">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Enviar como anônimo
      </label>
      {error && <div className="err" role="alert">{error}</div>}
      <div className="acts">
        <span className="m small">{t.length}/120</span>
        <button className="btn red" disabled={busy || text.length < 3} onClick={send}>
          Enviar para aprovação
        </button>
      </div>
    </>
  );
}

export const LetterModal = ({ l }) => {
  if (!l) return <p className="m">Mensagem não encontrada.</p>;
  const author = l.author || 'Anônimo';

  return (
    <>
      <div className="letter-from">
        <Icon name="mail" size={15} />
        <span>Enfeite de <b className="uname">{author}</b></span>
      </div>
      <h3>Mensagem na Árvore</h3>
      <div className="paper">
        <span style={{ whiteSpace: 'pre-wrap' }}>{l.text}</span>
        <br />
        <br />
        <i className="uname" style={{ color: '#A81E23', fontWeight: 700 }}>— {author}</i>
      </div>
    </>
  );
};