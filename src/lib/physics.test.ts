import { describe, expect, it } from 'vitest';
import * as F from './physics';

const close = (a: number, b: number, rel = 1e-3) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * rel + 1e-9);

describe('Módulo 1 — grandezas (valores do material)', () => {
  it('Lista 01 Q1: peso da motobomba na Terra e na Lua; massa não muda', () => {
    close(F.weight(120, F.G_EARTH), 1177.2);
    close(F.weight(120, F.G_MOON), 194.4);
  });
  it('Lista 01 Q2: reservatório cilíndrico D = 0,80 m, h = 1,50 m, 80%, ρ = 850', () => {
    const v = F.cylinderVolumeFromDiameter(0.8, 1.5);
    close(v, 0.754, 1e-3);
    const vo = F.filledVolume(v, 0.8);
    close(vo, 0.6032, 1e-3);
    close(F.massFromDensity(850, vo), 512.7, 1e-3);
  });
  it('usar o diâmetro como raio dá volume 4× maior', () => {
    expect(F.cylinderVolume(0.8, 1.5) / F.cylinderVolumeFromDiameter(0.8, 1.5)).toBeCloseTo(4, 10);
  });
  it('Exemplo do Módulo 1: tanque D = 1,0 m, h = 2,0 m, 70%, ρ = 900', () => {
    const m = F.massFromDensity(900, F.filledVolume(F.cylinderVolumeFromDiameter(1, 2), 0.7));
    close(m, 989.6, 1e-3);
    close(F.weight(m), 9708, 1e-3);
  });
  it('Fixações da Aula 2 (tanque, eixo, reservatório)', () => {
    close(F.cylinderVolumeFromDiameter(1.2, 2.5), 2.827, 1e-3);
    const vEixo = F.cylinderVolumeFromDiameter(0.08, 1.2);
    close(vEixo, 6.03e-3, 1e-3);
    close(F.massFromDensity(2700, vEixo), 16.29, 1e-3);
    close(15 * F.massFromDensity(2700, vEixo), 244.3, 1e-3);
    const vRes = F.boxVolume(0.5, 0.3, 0.4);
    close(vRes, 0.06);
    close(F.massFromDensity(850, F.filledVolume(vRes, 0.75)), 38.25);
  });
  it('rejeita valores inválidos', () => {
    expect(() => F.weight(-1)).toThrow(F.PhysicsError);
    expect(() => F.weight(1, 0)).toThrow(F.PhysicsError);
    expect(() => F.filledVolume(1, 1.2)).toThrow(F.PhysicsError);
    expect(() => F.density(1, 0)).toThrow(F.PhysicsError);
    expect(() => F.cylinderVolume(Number.NaN, 1)).toThrow(F.PhysicsError);
  });
  it('situações-limite: massa nula pesa zero; volume nulo', () => {
    expect(F.weight(0)).toBe(0);
    expect(F.cylinderVolume(0, 2)).toBe(0);
  });
});

describe('Módulo 2 — 1ª Lei (convenção ΔU = Q − W)', () => {
  it('Lista 01 Q5: Q = 2,0 × 900 × 50 = 90 000 J', () => {
    expect(F.sensibleHeat(2, 900, 25, 75)).toBeCloseTo(90000, 6);
  });
  it('resfriamento gera Q negativo', () => {
    expect(F.sensibleHeat(1, 4186, 80, 20)).toBeLessThan(0);
  });
  it('Quiz Q7: 0,50 kg de água de 20 a 80 °C ≈ 125,6 kJ', () => {
    close(F.sensibleHeat(0.5, 4186, 20, 80), 125580);
  });
  it('calor específico do alumínio (slides): 300 J/(kg·°C)', () => {
    close(F.specificHeat(3000, 0.2, 50), 300);
    expect(() => F.specificHeat(3000, 0.2, 0)).toThrow(F.PhysicsError);
  });
  it('Lista 01 Q6: compressão isobárica 200 kPa, 6 → 2 dm³ dá W = −800 J', () => {
    close(F.isobaricWork(200e3, 0.006, 0.002), -800);
  });
  it('Quiz Q8: expansão 150 kPa de 3 L a 8 L dá +750 J', () => {
    close(F.isobaricWork(150e3, 0.003, 0.008), 750);
  });
  it('ΔV a partir do trabalho (slides): 500 J a 100 kPa → 0,005 m³', () => {
    close(500 / 100e3, 0.005);
  });
  it('Exemplo: recebe 500 J e é comprimido com 200 J → ΔU = +700 J', () => {
    expect(F.firstLawDeltaU(500, -200)).toBe(700);
  });
  it('Lista 01 Q7: duas rotas, mesmo ΔU = 700 J', () => {
    expect(F.firstLawDeltaU(1500, 800)).toBe(700);
    expect(F.firstLawDeltaU(1000, 300)).toBe(700);
  });
  it('Lista 01 Q8: isotérmica + isocórica', () => {
    const w1 = F.firstLawWork(1200, 0); // isotérmica: ΔU = 0 ⇒ W = Q
    const du2 = F.firstLawDeltaU(-500, 0); // isocórica: W = 0
    expect(w1).toBe(1200);
    expect(du2).toBe(-500);
    expect(F.firstLawDeltaU(1200 - 500, 1200)).toBe(-500);
  });
  it('Lista 01 Q10: caminho A→B→C', () => {
    const w = F.isobaricWork(5e5, 2, 5) + 0;
    close(w, 1.5e6);
    close(F.firstLawDeltaU(1.8e6, w), 3e5);
  });
  it('slides: libera 4000 J e realiza 3000 J → ΔU = −7000 J', () => {
    expect(F.firstLawDeltaU(-4000, 3000)).toBe(-7000);
  });
  it('Quiz Q9: recebe 900 J e recebe 400 J de trabalho → 1300 J', () => {
    expect(F.firstLawDeltaU(900, -400)).toBe(1300);
    expect(F.firstLawHeat(1300, -400)).toBe(900);
  });
});

describe('Módulo 3 — Carnot (temperaturas em kelvin)', () => {
  it('conversão °C → K', () => {
    expect(F.celsiusToKelvin(27)).toBeCloseTo(300.15, 10);
    expect(F.celsiusToKelvin(-273.15)).toBe(0);
    expect(() => F.celsiusToKelvin(-300)).toThrow(F.PhysicsError);
    expect(F.kelvinToCelsius(300.15)).toBeCloseTo(27, 10);
  });
  it('Exemplo 327 °C / 27 °C: η ≈ 50%; em °C daria 91,7% (errado)', () => {
    const eta = F.carnotEfficiency(F.celsiusToKelvin(327), F.celsiusToKelvin(27));
    close(eta, 0.4999, 1e-3);
    close(1 - 27 / 327, 0.917, 1e-3);
  });
  it('Lista Aula 03 Q1: 520 °C / 30 °C, Qq = 2,40 MW', () => {
    const eta = F.carnotEfficiency(F.celsiusToKelvin(520), F.celsiusToKelvin(30));
    close(eta, 0.6178, 1e-3);
    const w = F.workFromEfficiency(eta, 2.4);
    close(w, 1.483, 1e-3);
    close(F.rejectedHeat(2.4, w), 0.917, 2e-3);
  });
  it('Lista Aula 03 Q2: 80 MW com 75% de Carnot entre 600 K e 300 K', () => {
    const real = 0.75 * F.carnotEfficiency(600, 300);
    close(real, 0.375);
    const qq = F.heatInputFromWork(80, real);
    close(qq, 213.33, 1e-3);
    close(F.rejectedHeat(qq, 80), 133.33, 1e-3);
  });
  it('Lista Aula 03 Q9 e Quiz Q15: viabilidade', () => {
    close(F.carnotEfficiency(900, 300), 0.6667, 1e-3);
    expect(F.isEngineFeasible(0.75, 900, 300)).toBe(false);
    expect(F.isEngineFeasible(0.6, 800, 400)).toBe(false);
    expect(F.isEngineFeasible(0.5, 800, 400)).toBe(true);
  });
  it('Quiz Q13: 400 °C / 25 °C → 55,7%', () => {
    close(F.carnotEfficiency(F.celsiusToKelvin(400), F.celsiusToKelvin(25)), 0.557, 1e-3);
  });
  it('Quiz Q14: Qq = 5 MW, η = 40% → Qf = 3 MW', () => {
    expect(F.rejectedHeat(5, F.workFromEfficiency(0.4, 5))).toBeCloseTo(3, 10);
  });
  it('Slides Ex. 1: usina 800 000 kW, 70% de Carnot (585 K / 295 K)', () => {
    const eta = 0.7 * F.carnotEfficiency(585, 295);
    close(eta, 0.347, 1e-3);
    const qq = F.heatInputFromWork(800000, eta);
    close(qq, 2.305e6, 1e-3);
    close(F.rejectedHeat(qq, 800000), 1.505e6, 1e-3);
  });
  it('Slides Ex. 2: motor com Qq = 6 kW entre 250 °C e 30 °C', () => {
    const eta = F.carnotEfficiency(F.celsiusToKelvin(250), F.celsiusToKelvin(30));
    close(eta, 0.4205, 1e-3);
    close(F.workFromEfficiency(eta, 6), 2.523, 1e-3);
  });
  it('Slides Ex. 3: termelétrica 1000 MW, 550 °C / 318,95 K', () => {
    const eta = F.carnotEfficiency(F.celsiusToKelvin(550), 318.95);
    close(eta, 0.6125, 1e-3);
    const qq = F.heatInputFromWork(1000, eta);
    close(qq, 1632.6, 1e-3);
    close(qq - 1000, 632.6, 2e-3);
  });
  it('rejeita casos impossíveis', () => {
    expect(() => F.carnotEfficiency(300, 300)).toThrow(F.PhysicsError);
    expect(() => F.carnotEfficiency(300, 0)).toThrow(F.PhysicsError);
    expect(() => F.engineEfficiency(12, 10)).toThrow(F.PhysicsError);
    expect(() => F.heatInputFromWork(10, 1)).toThrow(F.PhysicsError);
    expect(() => F.heatInputFromWork(10, 0)).toThrow(F.PhysicsError);
  });
  it('η = W/Qq = 1 − Qf/Qq são equivalentes', () => {
    expect(F.engineEfficiency(2, 5)).toBeCloseTo(F.efficiencyFromHeats(5, 3), 12);
  });
});

describe('Módulo 4 — propriedades e viscosidade', () => {
  it('Lista Aula 03 Q4: óleo da prensa', () => {
    const rho = F.density(348, 0.4);
    expect(rho).toBeCloseTo(870, 10);
    expect(F.relativeDensity(rho)).toBeCloseTo(0.87, 10);
    close(F.specificWeight(rho, 9.81), 8534.7);
    close(F.relativeSpecificWeight(F.specificWeight(rho, 9.81), F.specificWeight(1000, 9.81)), 0.87);
  });
  it('Lista Aula 03 Q5: caixa de engrenagens (g = 10)', () => {
    const rho = 0.82 * 1000;
    const m = F.massFromDensity(rho, 0.15);
    close(m, 123);
    close(F.weight(m, 10), 1230);
    close(F.specificWeight(rho, 10), 8200);
  });
  it('Quiz Q17: 200 L, 170 kg, g = 10 → γ = 8500 N/m³', () => {
    close(F.specificWeight(F.density(170, 0.2), 10), 8500);
  });
  it('Exemplo do Módulo 4: placa 0,80 m², 0,50 m/s, 2,0 mm, μ = 0,10', () => {
    expect(F.shearRate(0.5, 0.002)).toBeCloseTo(250, 8);
    const tau = F.shearStress(0.1, 0.5, 0.002);
    expect(tau).toBeCloseTo(25, 8);
    const f = F.viscousForce(tau, 0.8);
    expect(f).toBeCloseTo(20, 8);
    expect(F.viscousPower(f, 0.5)).toBeCloseTo(10, 8);
  });
  it('Lista Aula 03 Q6: guia linear', () => {
    close(F.shearRate(0.4, 0.0015), 266.7);
    const tau = F.shearStress(0.12, 0.4, 0.0015);
    close(tau, 32.0);
    const f = F.viscousForce(tau, 0.6);
    close(f, 19.2);
    close(F.viscousPower(f, 0.4), 7.68);
  });
  it('Lista Aula 03 Q7: ν → μ e força', () => {
    const mu = F.dynamicFromKinematic(1.8e-4, 850);
    close(mu, 0.153);
    const tau = F.shearStress(mu, 0.25, 0.0008);
    close(tau, 47.8, 2e-3);
    close(F.viscousForce(tau, 0.3), 14.34, 1e-3); // material arredonda para 14,3 N
  });
  it('Quiz Q18/Q19 e slides Ex. 2/3', () => {
    close(F.kinematicViscosity(0.04, 800), 5e-5);
    close(F.viscousForce(F.shearStress(0.05, 2, 0.002), 0.5), 25);
    close(F.viscousForce(F.shearStress(0.02, 0.05, 0.0001), 1), 10);
    close(F.dynamicFromKinematic(2e-6, 750), 1.5e-3);
  });
  it('classificação newtoniana pela razão constante', () => {
    const q10 = F.classifyNewtonian([
      { rate: 25, stress: 8 },
      { rate: 50, stress: 16 },
      { rate: 75, stress: 24 },
    ]);
    expect(q10.newtonian).toBe(true);
    close(q10.mean, 0.32);
    const fluidB = F.classifyNewtonian([
      { rate: 7.5, stress: 1 },
      { rate: 14, stress: 2 },
      { rate: 18, stress: 3 },
      { rate: 20, stress: 4 },
    ]);
    expect(fluidB.newtonian).toBe(false);
    expect(() => F.classifyNewtonian([{ rate: 1, stress: 1 }])).toThrow(F.PhysicsError);
    expect(() => F.classifyNewtonian([{ rate: 0, stress: 1 }, { rate: 1, stress: 1 }])).toThrow(F.PhysicsError);
  });
  it('espessura zero é inválida', () => {
    expect(() => F.shearRate(1, 0)).toThrow(F.PhysicsError);
  });
});

describe('Módulo 5 — pressão e manometria', () => {
  it('Quiz Q21: 5 m de água (γ = 10 000) → 50 kPa manométrica', () => {
    expect(F.hydrostaticPressure(1000, 10, 5)).toBe(50000);
    close(F.absolutePressure(101e3, 50e3), 151e3);
  });
  it('Quiz Q22: mercúrio 0,30 m → ≈ 40,0 kPa', () => {
    close(F.hydrostaticPressure(13600, 9.81, 0.3), 40024.8);
  });
  it('Aula 5 Ex. 1: p1 = 129,6 kPa (o caderno tem 124,6 por erro de soma)', () => {
    const g = 9.81;
    const segs: F.ManometerSegment[] = [
      { fluid: 'água', gamma: 1000 * g, h: 0.1, dir: 'desce' },
      { fluid: 'óleo', gamma: 850 * g, h: 0.2, dir: 'desce' },
      { fluid: 'mercúrio', gamma: 13600 * g, h: 0.35, dir: 'sobe' },
    ];
    const p1 = F.solveManometerStart(85600, segs);
    close(p1, 129646.9, 1e-5);
    expect(Math.abs(p1 - 124600)).toBeGreaterThan(4000);
    expect(F.walkManometer(p1, segs).pEnd).toBeCloseTo(85600, 6);
  });
  it('Aula 5 Ex. 2: pB − pA = 132 100 Pa', () => {
    const segs: F.ManometerSegment[] = [
      { fluid: 'água', gamma: 10000, h: 0.25, dir: 'desce' },
      { fluid: 'mercúrio', gamma: 136000, h: 1.0, dir: 'desce' },
      { fluid: 'óleo', gamma: 8000, h: 0.8, dir: 'sobe' },
    ];
    close(F.manometerSum(segs), 132100);
  });
  it('subir no fluido diminui a pressão; descer aumenta', () => {
    const { terms } = F.walkManometer(0, [
      { fluid: 'água', gamma: 9810, h: 1, dir: 'desce' },
      { fluid: 'água', gamma: 9810, h: 1, dir: 'sobe' },
    ]);
    expect(terms[0].delta).toBeGreaterThan(0);
    expect(terms[1].delta).toBeLessThan(0);
    expect(terms[1].pressureAfter).toBeCloseTo(0, 10);
  });
  it('pressão absoluta negativa é rejeitada; manométrica pode ser negativa', () => {
    expect(() => F.absolutePressure(100e3, -150e3)).toThrow(F.PhysicsError);
    expect(F.gaugePressure(80e3, 101e3)).toBeLessThan(0);
  });
});
