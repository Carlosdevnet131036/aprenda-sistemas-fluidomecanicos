import { describe, expect, it } from 'vitest';
import { countSolved, createProgressStore, sanitize, STORAGE_KEY, type StorageLike } from './progress';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('progresso no navegador', () => {
  it('salva e recarrega o progresso', () => {
    const st = memoryStorage();
    const a = createProgressStore(st);
    a.setModuleCompleted('m1', true);
    a.recordAnswer('q1', false);
    a.markExerciseSolved('e1');
    const b = createProgressStore(st);
    expect(b.get().completedModules).toEqual(['m1']);
    expect(b.get().wrongQuestions).toEqual({ q1: 1 });
    expect(b.get().solvedExercises).toEqual(['e1']);
  });
  it('acertar depois remove a questão da lista de erros', () => {
    const s = createProgressStore(memoryStorage());
    s.recordAnswer('q1', false);
    s.recordAnswer('q1', false);
    expect(s.get().wrongQuestions.q1).toBe(2);
    s.recordAnswer('q1', true);
    expect(s.get().wrongQuestions.q1).toBeUndefined();
  });
  it('desmarcar módulo concluído e não duplicar', () => {
    const s = createProgressStore(memoryStorage());
    s.setModuleCompleted('m2', true);
    s.setModuleCompleted('m2', true);
    expect(s.get().completedModules).toEqual(['m2']);
    s.setModuleCompleted('m2', false);
    expect(s.get().completedModules).toEqual([]);
  });
  it('reiniciar apaga tudo', () => {
    const st = memoryStorage();
    const s = createProgressStore(st);
    s.setModuleCompleted('m3', true);
    s.reset();
    expect(s.get().completedModules).toEqual([]);
    expect(st.data.has(STORAGE_KEY)).toBe(false);
  });
  it('dados corrompidos não quebram o site', () => {
    const st = memoryStorage();
    st.setItem(STORAGE_KEY, '{isto não é json');
    expect(createProgressStore(st).get().completedModules).toEqual([]);
    const clean = sanitize({ completedModules: ['m1', 'm9', 3, 'm1'], wrongQuestions: { a: -1, b: 2, c: 'x' } });
    expect(clean.completedModules).toEqual(['m1']);
    expect(clean.wrongQuestions).toEqual({ b: 2 });
  });
  it('sem armazenamento disponível continua funcionando em memória', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('cheio');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };
    const s = createProgressStore(throwing);
    s.setModuleCompleted('m0', true);
    expect(s.get().completedModules).toEqual(['m0']);
    expect(s.isPersistent()).toBe(false);
    expect(() => s.reset()).not.toThrow();
    expect(createProgressStore(null).get().completedModules).toEqual([]);
  });
  it('contador de resolvidos considera só os ids da própria lista (revisão não infla os exercícios)', () => {
    const solved = ['rev-q1', 'rev-q2', 'l01-q1', 'l01-q1'];
    expect(countSolved(solved, ['l01-q1', 'l01-q2'])).toBe(1);
    expect(countSolved(solved, ['rev-q1', 'rev-q2', 'rev-q3'])).toBe(2);
    expect(countSolved([], ['l01-q1'])).toBe(0);
  });
});
