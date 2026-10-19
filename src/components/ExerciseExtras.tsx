// Recursos de estudo ativo dos exercícios: roteiro guiado em 9 passos,
// comparação da resposta com o resultado esperado e histórico de tentativas.
import { useState, type ReactNode } from 'react';
import type { Exercise } from '../content/types';
import type { CheckResult } from '../lib/answerCheck';
import type { ExerciseStat } from '../lib/progress';
import { fmt, fromSI, getUnit, parseNumber, toSI } from '../lib/units';
import { Tex } from './Tex';

interface Step {
  title: string;
  prompt: string;
  reveal: ReactNode;
}

function stepsOf(ex: Exercise): Step[] {
  return [
    { title: 'Interpretar o enunciado', prompt: 'Em uma frase: que fenômeno está acontecendo e qual princípio físico se aplica?', reveal: ex.concept },
    { title: 'Identificar os dados', prompt: 'Liste cada dado com sua unidade.', reveal: <ul className="data-list">{ex.given.map((g) => <li key={g}>{g}</li>)}</ul> },
    { title: 'Identificar a incógnita', prompt: 'O que exatamente a questão pede, e em que unidade?', reveal: ex.asked },
    {
      title: 'Selecionar a fórmula',
      prompt: 'Qual equação liga os dados à incógnita? Escreva-a literalmente antes de pôr números.',
      reveal: ex.formulas.length ? ex.formulas.map((f) => <Tex key={f} tex={f} block />) : 'Questão conceitual: não há fórmula a aplicar.',
    },
    {
      title: 'Converter as unidades',
      prompt: 'Algum dado está fora do SI (mm, L, kPa, °C…)? Converta antes de substituir.',
      reveal: ex.conversions.length ? ex.conversions.join(' • ') : 'Nenhuma conversão necessária: os dados já estão no SI.',
    },
    {
      title: 'Substituir os valores',
      prompt: 'Troque cada símbolo pelo valor convertido, com unidade.',
      reveal: ex.substitution.length ? ex.substitution.join(' • ') : 'Não há substituição numérica nesta questão.',
    },
    { title: 'Calcular', prompt: 'Faça a conta com calma e confira na calculadora.', reveal: <ol className="steps">{ex.steps.map((s) => <li key={s}>{s}</li>)}</ol> },
    { title: 'Apresentar o resultado com unidade', prompt: 'Escreva o valor final com a unidade e o sinal corretos.', reveal: <strong>{ex.result}</strong> },
    { title: 'Interpretar fisicamente', prompt: 'O que esse número significa no equipamento real? O sinal faz sentido?', reveal: ex.interpretation },
  ];
}

export function GuidedSolution({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const steps = stepsOf(ex);
  const [shown, setShown] = useState(0);
  return (
    <div className="guided" aria-live="polite">
      <p className="guided__intro">
        Pense em cada passo antes de revelá-lo. Passo {Math.min(shown + 1, steps.length)} de {steps.length}.
      </p>
      <ol className="guided__list">
        {steps.slice(0, Math.min(shown + 1, steps.length)).map((s, k) => (
          <li key={s.title} className={k < shown ? 'is-revealed' : 'is-current'}>
            <p className="guided__title">{s.title}</p>
            <p className="muted small">{s.prompt}</p>
            {k < shown ? (
              <div className="guided__reveal">{s.reveal}</div>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => setShown((x) => x + 1)}>
                Já pensei — mostrar este passo
              </button>
            )}
          </li>
        ))}
      </ol>
      {shown >= steps.length && <p className="check check--ok">Roteiro completo. Agora tente refazer sozinho, sem olhar.</p>}
      <button type="button" className="btn btn--link" onClick={onClose}>
        Fechar roteiro
      </button>
    </div>
  );
}

/**
 * Compara a resposta digitada com o resultado esperado. O valor esperado só
 * aparece quando o estudante acertou ou já abriu a resolução.
 */
export function AnswerComparison({ ex, value, unit, check, showExpected }: { ex: Exercise; value: string; unit: string; check: CheckResult; showExpected: boolean }) {
  const a = ex.answer;
  const x = parseNumber(value);
  if (!a || x === null || check.status === 'invalido') return null;
  const givenUnit = getUnit(unit);
  const expUnit = getUnit(a.unit);
  const sameDim = givenUnit.dim === expUnit.dim;
  const inExpected = sameDim ? fromSI(toSI(x, unit), a.unit) : null;
  const diff = inExpected !== null && a.value !== 0 ? ((inExpected - a.value) / Math.abs(a.value)) * 100 : null;
  return (
    <dl className="compare">
      <div>
        <dt>Sua resposta</dt>
        <dd>
          {fmt(x, 6)} {givenUnit.label}
          {sameDim && unit !== a.unit && inExpected !== null && (
            <span className="muted">
              {' '}
              = {fmt(inExpected, 6)} {expUnit.label}
            </span>
          )}
        </dd>
      </div>
      {showExpected ? (
        <>
          <div>
            <dt>Esperado</dt>
            <dd>
              {fmt(a.value, 6)} {expUnit.label} <span className="muted small">(tolerância de ±{Math.round((a.relTol ?? 0.01) * 100)}%)</span>
            </dd>
          </div>
          {diff !== null && (
            <div>
              <dt>Diferença</dt>
              <dd>{Math.abs(diff) < 0.05 ? 'nenhuma' : `${diff > 0 ? '+' : ''}${fmt(diff, 3)}%`}</dd>
            </div>
          )}
        </>
      ) : (
        <div>
          <dt>Esperado</dt>
          <dd className="muted">aparece quando você acertar ou abrir a resolução</dd>
        </div>
      )}
    </dl>
  );
}

const ERROR_LABEL: Record<string, string> = {
  sinal: 'sinal trocado',
  unidade: 'unidade de outra grandeza',
  potencia10: 'conversão (potência de 10)',
  incorreto: 'valor incorreto',
};

export function AttemptHistory({ stat, solved }: { stat?: ExerciseStat; solved: boolean }) {
  if (!stat) return null;
  const errs = Object.entries(stat.errors);
  return (
    <p className="muted small attempt-history">
      {stat.attempts} tentativa(s){solved ? ' • resolvido' : ''}
      {errs.length > 0 && <> • erros: {errs.map(([k, n]) => `${ERROR_LABEL[k] ?? k} (${n}×)`).join(', ')}</>}
    </p>
  );
}
