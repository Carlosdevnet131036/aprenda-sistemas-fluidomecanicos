import { describe, expect, it } from 'vitest';
import { MODULES } from './modules';
import { QUESTIONS } from './questions';
import { EXERCISES } from './exercises';
import { FORMULAS, GLOSSARY, IDENTIFY } from './reference';
import { getUnit, toSI } from '../lib/units';
import { checkNumericAnswer } from '../lib/answerCheck';
import { gradeQuiz, longestRun, selectQuestions } from '../lib/quiz';
import * as F from '../lib/physics';
import type { Block } from './types';

function allBlocks(): Block[] {
  const out: Block[] = [];
  const walk = (bs: Block[]) =>
    bs.forEach((b) => {
      out.push(b);
      if (b.t === 'callout') walk(b.body);
    });
  MODULES.forEach((m) => m.sections.forEach((s) => (walk(s.blocks), walk(s.simpler ?? []))));
  return out;
}

describe('integridade do conteúdo', () => {
  it('8 módulos (0 a 7) em ordem', () => {
    expect(MODULES.map((m) => m.num)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it('ids de seção são únicos dentro de cada módulo', () => {
    for (const m of MODULES) {
      const ids = m.sections.map((s) => s.id);
      expect(new Set(ids).size, m.id).toBe(ids.length);
    }
  });
  it('todo exercício e questão referenciados nas aulas existe', () => {
    const exIds = new Set(EXERCISES.map((e) => e.id));
    const qIds = new Set(QUESTIONS.map((q) => q.id));
    for (const b of allBlocks()) {
      if (b.t === 'exercise') expect(exIds.has(b.id), b.id).toBe(true);
      if (b.t === 'vf') b.ids.forEach((id) => expect(qIds.has(id), id).toBe(true));
    }
  });
  it('seções apontadas por questões e exercícios existem', () => {
    for (const item of [...QUESTIONS, ...EXERCISES]) {
      if (!item.section) continue;
      const m = MODULES.find((x) => x.id === item.module)!;
      expect(m.sections.some((s) => s.id === item.section), `${item.id} → ${item.section}`).toBe(true);
    }
  });
  it('glossário, formulário e identificação cobrem os módulos 0–5', () => {
    for (const id of ['m1', 'm2', 'm3', 'm4', 'm5']) {
      expect(GLOSSARY.some((g) => g.module === id)).toBe(true);
      expect(FORMULAS.some((f) => f.module === id)).toBe(true);
    }
    expect(new Set(IDENTIFY.map((i) => i.block)).size).toBe(5);
  });
});

describe('banco de questões', () => {
  it('ids únicos', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
  it('tem quantidade suficiente para novas tentativas', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(100);
    for (const m of ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6']) {
      expect(QUESTIONS.filter((q) => q.module === m).length, m).toBeGreaterThanOrEqual(12);
    }
  });
  it('toda afirmação falsa tem versão corrigida; toda questão tem justificativa e conceito a revisar', () => {
    for (const q of QUESTIONS) {
      expect(q.explanation.length, q.id).toBeGreaterThan(20);
      expect(q.review.length, q.id).toBeGreaterThan(5);
      if (!q.answer) expect(q.correction?.length ?? 0, q.id).toBeGreaterThan(10);
    }
  });
  it('verdadeiras e falsas equilibradas (40–60%) e os três níveis presentes', () => {
    const t = QUESTIONS.filter((q) => q.answer).length / QUESTIONS.length;
    expect(t).toBeGreaterThan(0.4);
    expect(t).toBeLessThan(0.6);
    for (const lvl of ['iniciante', 'intermediario', 'avancado'] as const) {
      expect(QUESTIONS.some((q) => q.level === lvl)).toBe(true);
    }
  });
  it('afirmações falsas não dependem de “sempre/nunca/impossível” para serem identificadas', () => {
    const marked = QUESTIONS.filter((q) => !q.answer && /\b(sempre|nunca|impossível)\b/i.test(q.statement));
    expect(marked.length).toBeLessThanOrEqual(2);
  });
});

describe('sorteio e correção do quiz', () => {
  it('sorteia sem repetir, equilibra V/F e evita sequências longas', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const qs = selectQuestions(QUESTIONS, { count: 20, seed });
      expect(new Set(qs.map((q) => q.id)).size).toBe(20);
      const t = qs.filter((q) => q.answer).length;
      expect(Math.abs(t - (20 - t))).toBeLessThanOrEqual(1);
      expect(longestRun(qs)).toBeLessThanOrEqual(4);
    }
  });
  it('filtra por módulo e nível', () => {
    const qs = selectQuestions(QUESTIONS, { count: 10, modules: ['m3'], levels: ['avancado'], seed: 3 });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.module === 'm3' && q.level === 'avancado')).toBe(true);
  });
  it('pede mais questões do que existem: devolve o que há', () => {
    const qs = selectQuestions(QUESTIONS, { count: 999, modules: ['m0'], seed: 1 });
    expect(qs.length).toBe(QUESTIONS.filter((q) => q.module === 'm0').length);
  });
  it('corrige, calcula percentual e aponta temas para revisar', () => {
    const qs = QUESTIONS.slice(0, 4);
    const answers = { [qs[0].id]: qs[0].answer, [qs[1].id]: !qs[1].answer, [qs[2].id]: qs[2].answer };
    const s = gradeQuiz(qs, answers);
    expect(s.correct).toBe(2);
    expect(s.unanswered).toBe(1);
    expect(s.percent).toBe(50);
    expect(s.toReview.length).toBeGreaterThan(0);
  });
  it('questão em branco nunca conta como acerto', () => {
    const s = gradeQuiz([QUESTIONS[0]], {});
    expect(s.correct).toBe(0);
  });
});

// Recalcula de forma independente as respostas numéricas dos exercícios.
const g = 9.81;
const K = F.celsiusToKelvin;
const RECOMPUTE: Record<string, () => number> = {
  'm0-conv-mm': () => 25 / 1000,
  'm0-conv-dm3': () => 6 / 1000,
  'l01-q1': () => F.weight(120, F.G_MOON),
  'l01-q2': () => F.massFromDensity(850, F.filledVolume(F.cylinderVolumeFromDiameter(0.8, 1.5), 0.8)),
  'a2-fix1': () => F.massFromDensity(1000, F.cylinderVolumeFromDiameter(1.2, 2.5)),
  'a2-fix2': () => 15 * F.massFromDensity(2700, F.cylinderVolumeFromDiameter(0.08, 1.2)),
  'a2-fix3': () => F.massFromDensity(850, F.filledVolume(F.boxVolume(0.5, 0.3, 0.4), 0.75)),
  'l01-q5': () => F.sensibleHeat(2, 900, 25, 75),
  'l01-q6': () => F.isobaricWork(200e3, 0.006, 0.002),
  'l01-q7': () => F.firstLawDeltaU(1500, 800),
  'l01-q8': () => F.firstLawDeltaU(1200 - 500, 1200),
  'l01-q10': () => F.firstLawDeltaU(1.8e6, F.isobaricWork(5e5, 2, 5)),
  'a2-calor-esp': () => F.specificHeat(3000, 0.2, 50),
  'a2-dv': () => 500 / 100e3,
  'a2-1lei': () => F.firstLawDeltaU(-4000, 3000),
  'a3-q1': () => F.workFromEfficiency(F.carnotEfficiency(K(520), K(30)), 2.4),
  'a3-q2': () => F.heatInputFromWork(80, 0.75 * F.carnotEfficiency(600, 300)),
  'a3-q9': () => F.carnotEfficiency(900, 300),
  's3-ex1': () => {
    const qq = F.heatInputFromWork(800000, 0.7 * F.carnotEfficiency(585, 295));
    return qq - 800000;
  },
  's3-ex2': () => F.workFromEfficiency(F.carnotEfficiency(K(250), K(30)), 6),
  's3-ex3': () => F.heatInputFromWork(1000, F.carnotEfficiency(K(550), 318.95)) - 1000,
  'a3-q4': () => F.specificWeight(F.density(348, 0.4), g),
  'a3-q5': () => F.weight(F.massFromDensity(820, 0.15), 10),
  'a3-q6': () => F.viscousForce(F.shearStress(0.12, 0.4, 0.0015), 0.6),
  'a3-q7': () => F.viscousForce(F.shearStress(F.dynamicFromKinematic(1.8e-4, 850), 0.25, 0.0008), 0.3),
  'a3-q10': () => F.classifyNewtonian([{ rate: 25, stress: 8 }, { rate: 50, stress: 16 }, { rate: 75, stress: 24 }]).mean,
  's3-prop1': () => F.specificWeight(800, 10),
  's3-visc2': () => F.viscousForce(F.shearStress(0.02, 0.05, 0.0001), 1),
  's3-visc3': () => F.dynamicFromKinematic(2e-6, 750),
  'm5-reservatorio': () => F.hydrostaticPressure(1000, 10, 5) / 1000,
  'm5-tubo-u': () => F.hydrostaticPressure(13600, g, 0.3) / 1000,
  'a5-ex1': () =>
    F.solveManometerStart(85600, [
      { fluid: 'água', gamma: 1000 * g, h: 0.1, dir: 'desce' },
      { fluid: 'óleo', gamma: 850 * g, h: 0.2, dir: 'desce' },
      { fluid: 'mercúrio', gamma: 13600 * g, h: 0.35, dir: 'sobe' },
    ]) / 1000,
  'a5-ex2': () =>
    F.manometerSum([
      { fluid: 'água', gamma: 10000, h: 0.25, dir: 'desce' },
      { fluid: 'mercúrio', gamma: 136000, h: 1, dir: 'desce' },
      { fluid: 'óleo', gamma: 8000, h: 0.8, dir: 'sobe' },
    ]) / 1000,
};

describe('exercícios: estrutura e resultados recalculados', () => {
  it('ids únicos e campos didáticos completos', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.hints.length, e.id).toBe(3);
      expect(e.result.length, e.id).toBeGreaterThan(3);
      expect(e.interpretation.length, e.id).toBeGreaterThan(10);
      expect(e.mistakes.length, e.id).toBeGreaterThan(0);
    }
  });
  it('unidades da resposta são válidas e incluem a unidade esperada', () => {
    for (const e of EXERCISES) {
      if (!e.answer) continue;
      expect(() => getUnit(e.answer!.unit)).not.toThrow();
      expect(e.answer.units, e.id).toContain(e.answer.unit);
      e.answer.units.forEach((u) => expect(() => getUnit(u)).not.toThrow());
    }
  });
  it('toda resposta numérica tem recálculo independente', () => {
    for (const e of EXERCISES) if (e.answer) expect(RECOMPUTE[e.id], e.id).toBeTypeOf('function');
  });
  for (const e of EXERCISES.filter((x) => x.answer)) {
    it(`${e.id}: resposta armazenada confere com o recálculo e é aceita pelo corretor`, () => {
      const a = e.answer!;
      const exact = RECOMPUTE[e.id]();
      const stored = toSI(a.value, a.unit);
      const exactSI = toSI(exact, a.unit);
      expect(Math.abs(stored - exactSI) / Math.abs(exactSI)).toBeLessThan(a.relTol ?? 0.01);
      expect(checkNumericAnswer(exact, a.unit, a).status).toBe('correto');
      if (exact !== 0) expect(checkNumericAnswer(-exact, a.unit, a).status).not.toBe('correto');
    });
  }
});
