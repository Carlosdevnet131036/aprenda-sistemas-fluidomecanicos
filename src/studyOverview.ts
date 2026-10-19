// Dados derivados usados pelo painel e pelo plano: revisões vencidas,
// desempenho por assunto/módulo, plano montado e sessão de hoje.
import { useMemo } from 'react';
import { MODULES } from './content/modules';
import { QUESTIONS, getQuestion } from './content/questions';
import { ACTIVE_EXAM_KEY } from './lib/exam';
import { buildPlan, type PlanModule } from './lib/plan';
import { dayKey, dueIds } from './lib/srs';
import { MIN_TOPIC_ATTEMPTS, moduleAccuracy, topicPerformance } from './lib/stats';
import type { ModuleId } from './content/types';
import { useProgress } from './progressContext';

export const PLAN_MODULES: PlanModule[] = MODULES.map((m) => ({ id: m.id, num: m.num, short: m.short, minutes: m.minutes }));

export function hasActiveExam(): boolean {
  try {
    return sessionStorage.getItem(ACTIVE_EXAM_KEY) !== null;
  } catch {
    return false;
  }
}

export function useStudyOverview() {
  const [state, progress] = useProgress();
  const today = dayKey(new Date());
  const due = useMemo(() => dueIds(Object.fromEntries(Object.entries(state.reviews).filter(([id]) => getQuestion(id))), new Date()), [state.reviews]);
  const perf = useMemo(() => topicPerformance(state.questionStats, QUESTIONS), [state.questionStats]);
  const modAcc = useMemo(() => moduleAccuracy(perf), [perf]);
  const weakModules = (Object.entries(modAcc) as [ModuleId, { total: number; percent: number }][])
    .filter(([, a]) => a.total >= MIN_TOPIC_ATTEMPTS && a.percent < 70)
    .sort((a, b) => a[1].percent - b[1].percent)
    .map(([id, a]) => ({ module: PLAN_MODULES.find((m) => m.id === id)!, percent: a.percent }));
  const plan = useMemo(() => (state.plan ? buildPlan(state.plan, PLAN_MODULES) : null), [state.plan]);
  const todaySessions = plan?.days.find((d) => d.date === today)?.sessions ?? [];
  return { state, progress, today, due, perf, weakModules, plan, todaySessions };
}
