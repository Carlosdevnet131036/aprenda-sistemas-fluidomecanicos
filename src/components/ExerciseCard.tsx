import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Exercise } from '../content/types';
import { checkNumericAnswer, type CheckResult } from '../lib/answerCheck';
import { exerciseNotebookKey } from '../lib/notes';
import type { SolutionStep, StepMark } from '../lib/progress';
import { getUnit, parseNumber } from '../lib/units';
import { moduleHref } from '../router';
import { useProgress } from '../progressContext';
import { AnswerComparison, AttemptHistory, GuidedSolution } from './ExerciseExtras';
import { FormulaZoom } from './FormulaZoom';
import { useHighlighter } from './Highlighter';
import { NotebookSnapshot, ReflectionForm, StepMarkControl } from './MyResolution';
import { NotebookButton, NotebookHost } from './Notebook';
import { Tex } from './Tex';

export function ExerciseCard({ ex, open: openInit = false }: { ex: Exercise; open?: boolean }) {
  const [open, setOpen] = useState(openInit);
  const [state] = useProgress();
  const solved = state.solvedExercises.includes(ex.id);
  const [round, setRound] = useState(0);
  // A resolução oficial fica oculta até o estudante pedir ("Conferir resolução").
  const [showSolution, setShowSolution] = useState(false);
  const solutionRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const nbKey = exerciseNotebookKey(ex.id);

  function checkSolution() {
    setShowSolution(true);
    requestAnimationFrame(() => solutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
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
          <ExerciseBody
            key={round}
            ex={ex}
            nbKey={nbKey}
            showSolution={showSolution}
            setShowSolution={setShowSolution}
            solutionRef={solutionRef}
            onRestart={() => {
              // refazer limpa resposta, dicas e resolução; caderno e destaques ficam
              setShowSolution(false);
              setRound((r) => r + 1);
            }}
          />
        </div>
      )}
      {open && (
        <NotebookHost
          nbKey={nbKey}
          footer={
            <div className="notebook__check">
              {showSolution ? (
                <>
                  <p className="small">A resolução oficial está aberta no exercício: compare etapa por etapa e registre como foi.</p>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={checkSolution}>
                    Ir para a resolução
                  </button>
                </>
              ) : (
                <>
                  <p className="small">Terminou? Compare com a resolução oficial — suas anotações continuam aqui.</p>
                  <button type="button" className="btn btn--sm" onClick={checkSolution}>
                    Conferir resolução
                  </button>
                </>
              )}
            </div>
          }
        />
      )}
    </article>
  );
}

interface BodyProps {
  ex: Exercise;
  nbKey: string;
  showSolution: boolean;
  setShowSolution: (fn: (s: boolean) => boolean) => void;
  solutionRef: RefObject<HTMLDivElement>;
  onRestart: () => void;
}

function ExerciseBody({ ex, nbKey, showSolution, setShowSolution, solutionRef, onRestart }: BodyProps) {
  const [state, progress] = useProgress();
  const [hints, setHints] = useState(0);
  const [guided, setGuided] = useState(false);
  const [marks, setMarks] = useState<Partial<Record<SolutionStep, StepMark>>>({});
  const hl = useHighlighter(ex);
  const markOf = (step: SolutionStep) => <StepMarkControl step={step} value={marks[step]} onChange={(m) => setMarks((x) => ({ ...x, [step]: m }))} />;
  const solved = state.solvedExercises.includes(ex.id);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(ex.answer?.units[0] ?? '');
  const [check, setCheck] = useState<CheckResult | null>(null);
  const inputId = useId();

  function verify() {
    if (!ex.answer) return;
    const r = checkNumericAnswer(parseNumber(value), unit, ex.answer);
    setCheck(r);
    if (r.status !== 'invalido') progress.recordExerciseAttempt(ex.id, r.status);
    if (r.status === 'correto') progress.markExerciseSolved(ex.id, `Exercício: ${ex.title}`, exerciseHref(ex.id));
  }

  return (
    <>
      <div className="exercise__tools">
        <NotebookButton nb={{ key: nbKey, title: ex.title, kind: 'exercicio' }} />
      </div>
      <div ref={hl.rootRef} className="exercise__text">
        {hl.toolbar}
        <p className="exercise__statement">{hl.renderField('enunciado', ex.statement)}</p>
        <div className="grid2">
          <div>
            <h5>Dados fornecidos</h5>
            <ul className="data-list">
              {ex.given.map((g, i) => (
                <li key={g}>{hl.renderField(`dado:${i}`, g)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h5>Pede-se</h5>
            <p>{hl.renderField('pede', ex.asked)}</p>
          </div>
        </div>
        {hl.status}
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
            Resolva no caderno de cálculos (ou no papel) e digite sua resposta para <strong>{ex.answer.label}</strong>:
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
          {check && <AnswerComparison ex={ex} value={value} unit={unit} check={check} showExpected={check.status === 'correto' || showSolution} />}
          <AttemptHistory stat={state.exerciseStats[ex.id]} solved={solved} />
        </form>
      )}
      {!ex.answer && !showSolution && (
        <p className="muted small">Questão conceitual: escreva sua resposta no caderno (ou no papel) antes de conferir a resolução.</p>
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
          <button type="button" className="btn btn--ghost" onClick={() => setGuided((g) => !g)} aria-expanded={guided}>
            {guided ? 'Fechar roteiro' : 'Resolver passo a passo'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setShowSolution((s) => !s)} aria-expanded={showSolution}>
            {showSolution ? 'Esconder resolução' : 'Conferir resolução'}
          </button>
          {(check || hints > 0 || showSolution || guided) && (
            <button type="button" className="btn btn--link" onClick={onRestart} title="Limpa resposta, dicas e resolução; seu progresso salvo é mantido">
              Refazer do zero
            </button>
          )}
          {ex.section && (
            <a className="btn btn--link" href={moduleHref(ex.module, ex.section)}>
              Voltar à teoria
            </a>
          )}
        </div>
      </div>

      {guided && <GuidedSolution ex={ex} onClose={() => setGuided(false)} />}

      {showSolution && (
        <div className="solution" ref={solutionRef} tabIndex={-1} aria-label="Resolução oficial">
          <NotebookSnapshot ex={ex} />
          <p className="solution__intro small muted">
            Resolução oficial. Marque cada etapa como “Entendi”, “Tive dificuldade” ou “Preciso revisar” e registre no fim como foi.
          </p>
          <Row label="Dados e incógnita" mark={markOf('dados')}>
            <ul>{ex.given.map((g) => <li key={g}>{g}</li>)}</ul>
            <p>
              <strong>Pede-se:</strong> {ex.asked}
            </p>
          </Row>
          <Row label="Conceito">{ex.concept}</Row>
          {ex.formulas.length > 0 && (
            <Row label="Fórmula" mark={markOf('formula')}>
              {ex.formulas.map((f) => (
                <div key={f} className="formula-line">
                  <Tex tex={f} block />
                  <FormulaZoom tex={f} title={`Fórmula — ${ex.title}`} />
                </div>
              ))}
            </Row>
          )}
          {ex.conversions.length > 0 && (
            <Row label="Conversões" mark={markOf('conversoes')}>
              {ex.conversions.join(' • ')}
            </Row>
          )}
          {ex.substitution.length > 0 && (
            <Row label="Substituição" mark={markOf('substituicao')}>
              {ex.substitution.join(' • ')}
            </Row>
          )}
          {ex.steps.length > 0 && (
            <Row label="Cálculo" mark={markOf('calculo')}>
              <ol className="steps">{ex.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            </Row>
          )}
          <Row label="Resultado" mark={markOf('resultado')}>
            <strong>{ex.result}</strong>
          </Row>
          <Row label="Interpretação" mark={markOf('interpretacao')}>
            {ex.interpretation}
          </Row>
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
            <button type="button" className="btn" onClick={() => progress.markExerciseSolved(ex.id, `Exercício: ${ex.title}`, exerciseHref(ex.id))}>
              Entendi — marcar como resolvido
            </button>
          )}
          <ReflectionForm ex={ex} marks={marks} href={exerciseHref(ex.id)} />
        </div>
      )}
    </>
  );
}

const exerciseHref = (id: string) => (id.startsWith('rev-') ? `#/revisao/${id}` : `#/exercicios/${id}`);

function Row({ label, children, mark }: { label: string; children: ReactNode; mark?: ReactNode }) {
  return (
    <div className="sol-row">
      <div className="sol-row__label">{label}</div>
      <div className="sol-row__body">
        {children}
        {mark}
      </div>
    </div>
  );
}
