import { useMemo, useState } from 'react';
import type { ModuleId } from '../content/types';
import { MODULES, moduleLabel } from '../content/modules';
import { EXERCISES, getExercise } from '../content/exercises';
import { QUESTIONS } from '../content/questions';
import { FORMULAS, GLOSSARY } from '../content/reference';
import { CALCULATORS, getCalculator } from '../lib/calculators';
import { countSolved } from '../lib/progress';
import { convert, fmt, parseNumber, UNITS, unitsOf, type Dimension } from '../lib/units';
import { Calculator } from '../components/Calculator';
import { ManometerLab, NewtonianLab } from '../components/Labs';
import { ExerciseCard } from '../components/ExerciseCard';
import { Feedback } from '../components/Quiz';
import { Pitfalls } from '../components/Blocks';
import { Tex } from '../components/Tex';
import { useProgress } from '../progressContext';
import { moduleHref } from '../router';
import { Trail, useOverall } from './Home';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function TrailPage() {
  const { done, total } = useOverall();
  return (
    <div className="page">
      <header className="page__head">
        <h1>Trilha de aprendizagem</h1>
        <p className="lead">
          Siga os módulos em ordem: cada um usa o que foi visto antes. {done} de {total} concluídos.
        </p>
      </header>
      <Trail />
    </div>
  );
}

// ---------------- Laboratório ----------------
const LAB_EXTRA = [
  { id: 'manometro', title: 'Manômetro (tubo em U)', module: 'm5' as ModuleId, summary: 'Caminho trecho a trecho, com presets da Aula 5.' },
  { id: 'newtoniano', title: 'Newtoniano × não newtoniano', module: 'm4' as ModuleId, summary: 'Classifique um fluido pela tabela do ensaio.' },
];

export function LabPage({ id }: { id?: string }) {
  const items = [...CALCULATORS.map((c) => ({ id: c.id, title: c.title, module: c.module, summary: c.summary })), ...LAB_EXTRA].sort(
    (a, b) => a.module.localeCompare(b.module),
  );
  const current = id ?? items[0].id;
  const def = getCalculator(current);
  return (
    <div className="page lab">
      <header className="page__head">
        <h1>Laboratório de Fórmulas</h1>
        <p className="lead">Altere os valores e acompanhe a resolução completa: conversões, substituição, cálculo, resultado e significado físico.</p>
      </header>
      <div className="lab__layout">
        <nav className="lab__nav" aria-label="Calculadoras">
          {MODULES.filter((m) => items.some((i) => i.module === m.id)).map((m) => (
            <div key={m.id}>
              <p className="lab__group">Módulo {m.num} — {m.short}</p>
              <ul>
                {items
                  .filter((i) => i.module === m.id)
                  .map((i) => (
                    <li key={i.id}>
                      <a href={`#/laboratorio/${i.id}`} aria-current={i.id === current ? 'page' : undefined}>
                        {i.title}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="lab__main">
          <label className="field lab__select">
            <span className="field__label">Escolha a calculadora</span>
            <select value={current} onChange={(e) => (window.location.hash = `/laboratorio/${e.target.value}`)}>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  M{i.module.slice(1)} — {i.title}
                </option>
              ))}
            </select>
          </label>
          {current === 'manometro' ? <ManometerLab /> : current === 'newtoniano' ? <NewtonianLab /> : def ? <Calculator key={def.id} def={def} /> : <p className="empty">Calculadora não encontrada.</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------- Exercícios ----------------
export function ExercisesPage({ id }: { id?: string }) {
  const [state] = useProgress();
  const [filter, setFilter] = useState<ModuleId | 'todos'>('todos');
  const single = id ? getExercise(id) : undefined;
  if (single) {
    return (
      <div className="page page--narrow">
        <nav className="crumbs">
          <a href="#/exercicios">Exercícios</a> › <span aria-current="page">{single.title}</span>
        </nav>
        <ExerciseCard ex={single} open />
      </div>
    );
  }
  const mods = MODULES.filter((m) => EXERCISES.some((e) => e.module === m.id));
  const list = EXERCISES.filter((e) => filter === 'todos' || e.module === filter);
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Exercícios resolvidos</h1>
        <p className="lead">
          Listas 01 e da Aula 03, exercícios da Aula 5 e dos slides. Tente resolver, peça dicas progressivas e só depois abra a resolução.{' '}
          {countSolved(state.solvedExercises, EXERCISES.map((e) => e.id))} de {EXERCISES.length} resolvidos.
        </p>
      </header>
      <div className="chips" role="group" aria-label="Filtrar por módulo">
        <button type="button" className={`chip ${filter === 'todos' ? 'chip--on' : ''}`} aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>
          Todos
        </button>
        {mods.map((m) => (
          <button key={m.id} type="button" className={`chip ${filter === m.id ? 'chip--on' : ''}`} aria-pressed={filter === m.id} onClick={() => setFilter(m.id)}>
            {m.num}. {m.short}
          </button>
        ))}
      </div>
      {list.map((e) => (
        <ExerciseCard key={e.id} ex={e} />
      ))}
    </div>
  );
}

// ---------------- Glossário ----------------
export function GlossaryPage() {
  const [q, setQ] = useState('');
  const list = useMemo(() => GLOSSARY.filter((g) => norm(`${g.term} ${g.def} ${g.symbol ?? ''}`).includes(norm(q))).sort((a, b) => a.term.localeCompare(b.term, 'pt')), [q]);
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Glossário</h1>
        <p className="lead">{GLOSSARY.length} termos técnicos explicados em linguagem simples.</p>
      </header>
      <SearchBox value={q} onChange={setQ} label="Buscar termo" />
      {list.length === 0 ? (
        <p className="empty">Nenhum termo encontrado para “{q}”.</p>
      ) : (
        <dl className="glossary">
          {list.map((g) => (
            <div key={g.term} className="glossary__item">
              <dt>
                {g.term} {g.symbol && <span className="sym">({g.symbol})</span>}
              </dt>
              <dd>
                {g.def} <a href={moduleHref(g.module)} className="small">Módulo {g.module.slice(1)}</a>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// ---------------- Formulário ----------------
export function FormulasPage() {
  const [q, setQ] = useState('');
  const list = FORMULAS.filter((f) => norm(`${f.name} ${f.keywords} ${f.note} ${f.vars}`).includes(norm(q)));
  return (
    <div className="page">
      <header className="page__head">
        <h1>Formulário</h1>
        <p className="lead">Todas as fórmulas do material, com unidades e lembretes. Pesquise por nome ou palavra-chave (ex.: “kelvin”, “tubo em U”, “litros”).</p>
      </header>
      <SearchBox value={q} onChange={setQ} label="Buscar fórmula" />
      {list.length === 0 && <p className="empty">Nenhuma fórmula encontrada para “{q}”.</p>}
      <div className="formula-grid">
        {list.map((f) => (
          <article key={f.id} className="formula-card">
            <p className="kicker">{moduleLabel(f.module)}</p>
            <h3>{f.name}</h3>
            <Tex tex={f.tex} block />
            {f.vars && <p className="small">{f.vars}</p>}
            <p className="small muted">{f.note}</p>
            <div className="row">
              <a className="btn btn--link" href={moduleHref(f.module)}>
                Teoria
              </a>
              {f.calc && (
                <a className="btn btn--link" href={`#/laboratorio/${f.calc}`}>
                  Calculadora
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ---------------- Conversor ----------------
const DIMS: { dim: Dimension; label: string }[] = [
  { dim: 'comprimento', label: 'Comprimento' },
  { dim: 'area', label: 'Área' },
  { dim: 'volume', label: 'Volume' },
  { dim: 'massa', label: 'Massa' },
  { dim: 'pressao', label: 'Pressão' },
  { dim: 'temperatura', label: 'Temperatura' },
  { dim: 'energia', label: 'Energia' },
  { dim: 'potencia', label: 'Potência' },
  { dim: 'viscDinamica', label: 'Viscosidade dinâmica' },
  { dim: 'viscCinematica', label: 'Viscosidade cinemática' },
  { dim: 'massaEspecifica', label: 'Massa específica' },
  { dim: 'forca', label: 'Força' },
];
const DEFAULT_PAIR: Partial<Record<Dimension, [string, string]>> = {
  comprimento: ['mm', 'm'],
  volume: ['L', 'm3'],
  pressao: ['kPa', 'Pa'],
  temperatura: ['C', 'K'],
  energia: ['kJ', 'J'],
  potencia: ['MW', 'W'],
};

export function ConverterPage() {
  const [dim, setDim] = useState<Dimension>('comprimento');
  const us = unitsOf(dim);
  const [from, setFrom] = useState('mm');
  const [to, setTo] = useState('m');
  const [val, setVal] = useState('1,50');
  const x = parseNumber(val);
  let result: string;
  try {
    result = x === null ? 'Digite um número.' : `${fmt(convert(x, from, to), 6)} ${UNITS.find((u) => u.id === to)!.label}`;
  } catch (e) {
    result = (e as Error).message;
  }
  function pickDim(d: Dimension) {
    setDim(d);
    const pair = DEFAULT_PAIR[d] ?? [unitsOf(d)[0].id, unitsOf(d)[unitsOf(d).length - 1].id];
    setFrom(pair[0]);
    setTo(pair[1]);
  }
  const fromU = UNITS.find((u) => u.id === from)!;
  const toU = UNITS.find((u) => u.id === to)!;
  const ratio = dim !== 'temperatura' ? fromU.factor / toU.factor : null;
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Conversor de unidades</h1>
        <p className="lead">Converta e veja a regra. Na prova, pergunte: a unidade nova é maior ou menor? Se for maior, o número diminui.</p>
      </header>
      <div className="panel converter">
        <label className="field">
          <span className="field__label">Grandeza</span>
          <select value={dim} onChange={(e) => pickDim(e.target.value as Dimension)}>
            {DIMS.map((d) => (
              <option key={d.dim} value={d.dim}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <div className="converter__row">
          <label className="field">
            <span className="field__label">Valor</span>
            <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">De</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {us.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="icon-btn" aria-label="Inverter unidades" onClick={() => (setFrom(to), setTo(from))}>
            ⇄
          </button>
          <label className="field">
            <span className="field__label">Para</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {us.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="result result--big" aria-live="polite">
          {result}
        </p>
        <p className="muted small">
          {dim === 'temperatura'
            ? 'Regra: T(K) = T(°C) + 273,15. Atenção: uma VARIAÇÃO de temperatura (ΔT) é igual em °C e em K.'
            : ratio !== null && ratio !== 1
              ? `Regra: 1 ${fromU.label} = ${fmt(ratio, 6)} ${toU.label} → ${ratio > 1 ? 'multiplique' : 'divida'} por ${fmt(ratio > 1 ? ratio : 1 / ratio, 6)}.`
              : 'As duas unidades são iguais.'}
          {dim === 'energia' && ' O material usa 1 cal = 4,18 J.'}
        </p>
      </div>
    </div>
  );
}

// ---------------- Meu estudo ----------------
export function StudyPage() {
  const [state, progress] = useProgress();
  const [confirm, setConfirm] = useState(false);
  const wrong = QUESTIONS.filter((q) => state.wrongQuestions[q.id]).sort((a, b) => state.wrongQuestions[b.id] - state.wrongQuestions[a.id]);
  const concepts = [...new Set(wrong.map((q) => q.review))];
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Meu estudo</h1>
        <p className="lead">Seu progresso, os erros dos quizzes, os conceitos a revisar e as pegadinhas.</p>
        {!progress.isPersistent() && (
          <p className="callout callout--alerta">Este navegador não permite salvar dados (modo privado ou armazenamento bloqueado). O progresso será perdido ao fechar a página.</p>
        )}
      </header>

      <section className="panel">
        <h2>Progresso por módulo</h2>
        <ul className="mod-progress">
          {MODULES.map((m) => {
            const ex = EXERCISES.filter((e) => e.module === m.id);
            const solved = ex.filter((e) => state.solvedExercises.includes(e.id)).length;
            const done = state.completedModules.includes(m.id);
            return (
              <li key={m.id}>
                <a href={moduleHref(m.id)}>
                  {m.num}. {m.title}
                </a>
                <span className={`badge ${done ? 'badge--ok' : ''}`}>{done ? 'Concluído' : state.visitedModules.includes(m.id) ? 'Em andamento' : 'Não iniciado'}</span>
                {ex.length > 0 && (
                  <span className="muted small">
                    {solved}/{ex.length} exercícios
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Tentativas de quiz</h2>
        {state.attempts.length === 0 ? (
          <p className="empty">Nenhuma tentativa ainda. <a href="#/quiz">Fazer um quiz</a>.</p>
        ) : (
          <ul>
            {[...state.attempts].reverse().slice(0, 10).map((a, i) => (
              <li key={i}>
                {new Date(a.date).toLocaleString('pt-BR')} — {a.mode === 'avaliacao' ? 'Avaliação' : 'Aprendizagem'} ({a.scope}): {a.correct}/{a.total} (
                {Math.round((a.correct / a.total) * 100)}%)
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Conceitos para revisar</h2>
        {concepts.length === 0 ? <p className="empty">Nada pendente: você não tem erros registrados.</p> : <ul>{concepts.map((c) => <li key={c}>{c}</li>)}</ul>}
      </section>

      <section className="panel">
        <h2>Revisão dos erros ({wrong.length})</h2>
        {wrong.length === 0 ? (
          <p className="empty">Quando você errar uma questão, ela aparece aqui até ser respondida corretamente.</p>
        ) : (
          <>
            <a className="btn" href="#/quiz?erros=1&modo=aprendizagem&n=40">
              Refazer só as questões que errei
            </a>
            <ol className="review-list">
              {wrong.map((q) => (
                <li key={q.id}>
                  <p className="quiz__statement small-statement">{q.statement}</p>
                  <p className="muted small">Errada {state.wrongQuestions[q.id]}×</p>
                  <Feedback q={q} given={!q.answer} />
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section className="panel">
        <h2>As 12 pegadinhas do material</h2>
        <Pitfalls />
      </section>

      <section className="panel panel--warn">
        <h2>Reiniciar dados de estudo</h2>
        <p>Apaga aulas concluídas, exercícios resolvidos, erros, tentativas e checklist deste navegador.</p>
        {!confirm ? (
          <button type="button" className="btn btn--danger" onClick={() => setConfirm(true)}>
            Apagar meu progresso
          </button>
        ) : (
          <div className="row">
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                progress.reset();
                setConfirm(false);
              }}
            >
              Sim, apagar tudo
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="search">
      <span className="sr-only">{label}</span>
      <input type="search" placeholder={`${label}…`} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
