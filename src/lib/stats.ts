// Indicadores de desempenho calculados só a partir do que o estudante já fez.
// Quando não há dados suficientes, as funções devolvem null ou listas vazias —
// a interface explica isso em vez de mostrar números inventados.
import type { ModuleId, Question } from '../content/types';
import type { QuestionStat, QuizAttempt } from './progress';

/** Mínimo de respostas num assunto para classificá-lo como forte ou fraco. */
export const MIN_TOPIC_ATTEMPTS = 3;

export interface TopicPerf {
  topic: string;
  module: ModuleId;
  section?: string;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
  questionIds: string[];
}

export function topicPerformance(stats: Record<string, QuestionStat>, questions: Question[]): TopicPerf[] {
  const map = new Map<string, TopicPerf>();
  for (const q of questions) {
    const st = stats[q.id];
    if (!st) continue;
    const t = map.get(q.topic) ?? { topic: q.topic, module: q.module, section: q.section, attempts: 0, correct: 0, wrong: 0, accuracy: 0, questionIds: [] };
    t.attempts += st.attempts;
    t.correct += st.correct;
    t.wrong += st.attempts - st.correct;
    t.questionIds.push(q.id);
    map.set(q.topic, t);
  }
  return [...map.values()].map((t) => ({ ...t, accuracy: t.correct / t.attempts }));
}

/** Melhores e piores assuntos entre os que têm respostas suficientes. */
export function strongAndWeak(perf: TopicPerf[], n = 3): { strong: TopicPerf[]; weak: TopicPerf[]; enough: boolean } {
  const ok = perf.filter((t) => t.attempts >= MIN_TOPIC_ATTEMPTS);
  const byAcc = [...ok].sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
  const weak = byAcc.filter((t) => t.accuracy < 0.7).slice(0, n);
  const strong = [...byAcc].reverse().filter((t) => t.accuracy >= 0.8).slice(0, n);
  return { strong, weak, enough: ok.length > 0 };
}

/** Assuntos em que o estudante errou mais de uma vez (erros recorrentes). */
export function recurringErrors(perf: TopicPerf[], minWrong = 2): TopicPerf[] {
  return perf.filter((t) => t.wrong >= minWrong).sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);
}

export interface Accuracy {
  correct: number;
  total: number;
  percent: number;
}

/** Taxa de acerto em todas as respostas registradas a questões V/F. */
export function answerAccuracy(stats: Record<string, QuestionStat>): Accuracy | null {
  let correct = 0;
  let total = 0;
  for (const s of Object.values(stats)) {
    correct += s.correct;
    total += s.attempts;
  }
  return total ? { correct, total, percent: Math.round((correct / total) * 100) } : null;
}

/** Taxa de acerto nas tentativas de quiz/simulado concluídas (inclui histórico antigo). */
export function attemptsAccuracy(attempts: QuizAttempt[]): Accuracy | null {
  const correct = attempts.reduce((s, a) => s + a.correct, 0);
  const total = attempts.reduce((s, a) => s + a.total, 0);
  return total ? { correct, total, percent: Math.round((correct / total) * 100) } : null;
}

/** Acerto por módulo (para o plano de estudos priorizar dificuldades). */
export function moduleAccuracy(perf: TopicPerf[]): Partial<Record<ModuleId, Accuracy>> {
  const out: Partial<Record<ModuleId, Accuracy>> = {};
  for (const t of perf) {
    const a = out[t.module] ?? { correct: 0, total: 0, percent: 0 };
    a.correct += t.correct;
    a.total += t.attempts;
    a.percent = Math.round((a.correct / a.total) * 100);
    out[t.module] = a;
  }
  return out;
}
