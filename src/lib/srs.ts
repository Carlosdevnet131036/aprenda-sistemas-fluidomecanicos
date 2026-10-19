// Revisão espaçada no estilo das caixas de Leitner, simples de explicar:
// cada questão fica numa "caixa" de 0 a N. Errou → volta para a caixa 0 e
// reaparece hoje. Acertou → sobe de caixa e só reaparece depois do intervalo
// daquela caixa (padrão: 1, 3, 7, 14 e 30 dias). Um único acerto nunca leva a
// questão direto para "dominada": é preciso acertar em revisões espaçadas até
// chegar à última caixa.

export type Rating = 'facil' | 'media' | 'dificil';

export interface ReviewCard {
  /** 0 = aprendendo (reaparece hoje); 1..N = caixas com intervalos crescentes */
  box: number;
  /** data (AAAA-MM-DD) a partir da qual a questão volta para revisão */
  due: string;
  lastAt: string;
  reviews: number;
  lapses: number;
}

export const DEFAULT_INTERVALS = [1, 3, 7, 14, 30];

const DAY = 86_400_000;

/** Data local no formato AAAA-MM-DD (sem fuso: o estudo é organizado por dia). */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY);
}

/** Valida a lista de intervalos (dias inteiros, crescentes, 2 a 8 caixas). */
export function validateIntervals(xs: number[]): string | null {
  if (xs.length < 2 || xs.length > 8) return 'Informe de 2 a 8 intervalos.';
  if (xs.some((x) => !Number.isInteger(x) || x < 1 || x > 365)) return 'Cada intervalo deve ser um número inteiro de dias entre 1 e 365.';
  if (xs.some((x, i) => i > 0 && x <= xs[i - 1])) return 'Os intervalos precisam ser crescentes (ex.: 1, 3, 7, 14, 30).';
  return null;
}

export function parseIntervals(text: string): { ok: true; value: number[] } | { ok: false; error: string } {
  const parts = text.split(/[;,\s]+/).filter(Boolean);
  const xs = parts.map((p) => Number(p));
  if (parts.length === 0 || xs.some((x) => !Number.isFinite(x))) return { ok: false, error: 'Use apenas números separados por vírgula.' };
  const err = validateIntervals(xs);
  return err ? { ok: false, error: err } : { ok: true, value: xs };
}

function schedule(box: number, now: Date, intervals: number[]): string {
  return dayKey(box === 0 ? now : addDays(now, intervals[box - 1]));
}

/** Resposta dada num quiz ou simulado (sem autoavaliação). */
export function applyAnswer(card: ReviewCard | undefined, correct: boolean, now: Date, intervals: number[]): ReviewCard {
  const max = intervals.length;
  const prev = card ?? { box: 0, due: dayKey(now), lastAt: now.toISOString(), reviews: 0, lapses: 0 };
  // Responder de novo antes do vencimento não acelera a revisão: só um erro muda a caixa.
  const early = card !== undefined && dayKey(now) < card.due;
  const box = correct ? (early ? prev.box : Math.min(max, prev.box + 1)) : 0;
  return {
    box,
    due: correct && early ? prev.due : schedule(box, now, intervals),
    lastAt: now.toISOString(),
    reviews: prev.reviews + 1,
    lapses: prev.lapses + (correct ? 0 : 1),
  };
}

/**
 * Revisão com autoavaliação. Errou: caixa 0. Acertou: “fácil” sobe 2 caixas,
 * “média” sobe 1 e “difícil” não sobe (mínimo caixa 1).
 */
export function applyRating(card: ReviewCard | undefined, correct: boolean, rating: Rating, now: Date, intervals: number[]): ReviewCard {
  const max = intervals.length;
  const prev = card ?? { box: 0, due: dayKey(now), lastAt: now.toISOString(), reviews: 0, lapses: 0 };
  const step = rating === 'facil' ? 2 : rating === 'media' ? 1 : 0;
  const box = correct ? Math.min(max, Math.max(1, prev.box + step)) : 0;
  return { box, due: schedule(box, now, intervals), lastAt: now.toISOString(), reviews: prev.reviews + 1, lapses: prev.lapses + (correct ? 0 : 1) };
}

export function isDue(card: ReviewCard, now: Date): boolean {
  return card.due <= dayKey(now);
}

/** Questões vencidas, das mais atrasadas (e mais fracas) para as mais recentes. */
export function dueIds(cards: Record<string, ReviewCard>, now: Date): string[] {
  return Object.entries(cards)
    .filter(([, c]) => isDue(c, now))
    .sort(([, a], [, b]) => (a.due === b.due ? a.box - b.box || b.lapses - a.lapses : a.due < b.due ? -1 : 1))
    .map(([id]) => id);
}

/** As mais fracas ainda não vencidas — para “adiantar” a revisão quando não há nada pendente. */
export function weakestIds(cards: Record<string, ReviewCard>, now: Date): string[] {
  return Object.entries(cards)
    .filter(([, c]) => !isDue(c, now) && c.box < 3)
    .sort(([, a], [, b]) => a.box - b.box || b.lapses - a.lapses)
    .map(([id]) => id);
}

export type MasteryLevel = 'aprendendo' | 'revisando' | 'consolidando' | 'dominada';

export function mastery(card: ReviewCard, intervals: number[]): MasteryLevel {
  if (card.box === 0) return 'aprendendo';
  if (card.box >= intervals.length) return 'dominada';
  if (card.box >= Math.ceil(intervals.length / 2)) return 'consolidando';
  return 'revisando';
}

export function nextDue(cards: Record<string, ReviewCard>): string | null {
  const ds = Object.values(cards).map((c) => c.due).sort();
  return ds[0] ?? null;
}
