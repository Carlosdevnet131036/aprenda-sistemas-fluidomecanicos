import { describe, expect, it } from 'vitest';
import { convert, fmt, parseNumber, toSI } from './units';
import { checkNumericAnswer } from './answerCheck';

describe('conversões de unidades', () => {
  it('comprimento: mm → m divide por 1000', () => {
    expect(convert(1.5, 'mm', 'm')).toBeCloseTo(0.0015, 12);
    expect(convert(25, 'mm', 'm')).toBeCloseTo(0.025, 12);
    expect(convert(80, 'cm', 'm')).toBeCloseTo(0.8, 12);
  });
  it('volume: 1 m³ = 1000 L; 1 L = 1 dm³', () => {
    expect(convert(1, 'm3', 'L')).toBeCloseTo(1000, 9);
    expect(convert(6, 'dm3', 'm3')).toBeCloseTo(0.006, 12);
    expect(convert(1, 'L', 'dm3')).toBeCloseTo(1, 12);
  });
  it('pressão: kPa → Pa multiplica por 1000', () => {
    expect(convert(200, 'kPa', 'Pa')).toBe(200000);
    expect(convert(1, 'atm', 'kPa')).toBeCloseTo(101.325, 9);
  });
  it('temperatura: °C ↔ K com 273,15', () => {
    expect(convert(27, 'C', 'K')).toBeCloseTo(300.15, 10);
    expect(convert(0, 'K', 'C')).toBeCloseTo(-273.15, 10);
    expect(() => convert(-300, 'C', 'K')).toThrow();
    expect(() => convert(-1, 'K', 'C')).toThrow();
  });
  it('energia com 1 cal = 4,18 J (valor do material)', () => {
    expect(convert(1, 'cal', 'J')).toBeCloseTo(4.18, 12);
  });
  it('viscosidade: 1 cP = 1 mPa·s; 1 cSt = 10⁻⁶ m²/s', () => {
    expect(convert(1, 'cP', 'Pa.s')).toBeCloseTo(0.001, 12);
    expect(convert(1, 'cSt', 'm2/s')).toBeCloseTo(1e-6, 15);
  });
  it('não converte grandezas diferentes', () => {
    expect(() => convert(1, 'Pa.s', 'm2/s')).toThrow();
    expect(() => convert(1, 'kg', 'N')).toThrow();
  });
  it('porcentagem é razão com fator 0,01', () => {
    expect(toSI(50, '%')).toBeCloseTo(0.5, 12);
  });
});

describe('formatação e leitura de números', () => {
  it('formata no padrão brasileiro', () => {
    expect(fmt(1177.2, 5)).toBe('1.177,2');
    expect(fmt(0.0015)).toBe('0,0015');
    expect(fmt(5e-5)).toBe('5 × 10⁻⁵');
    expect(fmt(0)).toBe('0');
  });
  it('lê vírgula, ponto e notação científica; recusa texto', () => {
    expect(parseNumber('0,0015')).toBe(0.0015);
    expect(parseNumber('1.234,5')).toBe(1234.5);
    expect(parseNumber('2.5')).toBe(2.5);
    expect(parseNumber('-800')).toBe(-800);
    expect(parseNumber('5e-5')).toBe(5e-5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1,2,3')).toBeNull();
  });
});

describe('correção de respostas numéricas', () => {
  const exp = { value: -800, unit: 'J' };
  it('aceita valor certo e unidades equivalentes', () => {
    expect(checkNumericAnswer(-800, 'J', exp).status).toBe('correto');
    expect(checkNumericAnswer(-0.8, 'kJ', exp).status).toBe('correto');
    expect(checkNumericAnswer(-801, 'J', exp).status).toBe('correto');
  });
  it('rejeita sinal errado', () => {
    expect(checkNumericAnswer(800, 'J', exp).status).toBe('sinal');
  });
  it('rejeita unidade de outra grandeza mesmo com o número certo', () => {
    expect(checkNumericAnswer(-800, 'W', exp).status).toBe('unidade');
    expect(checkNumericAnswer(5e-5, 'Pa.s', { value: 5e-5, unit: 'm2/s' }).status).toBe('unidade');
  });
  it('detecta erro de potência de 10 (conversão esquecida)', () => {
    expect(checkNumericAnswer(-800000, 'J', exp).status).toBe('potencia10');
    expect(checkNumericAnswer(25, 'kPa', { value: 25, unit: 'Pa' }).status).toBe('potencia10');
  });
  it('detecta o erro do diâmetro no lugar do raio', () => {
    const r = checkNumericAnswer(4 * 282.7, 'kg', { value: 282.7, unit: 'kg' });
    expect(r.status).toBe('incorreto');
    expect(r.message).toMatch(/diâmetro/);
  });
  it('trata entrada vazia e respostas zero', () => {
    expect(checkNumericAnswer(null, 'J', exp).status).toBe('invalido');
    expect(checkNumericAnswer(0, 'J', { value: 0, unit: 'J' }).status).toBe('correto');
    expect(checkNumericAnswer(5, 'J', { value: 0, unit: 'J' }).status).toBe('incorreto');
  });
  it('eficiência em % ou fração', () => {
    expect(checkNumericAnswer(61.8, '%', { value: 0.6178, unit: '-' }).status).toBe('correto');
    expect(checkNumericAnswer(94, '%', { value: 0.6178, unit: '-' }).status).toBe('incorreto');
  });
});
