import { describe, expect, it } from 'vitest';
import { BACKUP_APP, exportBackup, parseBackup } from './backup';
import { createProgressStore, emptyProgress } from './progress';

describe('backup dos dados de estudo', () => {
  it('exporta e importa sem perder dados', () => {
    const s = createProgressStore(null);
    s.setModuleCompleted('m2', true);
    s.recordAnswer('m2-01', false);
    s.markExerciseSolved('l01-q1');
    const r = parseBackup(exportBackup(s.get()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.completedModules).toEqual(['m2']);
    expect(r.state.reviews['m2-01'].box).toBe(0);
    expect(r.summary.answeredQuestions).toBe(1);
  });
  it('recusa arquivos que não são backup, JSON inválido e versões futuras', () => {
    expect(parseBackup('{oi').ok).toBe(false);
    expect(parseBackup('[]').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'outro', version: 2, data: {} })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: BACKUP_APP, version: 99, data: {} })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: BACKUP_APP, version: 2 })).ok).toBe(false);
  });
  it('migra um backup da versão 1 e descarta campos corrompidos', () => {
    const v1 = { version: 1, completedModules: ['m1', 'mx'], wrongQuestions: { 'm1-01': 2 }, attempts: [{ correct: 3, total: 2 }] };
    const r = parseBackup(JSON.stringify({ app: BACKUP_APP, version: 1, data: v1 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.version).toBe(3);
    expect(r.state.completedModules).toEqual(['m1']);
    expect(r.state.reviews['m1-01'].box).toBe(0);
    expect(r.state.attempts).toEqual([]); // 3 acertos em 2 questões é impossível
    expect(r.state.settings).toEqual(emptyProgress().settings);
  });
});

describe('backup com anotações', () => {
  it('leva cadernos e destaques junto; backup antigo não traz anotações', async () => {
    const { createNotesStore } = await import('./notes');
    const n = createNotesStore(null);
    n.setText('ex:l01-q1', 'ρ = 1000 kg/m³');
    n.setHighlights('l01-q1', [{ id: 'a', field: 'enunciado', start: 0, end: 2, color: 'dado', quote: 'Um' }]);
    const r = parseBackup(exportBackup(createProgressStore(null).get(), new Date(), n.get()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.notes?.notebooks['ex:l01-q1'].text).toBe('ρ = 1000 kg/m³');
    expect(r.summary).toMatchObject({ notebooks: 1, highlights: 1 });
    const old = parseBackup(JSON.stringify({ app: BACKUP_APP, version: 2, data: { version: 2 } }));
    expect(old.ok && old.notes).toBe(null);
  });
});
