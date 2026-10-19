import { useId, useState, type ReactNode } from 'react';
import type { Exercise } from '../content/types';
import { checkNumericAnswer, type CheckResult } from '../lib/answerCheck';
import { getUnit, parseNumber } from '../lib/units';
import { moduleHref } from '../router';
import { useProgress } from '../progressContext';
import { FormulaZoom } from './FormulaZoom';
import { Tex } from './Tex';

export function ExerciseCard({ ex, open: openInit = false }: { ex: Exercise; open?: boolean }) {
  const [open, setOpen] = useState(openInit);
  const [state] = useProgress();
  const solved = state.solvedExercises.includes(ex.id);
  const bodyId = useId();
  return (
    <article className={`exercise ${open ? 'exercise--open' : ''}`}>
      <button type="button" className="exercise__head" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
        <span className="exercise__title">
          {solved && <span className="badge badge--ok" aria-label="resolvido">✓</span>} {ex.title}
        </span>
        <span className="exercise__source">{ex.source}</span>
        <span className="exercise__chev" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div id={bodyId} className="exercise__body">
          <ExerciseBody ex={ex} />
        </div>
      )}
    </article>
  );
}

function ExerciseBody({ ex }: { ex: Exercise }) {
  const [, progress] = useProgress();
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(ex.answer?.units[0] ?? '');
  const [check, setCheck] = useState<CheckResult | null>(null);
  const inputId = useId();

  function verify() {
    if (!ex.answer) return;
    const r = checkNumericAnswer(parseNumber(value), unit, ex.answer);
    setCheck(r);
    if (r.status === 'correto') progress.markExerciseSolved(ex.id);
  }

  return (
    <>
      <p className="exercise__statement">{ex.statement}</p>
      <div className="grid2">
        <div>
          <h5>Dados fornecidos</h5>
          <ul className="data-list">{ex.given.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
        <div>
          <h5>Pede-se</h5>
          <p>{ex.asked}</p>
        </div>
      </div>

      {ex.answer && (
        <form
          className="attempt"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <label htmlFor={inputId}>
            Tente resolver no papel e digite sua resposta para <strong>{ex.answer.label}</strong>:
          </label>
          <div className="attempt__row">
            <input
              id={inputId}
              inputMode="decimal"
              autoComplete="off"
              value={value}
              placeholder="ex.: 0,025 ou -800"
              onChange={(e) => {
                setValue(e.target.value);
                setCheck(null);
              }}
            />
            <select
              aria-label="Unidade da resposta"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setCheck(null);
              }}
            >
              {ex.answer.units.map((u) => (
                <option key={u} value={u}>
                  {getUnit(u).label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn">
              Verificar
            </button>
          </div>
          {check && (
            <p className={`check check--${check.status === 'correto' ? 'ok' : 'bad'}`} role="status">
              {check.message}
            </p>
          )}
        </form>
      )}
      {!ex.answer && !showSolution && (
        <p className="muted small">Questão conceitual: escreva sua resposta no papel antes de abrir a resolução.</p>
      )}

      <div className="hints">
        {ex.hints.slice(0, hints).map((h, i) => (
          <p key={i} className="hint">
            <strong>Dica {i + 1}:</strong> {h}
          </p>
        ))}
        <div className="row">
          {hints < 3 && (
            <button type="button" className="btn btn--ghost" onClick={() => setHints((h) => h + 1)}>
              {hints === 0 ? 'Quero uma dica' : `Mostrar dica ${hints + 1} de 3`}
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => setShowSolution((s) => !s)} aria-expanded={showSolution}>
            {showSolution ? 'Esconder resolução' : 'Ver resolução completa'}
          </button>
          {ex.section && (
            <a className="btn btn--link" href={moduleHref(ex.module, ex.section)}>
              Voltar à teoria
            </a>
          )}
        </div>
      </div>

      {showSolution && (
        <div className="solution">
          <Row label="Conceito">{ex.concept}</Row>
          {ex.formulas.length > 0 && (
            <Row label="Fórmula">
              {ex.formulas.map((f) => (
                <div key={f} className="formula-line">
                  <Tex tex={f} block />
                  <FormulaZoom tex={f} title={`Fórmula — ${ex.title}`} />
                </div>
              ))}
            </Row>
          )}
          {ex.conversions.length > 0 && <Row label="Conversões">{ex.conversions.join(' • ')}</Row>}
          {ex.substitution.length > 0 && <Row label="Substituição">{ex.substitution.join(' • ')}</Row>}
          <Row label="Cálculo">
            <ol className="steps">{ex.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </Row>
          <Row label="Resultado">
            <strong>{ex.result}</strong>
          </Row>
          <Row label="Interpretação">{ex.interpretation}</Row>
          <Row label="Erros comuns">
            <ul>{ex.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
          </Row>
          {ex.audit && (
            <div className="callout callout--erro">
              <p className="callout__title">Auditoria do material</p>
              <p>{ex.audit}</p>
            </div>
          )}
          {!ex.answer && (
            <button type="button" className="btn" onClick={() => progress.markExerciseSolved(ex.id)}>
              Entendi — marcar como resolvido
            </button>
          )}
        </div>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sol-row">
      <div className="sol-row__label">{label}</div>
      <div className="sol-row__body">{children}</div>
    </div>
  );
}
