// "Minha resolução": depois de resolver no caderno, o estudante abre a
// resolução oficial, compara etapa por etapa e registra como foi. A avaliação
// é do estudante; o site só informa o resultado do corretor numérico quando o
// exercício tem resposta numérica verificável. Nada aqui altera o caderno.
import { useId, useState } from 'react';
import type { Exercise } from '../content/types';
import { exerciseNotebookKey } from '../lib/notes';
import { PAGE_H_DEFAULT } from '../lib/ink';
import { SOLUTION_STEPS, type Reflection, type SelfResult, type SolutionStep, type StepMark } from '../lib/progress';
import { useNotes } from '../notesContext';
import { useProgress } from '../progressContext';
import { InkView } from './Notebook';

export const STEP_LABEL: Record<SolutionStep, string> = {
  dados: 'Dados e incógnita',
  formula: 'Fórmula',
  conversoes: 'Conversões',
  substituicao: 'Substituição',
  calculo: 'Cálculo',
  resultado: 'Resultado',
  interpretacao: 'Interpretação',
};

const MARK_LABEL: Record<StepMark, string> = { entendi: 'Entendi', dificuldade: 'Tive dificuldade', revisar: 'Preciso revisar' };
const RESULT_LABEL: Record<SelfResult, string> = { acertei: 'Resolvi corretamente', dificuldade: 'Resolvi, mas com dificuldade', errei: 'Não consegui / errei' };

/** Etapas que a resolução oficial deste exercício realmente tem. */
export function stepsAvailable(ex: Exercise): SolutionStep[] {
  return SOLUTION_STEPS.filter((s) => {
    if (s === 'formula') return ex.formulas.length > 0;
    if (s === 'conversoes') return ex.conversions.length > 0;
    if (s === 'substituicao') return ex.substitution.length > 0;
    if (s === 'calculo') return ex.steps.length > 0;
    return true;
  });
}

export function StepMarkControl({ step, value, onChange }: { step: SolutionStep; value?: StepMark; onChange: (m: StepMark | undefined) => void }) {
  return (
    <div className="step-mark" role="group" aria-label={`Como foi a etapa ${STEP_LABEL[step]}`}>
      {(Object.keys(MARK_LABEL) as StepMark[]).map((m) => (
        <button key={m} type="button" className={`step-mark__btn step-mark__btn--${m}`} aria-pressed={value === m} onClick={() => onChange(value === m ? undefined : m)}>
          {MARK_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

/** O que o estudante escreveu no caderno deste exercício, só para leitura. */
export function NotebookSnapshot({ ex }: { ex: Exercise }) {
  const [notes] = useNotes();
  const nb = notes.notebooks[exerciseNotebookKey(ex.id)];
  const hasText = !!nb?.text.trim();
  const hasInk = !!nb && nb.ink.length > 0;
  let viewH = PAGE_H_DEFAULT;
  if (nb && hasInk) {
    let maxY = 0;
    for (const s of nb.ink) for (let i = 1; i < s.p.length; i += 2) maxY = Math.max(maxY, s.p[i]);
    viewH = Math.min(nb.inkHeight, Math.max(300, Math.ceil(maxY + 60)));
  }
  return (
    <details className="my-res" open>
      <summary>Minha resolução (do caderno)</summary>
      {!hasText && !hasInk ? (
        <p className="muted small">
          O caderno deste exercício está vazio. Se você resolveu no papel, compare com a sua folha e registre abaixo como foi.
        </p>
      ) : (
        <>
          {hasText && <pre className="my-res__text">{nb!.text}</pre>}
          {hasInk && <InkView strokes={nb!.ink} height={viewH} paper={notes.prefs.paper} label="Sua folha manuscrita deste exercício" />}
        </>
      )}
      <p className="muted small">Abrir a resolução oficial não altera o seu caderno. Diferenças de escrita não significam erro: compare o raciocínio e o resultado.</p>
    </details>
  );
}

function autoCheckOf(ex: Exercise, stat?: { lastStatus: string }): Reflection['autoCheck'] {
  if (!ex.answer || !stat) return null;
  return stat.lastStatus === 'correto' ? 'correto' : 'incorreto';
}

const AUTO_TEXT: Record<string, string> = {
  sinal: 'o sinal estava trocado',
  unidade: 'a unidade era de outra grandeza',
  potencia10: 'havia erro de potência de 10 (conversão)',
  incorreto: 'o valor não bateu com o resultado',
};

export function ReflectionForm({ ex, marks, href }: { ex: Exercise; marks: Partial<Record<SolutionStep, StepMark>>; href: string }) {
  const [state, progress] = useProgress();
  const stat = state.exerciseStats[ex.id];
  const auto = autoCheckOf(ex, stat);
  const available = stepsAvailable(ex);
  const firstHard = available.find((s) => marks[s] === 'dificuldade' || marks[s] === 'revisar') ?? '';
  const [result, setResult] = useState<SelfResult | null>(null);
  const [step, setStep] = useState<SolutionStep | '' | null>(null);
  const [concept, setConcept] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const history = state.reflections[ex.id] ?? [];
  const difficult = step ?? firstHard;

  function submit() {
    if (!result) return setError('Escolha como foi a sua resolução.');
    progress.recordReflection(ex.id, { result, steps: marks, difficultStep: difficult, concept: concept.trim(), note: note.trim(), autoCheck: auto }, ex.title, href);
    const card = progress.get().exerciseReviews[ex.id];
    const due = card ? new Date(`${card.due}T12:00:00`).toLocaleDateString('pt-BR') : '';
    setSaved(result === 'errei' ? 'Registrado. Este exercício volta para a sua revisão hoje.' : `Registrado. Próxima revisão deste exercício: ${due}.`);
    setError(null);
    setResult(null);
    setStep(null);
    setConcept('');
    setNote('');
  }

  return (
    <section className="reflect" aria-labelledby={`${id}-t`}>
      <h4 id={`${id}-t`}>Como foi a sua resolução?</h4>
      <p className="muted small">
        {auto === 'correto' && 'Verificação automática: sua última resposta numérica conferiu (valor, sinal e unidade). Avalie também o caminho até ela.'}
        {auto === 'incorreto' && `Verificação automática: na sua última resposta numérica, ${AUTO_TEXT[stat!.lastStatus] ?? 'o valor não conferiu'}.`}
        {auto === null &&
          (ex.answer
            ? 'Você ainda não digitou uma resposta numérica; a avaliação abaixo é sua.'
            : 'Esta questão não tem resposta numérica para conferência automática; a avaliação abaixo é sua.')}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset className="reflect__result">
          <legend>Resultado</legend>
          {(Object.keys(RESULT_LABEL) as SelfResult[]).map((r) => (
            <label key={r} className="chip">
              <input type="radio" name={`${id}-r`} value={r} checked={result === r} onChange={() => (setResult(r), setError(null))} /> {RESULT_LABEL[r]}
            </label>
          ))}
        </fieldset>
        {result === 'acertei' && auto === 'incorreto' && (
          <p className="callout callout--alerta small">Sua última resposta digitada não conferiu com o resultado oficial. Confira antes de registrar.</p>
        )}
        <div className="reflect__grid">
          <label className="field">
            <span className="field__label">Etapa que gerou dificuldade</span>
            <select value={difficult} onChange={(e) => setStep(e.target.value as SolutionStep | '')}>
              <option value="">Nenhuma</option>
              {available.map((s) => (
                <option key={s} value={s}>
                  {STEP_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Conceito para revisar</span>
            <input value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={300} placeholder="ex.: conversão de mm para m" />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Observação pessoal sobre o erro</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="O que você faria diferente da próxima vez?" />
        </label>
        <div className="row">
          <button type="submit" className="btn">
            Registrar no histórico
          </button>
        </div>
        {(error || saved) && (
          <p className={`check check--${error ? 'bad' : 'ok'}`} role="status">
            {error ?? saved}
          </p>
        )}
      </form>
      {history.length > 0 && (
        <details className="reflect__history">
          <summary>Registros anteriores ({history.length})</summary>
          <ol>
            {[...history].reverse().map((r) => (
              <li key={r.date}>
                <strong>{RESULT_LABEL[r.result]}</strong>
                <span className="muted small"> — {new Date(r.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                {r.difficultStep && <span className="small"> • dificuldade: {STEP_LABEL[r.difficultStep]}</span>}
                {r.concept && <span className="small"> • revisar: {r.concept}</span>}
                {r.note && <p className="small reflect__note">{r.note}</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
