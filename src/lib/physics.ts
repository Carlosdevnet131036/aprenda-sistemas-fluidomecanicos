// Fórmulas do material "Revisão A1 — Sistemas Fluidomecânicos".
// Todas as funções trabalham em unidades do SI e lançam PhysicsError
// quando os dados violam as condições de validade da equação.
// Convenção de sinais do material: ΔU = Q − W, Q > 0 quando o sistema
// recebe calor, W > 0 quando o trabalho é feito PELO sistema (expansão).

export class PhysicsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhysicsError';
  }
}

export const G_EARTH = 9.81; // m/s²
export const G_MOON = 1.62; // m/s²
export const RHO_WATER = 1000; // kg/m³
export const CAL_TO_J = 4.18; // valor usado no material (1 cal = 4,18 J)
export const KELVIN_OFFSET = 273.15;
export const P_ATM = 101_325; // Pa (atmosfera padrão)

function finite(name: string, x: number): void {
  if (!Number.isFinite(x)) throw new PhysicsError(`${name} precisa ser um número.`);
}
function nonNegative(name: string, x: number): void {
  finite(name, x);
  if (x < 0) throw new PhysicsError(`${name} não pode ser negativo.`);
}
function positive(name: string, x: number): void {
  finite(name, x);
  if (x <= 0) throw new PhysicsError(`${name} precisa ser maior que zero.`);
}

// ---------- Módulo 1: grandezas ----------

/** P = m·g  [N] */
export function weight(m: number, g: number = G_EARTH): number {
  nonNegative('A massa', m);
  positive('A gravidade', g);
  return m * g;
}

/** V = π·r²·h  [m³] — usa o RAIO. */
export function cylinderVolume(r: number, h: number): number {
  nonNegative('O raio', r);
  nonNegative('A altura', h);
  return Math.PI * r * r * h;
}

/** V = π·D²·h/4  [m³] */
export function cylinderVolumeFromDiameter(d: number, h: number): number {
  nonNegative('O diâmetro', d);
  return cylinderVolume(d / 2, h);
}

/** V = a·b·c  [m³] */
export function boxVolume(a: number, b: number, c: number): number {
  nonNegative('O comprimento', a);
  nonNegative('A largura', b);
  nonNegative('A altura', c);
  return a * b * c;
}

/** V_útil = fração·V_total, fração entre 0 e 1 */
export function filledVolume(vTotal: number, fraction: number): number {
  nonNegative('O volume total', vTotal);
  finite('A fração', fraction);
  if (fraction < 0 || fraction > 1) throw new PhysicsError('A fração de preenchimento deve ficar entre 0% e 100%.');
  return vTotal * fraction;
}

/** m = ρ·V  [kg] */
export function massFromDensity(rho: number, v: number): number {
  positive('A massa específica', rho);
  nonNegative('O volume', v);
  return rho * v;
}

/** ρ = m/V  [kg/m³] */
export function density(m: number, v: number): number {
  nonNegative('A massa', m);
  positive('O volume', v);
  return m / v;
}

// ---------- Módulo 4: propriedades ----------

/** d = ρ/ρ_água  [adimensional] */
export function relativeDensity(rho: number, rhoRef: number = RHO_WATER): number {
  positive('A massa específica', rho);
  positive('A massa específica de referência', rhoRef);
  return rho / rhoRef;
}

/** γ = ρ·g  [N/m³] */
export function specificWeight(rho: number, g: number = G_EARTH): number {
  positive('A massa específica', rho);
  positive('A gravidade', g);
  return rho * g;
}

/** γr = γ/γ_água  [adimensional] */
export function relativeSpecificWeight(gamma: number, gammaWater: number): number {
  positive('O peso específico', gamma);
  positive('O peso específico da água', gammaWater);
  return gamma / gammaWater;
}

// ---------- Módulo 2: termodinâmica ----------

/** Q = m·c·ΔT  [J]; ΔT = Tfinal − Tinicial (igual em °C ou K) */
export function sensibleHeat(m: number, c: number, tInitial: number, tFinal: number): number {
  nonNegative('A massa', m);
  positive('O calor específico', c);
  finite('A temperatura inicial', tInitial);
  finite('A temperatura final', tFinal);
  return m * c * (tFinal - tInitial);
}

/** c = Q/(m·ΔT) */
export function specificHeat(q: number, m: number, deltaT: number): number {
  finite('O calor', q);
  positive('A massa', m);
  finite('ΔT', deltaT);
  if (deltaT === 0) throw new PhysicsError('ΔT não pode ser zero para calcular o calor específico.');
  return q / (m * deltaT);
}

/** W = p·ΔV  [J], processo a pressão constante */
export function isobaricWork(p: number, vInitial: number, vFinal: number): number {
  nonNegative('A pressão', p);
  nonNegative('O volume inicial', vInitial);
  nonNegative('O volume final', vFinal);
  return p * (vFinal - vInitial);
}

/** ΔU = Q − W */
export function firstLawDeltaU(q: number, w: number): number {
  finite('Q', q);
  finite('W', w);
  return q - w;
}
/** Q = ΔU + W */
export function firstLawHeat(deltaU: number, w: number): number {
  finite('ΔU', deltaU);
  finite('W', w);
  return deltaU + w;
}
/** W = Q − ΔU */
export function firstLawWork(q: number, deltaU: number): number {
  finite('Q', q);
  finite('ΔU', deltaU);
  return q - deltaU;
}

// ---------- Módulo 3: 2ª Lei e Carnot ----------

export function celsiusToKelvin(c: number): number {
  finite('A temperatura', c);
  const k = c + KELVIN_OFFSET;
  if (k < 0) throw new PhysicsError('Abaixo do zero absoluto (−273,15 °C) não existe temperatura.');
  return k;
}

export function kelvinToCelsius(k: number): number {
  nonNegative('A temperatura em kelvin', k);
  return k - KELVIN_OFFSET;
}

/** η_Carnot = 1 − Tf/Tq, com T em KELVIN */
export function carnotEfficiency(tHotK: number, tColdK: number): number {
  positive('A temperatura quente (K)', tHotK);
  positive('A temperatura fria (K)', tColdK);
  if (tColdK >= tHotK) throw new PhysicsError('A temperatura do reservatório quente precisa ser maior que a do frio.');
  return 1 - tColdK / tHotK;
}

/** η = W/Qq */
export function engineEfficiency(w: number, qHot: number): number {
  positive('O calor recebido Qq', qHot);
  nonNegative('O trabalho W', w);
  if (w > qHot) throw new PhysicsError('O trabalho não pode ser maior que o calor recebido (violaria a 1ª Lei).');
  return w / qHot;
}

/** η = 1 − Qf/Qq */
export function efficiencyFromHeats(qHot: number, qCold: number): number {
  positive('O calor recebido Qq', qHot);
  nonNegative('O calor rejeitado Qf', qCold);
  if (qCold > qHot) throw new PhysicsError('Qf não pode ser maior que Qq.');
  return 1 - qCold / qHot;
}

/** Qf = Qq − W */
export function rejectedHeat(qHot: number, w: number): number {
  engineEfficiency(w, qHot);
  return qHot - w;
}

/** W = η·Qq */
export function workFromEfficiency(eta: number, qHot: number): number {
  efficiencyRange(eta);
  nonNegative('O calor recebido Qq', qHot);
  return eta * qHot;
}

/** Qq = W/η */
export function heatInputFromWork(w: number, eta: number): number {
  nonNegative('O trabalho W', w);
  efficiencyRange(eta);
  if (eta === 0) throw new PhysicsError('Com η = 0 a máquina não produz trabalho.');
  return w / eta;
}

function efficiencyRange(eta: number): void {
  finite('O rendimento', eta);
  if (eta < 0 || eta >= 1) throw new PhysicsError('O rendimento de uma máquina térmica fica entre 0 e 1 (nunca 100%, pela 2ª Lei).');
}

/** Teste de viabilidade: nenhuma máquina supera Carnot entre as mesmas temperaturas. */
export function isEngineFeasible(eta: number, tHotK: number, tColdK: number): boolean {
  finite('O rendimento', eta);
  return eta >= 0 && eta <= carnotEfficiency(tHotK, tColdK) + 1e-12;
}

// ---------- Módulo 4: viscosidade ----------

/** dv/dy = v/e  [1/s], perfil linear */
export function shearRate(v: number, e: number): number {
  nonNegative('A velocidade', v);
  positive('A espessura da película', e);
  return v / e;
}

/** τ = μ·v/e  [Pa] */
export function shearStress(mu: number, v: number, e: number): number {
  nonNegative('A viscosidade dinâmica', mu);
  return mu * shearRate(v, e);
}

/** F = τ·A  [N] */
export function viscousForce(tau: number, area: number): number {
  nonNegative('A tensão de cisalhamento', tau);
  nonNegative('A área', area);
  return tau * area;
}

/** Pot = F·v  [W] */
export function viscousPower(force: number, v: number): number {
  nonNegative('A força', force);
  nonNegative('A velocidade', v);
  return force * v;
}

/** ν = μ/ρ  [m²/s] */
export function kinematicViscosity(mu: number, rho: number): number {
  nonNegative('A viscosidade dinâmica', mu);
  positive('A massa específica', rho);
  return mu / rho;
}

/** μ = ν·ρ  [Pa·s] */
export function dynamicFromKinematic(nu: number, rho: number): number {
  nonNegative('A viscosidade cinemática', nu);
  positive('A massa específica', rho);
  return nu * rho;
}

export interface RheologyPoint {
  rate: number; // dv/dy (ou velocidade)
  stress: number; // τ (ou força)
}

export interface NewtonianResult {
  ratios: number[];
  newtonian: boolean;
  /** razão média (μ quando newtoniano) */
  mean: number;
}

/** Newtoniano ⇔ a razão τ/(dv/dy) é constante (dentro de uma tolerância relativa). */
export function classifyNewtonian(points: RheologyPoint[], relTol = 0.02): NewtonianResult {
  if (points.length < 2) throw new PhysicsError('São necessários pelo menos dois pontos do ensaio.');
  const ratios = points.map((p, i) => {
    positive(`A taxa de deformação da linha ${i + 1}`, p.rate);
    nonNegative(`A tensão da linha ${i + 1}`, p.stress);
    return p.stress / p.rate;
  });
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const max = Math.max(...ratios);
  const min = Math.min(...ratios);
  const newtonian = mean === 0 ? max === 0 : (max - min) / mean <= relTol;
  return { ratios, newtonian, mean };
}

// ---------- Módulo 5: pressão ----------

/** Δp = ρ·g·h  [Pa] */
export function hydrostaticPressure(rho: number, g: number, h: number): number {
  positive('A massa específica', rho);
  positive('A gravidade', g);
  nonNegative('A profundidade', h);
  return rho * g * h;
}

/** p_fundo = p_topo + ρ·g·h */
export function stevin(pTop: number, rho: number, g: number, h: number): number {
  finite('A pressão no topo', pTop);
  return pTop + hydrostaticPressure(rho, g, h);
}

/** p_abs = p_atm + p_man */
export function absolutePressure(pAtm: number, pGauge: number): number {
  nonNegative('A pressão atmosférica', pAtm);
  finite('A pressão manométrica', pGauge);
  const abs = pAtm + pGauge;
  if (abs < 0) throw new PhysicsError('A pressão absoluta não pode ser negativa.');
  return abs;
}

/** p_man = p_abs − p_atm */
export function gaugePressure(pAbs: number, pAtm: number): number {
  nonNegative('A pressão absoluta', pAbs);
  nonNegative('A pressão atmosférica', pAtm);
  return pAbs - pAtm;
}

// ---------- Módulo 5: princípio de Pascal ----------

/** A = π·d²/4  [m²] — área do êmbolo a partir do DIÂMETRO. */
export function circleAreaFromDiameter(d: number): number {
  positive('O diâmetro', d);
  return (Math.PI * d * d) / 4;
}

/** Prensa ideal, êmbolos no mesmo nível: F1/A1 = F2/A2 ⇒ F2 = F1·A2/A1  [N] */
export function pascalOutputForce(f1: number, a1: number, a2: number): number {
  nonNegative('A força de entrada', f1);
  positive('A área do êmbolo de entrada', a1);
  positive('A área do êmbolo de saída', a2);
  return (f1 * a2) / a1;
}

/** Volume deslocado é o mesmo: A1·s1 = A2·s2 ⇒ s2 = s1·A1/A2  [m] */
export function pascalOutputStroke(s1: number, a1: number, a2: number): number {
  nonNegative('O curso do êmbolo de entrada', s1);
  positive('A área do êmbolo de entrada', a1);
  positive('A área do êmbolo de saída', a2);
  return (s1 * a1) / a2;
}

/** Cilindro hidráulico: F = p_man·A, descontada a fração de perdas (0 a 1)  [N] */
export function hydraulicCylinderForce(pGauge: number, area: number, losses = 0): number {
  finite('A pressão manométrica', pGauge);
  positive('A área do pistão', area);
  if (!(losses >= 0 && losses < 1)) throw new PhysicsError('As perdas devem ser uma fração entre 0 e 1.');
  return pGauge * area * (1 - losses);
}

export interface ManometerSegment {
  fluid: string;
  /** peso específico γ = ρ·g do fluido NAQUELE trecho [N/m³] */
  gamma: number;
  /** altura percorrida [m] */
  h: number;
  dir: 'desce' | 'sobe';
}

export interface ManometerTerm {
  segment: ManometerSegment;
  /** +γh ao descer, −γh ao subir */
  delta: number;
  /** pressão após percorrer o trecho */
  pressureAfter: number;
}

/** Caminha pelo tubo a partir de uma pressão inicial: desce soma, sobe subtrai. */
export function walkManometer(pStart: number, segments: ManometerSegment[]): { pEnd: number; terms: ManometerTerm[] } {
  finite('A pressão inicial', pStart);
  let p = pStart;
  const terms = segments.map((s, i) => {
    positive(`O peso específico do trecho ${i + 1}`, s.gamma);
    nonNegative(`A altura do trecho ${i + 1}`, s.h);
    const delta = (s.dir === 'desce' ? 1 : -1) * s.gamma * s.h;
    p += delta;
    return { segment: s, delta, pressureAfter: p };
  });
  return { pEnd: p, terms };
}

/** Soma das parcelas ±γh do caminho (p_fim − p_início). */
export function manometerSum(segments: ManometerSegment[]): number {
  return walkManometer(0, segments).pEnd;
}

/** Resolve a pressão no início do caminho conhecendo a do fim. */
export function solveManometerStart(pEnd: number, segments: ManometerSegment[]): number {
  finite('A pressão final', pEnd);
  return pEnd - manometerSum(segments);
}
