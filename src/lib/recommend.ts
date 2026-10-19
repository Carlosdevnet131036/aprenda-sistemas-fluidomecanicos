// Próxima atividade recomendada no painel, em ordem de prioridade:
// simulado em andamento → revisões vencidas → sessão de hoje do plano →
// próxima aula da trilha → assunto mais fraco → simulado completo.
import type { PlanSession } from './plan';
import type { TopicPerf } from './stats';

export interface Recommendation {
  title: string;
  reason: string;
  href: string;
  cta: string;
}

export interface RecommendInput {
  activeExam: boolean;
  dueReviews: number;
  todayPlan: PlanSession | null;
  nextModule: { id: string; num: number; short: string } | null;
  startedTrail: boolean;
  weakest: TopicPerf | null;
}

export function recommend(i: RecommendInput): Recommendation {
  if (i.activeExam) return { title: 'Retomar o simulado em andamento', reason: 'Você tem um simulado começado; o relógio continua correndo.', href: '#/simulado', cta: 'Retomar' };
  if (i.dueReviews > 0)
    return {
      title: `Revisar ${i.dueReviews} questão(ões) vencida(s)`,
      reason: 'Revisar no momento certo fixa o conteúdo com menos esforço.',
      href: '#/revisar',
      cta: 'Começar a revisão',
    };
  if (i.todayPlan) return { title: i.todayPlan.label, reason: `Próxima sessão do seu plano de hoje (≈ ${i.todayPlan.minutes} min).`, href: i.todayPlan.href, cta: 'Ir para a sessão' };
  if (i.nextModule)
    return {
      title: `${i.startedTrail ? 'Continuar' : 'Começar'}: Módulo ${i.nextModule.num} — ${i.nextModule.short}`,
      reason: i.startedTrail ? 'É a próxima aula ainda não concluída da trilha.' : 'A trilha começa pelos fundamentos.',
      href: `#/modulo/${i.nextModule.id}`,
      cta: i.startedTrail ? 'Continuar a trilha' : 'Começar a aprender',
    };
  if (i.weakest)
    return {
      title: `Reforçar: ${i.weakest.topic}`,
      reason: `Seu acerto nesse assunto está em ${Math.round(i.weakest.accuracy * 100)}%.`,
      href: `#/modulo/${i.weakest.module}${i.weakest.section ? `?sec=${i.weakest.section}` : ''}`,
      cta: 'Rever a teoria',
    };
  return { title: 'Fazer um simulado completo', reason: 'Trilha concluída e sem revisões pendentes: teste-se nas condições da prova.', href: '#/simulado?n=30&tempo=45', cta: 'Abrir o simulado' };
}
