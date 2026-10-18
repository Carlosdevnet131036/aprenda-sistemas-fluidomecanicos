// Registro de unidades: cada unidade tem uma dimensão e um fator para a
// unidade-base do SI (valor_SI = valor × fator). Temperatura é tratada à parte
// porque °C ↔ K envolve soma (offset), não só multiplicação.

export type Dimension =
  | 'comprimento'
  | 'area'
  | 'volume'
  | 'massa'
  | 'forca'
  | 'pressao'
  | 'energia'
  | 'potencia'
  | 'viscDinamica'
  | 'viscCinematica'
  | 'taxa'
  | 'massaEspecifica'
  | 'pesoEspecifico'
  | 'calorEspecifico'
  | 'razao'
  | 'temperatura'
  | 'aceleracao'
  | 'velocidade';

export interface UnitDef {
  id: string;
  label: string;
  dim: Dimension;
  /** fator para a unidade-base (não usado para temperatura) */
  factor: number;
}

const U = (id: string, label: string, dim: Dimension, factor: number): UnitDef => ({ id, label, dim, factor });

export const UNITS: UnitDef[] = [
  U('mm', 'mm', 'comprimento', 1e-3),
  U('cm', 'cm', 'comprimento', 1e-2),
  U('dm', 'dm', 'comprimento', 1e-1),
  U('m', 'm', 'comprimento', 1),
  U('km', 'km', 'comprimento', 1e3),
  U('cm2', 'cm²', 'area', 1e-4),
  U('m2', 'm²', 'area', 1),
  U('mL', 'mL', 'volume', 1e-6),
  U('cm3', 'cm³', 'volume', 1e-6),
  U('L', 'L', 'volume', 1e-3),
  U('dm3', 'dm³', 'volume', 1e-3),
  U('m3', 'm³', 'volume', 1),
  U('g', 'g', 'massa', 1e-3),
  U('kg', 'kg', 'massa', 1),
  U('t', 't', 'massa', 1e3),
  U('N', 'N', 'forca', 1),
  U('kN', 'kN', 'forca', 1e3),
  U('Pa', 'Pa', 'pressao', 1),
  U('kPa', 'kPa', 'pressao', 1e3),
  U('MPa', 'MPa', 'pressao', 1e6),
  U('bar', 'bar', 'pressao', 1e5),
  U('atm', 'atm', 'pressao', 101_325),
  U('J', 'J', 'energia', 1),
  U('kJ', 'kJ', 'energia', 1e3),
  U('MJ', 'MJ', 'energia', 1e6),
  U('cal', 'cal', 'energia', 4.18),
  U('kcal', 'kcal', 'energia', 4180),
  U('W', 'W', 'potencia', 1),
  U('kW', 'kW', 'potencia', 1e3),
  U('MW', 'MW', 'potencia', 1e6),
  U('Pa.s', 'Pa·s', 'viscDinamica', 1),
  U('mPa.s', 'mPa·s', 'viscDinamica', 1e-3),
  U('cP', 'cP', 'viscDinamica', 1e-3),
  U('m2/s', 'm²/s', 'viscCinematica', 1),
  U('cSt', 'cSt (mm²/s)', 'viscCinematica', 1e-6),
  U('1/s', 's⁻¹', 'taxa', 1),
  U('kg/m3', 'kg/m³', 'massaEspecifica', 1),
  U('g/cm3', 'g/cm³', 'massaEspecifica', 1000),
  U('N/m3', 'N/m³', 'pesoEspecifico', 1),
  U('kN/m3', 'kN/m³', 'pesoEspecifico', 1e3),
  U('J/kgC', 'J/(kg·°C)', 'calorEspecifico', 1),
  U('-', 'adimensional', 'razao', 1),
  U('%', '%', 'razao', 0.01),
  U('K', 'K', 'temperatura', 1),
  U('C', '°C', 'temperatura', 1),
  U('m/s2', 'm/s²', 'aceleracao', 1),
  U('m/s', 'm/s', 'velocidade', 1),
];

const BY_ID = new Map(UNITS.map((u) => [u.id, u]));

export function getUnit(id: string): UnitDef {
  const u = BY_ID.get(id);
  if (!u) throw new Error(`Unidade desconhecida: ${id}`);
  return u;
}

export function unitsOf(dim: Dimension): UnitDef[] {
  return UNITS.filter((u) => u.dim === dim);
}

/** Converte para a unidade-base do SI (temperatura → K). */
export function toSI(value: number, unitId: string): number {
  const u = getUnit(unitId);
  if (u.dim === 'temperatura') return u.id === 'C' ? value + 273.15 : value;
  return value * u.factor;
}

export function fromSI(value: number, unitId: string): number {
  const u = getUnit(unitId);
  if (u.dim === 'temperatura') return u.id === 'C' ? value - 273.15 : value;
  return value / u.factor;
}

export function convert(value: number, from: string, to: string): number {
  const a = getUnit(from);
  const b = getUnit(to);
  if (a.dim !== b.dim) throw new Error(`Não dá para converter ${a.label} em ${b.label}: são grandezas diferentes.`);
  if (a.dim === 'temperatura' && value < 0 && a.id === 'K') throw new Error('Temperatura em kelvin não pode ser negativa.');
  const si = toSI(value, from);
  if (a.dim === 'temperatura' && si < 0) throw new Error('Abaixo do zero absoluto não existe temperatura.');
  return fromSI(si, to);
}

/** Formata número no padrão brasileiro com algarismos significativos. */
export function fmt(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e7 || abs < 1e-3) {
    const [m, e] = x.toExponential(Math.max(sig - 1, 0)).split('e');
    const mant = trimZeros(m).replace('.', ',');
    return `${mant} × 10${superscript(Number(e))}`;
  }
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(abs)));
  const fixed = x.toFixed(Math.min(digits, 10));
  const [int, dec] = trimZeros(fixed).split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${intFmt},${dec}` : intFmt;
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function superscript(n: number): string {
  return String(n).split('').map((c) => SUP[c] ?? c).join('');
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** Converte texto digitado (aceita vírgula ou ponto decimal) em número. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '');
  if (s === '') return null;
  // aceita "1.234,5" (pt-BR), "1234,5" e "1234.5"
  let norm = s;
  if (s.includes(',') && s.includes('.')) norm = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) norm = s.replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(norm)) return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}
