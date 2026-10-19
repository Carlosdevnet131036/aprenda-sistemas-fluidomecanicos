// Definições das calculadoras do Laboratório de Fórmulas. Cada uma recebe
// valores já convertidos para o SI e devolve os passos da resolução, os
// resultados com unidade, o significado físico e alertas. A interface é
// genérica (src/components/Calculator.tsx).
import type { ModuleId } from '../content/types';
import * as F from './physics';
import { PhysicsError } from './physics';
import { fmt, getUnit, parseNumber, toSI } from './units';

export interface CalcInput {
  key: string;
  label: string;
  sym: string;
  units: string[]; // ids; o primeiro é o padrão
  default: string;
  allowNegative?: boolean;
  allowZero?: boolean;
  optional?: boolean;
  help?: string;
  presets?: { label: string; value: string }[];
  showIf?: (opt: Record<string, string>) => boolean;
}

export interface CalcSelect {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  default: string;
}

export interface CalcStep {
  label: string;
  text: string;
}

export interface CalcResult {
  label: string;
  value: number;
  unit: string; // texto exibido
  sig?: number;
}

export interface CalcOk {
  ok: true;
  steps: CalcStep[];
  results: CalcResult[];
  meaning: string;
  warnings: string[];
}
export interface CalcErr {
  ok: false;
  errors: string[];
}
export type CalcOutput = CalcOk | CalcErr;

export interface CalcContext {
  v: Record<string, number>; // SI
  has: (k: string) => boolean;
  raw: Record<string, { value: number; unit: string }>;
  opt: Record<string, string>;
}

export interface CalculatorDef {
  id: string;
  title: string;
  module: ModuleId;
  section: string;
  summary: string;
  /** o fenômeno físico, em linguagem simples */
  about: string;
  /** hipóteses e condições de uso (e formas equivalentes da equação) */
  conditions: string;
  tex: string;
  inputs: CalcInput[];
  selects?: CalcSelect[];
  compute: (c: CalcContext) => Omit<CalcOk, 'ok'>;
}

const n = (x: number, sig = 4) => fmt(x, sig);

// Limites de plausibilidade: acima deles o valor quase certamente tem erro de
// digitação ou de unidade. O ósmio, substância mais densa conhecida, tem
// ρ ≈ 22 600 kg/m³.
const SUSPICIOUS_RHO = 22_600;
const SUSPICIOUS_GAMMA = SUSPICIOUS_RHO * F.G_EARTH;
const SUSPICIOUS_RHO_MSG = 'Massa específica acima da de qualquer substância conhecida (ósmio ≈ 22 600 kg/m³): confira o valor e a unidade.';
const SI_LABEL: Record<string, string> = {
  comprimento: 'm',
  area: 'm²',
  volume: 'm³',
  massa: 'kg',
  forca: 'N',
  pressao: 'Pa',
  energia: 'J',
  potencia: 'W',
  viscDinamica: 'Pa·s',
  viscCinematica: 'm²/s',
  massaEspecifica: 'kg/m³',
  pesoEspecifico: 'N/m³',
  razao: '',
  temperatura: 'K',
};

/** Valida o texto digitado, converte para o SI e executa a calculadora. */
export function runCalculator(
  def: CalculatorDef,
  text: Record<string, string>,
  units: Record<string, string>,
  opt: Record<string, string>,
): CalcOutput {
  const errors: string[] = [];
  const v: Record<string, number> = {};
  const raw: Record<string, { value: number; unit: string }> = {};
  const conversions: CalcStep[] = [];
  for (const inp of def.inputs) {
    if (inp.showIf && !inp.showIf(opt)) continue;
    const t = text[inp.key] ?? '';
    const x = parseNumber(t);
    if (x === null) {
      if (t.trim() === '' && inp.optional) continue;
      errors.push(t.trim() === '' ? `Preencha “${inp.label}”.` : `“${inp.label}” não é um número válido.`);
      continue;
    }
    if (!inp.allowNegative && x < 0) errors.push(`“${inp.label}” não pode ser negativo.`);
    if (!inp.allowZero && x === 0) errors.push(`“${inp.label}” precisa ser diferente de zero.`);
    const unit = units[inp.key] ?? inp.units[0];
    const u = getUnit(unit);
    let si: number;
    try {
      si = toSI(x, unit);
    } catch (e) {
      errors.push((e as Error).message);
      continue;
    }
    if (u.dim === 'temperatura' && si < 0) errors.push(`“${inp.label}” está abaixo do zero absoluto.`);
    v[inp.key] = si;
    raw[inp.key] = { value: x, unit };
    const siLabel = SI_LABEL[u.dim];
    if (u.factor !== 1 || (u.dim === 'temperatura' && unit === 'C')) {
      if (u.dim !== 'temperatura' && u.dim !== 'razao') {
        conversions.push({ label: 'Converter', text: `${inp.sym} = ${n(x, 6)} ${u.label} = ${n(si, 6)} ${siLabel}` });
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  try {
    const out = def.compute({ v, raw, opt, has: (k) => k in v });
    return { ok: true, ...out, steps: [...conversions, ...out.steps] };
  } catch (e) {
    if (e instanceof PhysicsError || e instanceof Error) return { ok: false, errors: [e.message] };
    throw e;
  }
}

const G_PRESETS = [
  { label: 'Terra 9,81', value: '9,81' },
  { label: 'g = 10', value: '10' },
  { label: 'Lua 1,62', value: '1,62' },
];
const gInput: CalcInput = { key: 'g', label: 'Aceleração da gravidade', sym: 'g', units: ['m/s2'], default: '9,81', presets: G_PRESETS };
const LEN = ['m', 'cm', 'mm'];
const VOL = ['m3', 'L', 'dm3', 'cm3'];
const ENERGY_OR_POWER = ['kW', 'MW', 'W', 'kJ', 'MJ', 'J'];

export const CALCULATORS: CalculatorDef[] = [
  {
    id: 'peso', title: 'Peso', module: 'm1', section: 'formula-peso',
    summary: 'Força com que a gravidade puxa uma massa.',
    about: 'A Terra (ou outro astro) atrai toda massa com uma força proporcional a ela: o peso.',
    conditions: 'g é a aceleração da gravidade local: 9,81 m/s² na Terra (ou 10, se a questão mandar) e 1,62 m/s² na Lua. A massa não muda de lugar para lugar; só o peso muda.',
    tex: String.raw`P = m \cdot g`,
    inputs: [{ key: 'm', label: 'Massa', sym: 'm', units: ['kg', 'g', 't'], default: '120', allowZero: true }, gInput],
    compute: ({ v }) => {
      const P = F.weight(v.m, v.g);
      return {
        steps: [
          { label: 'Equação', text: 'P = m · g' },
          { label: 'Substituição', text: `P = ${n(v.m, 6)} kg × ${n(v.g, 4)} m/s²` },
          { label: 'Cálculo', text: `P = ${n(P, 6)} N` },
        ],
        results: [{ label: 'Peso P', value: P, unit: 'N', sig: 6 }],
        meaning: `A gravidade puxa o corpo com ${n(P, 5)} N. A massa (${n(v.m, 5)} kg) é a mesma em qualquer lugar; só o peso depende de g.`,
        warnings: [
          'O peso é uma força: a unidade é N, nunca kg.',
          ...(v.g < 2 ? ['Com g da Lua, o peso é cerca de 6× menor que na Terra — mas a massa não muda.'] : []),
        ],
      };
    },
  },
  {
    id: 'volume', title: 'Volume de cilindro', module: 'm1', section: 'volume',
    summary: 'Tanques e eixos cilíndricos, com fração de preenchimento.',
    about: 'O volume de um cilindro é a área do círculo da base (π·r²) multiplicada pela altura.',
    conditions: 'V = π·r²·h usa o RAIO; a forma equivalente V = π·D²·h/4 usa o diâmetro. Use as dimensões internas; a fração de preenchimento multiplica o volume total.',
    tex: String.raw`V = \pi r^2 h,\quad r = D/2`,
    selects: [{ key: 'medida', label: 'Medida informada', default: 'D', options: [{ value: 'D', label: 'Diâmetro (D)' }, { value: 'r', label: 'Raio (r)' }] }],
    inputs: [
      { key: 'dim', label: 'Diâmetro ou raio interno', sym: 'D ou r', units: LEN, default: '0,80' },
      { key: 'h', label: 'Altura', sym: 'h', units: LEN, default: '1,50' },
      { key: 'frac', label: 'Preenchimento', sym: 'fração', units: ['%'], default: '80', help: '100% = cheio' },
    ],
    compute: ({ v, opt }) => {
      const r = opt.medida === 'r' ? v.dim : v.dim / 2;
      if (v.frac > 1) throw new PhysicsError('O preenchimento não pode passar de 100%.');
      const V = F.cylinderVolume(r, v.h);
      const Vu = F.filledVolume(V, v.frac);
      return {
        steps: [
          ...(opt.medida === 'D' ? [{ label: 'Raio', text: `r = D/2 = ${n(v.dim, 6)} / 2 = ${n(r, 6)} m` }] : []),
          { label: 'Equação', text: 'V = π · r² · h' },
          { label: 'Substituição', text: `V = 3,1416 × (${n(r, 6)})² × ${n(v.h, 6)} = 3,1416 × ${n(r * r, 6)} × ${n(v.h, 6)}` },
          { label: 'Cálculo', text: `V = ${n(V, 5)} m³ = ${n(V * 1000, 5)} L` },
          { label: 'Fração', text: `Vútil = ${n(v.frac, 4)} × ${n(V, 5)} = ${n(Vu, 5)} m³ = ${n(Vu * 1000, 5)} L` },
        ],
        results: [
          { label: 'Volume total', value: V, unit: 'm³' },
          { label: 'Capacidade total', value: V * 1000, unit: 'L' },
          { label: 'Volume ocupado', value: Vu, unit: 'm³' },
          { label: 'Volume ocupado', value: Vu * 1000, unit: 'L' },
        ],
        meaning: `Cabem ${n(V * 1000, 4)} L no cilindro; com ${n(v.frac * 100, 3)}% de preenchimento há ${n(Vu * 1000, 4)} L de fluido.`,
        warnings: [
          opt.medida === 'D'
            ? `Se você tivesse usado o diâmetro como raio, obteria ${n(4 * V, 4)} m³ — 4× mais. Use sempre r = D/2.`
            : 'Confirme que o valor informado é mesmo o raio (metade do diâmetro).',
          'Use as dimensões internas do reservatório.',
        ],
      };
    },
  },
  {
    id: 'volume-caixa', title: 'Volume de paralelepípedo', module: 'm1', section: 'volume',
    summary: 'Reservatórios em forma de caixa, com fração de preenchimento.',
    about: 'O volume de uma caixa retangular é comprimento × largura × altura.',
    conditions: 'Converta todas as medidas para metros antes de multiplicar e use as dimensões internas do reservatório.',
    tex: String.raw`V = a \cdot b \cdot c`,
    inputs: [
      { key: 'a', label: 'Comprimento', sym: 'a', units: ['cm', 'm', 'mm'], default: '50' },
      { key: 'b', label: 'Largura', sym: 'b', units: ['cm', 'm', 'mm'], default: '30' },
      { key: 'c', label: 'Altura', sym: 'c', units: ['cm', 'm', 'mm'], default: '40' },
      { key: 'frac', label: 'Preenchimento', sym: 'fração', units: ['%'], default: '75' },
    ],
    compute: ({ v }) => {
      if (v.frac > 1) throw new PhysicsError('O preenchimento não pode passar de 100%.');
      const V = F.boxVolume(v.a, v.b, v.c);
      const Vu = F.filledVolume(V, v.frac);
      return {
        steps: [
          { label: 'Equação', text: 'V = a · b · c' },
          { label: 'Substituição', text: `V = ${n(v.a, 5)} × ${n(v.b, 5)} × ${n(v.c, 5)}` },
          { label: 'Cálculo', text: `V = ${n(V, 5)} m³ = ${n(V * 1000, 5)} L` },
          { label: 'Fração', text: `Vútil = ${n(v.frac, 4)} × ${n(V, 5)} = ${n(Vu, 5)} m³ = ${n(Vu * 1000, 5)} L` },
        ],
        results: [
          { label: 'Volume total', value: V, unit: 'm³' },
          { label: 'Capacidade', value: V * 1000, unit: 'L' },
          { label: 'Volume ocupado', value: Vu * 1000, unit: 'L' },
        ],
        meaning: `A caixa comporta ${n(V * 1000, 4)} L; preenchida a ${n(v.frac * 100, 3)}% contém ${n(Vu * 1000, 4)} L.`,
        warnings: ['Converta cm → m (÷100) antes de multiplicar: 50 × 30 × 40 em cm dá cm³, não m³.'],
      };
    },
  },
  {
    id: 'massa', title: 'Massa a partir de ρ e V', module: 'm1', section: 'densidade',
    summary: 'Quanto pesa o fluido que ocupa um volume.',
    about: 'A massa específica ρ diz quantos quilogramas de fluido há em cada metro cúbico.',
    conditions: 'Use o volume realmente ocupado pelo fluido (já com a fração de preenchimento). O peso usa P = m·g com o g informado.',
    tex: String.raw`m = \rho \cdot V`,
    inputs: [
      { key: 'rho', label: 'Massa específica', sym: 'ρ', units: ['kg/m3', 'g/cm3'], default: '850' },
      { key: 'V', label: 'Volume ocupado', sym: 'V', units: VOL, default: '0,6032', allowZero: true },
      gInput,
    ],
    compute: ({ v }) => {
      const m = F.massFromDensity(v.rho, v.V);
      const P = F.weight(m, v.g);
      return {
        steps: [
          { label: 'Equação', text: 'm = ρ · V' },
          { label: 'Substituição', text: `m = ${n(v.rho, 5)} kg/m³ × ${n(v.V, 5)} m³` },
          { label: 'Cálculo', text: `m = ${n(m, 5)} kg` },
          { label: 'Peso', text: `P = m · g = ${n(m, 5)} × ${n(v.g, 3)} = ${n(P, 5)} N` },
        ],
        results: [
          { label: 'Massa', value: m, unit: 'kg' },
          { label: 'Peso', value: P, unit: 'N' },
        ],
        meaning: `Cada m³ desse fluido tem ${n(v.rho, 4)} kg; o volume informado tem ${n(m, 4)} kg, que pesam ${n(P, 4)} N.`,
        warnings: [
          'Se o volume estiver em litros, ele precisa virar m³ (÷1000) — a calculadora faz isso, mas na prova é você quem converte.',
          ...(v.rho > SUSPICIOUS_RHO ? [SUSPICIOUS_RHO_MSG] : []),
        ],
      };
    },
  },
  {
    id: 'calor', title: 'Calor sensível', module: 'm2', section: 'calor',
    summary: 'Calor para aquecer ou esfriar um corpo.',
    about: 'Calor sensível: energia trocada quando a temperatura de um corpo muda, sem mudança de fase.',
    conditions: 'Vale sem mudança de estado físico e com c praticamente constante na faixa de temperatura. ΔT tem o mesmo valor em °C e em K.',
    tex: String.raw`Q = m \cdot c \cdot \Delta T`,
    inputs: [
      { key: 'm', label: 'Massa', sym: 'm', units: ['kg', 'g'], default: '2,0' },
      { key: 'c', label: 'Calor específico', sym: 'c', units: ['J/kgC'], default: '900' },
      { key: 'Ti', label: 'Temperatura inicial', sym: 'Ti', units: ['C', 'K'], default: '25', allowNegative: true, allowZero: true },
      { key: 'Tf', label: 'Temperatura final', sym: 'Tf', units: ['C', 'K'], default: '75', allowNegative: true, allowZero: true },
    ],
    compute: ({ v, raw }) => {
      const dT = v.Tf - v.Ti; // ambos em K: a diferença é a mesma em °C
      const Q = F.sensibleHeat(v.m, v.c, v.Ti, v.Tf);
      const sameUnit = raw.Ti.unit === raw.Tf.unit;
      return {
        steps: [
          { label: 'ΔT', text: sameUnit ? `ΔT = ${n(raw.Tf.value, 5)} − ${n(raw.Ti.value, 5)} = ${n(dT, 5)} (°C ou K, é o mesmo número)` : `Temperaturas em escalas diferentes: convertidas para K → ΔT = ${n(dT, 5)} K` },
          { label: 'Equação', text: 'Q = m · c · ΔT' },
          { label: 'Substituição', text: `Q = ${n(v.m, 5)} × ${n(v.c, 5)} × ${n(dT, 5)}` },
          { label: 'Cálculo', text: `Q = ${n(Q, 6)} J = ${n(Q / 1000, 5)} kJ` },
        ],
        results: [
          { label: 'Calor Q', value: Q, unit: 'J', sig: 6 },
          { label: 'Calor Q', value: Q / 1000, unit: 'kJ' },
        ],
        meaning: Q > 0 ? `Q positivo: o corpo RECEBE ${n(Q, 5)} J de calor (aquece).` : Q < 0 ? `Q negativo: o corpo PERDE ${n(-Q, 5)} J de calor (esfria).` : 'ΔT = 0: não houve troca de calor sensível.',
        warnings: ['Não some 273,15 ao ΔT: uma variação de temperatura tem o mesmo valor em °C e em K.', 'A massa precisa estar em kg (200 g = 0,200 kg).'],
      };
    },
  },
  {
    id: 'trabalho', title: 'Trabalho a pressão constante', module: 'm2', section: 'trabalho',
    summary: 'Trabalho de expansão ou compressão isobárica.',
    about: 'Ao se expandir, um gás empurra a fronteira (o pistão) e transfere energia na forma de trabalho.',
    conditions: 'Só vale com pressão constante durante todo o processo (isobárico). Em outros processos, W é a área sob a curva no diagrama p–V.',
    tex: String.raw`W = p \cdot (V_f - V_i)`,
    inputs: [
      { key: 'p', label: 'Pressão (constante)', sym: 'p', units: ['kPa', 'Pa', 'MPa', 'bar'], default: '200', allowZero: true },
      { key: 'Vi', label: 'Volume inicial', sym: 'Vi', units: ['dm3', 'L', 'm3', 'cm3'], default: '6', allowZero: true },
      { key: 'Vf', label: 'Volume final', sym: 'Vf', units: ['dm3', 'L', 'm3', 'cm3'], default: '2', allowZero: true },
    ],
    compute: ({ v }) => {
      const dV = v.Vf - v.Vi;
      const W = F.isobaricWork(v.p, v.Vi, v.Vf);
      return {
        steps: [
          { label: 'ΔV', text: `ΔV = Vf − Vi = ${n(v.Vf, 5)} − ${n(v.Vi, 5)} = ${n(dV, 5)} m³` },
          { label: 'Equação', text: 'W = p · ΔV' },
          { label: 'Substituição', text: `W = ${n(v.p, 5)} Pa × (${n(dV, 5)} m³)` },
          { label: 'Cálculo', text: `W = ${n(W, 6)} J` },
        ],
        results: [{ label: 'Trabalho W', value: W, unit: 'J', sig: 6 }],
        meaning: W > 0 ? 'W positivo: EXPANSÃO — o trabalho é feito PELO gás.' : W < 0 ? 'W negativo: COMPRESSÃO — o trabalho é feito SOBRE o gás.' : 'ΔV = 0: volume constante, não há trabalho (W = 0).',
        warnings: ['L e dm³ → m³: divida por 1000. kPa → Pa: multiplique por 1000. Esquecer dá resultado 1000× errado.'],
      };
    },
  },
  {
    id: 'primeira-lei', title: '1ª Lei da Termodinâmica', module: 'm2', section: 'primeira-lei',
    summary: 'Escolha o que acontece com o gás e veja os sinais.',
    about: 'Conservação da energia num sistema fechado: a energia interna varia com o calor recebido menos o trabalho feito pelo sistema.',
    conditions: 'Convenção do material: Q > 0 quando o sistema recebe calor e W > 0 quando o trabalho é feito PELO sistema. Livros que escrevem ΔU = Q + W tratam como positivo o trabalho feito SOBRE o sistema — mesma física, outro sinal.',
    tex: String.raw`\Delta U = Q - W`,
    selects: [
      { key: 'qdir', label: 'O sistema…', default: 'recebe', options: [{ value: 'recebe', label: 'recebe calor (Q > 0)' }, { value: 'perde', label: 'perde/libera calor (Q < 0)' }] },
      { key: 'wdir', label: 'O trabalho é…', default: 'sobre', options: [{ value: 'pelo', label: 'feito PELO sistema — expansão (W > 0)' }, { value: 'sobre', label: 'feito SOBRE o sistema — compressão (W < 0)' }] },
    ],
    inputs: [
      { key: 'Q', label: 'Quantidade de calor (sem sinal)', sym: '|Q|', units: ['J', 'kJ', 'cal'], default: '500', allowZero: true },
      { key: 'W', label: 'Quantidade de trabalho (sem sinal)', sym: '|W|', units: ['J', 'kJ'], default: '200', allowZero: true },
    ],
    compute: ({ v, opt }) => {
      const Q = opt.qdir === 'perde' ? -v.Q : v.Q;
      const W = opt.wdir === 'sobre' ? -v.W : v.W;
      const dU = F.firstLawDeltaU(Q, W);
      return {
        steps: [
          { label: 'Sinal de Q', text: `${opt.qdir === 'perde' ? 'Perde calor' : 'Recebe calor'} ⇒ Q = ${n(Q, 6)} J` },
          { label: 'Sinal de W', text: `${opt.wdir === 'sobre' ? 'Trabalho sobre o sistema (compressão)' : 'Trabalho pelo sistema (expansão)'} ⇒ W = ${n(W, 6)} J` },
          { label: 'Equação', text: 'ΔU = Q − W' },
          { label: 'Substituição', text: `ΔU = ${n(Q, 6)} − (${n(W, 6)})` },
          { label: 'Cálculo', text: `ΔU = ${n(dU, 6)} J` },
        ],
        results: [{ label: 'ΔU', value: dU, unit: 'J', sig: 6 }],
        meaning: dU > 0 ? 'ΔU positivo: a energia interna aumenta — a temperatura do gás sobe.' : dU < 0 ? 'ΔU negativo: a energia interna diminui — o gás esfria.' : 'ΔU = 0: a energia interna não muda (como numa isotérmica).',
        warnings:
          opt.wdir === 'sobre' && v.W > 0
            ? [`Erro clássico: fazer ${n(Q, 5)} − ${n(v.W, 5)} = ${n(Q - v.W, 5)} J. Trabalho recebido é negativo, e menos com menos vira soma.`]
            : ['Convenção do material: W > 0 é trabalho feito PELO sistema.'],
      };
    },
  },
  {
    id: 'rendimento', title: 'Rendimento de máquina térmica', module: 'm3', section: 'maquina',
    summary: 'A partir do calor recebido e do trabalho produzido.',
    about: 'Uma máquina térmica em ciclo recebe calor de uma fonte quente, transforma parte em trabalho e rejeita o resto a uma fonte fria.',
    conditions: 'Vale para máquinas em ciclo (ΔU = 0 no ciclo). Qq e W devem estar ambos em energia (J) ou ambos em potência (W).',
    tex: String.raw`\eta = \dfrac{W}{Q_q},\quad Q_f = Q_q - W`,
    inputs: [
      { key: 'Qq', label: 'Calor recebido (fonte quente)', sym: 'Qq', units: ENERGY_OR_POWER, default: '5' },
      { key: 'W', label: 'Trabalho (ou potência) produzido', sym: 'W', units: ENERGY_OR_POWER, default: '2', allowZero: true },
    ],
    compute: ({ v, raw }) => {
      const dq = getUnit(raw.Qq.unit).dim;
      if (dq !== getUnit(raw.W.unit).dim) throw new PhysicsError('Use as duas grandezas como energia (J) ou as duas como potência (W).');
      const eta = F.engineEfficiency(v.W, v.Qq);
      const Qf = F.rejectedHeat(v.Qq, v.W);
      const u = dq === 'potencia' ? 'W' : 'J';
      return {
        steps: [
          { label: 'Equação', text: 'η = W / Qq' },
          { label: 'Substituição', text: `η = ${n(v.W, 5)} / ${n(v.Qq, 5)}` },
          { label: 'Cálculo', text: `η = ${n(eta, 4)} = ${n(eta * 100, 4)}%` },
          { label: 'Balanço', text: `Qf = Qq − W = ${n(v.Qq, 5)} − ${n(v.W, 5)} = ${n(Qf, 5)} ${u}` },
        ],
        results: [
          { label: 'Rendimento η', value: eta * 100, unit: '%' },
          { label: 'Calor rejeitado Qf', value: Qf, unit: u },
        ],
        meaning: `De cada 100 unidades de calor recebidas, ${n(eta * 100, 3)} viram trabalho e ${n((1 - eta) * 100, 3)} são rejeitadas ao reservatório frio.`,
        warnings: ['Não confunda W (trabalho) com Qf (calor rejeitado).', 'Pela 2ª Lei, η nunca chega a 100%; compare com o limite de Carnot.'],
      };
    },
  },
  {
    id: 'carnot', title: 'Rendimento máximo de Carnot', module: 'm3', section: 'carnot',
    summary: 'Com conversão °C → K, fração de Carnot e teste de viabilidade.',
    about: 'O ciclo de Carnot, ideal e reversível, dá o maior rendimento possível entre duas temperaturas.',
    conditions: 'Temperaturas obrigatoriamente em kelvin, com Tq > Tf. Máquinas reais ficam abaixo desse limite; a “fração de Carnot” aplica esse desconto.',
    tex: String.raw`\eta_C = 1 - \dfrac{T_f}{T_q}\ \ (T\ \text{em K})`,
    inputs: [
      { key: 'Tq', label: 'Temperatura da fonte quente', sym: 'Tq', units: ['C', 'K'], default: '327', allowNegative: true, allowZero: true },
      { key: 'Tf', label: 'Temperatura da fonte fria', sym: 'Tf', units: ['C', 'K'], default: '27', allowNegative: true, allowZero: true },
      { key: 'Qq', label: 'Calor recebido Qq (opcional)', sym: 'Qq', units: ENERGY_OR_POWER, default: '10', optional: true },
      { key: 'frac', label: 'Fração de Carnot atingida (opcional)', sym: 'fração', units: ['%'], default: '', optional: true, help: 'Ex.: 75 para “75% da eficiência de Carnot”' },
      { key: 'prop', label: 'Rendimento anunciado para testar (opcional)', sym: 'η?', units: ['%'], default: '', optional: true, allowZero: true },
    ],
    compute: ({ v, raw, has }) => {
      const steps: CalcStep[] = [];
      const warnings: string[] = [];
      for (const k of ['Tq', 'Tf'] as const) {
        if (raw[k].unit === 'C') steps.push({ label: 'Converter', text: `${k} = ${n(raw[k].value, 6)} + 273,15 = ${n(v[k], 6)} K` });
      }
      const etaC = F.carnotEfficiency(v.Tq, v.Tf);
      steps.push({ label: 'Equação', text: 'ηC = 1 − Tf/Tq' });
      steps.push({ label: 'Cálculo', text: `ηC = 1 − ${n(v.Tf, 6)}/${n(v.Tq, 6)} = 1 − ${n(v.Tf / v.Tq, 4)} = ${n(etaC, 4)}` });
      const results: CalcResult[] = [{ label: 'η de Carnot', value: etaC * 100, unit: '%' }];
      let eta = etaC;
      if (has('frac')) {
        if (v.frac > 1) throw new PhysicsError('A fração de Carnot não pode passar de 100%.');
        eta = v.frac * etaC;
        steps.push({ label: 'Real', text: `ηreal = ${n(v.frac, 4)} × ${n(etaC, 4)} = ${n(eta, 4)}` });
        results.push({ label: 'η real', value: eta * 100, unit: '%' });
      }
      if (has('Qq')) {
        const u = getUnit(raw.Qq.unit);
        const unitOut = u.dim === 'potencia' ? 'W' : 'J';
        const W = F.workFromEfficiency(eta, v.Qq);
        const Qf = v.Qq - W;
        steps.push({ label: 'Trabalho', text: `W = η · Qq = ${n(eta, 4)} × ${n(v.Qq, 5)} = ${n(W, 5)} ${unitOut}` });
        steps.push({ label: 'Rejeitado', text: `Qf = Qq − W = ${n(v.Qq, 5)} − ${n(W, 5)} = ${n(Qf, 5)} ${unitOut}` });
        results.push({ label: 'Trabalho W', value: W, unit: unitOut }, { label: 'Calor rejeitado Qf', value: Qf, unit: unitOut });
      }
      if (raw.Tq.unit === 'C' && raw.Tf.unit === 'C' && raw.Tq.value > 0 && raw.Tf.value >= 0 && raw.Tq.value > raw.Tf.value) {
        warnings.push(`Se você usasse °C: 1 − ${n(raw.Tf.value, 5)}/${n(raw.Tq.value, 5)} = ${n((1 - raw.Tf.value / raw.Tq.value) * 100, 4)}% — resultado ERRADO. Sempre kelvin!`);
      }
      warnings.push('A eficiência de Carnot depende só das temperaturas, não do fluido nem da vazão.');
      let meaning = `Nenhuma máquina operando entre essas temperaturas pode ter rendimento acima de ${n(etaC * 100, 4)}%.`;
      if (has('prop')) {
        const ok = F.isEngineFeasible(v.prop, v.Tq, v.Tf);
        steps.push({ label: 'Viabilidade', text: `${n(v.prop * 100, 4)}% ${ok ? '≤' : '>'} ${n(etaC * 100, 4)}%` });
        meaning += ok ? ` O rendimento anunciado (${n(v.prop * 100, 4)}%) é possível.` : ` O rendimento anunciado (${n(v.prop * 100, 4)}%) é IMPOSSÍVEL: supera o limite de Carnot.`;
      }
      return { steps, results, meaning, warnings };
    },
  },
  {
    id: 'propriedades', title: 'ρ, d, γ e γr', module: 'm4', section: 'propriedades',
    summary: 'Propriedades estáticas de um fluido.',
    about: 'Massa específica (massa por volume), densidade relativa (comparação com a água) e peso específico (peso por volume).',
    conditions: 'Referência: água com ρ = 1000 kg/m³. Use o g indicado na questão. d e γr são adimensionais e têm o mesmo valor.',
    tex: String.raw`\begin{gathered} \rho = \tfrac{m}{V},\ d = \tfrac{\rho}{1000} \\ \gamma = \rho g,\ \gamma_r = \tfrac{\gamma}{\gamma_{água}} \end{gathered}`,
    selects: [{ key: 'modo', label: 'Dado conhecido', default: 'mV', options: [{ value: 'mV', label: 'Massa e volume' }, { value: 'rho', label: 'Massa específica ρ' }, { value: 'd', label: 'Densidade relativa d' }] }],
    inputs: [
      { key: 'm', label: 'Massa', sym: 'm', units: ['kg', 'g'], default: '348', showIf: (o) => o.modo === 'mV' },
      { key: 'V', label: 'Volume', sym: 'V', units: VOL, default: '0,400', showIf: (o) => o.modo === 'mV' },
      { key: 'rho', label: 'Massa específica', sym: 'ρ', units: ['kg/m3', 'g/cm3'], default: '870', showIf: (o) => o.modo === 'rho' },
      { key: 'd', label: 'Densidade relativa', sym: 'd', units: ['-'], default: '0,82', showIf: (o) => o.modo === 'd' },
      gInput,
    ],
    compute: ({ v, opt }) => {
      const steps: CalcStep[] = [];
      let rho: number;
      if (opt.modo === 'mV') {
        rho = F.density(v.m, v.V);
        steps.push({ label: 'ρ', text: `ρ = m/V = ${n(v.m, 5)} / ${n(v.V, 5)} = ${n(rho, 5)} kg/m³` });
      } else if (opt.modo === 'rho') {
        rho = v.rho;
      } else {
        rho = v.d * 1000;
        steps.push({ label: 'ρ', text: `ρ = d × ρágua = ${n(v.d, 4)} × 1000 = ${n(rho, 5)} kg/m³` });
      }
      const d = F.relativeDensity(rho);
      const gamma = F.specificWeight(rho, v.g);
      const gw = F.specificWeight(1000, v.g);
      const gr = F.relativeSpecificWeight(gamma, gw);
      steps.push(
        { label: 'd', text: `d = ρ/ρágua = ${n(rho, 5)}/1000 = ${n(d, 4)}` },
        { label: 'γ', text: `γ = ρ·g = ${n(rho, 5)} × ${n(v.g, 3)} = ${n(gamma, 5)} N/m³` },
        { label: 'γr', text: `γr = γ/γágua = ${n(gamma, 5)}/${n(gw, 5)} = ${n(gr, 4)}` },
      );
      return {
        steps,
        results: [
          { label: 'Massa específica ρ', value: rho, unit: 'kg/m³' },
          { label: 'Densidade relativa d', value: d, unit: '(adimensional)' },
          { label: 'Peso específico γ', value: gamma, unit: 'N/m³' },
          { label: 'Peso específico relativo γr', value: gr, unit: '(adimensional)' },
        ],
        meaning: d < 1 ? `O fluido é ${n((1 - d) * 100, 3)}% mais leve que a água (flutuaria sobre ela).` : d > 1 ? `O fluido é ${n(d, 3)} vezes mais denso que a água.` : 'O fluido tem a mesma densidade da água.',
        warnings: [
          'd e γr dão sempre o mesmo número: o g se cancela.',
          'γ está em N/m³ e ρ em kg/m³ — não troque as unidades.',
          ...(rho > SUSPICIOUS_RHO ? [SUSPICIOUS_RHO_MSG] : []),
        ],
      };
    },
  },
  {
    id: 'viscosidade', title: 'Viscosidade dinâmica ↔ cinemática', module: 'm4', section: 'formulas-visc',
    summary: 'Converter μ em ν e vice-versa.',
    about: 'A viscosidade cinemática ν é a viscosidade dinâmica μ dividida pela massa específica ρ.',
    conditions: 'μ e ρ devem ser do mesmo fluido, na mesma temperatura. Para τ, força e potência use μ (dinâmica), não ν.',
    tex: String.raw`\nu = \dfrac{\mu}{\rho}\ \Leftrightarrow\ \mu = \nu\rho`,
    selects: [{ key: 'modo', label: 'Calcular', default: 'nu', options: [{ value: 'nu', label: 'ν a partir de μ' }, { value: 'mu', label: 'μ a partir de ν' }] }],
    inputs: [
      { key: 'mu', label: 'Viscosidade dinâmica', sym: 'μ', units: ['Pa.s', 'mPa.s', 'cP'], default: '0,04', showIf: (o) => o.modo === 'nu' },
      { key: 'nu', label: 'Viscosidade cinemática', sym: 'ν', units: ['m2/s', 'cSt'], default: '1,8e-4', showIf: (o) => o.modo === 'mu' },
      { key: 'rho', label: 'Massa específica', sym: 'ρ', units: ['kg/m3', 'g/cm3'], default: '800' },
    ],
    compute: ({ v, opt }) => {
      if (opt.modo === 'nu') {
        const nu = F.kinematicViscosity(v.mu, v.rho);
        return {
          steps: [
            { label: 'Equação', text: 'ν = μ / ρ' },
            { label: 'Substituição', text: `ν = ${n(v.mu, 5)} Pa·s / ${n(v.rho, 5)} kg/m³` },
            { label: 'Cálculo', text: `ν = ${n(nu, 4)} m²/s` },
          ],
          results: [{ label: 'Viscosidade cinemática ν', value: nu, unit: 'm²/s' }],
          meaning: 'ν mede a viscosidade “por unidade de massa específica”: quanto o fluido resiste ao escoamento considerando sua inércia.',
          warnings: ['ν em m²/s; μ em Pa·s. Uma alternativa com o número certo e a unidade de μ está errada.', 'Não inverta a divisão (ρ/μ).'],
        };
      }
      const mu = F.dynamicFromKinematic(v.nu, v.rho);
      return {
        steps: [
          { label: 'Equação', text: 'μ = ν · ρ' },
          { label: 'Substituição', text: `μ = ${n(v.nu, 4)} m²/s × ${n(v.rho, 5)} kg/m³` },
          { label: 'Cálculo', text: `μ = ${n(mu, 4)} Pa·s` },
        ],
        results: [{ label: 'Viscosidade dinâmica μ', value: mu, unit: 'Pa·s' }],
        meaning: 'μ é a viscosidade que entra na lei de Newton da viscosidade (τ = μ·v/e).',
        warnings: ['Para calcular τ, F e potência, use μ (dinâmica), não ν.'],
      };
    },
  },
  {
    id: 'cisalhamento', title: 'Tensão de cisalhamento, força e potência', module: 'm4', section: 'formulas-visc',
    summary: 'Placa deslizando sobre película de óleo (perfil linear).',
    about: 'Numa película fina entre uma placa móvel e uma fixa, o fluido resiste ao deslizamento com uma tensão proporcional à taxa de deformação.',
    conditions: 'Fluido newtoniano, película fina com perfil de velocidade linear (dv/dy = v/e) e placa a velocidade constante.',
    tex: String.raw`\tau = \mu\,\dfrac{v}{e},\ F = \tau A,\ \text{Pot} = F v`,
    inputs: [
      { key: 'mu', label: 'Viscosidade dinâmica', sym: 'μ', units: ['Pa.s', 'mPa.s', 'cP'], default: '0,120', allowZero: true },
      { key: 'v', label: 'Velocidade da placa', sym: 'v', units: ['m/s'], default: '0,400', allowZero: true },
      { key: 'e', label: 'Espessura da película', sym: 'e', units: ['mm', 'm', 'cm'], default: '1,50' },
      { key: 'A', label: 'Área de contato', sym: 'A', units: ['m2', 'cm2'], default: '0,600', allowZero: true },
    ],
    compute: ({ v }) => {
      const rate = F.shearRate(v.v, v.e);
      const tau = F.shearStress(v.mu, v.v, v.e);
      const Fv = F.viscousForce(tau, v.A);
      const P = F.viscousPower(Fv, v.v);
      return {
        steps: [
          { label: 'Taxa', text: `dv/dy = v/e = ${n(v.v, 4)} / ${n(v.e, 4)} = ${n(rate, 5)} s⁻¹` },
          { label: 'τ', text: `τ = μ · dv/dy = ${n(v.mu, 4)} × ${n(rate, 5)} = ${n(tau, 5)} Pa` },
          { label: 'F', text: `F = τ · A = ${n(tau, 5)} × ${n(v.A, 4)} = ${n(Fv, 5)} N` },
          { label: 'Potência', text: `Pot = F · v = ${n(Fv, 5)} × ${n(v.v, 4)} = ${n(P, 5)} W` },
        ],
        results: [
          { label: 'Taxa de deformação', value: rate, unit: 's⁻¹' },
          { label: 'Tensão τ', value: tau, unit: 'Pa' },
          { label: 'Força viscosa F', value: Fv, unit: 'N' },
          { label: 'Potência dissipada', value: P, unit: 'W' },
        ],
        meaning: `Para manter a placa a velocidade constante é preciso aplicar ${n(Fv, 4)} N; ${n(P, 4)} W viram calor no óleo.`,
        warnings: [
          'A espessura entra em METROS: 1,50 mm = 0,0015 m.',
          'Dobrar a velocidade dobra a força e quadruplica a potência.',
          ...(v.e > 0.01 ? ['Película com mais de 10 mm: o perfil linear (dv/dy = v/e) supõe película FINA; confira se a espessura e a unidade estão certas.'] : []),
        ],
      };
    },
  },
  {
    id: 'stevin', title: 'Pressão hidrostática (Stevin)', module: 'm5', section: 'stevin',
    summary: 'Pressão manométrica e absoluta a uma profundidade.',
    about: 'Num fluido em repouso, a pressão aumenta com a profundidade por causa do peso da coluna de fluido acima do ponto.',
    conditions: 'Fluido em repouso, contínuo e com massa específica constante; superfície aberta à atmosfera. Em tanque fechado, troque patm pela pressão do gás sobre o líquido.',
    tex: String.raw`\begin{gathered} p_{man} = \rho g h = \gamma h \\ p_{abs} = p_{atm} + p_{man} \end{gathered}`,
    selects: [{ key: 'modo', label: 'Dado do fluido', default: 'rho', options: [{ value: 'rho', label: 'Massa específica ρ (e g)' }, { value: 'gamma', label: 'Peso específico γ' }] }],
    inputs: [
      { key: 'rho', label: 'Massa específica', sym: 'ρ', units: ['kg/m3'], default: '1000', showIf: (o) => o.modo === 'rho' },
      { ...gInput, showIf: (o) => o.modo === 'rho' },
      { key: 'gamma', label: 'Peso específico', sym: 'γ', units: ['N/m3', 'kN/m3'], default: '10000', showIf: (o) => o.modo === 'gamma' },
      { key: 'h', label: 'Profundidade', sym: 'h', units: ['m', 'cm', 'mm'], default: '5', allowZero: true },
      { key: 'patm', label: 'Pressão atmosférica', sym: 'patm', units: ['kPa', 'Pa', 'atm'], default: '101,325' },
    ],
    compute: ({ v, opt }) => {
      const gamma = opt.modo === 'rho' ? F.specificWeight(v.rho, v.g) : v.gamma;
      const pman = gamma * v.h;
      const pabs = F.absolutePressure(v.patm, pman);
      return {
        steps: [
          ...(opt.modo === 'rho' ? [{ label: 'γ', text: `γ = ρ·g = ${n(v.rho, 5)} × ${n(v.g, 3)} = ${n(gamma, 5)} N/m³` }] : []),
          { label: 'Manométrica', text: `pman = γ·h = ${n(gamma, 5)} × ${n(v.h, 4)} = ${n(pman, 6)} Pa` },
          { label: 'Absoluta', text: `pabs = patm + pman = ${n(v.patm, 6)} + ${n(pman, 6)} = ${n(pabs, 6)} Pa` },
        ],
        results: [
          { label: 'Pressão manométrica', value: pman / 1000, unit: 'kPa' },
          { label: 'Pressão absoluta', value: pabs / 1000, unit: 'kPa' },
        ],
        meaning: `A ${n(v.h, 3)} m de profundidade, a pressão está ${n(pman / 1000, 4)} kPa acima da atmosférica.`,
        warnings: [
          'Se a questão der γ, não multiplique por g de novo.',
          'Leia se a questão pede pressão manométrica ou absoluta.',
          ...(gamma > SUSPICIOUS_GAMMA ? ['Peso específico acima do de qualquer substância conhecida (≈ 222 kN/m³ para o ósmio; mercúrio ≈ 133 kN/m³): confira o valor e a unidade.'] : []),
        ],
      };
    },
  },
  {
    id: 'pascal', title: 'Prensa hidráulica (Pascal)', module: 'm5', section: 'pascal',
    summary: 'Força no êmbolo maior e quanto ele se desloca.',
    about: 'Num fluido confinado, a pressão aplicada a um êmbolo se transmite integralmente ao outro; com áreas diferentes, a força é multiplicada.',
    conditions: 'Êmbolos no mesmo nível, fluido incompressível em repouso, sem atrito, vazamento ou peso dos êmbolos. A energia não é multiplicada: o êmbolo maior anda menos (A1·s1 = A2·s2). Com desnível entre os êmbolos, some ρ·g·h (Stevin).',
    tex: String.raw`\dfrac{F_1}{A_1} = \dfrac{F_2}{A_2},\ A = \dfrac{\pi d^2}{4}`,
    inputs: [
      { key: 'F1', label: 'Força no êmbolo de entrada', sym: 'F1', units: ['N', 'kN'], default: '360' },
      { key: 'd1', label: 'Diâmetro do êmbolo de entrada', sym: 'd1', units: ['mm', 'cm', 'm'], default: '32' },
      { key: 'd2', label: 'Diâmetro do êmbolo de saída', sym: 'd2', units: ['mm', 'cm', 'm'], default: '192' },
      { key: 's1', label: 'Curso do êmbolo de entrada (opcional)', sym: 's1', units: ['cm', 'mm', 'm'], default: '', optional: true },
    ],
    compute: ({ v, has }) => {
      const A1 = F.circleAreaFromDiameter(v.d1);
      const A2 = F.circleAreaFromDiameter(v.d2);
      const p = v.F1 / A1;
      const F2 = F.pascalOutputForce(v.F1, A1, A2);
      const ratio = A2 / A1;
      const steps: CalcStep[] = [
        { label: 'Áreas', text: `A1 = π·d1²/4 = ${n(A1, 5)} m²;  A2 = π·d2²/4 = ${n(A2, 5)} m²` },
        { label: 'Pressão', text: `p = F1/A1 = ${n(v.F1, 5)} / ${n(A1, 5)} = ${n(p, 6)} Pa` },
        { label: 'Equação', text: 'F1/A1 = F2/A2  ⇒  F2 = p · A2 = F1 · (d2/d1)²' },
        { label: 'Cálculo', text: `F2 = ${n(p, 6)} × ${n(A2, 5)} = ${n(F2, 6)} N  (razão das áreas = ${n(ratio, 5)})` },
      ];
      const results: CalcResult[] = [
        { label: 'Pressão transmitida', value: p / 1000, unit: 'kPa' },
        { label: 'Força no êmbolo de saída F2', value: F2, unit: 'N', sig: 6 },
        { label: 'Razão das áreas A2/A1', value: ratio, unit: '(adimensional)' },
      ];
      if (has('s1')) {
        const s2 = F.pascalOutputStroke(v.s1, A1, A2);
        steps.push({ label: 'Curso', text: `A1·s1 = A2·s2 ⇒ s2 = ${n(v.s1, 5)} × ${n(A1, 5)} / ${n(A2, 5)} = ${n(s2, 5)} m` });
        steps.push({ label: 'Trabalho', text: `F1·s1 = ${n(v.F1 * v.s1, 5)} J = F2·s2 = ${n(F2 * s2, 5)} J` });
        results.push({ label: 'Curso do êmbolo de saída s2', value: s2 * 100, unit: 'cm' });
      }
      const dRatio = v.d2 / v.d1;
      return {
        steps,
        results,
        meaning:
          ratio >= 1
            ? `A força sai ${n(ratio, 4)} vezes maior, mas o êmbolo de saída anda ${n(ratio, 4)} vezes menos: a prensa troca deslocamento por força.`
            : 'O êmbolo de saída é menor que o de entrada: a força diminui (e o deslocamento aumenta).',
        warnings: [
          `Use a razão das ÁREAS, (d2/d1)² = ${n(ratio, 4)}, e não a razão dos diâmetros (${n(dRatio, 4)}).`,
          'Só vale com os êmbolos no mesmo nível; com desnível, a pressão no êmbolo mais baixo é maior em ρ·g·h.',
        ],
      };
    },
  },
  {
    id: 'cilindro-hidr', title: 'Força de cilindro hidráulico', module: 'm5', section: 'pascal',
    summary: 'Força teórica e útil a partir da pressão e do diâmetro do pistão.',
    about: 'A pressão do óleo empurra a face do pistão: a força é a pressão vezes a área.',
    conditions: 'Use a pressão manométrica quando a outra câmara está à atmosfera (a atmosfera age dos dois lados e se cancela). As perdas mecânicas, em fração, reduzem a força útil.',
    tex: String.raw`\begin{gathered} F = p_{man}\,A \\ F_{útil} = (1 - \text{perdas})\,F \end{gathered}`,
    inputs: [
      { key: 'p', label: 'Pressão manométrica', sym: 'pman', units: ['MPa', 'kPa', 'bar', 'Pa'], default: '5,50' },
      { key: 'D', label: 'Diâmetro do pistão', sym: 'D', units: ['mm', 'cm', 'm'], default: '70' },
      { key: 'perdas', label: 'Perdas mecânicas', sym: 'perdas', units: ['%'], default: '12', allowZero: true, help: '0 para cilindro ideal' },
      { key: 'Freq', label: 'Força útil exigida (opcional)', sym: 'Fexig', units: ['kN', 'N'], default: '20,0', optional: true },
    ],
    compute: ({ v, has }) => {
      const A = F.circleAreaFromDiameter(v.D);
      const Ft = F.hydraulicCylinderForce(v.p, A);
      const Fu = F.hydraulicCylinderForce(v.p, A, v.perdas);
      const steps: CalcStep[] = [
        { label: 'Área', text: `A = π·D²/4 = ${n(A, 5)} m²` },
        { label: 'Teórica', text: `F = pman · A = ${n(v.p, 6)} × ${n(A, 5)} = ${n(Ft, 6)} N` },
        { label: 'Útil', text: `Fútil = (1 − ${n(v.perdas, 4)}) × ${n(Ft, 6)} = ${n(Fu, 6)} N` },
      ];
      const results: CalcResult[] = [
        { label: 'Força teórica', value: Ft / 1000, unit: 'kN' },
        { label: 'Força útil', value: Fu / 1000, unit: 'kN' },
      ];
      let meaning = `O cilindro empurra com ${n(Ft / 1000, 4)} kN em teoria; descontadas as perdas, entrega ${n(Fu / 1000, 4)} kN.`;
      if (has('Freq')) {
        const pMin = v.Freq / ((1 - v.perdas) * A);
        const enough = Fu >= v.Freq;
        steps.push({ label: 'Verificação', text: `Fútil = ${n(Fu, 6)} N ${enough ? '≥' : '<'} ${n(v.Freq, 6)} N exigidos` });
        steps.push({ label: 'Pressão mínima', text: `pmín = Fexig / [(1 − perdas)·A] = ${n(pMin, 6)} Pa` });
        results.push({ label: 'Pressão mínima para a força exigida', value: pMin / 1e6, unit: 'MPa' });
        meaning += enough ? ' Atende à força exigida.' : ' NÃO atende à força exigida: aumente a pressão ou o diâmetro.';
      }
      return {
        steps,
        results,
        meaning,
        warnings: ['A força teórica é ANTES de descontar as perdas.', 'Converta o diâmetro para metros e a pressão para Pa antes de multiplicar.'],
      };
    },
  },
];

export function getCalculator(id: string): CalculatorDef | undefined {
  return CALCULATORS.find((c) => c.id === id);
}

/** Valores-padrão de entrada (texto, unidades e seleções) de uma calculadora. */
export function defaults(def: CalculatorDef) {
  const text: Record<string, string> = {};
  const units: Record<string, string> = {};
  const opt: Record<string, string> = {};
  def.inputs.forEach((i) => {
    text[i.key] = i.default;
    units[i.key] = i.units[0];
  });
  def.selects?.forEach((s) => (opt[s.key] = s.default));
  return { text, units, opt };
}
