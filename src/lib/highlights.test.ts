import { describe, expect, it } from 'vitest';
import { addHighlight, removeHighlight, segments, trimRange, validateHighlights, type Highlight } from './highlights';

const TEXT = 'Um tanque contém 2 m³ de óleo a 20 °C. Calcule a massa.';
let n = 0;
const id = () => `t${n++}`;
const add = (list: Highlight[], s: number, e: number, c: Highlight['color'] = 'dado') => addHighlight(list, 'enunciado', TEXT, s, e, c, id);
const at = (q: string) => [TEXT.indexOf(q), TEXT.indexOf(q) + q.length] as const;

describe('marca-texto: aplicar e remover', () => {
  it('aplica um destaque e guarda o trecho exato, sem espaços nas pontas', () => {
    const [s, e] = at('2 m³');
    const list = add([], s - 1, e + 1);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ field: 'enunciado', start: s, end: e, quote: '2 m³', color: 'dado' });
    expect(trimRange(TEXT, s - 1, e + 1)).toEqual([s, e]);
  });
  it('ignora seleção vazia ou só de espaços', () => {
    expect(add([], 2, 3)).toEqual([]);
  });
  it('a cor nova corta o destaque que ela sobrepõe e une vizinhos da mesma cor', () => {
    const [s, e] = at('2 m³ de óleo');
    let list = add([], s, e, 'dado');
    const [os, oe] = at('óleo');
    list = add(list, os, oe, 'condicao');
    expect(list.map((h) => [h.quote, h.color])).toEqual([
      ['2 m³ de ', 'dado'],
      ['óleo', 'condicao'],
    ]);
    const [cs, ce] = at(' a 20 °C');
    list = add(list, cs, ce, 'condicao');
    expect(list.filter((h) => h.color === 'condicao').map((h) => h.quote)).toEqual(['óleo a 20 °C']);
  });
  it('remove um destaque individualmente', () => {
    const a = add([], ...at('2 m³'));
    const b = add(a, ...at('massa'), 'objetivo');
    expect(removeHighlight(b, a[0].id).map((h) => h.quote)).toEqual(['massa']);
  });
  it('os pedaços para renderizar reproduzem o texto original sem alteração', () => {
    let list = add([], ...at('2 m³'));
    list = add(list, ...at('massa'), 'objetivo');
    const segs = segments(TEXT, list);
    expect(segs.map((s) => s.text).join('')).toBe(TEXT);
    expect(segs.filter((s) => s.mark).map((s) => s.text)).toEqual(['2 m³', 'massa']);
  });
});

describe('marca-texto: validação quando o enunciado muda', () => {
  const saved = (): Highlight[] => [{ id: 'a', field: 'enunciado', start: TEXT.indexOf('2 m³'), end: TEXT.indexOf('2 m³') + 4, color: 'dado', quote: '2 m³' }];
  it('mantém o destaque quando o texto continua igual', () => {
    expect(validateHighlights(saved(), { enunciado: TEXT })).toMatchObject({ dropped: 0, relocated: 0, valid: saved() });
  });
  it('reposiciona quando o mesmo trecho aparece uma única vez em outro lugar', () => {
    const novo = `Atenção: ${TEXT}`;
    const r = validateHighlights(saved(), { enunciado: novo });
    expect(r.relocated).toBe(1);
    expect(novo.slice(r.valid[0].start, r.valid[0].end)).toBe('2 m³');
  });
  it('descarta quando o trecho sumiu, ficou ambíguo ou o campo não existe mais', () => {
    expect(validateHighlights(saved(), { enunciado: TEXT.replace('2 m³', '3 m³') })).toMatchObject({ dropped: 1, valid: [] });
    expect(validateHighlights(saved(), { enunciado: '2 m³ ou 2 m³?' })).toMatchObject({ dropped: 1, valid: [] });
    expect(validateHighlights(saved(), { pede: TEXT })).toMatchObject({ dropped: 1, valid: [] });
  });
});
