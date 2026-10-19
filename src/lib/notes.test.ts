import { describe, expect, it } from 'vitest';
import { amend, commit, initHistory, redo, undo } from './history';
import { hitsStroke, pushPoint, sanitizeStrokes } from './ink';
import { createNotesStore, exerciseNotebookKey, moduleNotebookKey, NOTES_CORRUPT_KEY, NOTES_KEY, sanitizeNotes } from './notes';
import type { StorageLike } from './progress';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

const hl = { id: 'a', field: 'enunciado', start: 0, end: 2, color: 'dado' as const, quote: 'Um' };

describe('anotações: persistência', () => {
  it('salva e restaura destaques e cadernos depois de recarregar', () => {
    const st = memory();
    const a = createNotesStore(st);
    a.setHighlights('l01-q1', [hl]);
    a.setText(exerciseNotebookKey('l01-q1'), 'ρ = m/V');
    a.setInk(exerciseNotebookKey('l01-q1'), [{ c: '#1d4ed8', w: 4, p: [1, 2, 30, 40] }], 2100);
    const b = createNotesStore(st); // “recarregar a página”
    expect(b.get().highlights['l01-q1']).toEqual([hl]);
    expect(b.get().notebooks['ex:l01-q1']).toMatchObject({ text: 'ρ = m/V', inkHeight: 2100, ink: [{ c: '#1d4ed8', w: 4, p: [1, 2, 30, 40] }] });
    expect(b.status()).toMatchObject({ ok: true, issue: null });
  });
  it('cada exercício tem o próprio caderno e o caderno do módulo é separado', () => {
    const s = createNotesStore(memory());
    s.setText(exerciseNotebookKey('l01-q1'), 'cálculo da q1');
    s.setText(exerciseNotebookKey('l01-q2'), 'cálculo da q2');
    s.setText(moduleNotebookKey('m1'), 'observações do módulo 1');
    expect(Object.keys(s.get().notebooks).sort()).toEqual(['ex:l01-q1', 'ex:l01-q2', 'mod:m1']);
    expect(s.get().notebooks['ex:l01-q1'].text).toBe('cálculo da q1');
    expect(s.get().notebooks['mod:m1'].text).toBe('observações do módulo 1');
  });
  it('caderno esvaziado deixa de ocupar espaço; destaques de outro exercício ficam intactos', () => {
    const s = createNotesStore(memory());
    s.setHighlights('a', [hl]);
    s.setHighlights('b', [hl]);
    s.setText('ex:a', 'x');
    s.setText('ex:a', '');
    s.setHighlights('a', []);
    expect(s.get().notebooks).toEqual({});
    expect(Object.keys(s.get().highlights)).toEqual(['b']);
  });
  it('sem espaço no navegador: mantém na memória, avisa e grava ao tentar de novo', () => {
    const st = memory();
    let full = true;
    const s = createNotesStore({
      ...st,
      setItem: (k, v) => {
        if (full) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
        st.setItem(k, v);
      },
    });
    s.setText('ex:a', 'importante');
    expect(s.status()).toMatchObject({ ok: false, issue: 'cheio' });
    expect(s.get().notebooks['ex:a'].text).toBe('importante');
    expect(st.data.has(NOTES_KEY)).toBe(false);
    full = false;
    s.retry();
    expect(s.status()).toMatchObject({ ok: true, issue: null });
    expect(JSON.parse(st.data.get(NOTES_KEY)!).notebooks['ex:a'].text).toBe('importante');
  });
  it('armazenamento indisponível e dados ilegíveis não quebram o site', () => {
    expect(createNotesStore(null).status().issue).toBe('indisponivel');
    const st = memory();
    st.setItem(NOTES_KEY, '{quebrado');
    const s = createNotesStore(st);
    expect(s.loadIssue()).toBe('corrompido');
    expect(st.data.get(NOTES_CORRUPT_KEY)).toBe('{quebrado');
    expect(s.get().notebooks).toEqual({});
  });
  it('descarta só os campos corrompidos', () => {
    const s = sanitizeNotes({
      highlights: { a: [hl, { ...hl, id: 'b', end: 9 }, { ...hl, id: 'c', color: 'azul' }] },
      notebooks: { 'ex:a': { text: 'ok', ink: [{ c: 'red', w: 4, p: [1, 2] }, { c: '#000000', w: 2, p: [1] }, { c: '#000000', w: 2, p: [5, 5] }] }, 'xx:b': { text: 'x' } },
      prefs: { paper: 'pautado', mode: 'voar' },
    });
    expect(s.highlights.a.map((h) => h.id)).toEqual(['a']); // b: tamanho do trecho não confere; c: cor inválida
    expect(s.notebooks['ex:a'].ink).toEqual([{ c: '#000000', w: 2, p: [5, 5] }]);
    expect(s.notebooks['xx:b']).toBeUndefined();
    expect(s.prefs).toEqual({ paper: 'pautado', mode: 'texto' });
  });
});

describe('caderno: desfazer/refazer e traços', () => {
  it('commit, amend, undo e redo', () => {
    let h = initHistory('');
    h = commit(h, 'a');
    h = amend(h, 'ab'); // digitação contínua: mesmo passo
    h = commit(h, 'ab\n');
    expect(undo(h).present).toBe('ab');
    expect(undo(undo(h)).present).toBe('');
    expect(redo(undo(h)).present).toBe('ab\n');
    expect(commit(undo(h), 'x').future).toEqual([]);
  });
  it('pontos muito próximos não engordam o traço; a borracha acerta o traço tocado', () => {
    const p: number[] = [];
    pushPoint(p, 10, 10, 0);
    expect(pushPoint(p, 10.5, 10.5)).toBe(false);
    expect(pushPoint(p, 100, 10)).toBe(true);
    const s = { c: '#000000', w: 4, p };
    expect(hitsStroke(s, 50, 14, 5)).toBe(true);
    expect(hitsStroke(s, 50, 40, 5)).toBe(false);
    expect(sanitizeStrokes([s, { c: '#000000', w: 999, p: [1, 1] }])).toHaveLength(1);
  });
});
