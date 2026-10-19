import { describe, expect, it } from 'vitest';
import { CALCULATORS, defaults, getCalculator, runCalculator, type CalcOk } from './calculators';

function run(id: string, text: Record<string, string> = {}, units: Record<string, string> = {}, opt: Record<string, string> = {}) {
  const def = getCalculator(id)!;
  const d = defaults(def);
  return runCalculator(def, { ...d.text, ...text }, { ...d.units, ...units }, { ...d.opt, ...opt });
}
const ok = (r: ReturnType<typeof run>) => {
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r as CalcOk;
};
const val = (r: CalcOk, label: string) => r.results.find((x) => x.label.startsWith(label))!.value;

describe('calculadoras do laboratório', () => {
  it('todas rodam com os valores-padrão e mostram passos, resultado e significado', () => {
    for (const c of CALCULATORS) {
      const r = ok(run(c.id));
      expect(r.steps.length, c.id).toBeGreaterThan(1);
      expect(r.results.length, c.id).toBeGreaterThan(0);
      expect(r.meaning.length, c.id).toBeGreaterThan(10);
      r.results.forEach((x) => expect(Number.isFinite(x.value), c.id).toBe(true));
    }
  });
  it('peso: 120 kg na Lua = 194,4 N', () => {
    expect(val(ok(run('peso', { m: '120', g: '1,62' })), 'Peso')).toBeCloseTo(194.4, 6);
  });
  it('volume: converte cm e usa D/2; mostra a conversão', () => {
    const r = ok(run('volume', { dim: '80', h: '150', frac: '80' }, { dim: 'cm', h: 'cm' }));
    expect(val(r, 'Volume total')).toBeCloseTo(0.754, 3);
    expect(r.steps.some((s) => s.label === 'Converter')).toBe(true);
  });
  it('volume: rejeita preenchimento acima de 100%', () => {
    expect(run('volume', { frac: '120' }).ok).toBe(false);
  });
  it('calor: ΔT igual em °C e K; resfriamento negativo', () => {
    expect(val(ok(run('calor')), 'Calor')).toBeCloseTo(90000, 6);
    expect(val(ok(run('calor', { Ti: '298,15', Tf: '348,15' }, { Ti: 'K', Tf: 'K' })), 'Calor')).toBeCloseTo(90000, 6);
    expect(val(ok(run('calor', { Ti: '80', Tf: '20' })), 'Calor')).toBeLessThan(0);
  });
  it('trabalho: compressão 200 kPa 6→2 dm³ = −800 J', () => {
    const r = ok(run('trabalho'));
    expect(val(r, 'Trabalho')).toBeCloseTo(-800, 6);
    expect(r.meaning).toMatch(/COMPRESSÃO/);
  });
  it('1ª Lei: recebe 500 J e é comprimido com 200 J ⇒ +700 J e alerta do erro clássico', () => {
    const r = ok(run('primeira-lei'));
    expect(val(r, 'ΔU')).toBeCloseTo(700, 9);
    expect(r.warnings.join(' ')).toMatch(/Erro clássico/);
    expect(val(ok(run('primeira-lei', { Q: '4000', W: '3000' }, {}, { qdir: 'perde', wdir: 'pelo' })), 'ΔU')).toBeCloseTo(-7000, 9);
  });
  it('rendimento: 5 MW e 2 MW ⇒ 40% e Qf = 3 MW; mistura energia/potência é erro', () => {
    const r = ok(run('rendimento', { Qq: '5', W: '2' }, { Qq: 'MW', W: 'MW' }));
    expect(val(r, 'Rendimento')).toBeCloseTo(40, 9);
    expect(val(r, 'Calor rejeitado')).toBeCloseTo(3e6, 3);
    expect(run('rendimento', { Qq: '5', W: '2' }, { Qq: 'MW', W: 'MJ' }).ok).toBe(false);
    expect(run('rendimento', { Qq: '2', W: '5' }).ok).toBe(false);
  });
  it('Carnot: converte °C, alerta do erro em °C e testa viabilidade', () => {
    const r = ok(run('carnot'));
    expect(val(r, 'η de Carnot')).toBeCloseTo(49.99, 1);
    expect(r.warnings.join(' ')).toMatch(/ERRADO/);
    const imp = ok(run('carnot', { Tq: '800', Tf: '400', prop: '60', Qq: '' }, { Tq: 'K', Tf: 'K' }));
    expect(imp.meaning).toMatch(/IMPOSSÍVEL/);
    const real = ok(run('carnot', { Tq: '600', Tf: '300', frac: '75', Qq: '' }, { Tq: 'K', Tf: 'K' }));
    expect(val(real, 'η real')).toBeCloseTo(37.5, 9);
    expect(run('carnot', { Tq: '20', Tf: '30' }).ok).toBe(false);
    expect(run('carnot', { Tq: '-300' }).ok).toBe(false);
  });
  it('propriedades: três modos', () => {
    expect(val(ok(run('propriedades')), 'Peso específico γ')).toBeCloseTo(8534.7, 3);
    const d = ok(run('propriedades', { d: '0,82', g: '10' }, {}, { modo: 'd' }));
    expect(val(d, 'Peso específico γ')).toBeCloseTo(8200, 6);
  });
  it('viscosidade: μ → ν e ν → μ', () => {
    expect(val(ok(run('viscosidade')), 'Viscosidade cinemática')).toBeCloseTo(5e-5, 12);
    expect(val(ok(run('viscosidade', { rho: '850' }, {}, { modo: 'mu' })), 'Viscosidade dinâmica')).toBeCloseTo(0.153, 9);
  });
  it('cisalhamento: guia linear (e em mm)', () => {
    const r = ok(run('cisalhamento'));
    expect(val(r, 'Força')).toBeCloseTo(19.2, 6);
    expect(val(r, 'Potência')).toBeCloseTo(7.68, 6);
    expect(run('cisalhamento', { e: '0' }).ok).toBe(false);
  });
  it('Stevin: 5 m de água com γ = 10 000 ⇒ 50 kPa', () => {
    expect(val(ok(run('stevin', { gamma: '10000' }, {}, { modo: 'gamma' })), 'Pressão manométrica')).toBeCloseTo(50, 9);
  });
  it('validação: vazio, texto e negativo', () => {
    expect(run('peso', { m: '' }).ok).toBe(false);
    expect(run('peso', { m: 'abc' }).ok).toBe(false);
    const neg = run('peso', { m: '-5' });
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.errors[0]).toMatch(/negativo/);
  });
});

describe('calculadoras: descrição, casos-limite e novas fórmulas', () => {
  it('toda calculadora descreve o fenômeno e as condições de uso', () => {
    for (const c of CALCULATORS) {
      expect(c.about.length, c.id).toBeGreaterThan(20);
      expect(c.conditions.length, c.id).toBeGreaterThan(20);
    }
  });
  it('entrada obrigatória vazia, texto inválido ou valor não finito viram mensagem de erro (nunca exceção)', () => {
    for (const c of CALCULATORS) {
      const d = defaults(c);
      for (const inp of c.inputs.filter((i) => !i.optional && (!i.showIf || i.showIf(d.opt)))) {
        for (const bad of ['', 'abc', '1e400', '--2']) {
          const r = runCalculator(c, { ...d.text, [inp.key]: bad }, d.units, d.opt);
          expect(r.ok, `${c.id}.${inp.key} = "${bad}"`).toBe(false);
          if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
        }
      }
    }
  });
  it('todas as unidades oferecidas geram passos legíveis (sem “undefined” na conversão)', () => {
    for (const c of CALCULATORS) {
      const d = defaults(c);
      for (const inp of c.inputs) {
        for (const u of inp.units) {
          const r = runCalculator(c, d.text, { ...d.units, [inp.key]: u }, d.opt);
          if (r.ok) r.steps.forEach((s) => expect(s.text, `${c.id}.${inp.key} [${u}]`).not.toContain('undefined'));
        }
      }
    }
  });
  it('rendimento: trabalho maior que o calor recebido é rejeitado; Carnot exige Tq > Tf', () => {
    expect(run('rendimento', { Qq: '2', W: '5' }).ok).toBe(false);
    expect(run('carnot', { Tq: '20', Tf: '80' }).ok).toBe(false);
    expect(run('carnot', { Tq: '-300' }).ok).toBe(false);
  });
  it('alerta valores fisicamente suspeitos sem bloquear o cálculo', () => {
    const r = ok(run('massa', { rho: '30000' }));
    expect(r.warnings.some((w) => w.includes('ósmio'))).toBe(true);
    expect(ok(run('cisalhamento', { e: '25' })).warnings.some((w) => w.includes('FINA'))).toBe(true);
    expect(ok(run('massa')).warnings.some((w) => w.includes('ósmio'))).toBe(false);
  });
  it('prensa hidráulica (lista de revisão Q13): F2 = 36 × 360 N; curso inversamente proporcional', () => {
    const r = ok(run('pascal'));
    expect(val(r, 'Força no êmbolo de saída')).toBeCloseTo(12960, 6);
    expect(val(r, 'Razão das áreas')).toBeCloseTo(36, 9);
    expect(val(r, 'Pressão transmitida')).toBeCloseTo(360 / (Math.PI * 0.032 ** 2 / 4) / 1000, 6);
    const s = ok(run('pascal', { s1: '36' }));
    expect(val(s, 'Curso do êmbolo de saída')).toBeCloseTo(1, 9);
    expect(ok(run('pascal', { F1: '0,36' }, { F1: 'kN' })).steps[0].text).toContain('N');
  });
  it('cilindro hidráulico (lista de revisão Q14): força teórica, útil e verificação da força exigida', () => {
    const r = ok(run('cilindro-hidr'));
    expect(val(r, 'Força teórica')).toBeCloseTo((5.5e6 * Math.PI * 0.07 ** 2) / 4 / 1000, 6);
    expect(val(r, 'Força útil')).toBeCloseTo((0.88 * 5.5e6 * Math.PI * 0.07 ** 2) / 4 / 1000, 6);
    expect(r.meaning).toContain('NÃO atende');
    expect(val(r, 'Pressão mínima')).toBeCloseTo(20000 / (0.88 * (Math.PI * 0.07 ** 2) / 4) / 1e6, 6);
    expect(run('cilindro-hidr', { perdas: '100' }).ok).toBe(false);
  });
});

