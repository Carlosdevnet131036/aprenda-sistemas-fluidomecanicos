import { describe, expect, it } from 'vitest';
import { MODULES } from '../content/modules';
import type { StudyPlanSettings } from './progress';
import { addDay, buildPlan, daysBetween, planProgress, reviewMinutes, todayAdjustments, type PlanModule } from './plan';
import { recommend } from './recommend';
import { strongAndWeak, topicPerformance, answerAccuracy } from './stats';
import { QUESTIONS } from '../content/questions';

const MODS: PlanModule[] = MODULES.map((m) => ({ id: m.id, num: m.num, short: m.short, minutes: m.minutes }));
const base: StudyPlanSettings = {
  enabled: true,
  examDate: '2026-11-01',
  startDate: '2026-10-18',
  minutesPerDay: 90,
  priorityModules: ['m3'],
  pendingModules: ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'],
  weakModules: [],
  done: {},
};

describe('plano de estudos', () => {
  it('datas: diferença e soma de dias', () => {
    expect(daysBetween('2026-10-18', '2026-11-01')).toBe(14);
    expect(addDay('2026-10-31', 1)).toBe('2026-11-01');
  });
  it('cobre todos os dias até a véspera, nunca passa dos minutos diários e revisa todo dia', () => {
    const p = buildPlan(base, MODS);
    expect(p.days.length).toBe(14);
    expect(p.days[0].date).toBe('2026-10-18');
    expect(p.days[13].date).toBe('2026-10-31');
    for (const d of p.days) {
      expect(d.minutes).toBeLessThanOrEqual(base.minutesPerDay);
      expect(d.sessions[0].kind).toBe('revisao');
      expect(d.sessions[0].minutes).toBe(reviewMinutes(90));
    }
    const ids = p.days.flatMap((d) => d.sessions.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('agenda teoria de todos os módulos pendentes, na ordem da trilha, e reserva a reta final para simulados', () => {
    const p = buildPlan(base, MODS);
    const theory = p.days.flatMap((d) => d.sessions).filter((s) => s.kind === 'teoria');
    const order = [...new Set(theory.map((s) => s.module))];
    expect(order).toEqual(['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']);
    expect(p.days[12].sessions.some((s) => s.kind === 'simulado')).toBe(true);
    expect(p.days[13].sessions.some((s) => s.label.startsWith('Véspera'))).toBe(true);
    expect(p.uncovered).toEqual([]);
  });
  it('módulo prioritário recebe mais exercícios que um módulo comum de mesma duração', () => {
    const p = buildPlan(base, MODS);
    const exMin = (id: string) => p.days.flatMap((d) => d.sessions).filter((s) => s.kind === 'exercicios' && s.module === id && !s.id.endsWith('reforco')).reduce((a, s) => a + s.minutes, 0);
    expect(exMin('m3')).toBeGreaterThan(exMin('m4')); // m3 e m4 têm 45 min de teoria
  });
  it('sem tempo para tudo: prioriza os módulos em foco e avisa o que ficou de fora', () => {
    const p = buildPlan({ ...base, examDate: '2026-10-20', minutesPerDay: 30, priorityModules: ['m5'] }, MODS);
    const theory = p.days.flatMap((d) => d.sessions).filter((s) => s.kind === 'teoria');
    expect(theory[0].module).toBe('m5');
    expect(p.uncovered.length).toBeGreaterThan(0);
    expect(p.warnings.length).toBeGreaterThan(0);
  });
  it('prova hoje ou no passado: nenhum dia e aviso claro', () => {
    const p = buildPlan({ ...base, examDate: '2026-10-18' }, MODS);
    expect(p.days).toEqual([]);
    expect(p.warnings[0]).toContain('hoje ou já passou');
  });
  it('previsto × realizado e sessões atrasadas', () => {
    const p = buildPlan(base, MODS);
    const first = p.days[0].sessions;
    const done = { [first[0].id]: '2026-10-18' };
    const pr = planProgress(p, done, '2026-10-19');
    expect(pr.plannedToDate).toBe(p.days[0].sessions.length + p.days[1].sessions.length);
    expect(pr.doneToDate).toBe(1);
    expect(pr.overdue.length).toBe(first.length - 1);
  });
  it('ajustes de hoje: revisões vencidas e reforço de módulo fraco que não está na agenda do dia', () => {
    const adj = todayAdjustments('2026-10-18', 4, [{ module: MODS[4], percent: 40 }], []);
    expect(adj.map((a) => a.id)).toEqual(['2026-10-18|ajuste|revisao', '2026-10-18|ajuste|m4']);
    expect(todayAdjustments('2026-10-18', 0, [], [])).toEqual([]);
  });
});

describe('painel: indicadores e recomendação', () => {
  it('sem respostas não há taxa de acerto nem pontos fortes/fracos inventados', () => {
    expect(answerAccuracy({})).toBeNull();
    expect(strongAndWeak(topicPerformance({}, QUESTIONS)).enough).toBe(false);
  });
  it('assunto só é classificado com respostas suficientes', () => {
    const q = QUESTIONS.filter((x) => x.topic === QUESTIONS[0].topic);
    const stats = { [q[0].id]: { attempts: 2, correct: 0, lastAt: '', lastCorrect: false } };
    expect(strongAndWeak(topicPerformance(stats, QUESTIONS)).enough).toBe(false);
    const more = { [q[0].id]: { attempts: 4, correct: 1, lastAt: '', lastCorrect: false } };
    expect(strongAndWeak(topicPerformance(more, QUESTIONS)).weak[0].topic).toBe(q[0].topic);
    expect(answerAccuracy(more)).toEqual({ correct: 1, total: 4, percent: 25 });
  });
  it('recomendação segue a prioridade: simulado aberto, revisões, plano, trilha, assunto fraco', () => {
    const none = { activeExam: false, dueReviews: 0, todayPlan: null, nextModule: null, startedTrail: false, weakest: null };
    expect(recommend({ ...none, activeExam: true, dueReviews: 3 }).href).toBe('#/simulado');
    expect(recommend({ ...none, dueReviews: 3 }).href).toBe('#/revisar');
    expect(recommend({ ...none, nextModule: { id: 'm2', num: 2, short: 'Termo' }, startedTrail: true }).title).toContain('Continuar');
    expect(recommend(none).href).toContain('#/simulado');
  });
});
