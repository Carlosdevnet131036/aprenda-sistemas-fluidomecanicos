// Progresso do estudante salvo no navegador (localStorage). Toda leitura e
// escrita é protegida: em modo privado ou com armazenamento bloqueado o site
// continua funcionando, apenas sem lembrar o progresso.
import type { ModuleId } from '../content/types';

export const STORAGE_KEY = 'asf-progresso-v1';

export interface QuizAttempt {
  date: string;
  mode: 'aprendizagem' | 'avaliacao';
  scope: string;
  correct: number;
  total: number;
}

export interface ProgressState {
  version: 1;
  completedModules: ModuleId[];
  visitedModules: ModuleId[];
  solvedExercises: string[];
  /** questões erradas → nº de erros (para a revisão de erros) */
  wrongQuestions: Record<string, number>;
  attempts: QuizAttempt[];
  checklist: Record<string, boolean>;
}

export function emptyProgress(): ProgressState {
  return {
    version: 1,
    completedModules: [],
    visitedModules: [],
    solvedExercises: [],
    wrongQuestions: {},
    attempts: [],
    checklist: {},
  };
}

const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);

/** Valida dados lidos do armazenamento; descarta campos corrompidos. */
export function sanitize(raw: unknown): ProgressState {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const modules = (x: unknown) => strArr(x).filter((m): m is ModuleId => /^m[0-7]$/.test(m));
  const wrong: Record<string, number> = {};
  if (r.wrongQuestions && typeof r.wrongQuestions === 'object') {
    for (const [k, v] of Object.entries(r.wrongQuestions as Record<string, unknown>)) {
      if (typeof v === 'number' && v > 0) wrong[k] = Math.floor(v);
    }
  }
  const checklist: Record<string, boolean> = {};
  if (r.checklist && typeof r.checklist === 'object') {
    for (const [k, v] of Object.entries(r.checklist as Record<string, unknown>)) if (v === true) checklist[k] = true;
  }
  const attempts = Array.isArray(r.attempts)
    ? (r.attempts as unknown[])
        .filter(
          (a): a is QuizAttempt =>
            !!a && typeof a === 'object' && typeof (a as QuizAttempt).correct === 'number' && typeof (a as QuizAttempt).total === 'number',
        )
        .slice(-30)
    : [];
  return {
    version: 1,
    completedModules: [...new Set(modules(r.completedModules))],
    visitedModules: [...new Set(modules(r.visitedModules))],
    solvedExercises: [...new Set(strArr(r.solvedExercises))],
    wrongQuestions: wrong,
    attempts,
    checklist,
  };
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

export function createProgressStore(storage: StorageLike | null = defaultStorage()) {
  let state = load();
  let persistent = storage !== null;
  const listeners = new Set<() => void>();

  function load(): ProgressState {
    try {
      const txt = storage?.getItem(STORAGE_KEY);
      return txt ? sanitize(JSON.parse(txt)) : emptyProgress();
    } catch {
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

  return {
    get: () => state,
    isPersistent: () => persistent,
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
    visitModule(id: ModuleId) {
      if (state.visitedModules.includes(id)) return;
      update((s) => ({ ...s, visitedModules: [...s.visitedModules, id] }));
    },
    markExerciseSolved(id: string) {
      if (state.solvedExercises.includes(id)) return;
      update((s) => ({ ...s, solvedExercises: [...s.solvedExercises, id] }));
    },
    recordAnswer(questionId: string, correct: boolean) {
      update((s) => {
        const wrong = { ...s.wrongQuestions };
        if (correct) delete wrong[questionId];
        else wrong[questionId] = (wrong[questionId] ?? 0) + 1;
        return { ...s, wrongQuestions: wrong };
      });
    },
    recordAttempt(a: QuizAttempt) {
      update((s) => ({ ...s, attempts: [...s.attempts, a].slice(-30) }));
    },
    toggleChecklist(key: string) {
      update((s) => {
        const c = { ...s.checklist };
        if (c[key]) delete c[key];
        else c[key] = true;
        return { ...s, checklist: c };
      });
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

export type ProgressStore = ReturnType<typeof createProgressStore>;
