// Regras do quiz de Verdadeiro ou Falso: seleção equilibrada das questões,
// correção e resumo do desempenho. A interface só chama estas funções.
import type { ModuleId, Question, QuizLevel } from '../content/types';

export type Answers = Record<string, boolean | undefined>;

export interface QuizOptions {
  modules?: ModuleId[];
  levels?: QuizLevel[];
  count: number;
  seed?: number;
}

/** Gerador pseudoaleatório determinístico (mulberry32), para testes reprodutíveis. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function filterBank(bank: Question[], opts: Pick<QuizOptions, 'modules' | 'levels'>): Question[] {
  return bank.filter(
    (q) => (!opts.modules?.length || opts.modules.includes(q.module)) && (!opts.levels?.length || opts.levels.includes(q.level)),
  );
}

/** Maior sequência de respostas iguais seguidas. */
export function longestRun(qs: Question[]): number {
  let best = 0;
  let run = 0;
  qs.forEach((q, i) => {
    run = i > 0 && qs[i - 1].answer === q.answer ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/**
 * Sorteia questões equilibrando verdadeiras e falsas (diferença máxima de 1
 * quando o banco permite) e evitando sequências longas de respostas iguais.
 */
export function selectQuestions(bank: Question[], opts: QuizOptions): Question[] {
  const rand = rng(opts.seed ?? Date.now());
  const pool = filterBank(bank, opts);
  const count = Math.min(opts.count, pool.length);
  const trues = shuffle(pool.filter((q) => q.answer), rand);
  const falses = shuffle(pool.filter((q) => !q.answer), rand);
  const half = count % 2 === 0 ? count / 2 : rand() < 0.5 ? Math.floor(count / 2) : Math.ceil(count / 2);
  let nTrue = Math.min(trues.length, half);
  let nFalse = count - nTrue;
  if (nFalse > falses.length) {
    nFalse = falses.length;
    nTrue = Math.min(trues.length, count - nFalse);
  }
  const chosen = [...trues.slice(0, nTrue), ...falses.slice(0, nFalse)];
  let best = shuffle(chosen, rand);
  for (let i = 0; i < 50 && longestRun(best) > 3; i++) {
    const candidate = shuffle(chosen, rand);
    if (longestRun(candidate) < longestRun(best)) best = candidate;
  }
  return best;
}

export function isCorrect(q: Question, given: boolean | undefined): boolean {
  return given !== undefined && given === q.answer;
}

export interface QuestionResult {
  question: Question;
  given: boolean | undefined;
  correct: boolean;
}

export interface TopicScore {
  topic: string;
  module: ModuleId;
  correct: number;
  total: number;
}

export interface QuizSummary {
  total: number;
  correct: number;
  unanswered: number;
  percent: number;
  results: QuestionResult[];
  byTopic: TopicScore[];
  strengths: TopicScore[];
  toReview: TopicScore[];
}

export function gradeQuiz(questions: Question[], answers: Answers): QuizSummary {
  const results = questions.map((q) => ({ question: q, given: answers[q.id], correct: isCorrect(q, answers[q.id]) }));
  const correct = results.filter((r) => r.correct).length;
  const unanswered = results.filter((r) => r.given === undefined).length;
  const map = new Map<string, TopicScore>();
  for (const r of results) {
    const key = r.question.topic;
    const t = map.get(key) ?? { topic: key, module: r.question.module, correct: 0, total: 0 };
    t.total += 1;
    if (r.correct) t.correct += 1;
    map.set(key, t);
  }
  const byTopic = [...map.values()].sort((a, b) => a.correct / a.total - b.correct / b.total);
  return {
    total: questions.length,
    correct,
    unanswered,
    percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    results,
    byTopic,
    strengths: byTopic.filter((t) => t.correct === t.total),
    toReview: byTopic.filter((t) => t.correct < t.total),
  };
}

export function performanceMessage(percent: number): string {
  if (percent >= 90) return 'Excelente! Você domina este conteúdo. Revise só os detalhes que errou.';
  if (percent >= 70) return 'Bom resultado. Revise os temas indicados abaixo e refaça o quiz.';
  if (percent >= 50) return 'Você está no caminho. Volte às aulas dos temas indicados antes de tentar de novo.';
  return 'Vale a pena rever as aulas com calma. Use o "Explique de outra forma" e refaça os exemplos.';
}
