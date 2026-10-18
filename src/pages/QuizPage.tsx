import { useMemo, useState } from 'react';
import type { ModuleId, Question, QuizLevel } from '../content/types';
import { MODULES } from '../content/modules';
import { QUESTIONS } from '../content/questions';
import { filterBank, selectQuestions } from '../lib/quiz';
import { Quiz, type QuizMode } from '../components/Quiz';
import { useProgress } from '../progressContext';

const QUIZ_MODULES = MODULES.filter((m) => QUESTIONS.some((q) => q.module === m.id));
const LEVELS: { id: QuizLevel; label: string }[] = [
  { id: 'iniciante', label: 'Iniciante' },
  { id: 'intermediario', label: 'Intermediário' },
  { id: 'avancado', label: 'Avançado' },
];

interface Run {
  questions: Question[];
  mode: QuizMode;
  scope: string;
  config: Config;
}
interface Config {
  mode: QuizMode;
  modules: ModuleId[];
  levels: QuizLevel[];
  count: number;
  errorsOnly: boolean;
}

function build(cfg: Config, wrong: Record<string, number>): Run {
  let questions: Question[];
  let scope: string;
  if (cfg.errorsOnly) {
    const pool = QUESTIONS.filter((q) => wrong[q.id]);
    questions = selectQuestions(pool, { count: Math.min(cfg.count, pool.length), seed: Date.now() });
    scope = 'Revisão de erros';
  } else {
    questions = selectQuestions(QUESTIONS, { modules: cfg.modules, levels: cfg.levels, count: cfg.count, seed: Date.now() });
    scope = cfg.modules.length === QUIZ_MODULES.length ? 'Todos os módulos' : cfg.modules.map((m) => `M${m.slice(1)}`).join(', ');
  }
  return { questions, mode: cfg.mode, scope, config: cfg };
}

export function QuizPage({ query }: { query: URLSearchParams }) {
  const [state] = useProgress();
  const initial: Config = useMemo(() => {
    const mods = (query.get('modulos') ?? '')
      .split(',')
      .filter((m): m is ModuleId => QUIZ_MODULES.some((x) => x.id === m));
    return {
      mode: query.get('modo') === 'avaliacao' ? 'avaliacao' : 'aprendizagem',
      modules: mods.length ? mods : QUIZ_MODULES.map((m) => m.id),
      levels: LEVELS.map((l) => l.id),
      count: Math.max(5, Math.min(40, Number(query.get('n')) || 15)),
      errorsOnly: query.get('erros') === '1',
    };
  }, [query]);
  const autoStart = query.has('modo') || query.has('erros');
  const [cfg, setCfg] = useState(initial);
  const [run, setRun] = useState<Run | null>(() => (autoStart ? build(initial, state.wrongQuestions) : null));

  const available = cfg.errorsOnly ? Object.keys(state.wrongQuestions).length : filterBank(QUESTIONS, cfg).length;
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (run) {
    return (
      <div className="page page--narrow">
        <nav className="crumbs" aria-label="Você está em">
          <a href="#/">Início</a> › <a href="#/quiz" onClick={() => setRun(null)}>Quiz</a> › <span aria-current="page">{run.mode === 'avaliacao' ? 'Modo avaliação' : 'Modo aprendizagem'}</span>
        </nav>
        <header className="page__head">
          <h1>{run.mode === 'avaliacao' ? 'Avaliação' : 'Quiz de aprendizagem'}</h1>
          <p className="muted">
            {run.scope} • {run.questions.length} questões •{' '}
            {run.mode === 'avaliacao' ? 'a correção aparece somente ao entregar.' : 'a correção aparece após cada resposta.'}
          </p>
          <button type="button" className="btn btn--ghost" onClick={() => setRun(null)}>
            Mudar configuração
          </button>
        </header>
        <Quiz questions={run.questions} mode={run.mode} scope={run.scope} onRetry={() => setRun(build(run.config, state.wrongQuestions))} />
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Quiz de Verdadeiro ou Falso</h1>
        <p className="lead">Julgue cada afirmação. As falsas trazem a versão corrigida; os erros mostram o conceito a revisar.</p>
      </header>
      <form
        className="panel setup"
        onSubmit={(e) => {
          e.preventDefault();
          setRun(build(cfg, state.wrongQuestions));
        }}
      >
        <fieldset>
          <legend>Modo</legend>
          <label className="radio">
            <input type="radio" name="modo" checked={cfg.mode === 'aprendizagem'} onChange={() => setCfg({ ...cfg, mode: 'aprendizagem' })} />
            <span>
              <strong>Aprendizagem</strong> — explicação logo após cada resposta, com link para a teoria.
            </span>
          </label>
          <label className="radio">
            <input type="radio" name="modo" checked={cfg.mode === 'avaliacao'} onChange={() => setCfg({ ...cfg, mode: 'avaliacao' })} />
            <span>
              <strong>Avaliação</strong> — responda tudo sem ver a correção; ela aparece completa ao entregar.
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Questões</legend>
          <label className="check-line">
            <input type="checkbox" checked={cfg.errorsOnly} onChange={() => setCfg({ ...cfg, errorsOnly: !cfg.errorsOnly })} />
            Só as questões que errei ({Object.keys(state.wrongQuestions).length})
          </label>
        </fieldset>

        {!cfg.errorsOnly && (
          <>
            <fieldset>
              <legend>Módulos</legend>
              <div className="chips">
                {QUIZ_MODULES.map((m) => (
                  <label key={m.id} className={`chip ${cfg.modules.includes(m.id) ? 'chip--on' : ''}`}>
                    <input type="checkbox" className="sr-only" checked={cfg.modules.includes(m.id)} onChange={() => setCfg({ ...cfg, modules: toggle(cfg.modules, m.id) })} />
                    {m.num}. {m.short}
                  </label>
                ))}
              </div>
              <div className="row">
                <button type="button" className="btn btn--link" onClick={() => setCfg({ ...cfg, modules: QUIZ_MODULES.map((m) => m.id) })}>
                  Marcar todos
                </button>
                <button type="button" className="btn btn--link" onClick={() => setCfg({ ...cfg, modules: [] })}>
                  Limpar
                </button>
              </div>
            </fieldset>
            <fieldset>
              <legend>Níveis</legend>
              <div className="chips">
                {LEVELS.map((l) => (
                  <label key={l.id} className={`chip ${cfg.levels.includes(l.id) ? 'chip--on' : ''}`}>
                    <input type="checkbox" className="sr-only" checked={cfg.levels.includes(l.id)} onChange={() => setCfg({ ...cfg, levels: toggle(cfg.levels, l.id) })} />
                    {l.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <fieldset>
          <legend>Quantidade</legend>
          <div className="chips">
            {[10, 15, 20, 30].map((n) => (
              <label key={n} className={`chip ${cfg.count === n ? 'chip--on' : ''}`}>
                <input type="radio" name="qtd" className="sr-only" checked={cfg.count === n} onChange={() => setCfg({ ...cfg, count: n })} />
                {n}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="muted small" aria-live="polite">
          {available === 0
            ? cfg.errorsOnly
              ? 'Você ainda não tem questões erradas registradas.'
              : 'Nenhuma questão para essa combinação. Marque ao menos um módulo e um nível.'
            : `${available} questões disponíveis para sorteio${available < cfg.count ? ` (serão usadas ${available})` : ''}.`}
        </p>
        <button type="submit" className="btn btn--big" disabled={available === 0}>
          Começar
        </button>
      </form>
    </div>
  );
}
