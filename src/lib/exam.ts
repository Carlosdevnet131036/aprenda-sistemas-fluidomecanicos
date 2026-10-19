// Regras do simulado de prova: montagem a partir do banco de questões,
// relógio e estado salvo para retomar a prova após recarregar a página.
import type { ModuleId, Question, QuizLevel } from '../content/types';
import { filterBank, selectQuestions, type Answers } from './quiz';

export interface ExamConfig {
  modules: ModuleId[];
  topics: string[];
  levels: QuizLevel[];
  count: number;
  /** minutos; 0 = sem limite de tempo */
  timeLimitMin: number;
}

export interface BuiltExam {
  questions: Question[];
  available: number;
  /** quantas questões faltaram para atingir o número pedido */
  shortfall: number;
}

export const EXAM_MIN_COUNT = 5;
export const EXAM_MAX_COUNT = 60;

export function buildExam(bank: Question[], cfg: ExamConfig, seed: number): BuiltExam {
  const pool = filterBank(bank, cfg);
  const count = Math.max(1, Math.min(cfg.count, EXAM_MAX_COUNT));
  const questions = selectQuestions(pool, { count, seed });
  return { questions, available: pool.length, shortfall: Math.max(0, count - questions.length) };
}

/** Segundos restantes (nunca negativo); null quando a prova não tem limite. */
export function remainingSeconds(startedAt: number, timeLimitMin: number, now: number): number | null {
  if (timeLimitMin <= 0) return null;
  return Math.max(0, Math.round(timeLimitMin * 60 - (now - startedAt) / 1000));
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}

/** Sugestão de tempo: cerca de 1,5 min por afirmação, arredondado para 5 min. */
export function suggestedMinutes(count: number): number {
  return Math.max(5, Math.round((count * 1.5) / 5) * 5);
}

// ---------- prova em andamento (sessionStorage) ----------

export interface ActiveExam {
  ids: string[];
  answers: Answers;
  flags: string[];
  index: number;
  startedAt: number;
  timeLimitMin: number;
  scope: string;
}

export const ACTIVE_EXAM_KEY = 'asf-simulado-em-andamento';

export function parseActiveExam(text: string | null, bankIds: Set<string>): ActiveExam | null {
  if (!text) return null;
  try {
    const r = JSON.parse(text) as Partial<ActiveExam>;
    if (!Array.isArray(r.ids) || r.ids.length === 0 || !r.ids.every((id) => typeof id === 'string' && bankIds.has(id))) return null;
    if (typeof r.startedAt !== 'number' || typeof r.timeLimitMin !== 'number' || r.timeLimitMin < 0) return null;
    const answers: Answers = {};
    if (r.answers && typeof r.answers === 'object') {
      for (const [k, v] of Object.entries(r.answers)) if (r.ids.includes(k) && typeof v === 'boolean') answers[k] = v;
    }
    return {
      ids: r.ids,
      answers,
      flags: Array.isArray(r.flags) ? r.flags.filter((f) => r.ids!.includes(f)) : [],
      index: typeof r.index === 'number' && r.index >= 0 && r.index < r.ids.length ? r.index : 0,
      startedAt: r.startedAt,
      timeLimitMin: r.timeLimitMin,
      scope: typeof r.scope === 'string' ? r.scope : 'Simulado',
    };
  } catch {
    return null;
  }
}
