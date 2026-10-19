// Progresso do estudante salvo no navegador (localStorage). Toda leitura e
// escrita é protegida: em modo privado ou com armazenamento bloqueado o site
// continua funcionando, apenas sem lembrar o progresso.
//
// Versões da estrutura salva:
//   1 — aulas, exercícios resolvidos, erros do quiz, tentativas e checklist.
//   2 — acrescenta estatísticas por questão e por exercício, revisão espaçada,
//       histórico de revisões, atividades recentes, plano de estudos e
//       configurações. Dados da versão 1 são migrados sem perda.
import type { ModuleId } from '../content/types';
import { applyAnswer, applyRating, dayKey, DEFAULT_INTERVALS, validateIntervals, type Rating, type ReviewCard } from './srs';

export const STORAGE_KEY = 'asf-progresso-v1';
/** Cópia do texto salvo quando ele não pôde ser lido (para não perder dados). */
export const CORRUPT_KEY = 'asf-progresso-corrompido';
export const DATA_VERSION = 2;

export type QuizMode = 'aprendizagem' | 'avaliacao' | 'simulado';

export interface QuizAttempt {
  date: string;
  mode: QuizMode;
  scope: string;
  correct: number;
  total: number;
  /** só nos simulados */
  durationSec?: number;
  timeLimitMin?: number;
  unanswered?: number;
}

export interface QuestionStat {
  attempts: number;
  correct: number;
  lastAt: string;
  lastCorrect: boolean;
}

export interface ExerciseStat {
  attempts: number;
  /** quantas vezes cada tipo de erro apareceu (sinal, unidade, potencia10, incorreto…) */
  errors: Record<string, number>;
  lastAt: string;
  lastStatus: string;
}

export interface ReviewLogEntry {
  id: string;
  date: string;
  correct: boolean;
  rating: Rating | null;
}

export type ActivityKind = 'aula' | 'quiz' | 'simulado' | 'exercicio' | 'revisao';

export interface Activity {
  date: string;
  kind: ActivityKind;
  label: string;
  href: string;
}

export interface StudyPlanSettings {
  enabled: boolean;
  /** AAAA-MM-DD informado pelo estudante */
  examDate: string;
  /** dia em que o plano foi criado ou recalculado (início do cronograma) */
  startDate: string;
  minutesPerDay: number;
  priorityModules: ModuleId[];
  /** módulos ainda não concluídos quando o plano foi criado/recalculado */
  pendingModules: ModuleId[];
  /** módulos com desempenho fraco quando o plano foi criado/recalculado */
  weakModules: ModuleId[];
  /** sessão → data (AAAA-MM-DD) em que foi concluída */
  done: Record<string, string>;
}

export interface Settings {
  /** intervalos da revisão espaçada, em dias, para as caixas 1..N */
  srsIntervals: number[];
}

export interface ProgressState {
  version: 2;
  completedModules: ModuleId[];
  visitedModules: ModuleId[];
  solvedExercises: string[];
  /** questões erradas → nº de erros (some da lista ao acertar) */
  wrongQuestions: Record<string, number>;
  attempts: QuizAttempt[];
  checklist: Record<string, boolean>;
  questionStats: Record<string, QuestionStat>;
  exerciseStats: Record<string, ExerciseStat>;
  reviews: Record<string, ReviewCard>;
  reviewLog: ReviewLogEntry[];
  activity: Activity[];
  plan: StudyPlanSettings | null;
  settings: Settings;
}

const MAX_ATTEMPTS = 50;
const MAX_LOG = 300;
const MAX_ACTIVITY = 20;

export function emptyProgress(): ProgressState {
  return {
    version: 2,
    completedModules: [],
    visitedModules: [],
    solvedExercises: [],
    wrongQuestions: {},
    attempts: [],
    checklist: {},
    questionStats: {},
    exerciseStats: {},
    reviews: {},
    reviewLog: [],
    activity: [],
    plan: null,
    settings: { srsIntervals: [...DEFAULT_INTERVALS] },
  };
}

const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isDay = (x: unknown): x is string => isStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);
const modules = (x: unknown) => [...new Set(strArr(x).filter((m): m is ModuleId => /^m[0-7]$/.test(m)))];

function entries<T>(x: unknown, pick: (v: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    const p = pick(v);
    if (p !== null) out[k] = p;
  }
  return out;
}

const MODES: QuizMode[] = ['aprendizagem', 'avaliacao', 'simulado'];

/**
 * Valida dados lidos do armazenamento ou de um backup, migra versões antigas
 * e descarta apenas os campos corrompidos.
 */
export function sanitize(raw: unknown): ProgressState {
  const base = emptyProgress();
  if (!isObj(raw)) return base;
  const r = raw;
  const attempts = Array.isArray(r.attempts)
    ? r.attempts
        .filter((a): a is QuizAttempt => isObj(a) && isNum(a.correct) && isNum(a.total) && a.total > 0 && a.correct >= 0 && a.correct <= a.total)
        .map((a) => ({ ...a, mode: MODES.includes(a.mode) ? a.mode : 'aprendizagem', scope: isStr(a.scope) ? a.scope : '', date: isStr(a.date) ? a.date : '' }))
        .slice(-MAX_ATTEMPTS)
    : [];
  const intervals = isObj(r.settings) && Array.isArray(r.settings.srsIntervals) ? (r.settings.srsIntervals as number[]) : null;
  const settings: Settings = { srsIntervals: intervals && !validateIntervals(intervals) ? [...intervals] : [...DEFAULT_INTERVALS] };
  const maxBox = settings.srsIntervals.length;
  const wrongQuestions = entries(r.wrongQuestions, (v) => (isNum(v) && v > 0 ? Math.floor(v) : null));

  let reviews = entries<ReviewCard>(r.reviews, (v) =>
    isObj(v) && isNum(v.box) && isDay(v.due)
      ? {
          box: Math.max(0, Math.min(maxBox, Math.floor(v.box))),
          due: v.due,
          lastAt: isStr(v.lastAt) ? v.lastAt : '',
          reviews: isNum(v.reviews) ? Math.max(0, Math.floor(v.reviews)) : 0,
          lapses: isNum(v.lapses) ? Math.max(0, Math.floor(v.lapses)) : 0,
        }
      : null,
  );
  // Migração v1 → v2: cada questão errada entra na revisão espaçada na caixa 0.
  if (r.version !== 2 && Object.keys(reviews).length === 0) {
    const today = dayKey(new Date());
    reviews = Object.fromEntries(Object.entries(wrongQuestions).map(([id, n]) => [id, { box: 0, due: today, lastAt: '', reviews: n, lapses: n }]));
  }

  const plan: StudyPlanSettings | null =
    isObj(r.plan) && isDay(r.plan.examDate) && isNum(r.plan.minutesPerDay) && r.plan.minutesPerDay >= 10 && r.plan.minutesPerDay <= 600
      ? {
          enabled: r.plan.enabled !== false,
          examDate: r.plan.examDate,
          startDate: isDay(r.plan.startDate) ? r.plan.startDate : dayKey(new Date()),
          minutesPerDay: Math.round(r.plan.minutesPerDay),
          priorityModules: modules(r.plan.priorityModules),
          pendingModules: modules(r.plan.pendingModules),
          weakModules: modules(r.plan.weakModules),
          done: entries(r.plan.done, (v) => (isDay(v) ? v : null)),
        }
      : null;

  return {
    version: 2,
    completedModules: modules(r.completedModules),
    visitedModules: modules(r.visitedModules),
    solvedExercises: [...new Set(strArr(r.solvedExercises))],
    wrongQuestions,
    attempts,
    checklist: entries(r.checklist, (v) => (v === true ? true : null)),
    questionStats: entries<QuestionStat>(r.questionStats, (v) =>
      isObj(v) && isNum(v.attempts) && isNum(v.correct) && v.attempts >= 1 && v.correct >= 0 && v.correct <= v.attempts
        ? { attempts: Math.floor(v.attempts), correct: Math.floor(v.correct), lastAt: isStr(v.lastAt) ? v.lastAt : '', lastCorrect: v.lastCorrect === true }
        : null,
    ),
    exerciseStats: entries<ExerciseStat>(r.exerciseStats, (v) =>
      isObj(v) && isNum(v.attempts) && v.attempts >= 1
        ? {
            attempts: Math.floor(v.attempts),
            errors: entries(v.errors, (n) => (isNum(n) && n > 0 ? Math.floor(n) : null)),
            lastAt: isStr(v.lastAt) ? v.lastAt : '',
            lastStatus: isStr(v.lastStatus) ? v.lastStatus : '',
          }
        : null,
    ),
    reviews,
    reviewLog: Array.isArray(r.reviewLog)
      ? r.reviewLog
          .filter((e): e is ReviewLogEntry => isObj(e) && isStr(e.id) && isStr(e.date) && typeof e.correct === 'boolean')
          .map((e) => ({ id: e.id, date: e.date, correct: e.correct, rating: e.rating === 'facil' || e.rating === 'media' || e.rating === 'dificil' ? e.rating : null }))
          .slice(-MAX_LOG)
      : [],
    activity: Array.isArray(r.activity)
      ? r.activity
          .filter((a): a is Activity => isObj(a) && isStr(a.date) && isStr(a.label) && isStr(a.href) && isStr(a.kind))
          .slice(0, MAX_ACTIVITY)
      : [],
    plan,
    settings,
  };
}

/**
 * Quantos itens de uma lista já foram resolvidos. `solvedExercises` guarda
 * exercícios e questões da lista de revisão juntos, então cada contador
 * precisa filtrar pelos ids da própria lista.
 */
export function countSolved(solved: readonly string[], ids: readonly string[]): number {
  const done = new Set(solved);
  return ids.filter((id) => done.has(id)).length;
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export type LoadIssue = null | 'corrompido';

export function createProgressStore(storage: StorageLike | null = defaultStorage(), clock: () => Date = () => new Date()) {
  let issue: LoadIssue = null;
  let state = load();
  let persistent = storage !== null;
  const listeners = new Set<() => void>();

  function load(): ProgressState {
    let txt: string | null = null;
    try {
      txt = storage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return emptyProgress();
    }
    if (!txt) return emptyProgress();
    try {
      return sanitize(JSON.parse(txt));
    } catch {
      // Guarda o texto ilegível em outra chave antes de recomeçar do zero.
      issue = 'corrompido';
      try {
        storage?.setItem(CORRUPT_KEY, txt);
      } catch {
        /* sem espaço: segue sem a cópia */
      }
      return emptyProgress();
    }
  }

  function save() {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state));
      persistent = storage !== null;
    } catch {
      persistent = false;
    }
  }

  function update(fn: (s: ProgressState) => ProgressState) {
    state = fn(state);
    save();
    listeners.forEach((l) => l());
  }

  const withActivity = (s: ProgressState, a: Omit<Activity, 'date'>): Activity[] =>
    [{ ...a, date: clock().toISOString() }, ...s.activity.filter((x) => !(x.href === a.href && x.kind === a.kind))].slice(0, MAX_ACTIVITY);

  return {
    get: () => state,
    isPersistent: () => persistent,
    loadIssue: () => issue,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    setModuleCompleted(id: ModuleId, done: boolean) {
      update((s) => ({
        ...s,
        completedModules: done ? [...new Set([...s.completedModules, id])] : s.completedModules.filter((m) => m !== id),
      }));
    },
    visitModule(id: ModuleId, label?: string) {
      if (!label && state.visitedModules.includes(id)) return;
      update((s) => ({
        ...s,
        visitedModules: s.visitedModules.includes(id) ? s.visitedModules : [...s.visitedModules, id],
        activity: label ? withActivity(s, { kind: 'aula', label, href: `#/modulo/${id}` }) : s.activity,
      }));
    },
    markExerciseSolved(id: string, label?: string, href?: string) {
      if (state.solvedExercises.includes(id)) return;
      update((s) => ({
        ...s,
        solvedExercises: [...s.solvedExercises, id],
        activity: label && href ? withActivity(s, { kind: 'exercicio', label, href }) : s.activity,
      }));
    },
    /** Tentativa de resposta numérica num exercício (status do corretor). */
    recordExerciseAttempt(id: string, status: string) {
      update((s) => {
        const prev = s.exerciseStats[id] ?? { attempts: 0, errors: {}, lastAt: '', lastStatus: '' };
        const errors = { ...prev.errors };
        if (status !== 'correto') errors[status] = (errors[status] ?? 0) + 1;
        return { ...s, exerciseStats: { ...s.exerciseStats, [id]: { attempts: prev.attempts + 1, errors, lastAt: clock().toISOString(), lastStatus: status } } };
      });
    },
    /** Resposta a uma questão V/F (quiz, simulado ou verificação de módulo). */
    recordAnswer(questionId: string, correct: boolean) {
      update((s) => {
        const now = clock();
        const wrong = { ...s.wrongQuestions };
        if (correct) delete wrong[questionId];
        else wrong[questionId] = (wrong[questionId] ?? 0) + 1;
        const st = s.questionStats[questionId] ?? { attempts: 0, correct: 0, lastAt: '', lastCorrect: false };
        return {
          ...s,
          wrongQuestions: wrong,
          questionStats: {
            ...s.questionStats,
            [questionId]: { attempts: st.attempts + 1, correct: st.correct + (correct ? 1 : 0), lastAt: now.toISOString(), lastCorrect: correct },
          },
          reviews: { ...s.reviews, [questionId]: applyAnswer(s.reviews[questionId], correct, now, s.settings.srsIntervals) },
        };
      });
    },
    /** Resposta dada numa sessão de revisão, com autoavaliação (fácil/média/difícil). */
    recordReview(questionId: string, correct: boolean, rating: Rating | null) {
      update((s) => {
        const now = clock();
        const wrong = { ...s.wrongQuestions };
        if (correct) delete wrong[questionId];
        else wrong[questionId] = (wrong[questionId] ?? 0) + 1;
        const st = s.questionStats[questionId] ?? { attempts: 0, correct: 0, lastAt: '', lastCorrect: false };
        const card = correct && rating ? applyRating(s.reviews[questionId], true, rating, now, s.settings.srsIntervals) : applyRating(s.reviews[questionId], false, 'dificil', now, s.settings.srsIntervals);
        return {
          ...s,
          wrongQuestions: wrong,
          questionStats: {
            ...s.questionStats,
            [questionId]: { attempts: st.attempts + 1, correct: st.correct + (correct ? 1 : 0), lastAt: now.toISOString(), lastCorrect: correct },
          },
          reviews: { ...s.reviews, [questionId]: card },
          reviewLog: [...s.reviewLog, { id: questionId, date: now.toISOString(), correct, rating: correct ? rating : null }].slice(-MAX_LOG),
        };
      });
    },
    recordAttempt(a: QuizAttempt, href = '#/quiz') {
      update((s) => ({
        ...s,
        attempts: [...s.attempts, a].slice(-MAX_ATTEMPTS),
        activity: withActivity(s, {
          kind: a.mode === 'simulado' ? 'simulado' : 'quiz',
          label: `${a.mode === 'simulado' ? 'Simulado' : a.mode === 'avaliacao' ? 'Avaliação' : 'Quiz'} — ${a.scope}: ${a.correct}/${a.total}`,
          href,
        }),
      }));
    },
    logActivity(a: Omit<Activity, 'date'>) {
      update((s) => ({ ...s, activity: withActivity(s, a) }));
    },
    toggleChecklist(key: string) {
      update((s) => {
        const c = { ...s.checklist };
        if (c[key]) delete c[key];
        else c[key] = true;
        return { ...s, checklist: c };
      });
    },
    setIntervals(intervals: number[]) {
      const err = validateIntervals(intervals);
      if (err) throw new Error(err);
      update((s) => ({ ...s, settings: { ...s.settings, srsIntervals: [...intervals] }, reviews: clampBoxes(s.reviews, intervals.length) }));
    },
    setPlan(plan: StudyPlanSettings | null) {
      update((s) => ({ ...s, plan }));
    },
    togglePlanSession(sessionId: string) {
      update((s) => {
        if (!s.plan) return s;
        const done = { ...s.plan.done };
        if (done[sessionId]) delete done[sessionId];
        else done[sessionId] = dayKey(clock());
        return { ...s, plan: { ...s.plan, done } };
      });
    },
    /** Substitui todos os dados (importação de backup já validada). */
    replace(next: ProgressState) {
      update(() => sanitize(next));
    },
    reset() {
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        /* ignorado: estado em memória é zerado de qualquer forma */
      }
      state = emptyProgress();
      listeners.forEach((l) => l());
    },
  };
}

function clampBoxes(reviews: Record<string, ReviewCard>, max: number): Record<string, ReviewCard> {
  return Object.fromEntries(Object.entries(reviews).map(([k, c]) => [k, { ...c, box: Math.min(c.box, max) }]));
}

export type ProgressStore = ReturnType<typeof createProgressStore>;
