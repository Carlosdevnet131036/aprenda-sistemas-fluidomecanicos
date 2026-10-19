// Simulado de prova: configuração (questões, tempo, módulos, assuntos e
// níveis), prova com tempo ou modo aprendizagem, retomada após recarregar e
// histórico real dos simulados anteriores.
import { useMemo, useState } from 'react';
import type { ModuleId, Question, QuizLevel } from '../content/types';
import { MODULES } from '../content/modules';
import { QUESTIONS, getQuestion } from '../content/questions';
import { ACTIVE_EXAM_KEY, buildExam, EXAM_MAX_COUNT, EXAM_MIN_COUNT, formatClock, parseActiveExam, suggestedMinutes, type ActiveExam } from '../lib/exam';
import { filterBank } from '../lib/quiz';
import { Exam } from '../components/Exam';
import { Quiz } from '../components/Quiz';
import { useProgress } from '../progressContext';

const QUIZ_MODULES = MODULES.filter((m) => QUESTIONS.some((q) => q.module === m.id));
const LEVELS: { id: QuizLevel; label: string }[] = [
  { id: 'iniciante', label: 'Iniciante' },
  { id: 'intermediario', label: 'Intermediário' },
  { id: 'avancado', label: 'Avançado' },
];
const BANK_IDS = new Set(QUESTIONS.map((q) => q.id));

interface Cfg {
  mode: 'prova' | 'aprendizagem';
  modules: ModuleId[];
  topics: string[];
  levels: QuizLevel[];
  count: number;
  timeLimitMin: number;
}

function readActive(): ActiveExam | null {
  try {
    return parseActiveExam(sessionStorage.getItem(ACTIVE_EXAM_KEY), BANK_IDS);
  } catch {
    return null;
  }
}
function clearActive() {
  try {
    sessionStorage.removeItem(ACTIVE_EXAM_KEY);
  } catch {
    /* ignorado */
  }
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function SimuladoPage({ query }: { query: URLSearchParams }) {
  const [state] = useProgress();
  const initialCount = Math.max(EXAM_MIN_COUNT, Math.min(EXAM_MAX_COUNT, Number(query.get('n')) || 20));
  const [cfg, setCfg] = useState<Cfg>(() => ({
    mode: 'prova',
    modules: QUIZ_MODULES.map((m) => m.id),
    topics: [],
    levels: LEVELS.map((l) => l.id),
    count: initialCount,
    timeLimitMin: query.has('tempo') ? Math.max(0, Math.min(240, Number(query.get('tempo')) || 0)) : suggestedMinutes(initialCount),
  }));
  const [pendingResume, setPendingResume] = useState<ActiveExam | null>(readActive);
  const [run, setRun] = useState<{ exam: ActiveExam; questions: Question[] } | { learning: Question[]; scope: string } | null>(null);

  const topicsOfModules = useMemo(
    () => [...new Set(QUESTIONS.filter((q) => cfg.modules.includes(q.module)).map((q) => q.topic))].sort((a, b) => a.localeCompare(b, 'pt')),
    [cfg.modules],
  );
  const activeTopics = cfg.topics.filter((t) => topicsOfModules.includes(t));
  const available = filterBank(QUESTIONS, { modules: cfg.modules, levels: cfg.levels, topics: activeTopics }).length;
  const history = state.attempts.filter((a) => a.mode === 'simulado').slice(-5).reverse();

  const scope = cfg.modules.length === QUIZ_MODULES.length && activeTopics.length === 0 ? 'Todos os módulos' : activeTopics.length ? `${activeTopics.length} assunto(s)` : cfg.modules.map((m) => `M${m.slice(1)}`).join(', ');

  function start() {
    const built = buildExam(QUESTIONS, { ...cfg, topics: activeTopics }, Date.now());
    if (!built.questions.length) return;
    if (cfg.mode === 'aprendizagem') {
      setRun({ learning: built.questions, scope });
      return;
    }
    const exam: ActiveExam = { ids: built.questions.map((q) => q.id), answers: {}, flags: [], index: 0, startedAt: Date.now(), timeLimitMin: cfg.timeLimitMin, scope };
    setRun({ exam, questions: built.questions });
    window.scrollTo(0, 0);
  }

  if (run && 'exam' in run) {
    return (
      <div className="page page--narrow">
        <header className="page__head">
          <h1>Simulado de prova</h1>
          <p className="muted">
            {run.exam.scope} • {run.questions.length} questões • {run.exam.timeLimitMin > 0 ? `${run.exam.timeLimitMin} min` : 'sem limite de tempo'} • a correção
            aparece só depois da entrega.
          </p>
        </header>
        <Exam key={run.exam.startedAt} exam={run.exam} questions={run.questions} onRetry={start} onExit={() => setRun(null)} />
      </div>
    );
  }

  if (run && 'learning' in run) {
    return (
      <div className="page page--narrow">
        <header className="page__head">
          <h1>Simulado — modo aprendizagem</h1>
          <p className="muted">
            {run.scope} • {run.learning.length} questões • a explicação aparece logo após cada resposta.
          </p>
          <button type="button" className="btn btn--ghost" onClick={() => setRun(null)}>
            Mudar configuração
          </button>
        </header>
        <Quiz questions={run.learning} mode="aprendizagem" scope={`Simulado (aprendizagem) — ${run.scope}`} onRetry={start} />
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Simulado de prova</h1>
        <p className="lead">Treine nas condições da prova: tempo limitado, questões misturadas e correção só no final. Ou use o modo aprendizagem para ver a explicação de cada resposta na hora.</p>
      </header>

      {pendingResume && (
        <div className="callout callout--alerta" role="alert">
          <p className="callout__title">Há um simulado em andamento</p>
          <p>
            {pendingResume.ids.length} questões, {Object.values(pendingResume.answers).filter((v) => v !== undefined).length} respondidas
            {pendingResume.timeLimitMin > 0
              ? ` • tempo restante: ${formatClock(Math.max(0, pendingResume.timeLimitMin * 60 - (Date.now() - pendingResume.startedAt) / 1000))} (o relógio continuou correndo)`
              : ''}
            .
          </p>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setRun({ exam: pendingResume, questions: pendingResume.ids.map((id) => getQuestion(id)!) });
                setPendingResume(null);
              }}
            >
              Retomar simulado
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                clearActive();
                setPendingResume(null);
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <form
        className="panel setup"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <fieldset>
          <legend>Modo</legend>
          <label className="radio">
            <input type="radio" name="sim-modo" checked={cfg.mode === 'prova'} onChange={() => setCfg({ ...cfg, mode: 'prova' })} />
            <span>
              <strong>Prova</strong> — com tempo, uma questão por vez, marcação para revisar e correção só depois da entrega.
            </span>
          </label>
          <label className="radio">
            <input type="radio" name="sim-modo" checked={cfg.mode === 'aprendizagem'} onChange={() => setCfg({ ...cfg, mode: 'aprendizagem' })} />
            <span>
              <strong>Aprendizagem</strong> — resposta e explicação logo após cada questão, sem tempo.
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Número de questões e tempo</legend>
          <div className="setup__row">
            <label className="field">
              <span className="field__label">Questões ({EXAM_MIN_COUNT} a {EXAM_MAX_COUNT})</span>
              <IntField value={cfg.count} min={EXAM_MIN_COUNT} max={EXAM_MAX_COUNT} onChange={(n) => setCfg({ ...cfg, count: n })} />
            </label>
            {cfg.mode === 'prova' && (
              <label className="field">
                <span className="field__label">Tempo em minutos (0 = sem limite)</span>
                <IntField value={cfg.timeLimitMin} min={0} max={240} onChange={(n) => setCfg({ ...cfg, timeLimitMin: n })} />
              </label>
            )}
          </div>
          {cfg.mode === 'prova' && (
            <button type="button" className="btn btn--link" onClick={() => setCfg({ ...cfg, timeLimitMin: suggestedMinutes(cfg.count) })}>
              Usar tempo sugerido ({suggestedMinutes(cfg.count)} min ≈ 1,5 min por afirmação)
            </button>
          )}
        </fieldset>

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
            <button type="button" className="btn btn--link" onClick={() => setCfg({ ...cfg, modules: [], topics: [] })}>
              Limpar
            </button>
          </div>
        </fieldset>

        {topicsOfModules.length > 0 && (
          <fieldset>
            <legend>Assuntos (opcional)</legend>
            <p className="muted small">Sem nenhum assunto marcado, todos os assuntos dos módulos escolhidos entram.</p>
            <div className="chips">
              {topicsOfModules.map((t) => (
                <label key={t} className={`chip ${activeTopics.includes(t) ? 'chip--on' : ''}`}>
                  <input type="checkbox" className="sr-only" checked={activeTopics.includes(t)} onChange={() => setCfg({ ...cfg, topics: toggle(activeTopics, t) })} />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
        )}

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

        <p className={available < cfg.count ? 'check check--bad' : 'muted small'} aria-live="polite">
          {available === 0
            ? 'Nenhuma questão para essa combinação. Marque ao menos um módulo e um nível.'
            : available < cfg.count
              ? `O banco tem só ${available} questão(ões) para essa seleção; o simulado terá ${available}, não ${cfg.count}.`
              : `${available} questões disponíveis para sorteio.`}
        </p>
        <button type="submit" className="btn btn--big" disabled={available === 0}>
          {cfg.mode === 'prova' ? 'Começar o simulado' : 'Começar no modo aprendizagem'}
        </button>
      </form>

      <section className="panel" aria-labelledby="sim-hist">
        <h2 id="sim-hist">Seus últimos simulados</h2>
        {history.length === 0 ? (
          <p className="empty">Nenhum simulado entregue ainda. Seu histórico aparecerá aqui.</p>
        ) : (
          <ul className="topic-list">
            {history.map((a, k) => (
              <li key={k}>
                <span>
                  {a.date ? new Date(a.date).toLocaleDateString('pt-BR') : '—'} — {a.scope}
                </span>
                <span>
                  <strong>{Math.round((a.correct / a.total) * 100)}%</strong> ({a.correct}/{a.total})
                  {a.durationSec !== undefined && <span className="muted small"> • {formatClock(a.durationSec)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Campo inteiro que aceita digitação livre e só limita o valor ao sair do campo. */
function IntField({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(String(value));
  }
  const commit = () => {
    const n = Math.round(Number(text.replace(',', '.')));
    const v = Number.isFinite(n) && text.trim() !== '' ? Math.max(min, Math.min(max, n)) : value;
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={commit}
    />
  );
}
