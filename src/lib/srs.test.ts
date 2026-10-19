import { describe, expect, it } from 'vitest';
import { addDays, applyAnswer, applyRating, dayKey, DEFAULT_INTERVALS, dueIds, isDue, mastery, parseIntervals, validateIntervals, weakestIds } from './srs';

const I = DEFAULT_INTERVALS; // [1, 3, 7, 14, 30]
const d0 = new Date(2026, 9, 1, 10, 0, 0);

describe('revisão espaçada (caixas de Leitner)', () => {
  it('erro vai para a caixa 0 e reaparece no mesmo dia', () => {
    const c = applyAnswer(undefined, false, d0, I);
    expect(c.box).toBe(0);
    expect(c.due).toBe(dayKey(d0));
    expect(c.lapses).toBe(1);
    expect(isDue(c, d0)).toBe(true);
  });
  it('um único acerto NÃO torna a questão dominada', () => {
    const c = applyAnswer(undefined, true, d0, I);
    expect(c.box).toBe(1);
    expect(c.due).toBe(dayKey(addDays(d0, 1)));
    expect(mastery(c, I)).not.toBe('dominada');
  });
  it('acertar de novo antes do vencimento não acelera a revisão; errar sempre volta à caixa 0', () => {
    const c1 = applyAnswer(undefined, true, d0, I);
    const c2 = applyAnswer(c1, true, d0, I);
    expect(c2.box).toBe(1);
    expect(c2.due).toBe(c1.due);
    expect(applyAnswer(c2, false, d0, I).box).toBe(0);
  });
  it('só chega a “dominada” após acertos em revisões espaçadas até a última caixa', () => {
    let c = applyAnswer(undefined, true, d0, I);
    let t = d0;
    for (let i = 1; i < I.length; i++) {
      t = addDays(t, I[c.box - 1]);
      expect(isDue(c, t)).toBe(true);
      c = applyAnswer(c, true, t, I);
    }
    expect(c.box).toBe(I.length);
    expect(mastery(c, I)).toBe('dominada');
  });
  it('autoavaliação: fácil sobe 2 caixas, média 1, difícil fica (mínimo 1); errou → caixa 0', () => {
    const base = { box: 2, due: dayKey(d0), lastAt: '', reviews: 3, lapses: 0 };
    expect(applyRating(base, true, 'facil', d0, I).box).toBe(4);
    expect(applyRating(base, true, 'media', d0, I).box).toBe(3);
    expect(applyRating(base, true, 'dificil', d0, I).box).toBe(2);
    expect(applyRating({ ...base, box: 0 }, true, 'dificil', d0, I).box).toBe(1);
    expect(applyRating(base, false, 'facil', d0, I).box).toBe(0);
    expect(applyRating({ ...base, box: 5 }, true, 'facil', d0, I).box).toBe(5);
    expect(applyRating(base, true, 'media', d0, I).due).toBe(dayKey(addDays(d0, I[2])));
  });
  it('lista vencidas por atraso e fraqueza; “mais fracas” só entre as não vencidas', () => {
    const cards = {
      a: { box: 2, due: '2026-09-28', lastAt: '', reviews: 1, lapses: 0 },
      b: { box: 0, due: '2026-10-01', lastAt: '', reviews: 1, lapses: 2 },
      c: { box: 1, due: '2026-10-05', lastAt: '', reviews: 1, lapses: 0 },
      d: { box: 4, due: '2026-11-01', lastAt: '', reviews: 1, lapses: 0 },
    };
    expect(dueIds(cards, d0)).toEqual(['a', 'b']);
    expect(weakestIds(cards, d0)).toEqual(['c']);
  });
  it('intervalos configuráveis são validados', () => {
    expect(validateIntervals([1, 3, 7])).toBeNull();
    expect(validateIntervals([3, 1])).not.toBeNull();
    expect(validateIntervals([1])).not.toBeNull();
    expect(validateIntervals([1, 2.5])).not.toBeNull();
    expect(parseIntervals('1, 2; 4 8')).toEqual({ ok: true, value: [1, 2, 4, 8] });
    expect(parseIntervals('1, x').ok).toBe(false);
  });
});
