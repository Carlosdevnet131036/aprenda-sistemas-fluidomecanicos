import type { Module } from '../types';
import { box, link, list, p } from '../blocks';

export const m7: Module = {
  id: 'm7',
  num: 7,
  title: 'Avaliação final',
  short: 'Avaliação',
  description: 'Prova simulada de Verdadeiro ou Falso cobrindo todos os módulos, com correção completa ao final.',
  source: 'Quiz de 22 questões do material, adaptado para Verdadeiro ou Falso, + questões complementares',
  minutes: 30,
  sections: [
    {
      id: 'intro',
      kind: 'intro',
      title: 'Como funciona a avaliação',
      origin: 'misto',
      blocks: [
        p('A avaliação final reúne questões de **todos os módulos** e dos três níveis (iniciante, intermediário e avançado), sorteadas do banco de questões. Cada tentativa traz questões diferentes, com verdadeiras e falsas equilibradas.'),
        list([
          'Você responde todas as questões **sem ver a correção**. Pode voltar e mudar respostas antes de entregar.',
          'Ao entregar, aparece a correção completa: justificativa, versão corrigida das afirmações falsas e o conceito a revisar.',
          'Você vê o percentual de acertos, seus pontos fortes e os temas que precisam de revisão.',
          'As questões erradas vão para a sua lista de “Revisão de erros”.',
        ]),
        box('fonte', 'Como interpretar a nota (adaptado do material)',
          'No quiz do material: 20–22 acertos em 22 (≈ 90% ou mais) = pronto para a prova; 15–19 (≈ 70–89%) = revise as pegadinhas; abaixo de 15 (< 70%) = refaça os módulos e as listas resolvidas.'),
        link('#/quiz?modo=avaliacao&n=30', 'Começar a avaliação final (30 questões)', true),
        link('#/quiz?modo=avaliacao&n=15', 'Versão curta (15 questões)'),
      ],
    },
  ],
  summary: {
    essentials: [
      'Faça a avaliação depois de passar pelos módulos 0 a 6.',
      'Use a correção para identificar os temas fracos e volte às aulas indicadas.',
      'Refaça a avaliação: cada tentativa sorteia questões diferentes.',
    ],
    mistakes: ['Fazer a avaliação consultando as respostas: o objetivo é descobrir o que ainda falta estudar.'],
  },
};
