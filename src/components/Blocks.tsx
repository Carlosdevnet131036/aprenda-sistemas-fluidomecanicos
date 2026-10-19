import { useMemo, useState } from 'react';
import type { Block, CalloutKind } from '../content/types';
import { getExercise } from '../content/exercises';
import { getQuestion } from '../content/questions';
import { BLOCK_NAMES, CHECKLIST, IDENTIFY, PITFALLS } from '../content/reference';
import { moduleHref } from '../router';
import { useProgress } from '../progressContext';
import { Diagram } from './Diagrams';
import { ExerciseCard } from './ExerciseCard';
import { FormulaZoom, SymbolCards } from './FormulaZoom';
import { Quiz } from './Quiz';
import { Rich } from './Rich';
import { Tex } from './Tex';

const CALLOUT_LABEL: Record<CalloutKind, string> = {
  conceito: 'Conceito',
  analogia: 'Analogia',
  alerta: 'Atenção',
  dica: 'Dica',
  exemplo: 'Exemplo',
  fonte: 'Do material',
  complemento: 'Complemento didático',
  erro: 'Erro encontrado',
};

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'p':
      return (
        <p>
          <Rich text={b.text} />
        </p>
      );
    case 'list': {
      const L = b.ordered ? 'ol' : 'ul';
      return (
        <L className="list">
          {b.items.map((it, i) => (
            <li key={i}>
              <Rich text={it} />
            </li>
          ))}
        </L>
      );
    }
    case 'formula':
      return (
        <div className="formula">
          {b.caption && <p className="formula__caption">{b.caption}</p>}
          <Tex tex={b.tex} block />
          <div className="formula__tools">
            <FormulaZoom tex={b.tex} title={b.caption} symbols={b.symbols} />
          </div>
          {b.symbols && <SymbolCards symbols={b.symbols} />}
          {b.symbols && (
            <div className="table-wrap symbols-wrap symbols-table" tabIndex={0} role="region" aria-label="Símbolos da fórmula">
              <table className="symbols">
                <thead>
                  <tr>
                    <th>Símbolo</th>
                    <th>Significado</th>
                    <th>Unidade (SI)</th>
                  </tr>
                </thead>
                <tbody>
                  {b.symbols.map((s) => (
                    <tr key={s.sym}>
                      <td>
                        <Tex tex={s.sym} />
                      </td>
                      <td>{s.name}</td>
                      <td>{s.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {b.when && (
            <p className="formula__when">
              <strong>Quando usar:</strong> {b.when}
            </p>
          )}
        </div>
      );
    case 'callout':
      return (
        <aside className={`callout callout--${b.kind}`}>
          <p className="callout__title">
            <span className="callout__kind">{CALLOUT_LABEL[b.kind]}</span>
            {b.title && b.title !== CALLOUT_LABEL[b.kind] && <> — {b.title}</>}
          </p>
          <Blocks blocks={b.body} />
        </aside>
      );
    case 'table':
      return (
        <div className="table-wrap" tabIndex={0} role="region" aria-label={b.caption ?? 'Tabela'}>
          <table className="table">
            {b.caption && <caption>{b.caption}</caption>}
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'worked':
      return (
        <div className="worked">
          <p className="worked__kicker">Exemplo resolvido{b.source ? ` • ${b.source}` : ''}</p>
          <h4>{b.title}</h4>
          <p className="worked__statement">{b.statement}</p>
          <dl className="worked__rows">
            {b.rows.map((r, i) => (
              <div key={i} className={`worked__row worked__row--${r.label === 'Atenção' ? 'warn' : r.label === 'Resultado' ? 'result' : 'std'}`}>
                <dt>{r.label}</dt>
                <dd>{r.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case 'diagram':
      return <Diagram id={b.id} />;
    case 'exercise': {
      const ex = getExercise(b.id);
      return ex ? <ExerciseCard ex={ex} /> : null;
    }
    case 'vf':
      return <InlineVF ids={b.ids} />;
    case 'calc':
      return (
        <p>
          <a className="btn btn--ghost" href={`#/laboratorio/${b.id}`}>
            🧪 {b.label}
          </a>
        </p>
      );
    case 'link':
      return (
        <p>
          <a className={`btn ${b.primary ? '' : 'btn--ghost'}`} href={b.href}>
            {b.label}
          </a>
        </p>
      );
    case 'identify':
      return <Identify />;
    case 'checklist':
      return <Checklist />;
    case 'pitfalls':
      return <Pitfalls />;
  }
}

function InlineVF({ ids }: { ids: string[] }) {
  const [round, setRound] = useState(0);
  const qs = useMemo(() => ids.map((id) => getQuestion(id)!).filter(Boolean), [ids, round]); // nova referência reinicia o quiz
  return (
    <div className="inline-vf">
      <p className="muted">
        Julgue cada afirmação como Verdadeira ou Falsa. A correção aparece logo após cada resposta. Quer mais questões? Use o{' '}
        <a href="#/quiz">Quiz completo</a>.
      </p>
      <Quiz questions={qs} mode="aprendizagem" scope="Verificação de módulo" compact onRetry={() => setRound((r) => r + 1)} />
    </div>
  );
}

function Identify() {
  const [picked, setPicked] = useState<Record<string, number>>({});
  const done = Object.keys(picked).length;
  const right = IDENTIFY.filter((i) => picked[i.id] === i.block).length;
  return (
    <div className="identify">
      <p className="muted small" aria-live="polite">
        Respondidas: {done} de {IDENTIFY.length} • Acertos: {right}
      </p>
      <ol>
        {IDENTIFY.map((it) => {
          const p = picked[it.id];
          return (
            <li key={it.id} className="identify__item">
              <p>{it.statement}</p>
              <div className="chips" role="group" aria-label="Escolha o bloco">
                {([1, 2, 3, 4, 5] as const).map((bl) => {
                  const state = p === undefined ? '' : bl === it.block ? 'chip--right' : p === bl ? 'chip--wrong' : '';
                  return (
                    <button key={bl} type="button" className={`chip ${state}`} aria-pressed={p === bl} disabled={p !== undefined} onClick={() => setPicked({ ...picked, [it.id]: bl })}>
                      {bl}. {BLOCK_NAMES[bl]}
                    </button>
                  );
                })}
              </div>
              {p !== undefined && (
                <p className={`check check--${p === it.block ? 'ok' : 'bad'}`} role="status">
                  {p === it.block ? '✓ Isso mesmo. ' : `✗ É o bloco ${it.block} (${BLOCK_NAMES[it.block]}). `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {done > 0 && (
        <button type="button" className="btn btn--ghost" onClick={() => setPicked({})}>
          Recomeçar
        </button>
      )}
    </div>
  );
}

function Checklist() {
  const [state, progress] = useProgress();
  const n = CHECKLIST.filter((_, i) => state.checklist[`c${i}`]).length;
  return (
    <div className="checklist">
      <p className="muted small" aria-live="polite">
        {n} de {CHECKLIST.length} itens marcados
      </p>
      <ul>
        {CHECKLIST.map((c, i) => (
          <li key={c}>
            <label>
              <input type="checkbox" checked={!!state.checklist[`c${i}`]} onChange={() => progress.toggleChecklist(`c${i}`)} /> {c}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pitfalls() {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Pegadinhas">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Pegadinha</th>
            <th>Como evitar</th>
            <th>Aula</th>
          </tr>
        </thead>
        <tbody>
          {PITFALLS.map((p) => (
            <tr key={p.n}>
              <td>{p.n}</td>
              <td>
                <strong>{p.title}</strong>
              </td>
              <td>{p.avoid}</td>
              <td>
                <a href={moduleHref(p.module)}>Módulo {p.module.slice(1)}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
