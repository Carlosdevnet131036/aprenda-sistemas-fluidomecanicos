// Correção de respostas numéricas dos exercícios. Uma resposta só é aceita
// quando valor, SINAL e UNIDADE (dimensão) estão corretos. Unidades
// equivalentes (ex.: 0,75 kJ = 750 J) são aceitas após conversão.
import { getUnit, toSI } from './units';

export interface ExpectedAnswer {
  value: number;
  unit: string;
  /** tolerância relativa (padrão 1%) para absorver arredondamentos */
  relTol?: number;
}

export type CheckStatus = 'correto' | 'sinal' | 'unidade' | 'potencia10' | 'incorreto' | 'invalido';

export interface CheckResult {
  status: CheckStatus;
  message: string;
}

export function checkNumericAnswer(value: number | null, unitId: string, expected: ExpectedAnswer): CheckResult {
  if (value === null || !Number.isFinite(value)) {
    return { status: 'invalido', message: 'Digite um número válido (use vírgula ou ponto para decimais).' };
  }
  const given = getUnit(unitId);
  const exp = getUnit(expected.unit);
  if (given.dim !== exp.dim) {
    return {
      status: 'unidade',
      message: `A unidade escolhida (${given.label}) mede outra grandeza. A resposta pede uma unidade como ${exp.label}.`,
    };
  }
  const tol = expected.relTol ?? 0.01;
  const g = toSI(value, unitId);
  const e = toSI(expected.value, expected.unit);
  const close = (a: number, b: number) =>
    b === 0 ? Math.abs(a) <= 1e-9 : Math.abs(a - b) <= tol * Math.abs(b);

  if (close(g, e)) return { status: 'correto', message: 'Correto: valor, sinal e unidade conferem.' };
  if (e !== 0 && close(-g, e)) {
    return {
      status: 'sinal',
      message: 'O módulo está certo, mas o SINAL está trocado. Revise a convenção (Q > 0 recebe calor; W > 0 expansão; desce soma, sobe subtrai).',
    };
  }
  if (e !== 0 && g !== 0 && Math.sign(g) === Math.sign(e)) {
    const ratio = Math.log10(Math.abs(g / e));
    const k = Math.round(ratio);
    if (k !== 0 && Math.abs(ratio - k) < 0.01) {
      return {
        status: 'potencia10',
        message: `O número está ${Math.abs(k) === 3 ? '1000' : `10^${Math.abs(k)}`} vezes ${k > 0 ? 'maior' : 'menor'} que o esperado. Quase sempre é conversão de unidade (mm→m, L→m³, kPa→Pa, kJ→J).`,
      };
    }
    if (Math.abs(g / e - 4) < 0.04) {
      return { status: 'incorreto', message: 'O resultado está 4× maior: você pode ter usado o diâmetro no lugar do raio.' };
    }
  }
  return { status: 'incorreto', message: 'Ainda não. Confira os dados, as conversões e refaça a conta com calma.' };
}
