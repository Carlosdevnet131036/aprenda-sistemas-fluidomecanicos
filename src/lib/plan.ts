// Plano de estudos: cronograma determinístico e explicável entre a data em que
// o plano foi criado e a véspera da prova.
//
// Regras:
//  1. Todo dia começa com um bloco de revisão espaçada (≈ 20% do tempo, mín. 10 min).
//  2. Fase de conteúdo: teoria + exercícios dos módulos pendentes, na ordem da
//     trilha. Módulos prioritários ou com desempenho fraco recebem o dobro de
//     exercícios; módulos já concluídos que são prioritários/fracos recebem só
//     exercícios de reforço. Se não houver tempo para tudo, os módulos em foco
//     são agendados primeiro e os demais ficam sinalizados.
//  3. Sobrou tempo na fase de conteúdo: exercícios de reforço e simulados curtos.
//  4. Reta final (≈ 20% dos dias, se houver 3 dias ou mais): simulados com tempo;
//     a véspera fica com revisão leve e checklist.
// O cronograma só muda quando o estudante clica em “Recalcular”; o que se
// adapta todo dia são os “ajustes de hoje”, calculados com o desempenho atual.
import type { ModuleId } from '../content/types';
import type { StudyPlanSettings } from './progress';

export interface PlanModule {
  id: ModuleId;
  num: number;
  short: string;
  minutes: number;
}

export type SessionKind = 'teoria' | 'exercicios' | 'revisao' | 'simulado';

export interface PlanSession {
  id: string;
  date: string;
  kind: SessionKind;
  module?: ModuleId;
  minutes: number;
  label: string;
  href: string;
}

export interface PlanDay {
  date: string;
  sessions: PlanSession[];
  minutes: number;
}

export interface BuiltPlan {
  days: PlanDay[];
  warnings: string[];
  /** módulos pendentes que não couberam no tempo disponível */
  uncovered: ModuleId[];
}

const DAY = 86_400_000;
const parseDay = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const fmtDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Diferença em dias inteiros entre duas datas AAAA-MM-DD (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b) - parseDay(a)) / DAY);
}

export function addDay(d: string, n: number): string {
  return fmtDay(parseDay(d) + n * DAY);
}

export const MIN_MINUTES_PER_DAY = 20;

export function reviewMinutes(minutesPerDay: number): number {
  return Math.min(minutesPerDay, Math.max(10, Math.round(minutesPerDay * 0.2)));
}

/** Simulado que cabe em `minutes` (≈ 1,5 min por afirmação). */
export function simuladoFor(minutes: number): { count: number; minutes: number } {
  const count = Math.max(5, Math.min(40, Math.floor(minutes / 1.5)));
  return { count, minutes: Math.round(count * 1.5) };
}

interface Task {
  kind: 'teoria' | 'exercicios';
  module: PlanModule;
  minutes: number;
}

export function buildPlan(p: StudyPlanSettings, modules: PlanModule[]): BuiltPlan {
  const n = daysBetween(p.startDate, p.examDate);
  const warnings: string[] = [];
  if (n < 1) return { days: [], warnings: ['A data da prova é hoje ou já passou: não há dias para planejar. Ajuste a data.'], uncovered: [] };
  const review = reviewMinutes(p.minutesPerDay);
  const capacity = p.minutesPerDay - review;
  const finalDays = n >= 3 ? Math.max(1, Math.round(n * 0.2)) : 0;
  const contentDays = n - finalDays;
  const focus = new Set<ModuleId>([...p.priorityModules, ...p.weakModules]);
  const studyable = modules.filter((m) => m.id !== 'm7');

  // tarefas da fase de conteúdo
  const tasksFor = (m: PlanModule): Task[] => {
    const pending = p.pendingModules.includes(m.id);
    const ex = Math.max(15, Math.round(m.minutes * (focus.has(m.id) ? 1 : 0.5)));
    if (pending) return [{ kind: 'teoria', module: m, minutes: m.minutes }, { kind: 'exercicios', module: m, minutes: ex }];
    return focus.has(m.id) ? [{ kind: 'exercicios', module: m, minutes: ex }] : [];
  };
  let ordered = studyable.flatMap(tasksFor);
  const need = ordered.reduce((s, t) => s + t.minutes, 0);
  const have = contentDays * capacity;
  const uncovered: ModuleId[] = [];
  if (need > have) {
    // foco primeiro (mantendo a ordem da trilha), depois o restante enquanto couber
    const first = studyable.filter((m) => focus.has(m.id)).flatMap(tasksFor);
    const rest = studyable.filter((m) => !focus.has(m.id)).flatMap(tasksFor);
    let used = first.reduce((s, t) => s + t.minutes, 0);
    const kept = [...first];
    for (const t of rest) {
      if (used + t.minutes <= have) {
        kept.push(t);
        used += t.minutes;
      } else if (t.kind === 'teoria' && !uncovered.includes(t.module.id)) uncovered.push(t.module.id);
    }
    ordered = kept;
    if (uncovered.length) warnings.push(`O tempo até a prova não cobre toda a trilha: ${uncovered.length} módulo(s) ficaram de fora do cronograma. Aumente os minutos por dia ou priorize menos módulos.`);
    if (first.reduce((s, t) => s + t.minutes, 0) > have) warnings.push('Nem os módulos prioritários cabem no tempo disponível: o cronograma vai até onde for possível.');
  }

  const days: PlanDay[] = [];
  const queue = ordered.map((t) => ({ ...t, left: t.minutes, part: 0 }));
  let filler = 0;
  const fillerModules = studyable.filter((m) => focus.has(m.id));
  const fillerPool = fillerModules.length ? fillerModules : studyable;

  for (let i = 0; i < n; i++) {
    const date = addDay(p.startDate, i);
    const sessions: PlanSession[] = [
      { id: `${date}|revisao`, date, kind: 'revisao', minutes: review, label: 'Revisão espaçada: questões pendentes', href: '#/revisar' },
    ];
    let cap = capacity;
    const isLast = i === n - 1;
    if (i < contentDays) {
      while (cap >= 10 && queue.length) {
        const t = queue[0];
        const take = Math.min(t.left, cap);
        t.part += 1;
        t.left -= take;
        cap -= take;
        const split = t.left > 0 || t.part > 1;
        const what = t.kind === 'teoria' ? 'Teoria' : 'Exercícios';
        sessions.push({
          id: `${date}|${t.kind}|${t.module.id}|${t.part}`,
          date,
          kind: t.kind,
          module: t.module.id,
          minutes: take,
          label: `${what}: Módulo ${t.module.num} — ${t.module.short}${split ? ` (parte ${t.part})` : ''}`,
          href: t.kind === 'teoria' ? `#/modulo/${t.module.id}` : `#/exercicios?modulo=${t.module.id}`,
        });
        if (t.left <= 0) queue.shift();
      }
      if (cap >= 10 && !queue.length) {
        filler += 1;
        if (filler % 4 === 0 && cap >= 15) {
          const sim = simuladoFor(Math.min(cap, 30));
          sessions.push({ id: `${date}|simulado`, date, kind: 'simulado', minutes: sim.minutes, label: `Simulado curto: ${sim.count} questões`, href: `#/simulado?n=${sim.count}&tempo=${sim.minutes}` });
        } else {
          const m = fillerPool[(filler - 1) % fillerPool.length];
          sessions.push({ id: `${date}|exercicios|${m.id}|reforco`, date, kind: 'exercicios', module: m.id, minutes: cap, label: `Reforço: exercícios do Módulo ${m.num} — ${m.short}`, href: `#/exercicios?modulo=${m.id}` });
        }
      }
    } else if (isLast) {
      sessions.push({ id: `${date}|revisao|vespera`, date, kind: 'revisao', module: 'm6', minutes: cap, label: 'Véspera: formulário, pegadinhas e checklist final', href: '#/modulo/m6?sec=checklist' });
    } else if (cap >= 10) {
      const sim = simuladoFor(cap);
      sessions.push({ id: `${date}|simulado`, date, kind: 'simulado', minutes: sim.minutes, label: `Simulado com tempo: ${sim.count} questões`, href: `#/simulado?n=${sim.count}&tempo=${sim.minutes}` });
      const left = cap - sim.minutes;
      if (left >= 10) sessions.push({ id: `${date}|revisao|erros`, date, kind: 'revisao', minutes: left, label: 'Corrigir os erros do simulado e revisar os assuntos indicados', href: '#/revisar' });
    }
    days.push({ date, sessions, minutes: sessions.reduce((s, x) => s + x.minutes, 0) });
  }
  if (queue.length) warnings.push('Parte do conteúdo não coube na fase de estudo: considere aumentar os minutos por dia.');
  return { days, warnings, uncovered };
}

export interface PlanProgress {
  plannedToDate: number;
  doneToDate: number;
  minutesPlannedToDate: number;
  minutesDoneToDate: number;
  overdue: PlanSession[];
  totalSessions: number;
  totalDone: number;
}

/** Previsto × realizado até hoje (inclusive). */
export function planProgress(plan: BuiltPlan, done: Record<string, string>, today: string): PlanProgress {
  const all = plan.days.flatMap((d) => d.sessions);
  const toDate = all.filter((s) => s.date <= today);
  const doneToDate = toDate.filter((s) => done[s.id]);
  return {
    plannedToDate: toDate.length,
    doneToDate: doneToDate.length,
    minutesPlannedToDate: toDate.reduce((s, x) => s + x.minutes, 0),
    minutesDoneToDate: doneToDate.reduce((s, x) => s + x.minutes, 0),
    overdue: toDate.filter((s) => s.date < today && !done[s.id]),
    totalSessions: all.length,
    totalDone: all.filter((s) => done[s.id]).length,
  };
}

export interface Adjustment {
  id: string;
  label: string;
  reason: string;
  href: string;
}

/** Ajustes de hoje a partir do desempenho atual (revisões vencidas e módulos fracos). */
export function todayAdjustments(today: string, dueCount: number, weak: { module: PlanModule; percent: number }[], todaySessions: PlanSession[]): Adjustment[] {
  const out: Adjustment[] = [];
  if (dueCount > 0) {
    out.push({ id: `${today}|ajuste|revisao`, label: `Revisar ${dueCount} questão(ões) vencida(s)`, reason: 'Há questões no prazo de revisão espaçada.', href: '#/revisar' });
  }
  for (const w of weak) {
    if (todaySessions.some((s) => s.module === w.module.id)) continue;
    out.push({
      id: `${today}|ajuste|${w.module.id}`,
      label: `Reforço extra: Módulo ${w.module.num} — ${w.module.short}`,
      reason: `Seu acerto nesse módulo está em ${w.percent}%.`,
      href: `#/exercicios?modulo=${w.module.id}`,
    });
  }
  return out.slice(0, 3);
}
