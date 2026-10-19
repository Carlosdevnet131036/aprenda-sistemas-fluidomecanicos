import { describe, expect, it } from 'vitest';
import { CORRUPT_KEY, countSolved, createProgressStore, sanitize, STORAGE_KEY, type StorageLike } from './progress';

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
  it('versão 2: cada resposta atualiza estatística, revisão espaçada e lista de erros', () => {
    const now = new Date(2026, 9, 1, 12);
    const s = createProgressStore(memoryStorage(), () => now);
    s.recordAnswer('q1', false);
    expect(s.get().questionStats.q1).toMatchObject({ attempts: 1, correct: 0, lastCorrect: false });
    expect(s.get().reviews.q1.box).toBe(0);
    s.recordReview('q1', true, 'media');
    expect(s.get().reviews.q1.box).toBe(1);
    expect(s.get().wrongQuestions.q1).toBeUndefined();
    expect(s.get().reviewLog[s.get().reviewLog.length - 1]).toMatchObject({ id: 'q1', correct: true, rating: 'media' });
  });
  it('migra dados da versão 1 salvos no navegador', () => {
    const st = memoryStorage();
    st.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completedModules: ['m3'], wrongQuestions: { a: 1 }, solvedExercises: ['e1'] }));
    const s = createProgressStore(st);
    expect(s.get().version).toBe(3);
    expect(s.get().completedModules).toEqual(['m3']);
    expect(s.get().reviews.a.box).toBe(0);
    expect(s.get().solvedExercises).toEqual(['e1']);
  });
  it('dados ilegíveis são copiados para outra chave antes de recomeçar', () => {
    const st = memoryStorage();
    st.setItem(STORAGE_KEY, '{quebrado');
    const s = createProgressStore(st);
    expect(s.loadIssue()).toBe('corrompido');
    expect(st.data.get(CORRUPT_KEY)).toBe('{quebrado');
  });
  it('tentativas de exercício registram tipos de erro; plano marca sessões; intervalos inválidos são recusados', () => {
    const s = createProgressStore(null, () => new Date(2026, 9, 1));
    s.recordExerciseAttempt('e1', 'unidade');
    s.recordExerciseAttempt('e1', 'correto');
    expect(s.get().exerciseStats.e1).toMatchObject({ attempts: 2, errors: { unidade: 1 }, lastStatus: 'correto' });
    s.setPlan({ enabled: true, examDate: '2026-10-20', startDate: '2026-10-01', minutesPerDay: 60, priorityModules: ['m3'], pendingModules: ['m3'], weakModules: [], done: {} });
    s.togglePlanSession('x');
    expect(s.get().plan!.done.x).toBe('2026-10-01');
    expect(() => s.setIntervals([5, 2])).toThrow();
    s.setIntervals([2, 4]);
    expect(s.get().settings.srsIntervals).toEqual([2, 4]);
  });
});

describe('Minha resolução: histórico e revisão espaçada dos exercícios', () => {
  const base = { steps: {}, difficultStep: '' as const, concept: '', note: '', autoCheck: null };
  const day = (iso: string) => () => new Date(iso);
  it('autoavaliação agenda o exercício: não conseguiu volta hoje; resolveu sobe de caixa', () => {
    const s = createProgressStore(memoryStorage(), day('2026-10-19T12:00:00'));
    s.recordReflection('l01-q6', { ...base, result: 'errei' }, 'Atuador', '#/exercicios/l01-q6');
    expect(s.get().exerciseReviews['l01-q6']).toMatchObject({ box: 0, due: '2026-10-19' });
    s.recordReflection('l01-q6', { ...base, result: 'acertei' }, 'Atuador', '#/exercicios/l01-q6');
    expect(s.get().exerciseReviews['l01-q6']).toMatchObject({ box: 1, due: '2026-10-20' });
    expect(s.get().reflections['l01-q6'].map((r) => r.result)).toEqual(['errei', 'acertei']);
    expect(s.get().activity[0].label).toMatch(/Minha resolução — Atuador: resolvi/);
    // as questões V/F não são afetadas
    expect(s.get().reviews).toEqual({});
  });
  it('“com dificuldade” ou etapa marcada para revisar não sobe de caixa', () => {
    const s = createProgressStore(memoryStorage(), day('2026-10-19T12:00:00'));
    s.recordReflection('a', { ...base, result: 'acertei', steps: { formula: 'revisar' } }, 'A', '#/exercicios/a');
    s.recordReflection('b', { ...base, result: 'dificuldade', difficultStep: 'conversoes' }, 'B', '#/exercicios/b');
    expect(s.get().exerciseReviews.a.box).toBe(1);
    expect(s.get().exerciseReviews.b.box).toBe(1);
    expect(s.get().reflections.b[0]).toMatchObject({ difficultStep: 'conversoes', result: 'dificuldade' });
  });
  it('dados da versão 2 viram versão 3 sem perder nada', () => {
    const st = memoryStorage();
    st.setItem(STORAGE_KEY, JSON.stringify({ version: 2, solvedExercises: ['e1'], reviews: { q1: { box: 2, due: '2026-10-20', lastAt: '', reviews: 2, lapses: 0 } } }));
    const s = createProgressStore(st);
    expect(s.get()).toMatchObject({ version: 3, solvedExercises: ['e1'], exerciseReviews: {}, reflections: {} });
    expect(s.get().reviews.q1.box).toBe(2);
  });
  it('registros corrompidos são descartados um a um', () => {
    const r = sanitize({
      version: 3,
      reflections: { a: [{ date: 'x', result: 'acertei', steps: { formula: 'entendi', foo: 'entendi', calculo: 'talvez' } }, { date: 'y', result: 'nao' }] },
    });
    expect(r.reflections.a).toHaveLength(1);
    expect(r.reflections.a[0].steps).toEqual({ formula: 'entendi' });
  });
});
