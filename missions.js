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
export const MISSIONS = [
  ['Acenda a primeira luz', 'Entre no evento e acenda a luz da sua árvore', 10, 'login'],
  ['Cartinha de abertura', 'Deixe uma cartinha na árvore do evento', 15, 'letter'],
  ['Conecte-se', 'Conecte seu Discord ao perfil', 15, 'discord'],
  ['Gentileza de inverno', 'Elogie alguém da comunidade', 10, 'review'],
  ['Leitor de cartas', 'Leia 3 cartinhas de outros usuários', 15, 'reads3'],
  ['Chocolate quente', 'Conte qual é a sua bebida de inverno favorita', 10, 'review'],
  ['Enfeite a vibe', 'Troque seu avatar por um tema natalino', 10, 'review'],
  ['Amigo secreto', 'Responda a uma cartinha com carinho', 20, 'review'],
  ['Canção de Natal', 'Compartilhe sua música natalina favorita', 10, 'review'],
  ['Chuva de flocos', 'Convide um amigo para o evento', 20, 'review'],
  ['Memória mágica', 'Conte sua lembrança de Natal favorita', 15, 'review'],
  ['Biscoitos de gengibre', 'Compartilhe uma receita natalina', 15, 'review'],
  ['Noite de filme', 'Indique um filme de Natal', 10, 'review'],
  ['Presente invisível', 'Faça algo bom por alguém sem esperar nada', 20, 'review'],
  ['Meio do caminho', 'Conclua 10 missões até aqui', 25, 'count10'],
  ['Pisca-pisca', 'Entre no evento 3 dias seguidos', 15, 'review'],
  ['Poesia de inverno', 'Escreva um verso natalino', 15, 'review'],
  ['Desenho mágico', 'Mostre uma arte de Natal', 20, 'review'],
  ['Papai Noel por um dia', 'Escreva para quem ainda não recebeu cartinhas', 25, 'review'],
  ['Ceia dos sonhos', 'Descreva a sua ceia perfeita', 10, 'review'],
  ['Espírito de equipe', 'Participe de uma atividade no Discord', 20, 'review'],
  ['Gratidão', 'Agradeça publicamente a alguém', 15, 'review'],
  ['Contagem regressiva', 'Conclua 3 missões em um só dia', 25, 'review'],
  ['Véspera mágica', 'Deixe um desejo para o próximo ano', 20, 'review'],
  ['Feliz Natal!', 'Envie uma mensagem de Natal para todos', 30, 'review'],
];

// Exemplos: troque pelos prêmios reais
export const PRIZES = [
  { place: 1, title: '1º lugar', reward: 'Prêmio principal + cargo exclusivo Lenda do Natal' },
  { place: 2, title: '2º lugar', reward: 'Prêmio especial + cargo Estrela do Natal' },
  { place: 3, title: '3º lugar', reward: 'Prêmio surpresa + cargo Luz do Natal' },
];

export const MILESTONES = [
  { missions: 7, title: 'Elfo Ajudante', reward: 'cargo especial' },
  { missions: 15, title: 'Emoji exclusivo', reward: 'para o servidor' },
  { missions: 25, title: 'Natal Completo', reward: 'moldura de perfil' },
];
