// Painel pessoal de preparação: próxima atividade, indicadores separados de
// conclusão (aulas) e domínio (acertos e revisão espaçada), pontos fortes e
// fracos, visão por módulo e atividades recentes. Só dados reais do estudante.
import { MODULES } from '../content/modules';
import { QUESTIONS } from '../content/questions';
import { EXERCISES } from '../content/exercises';
import { REVISAO } from '../content/revisao';
import { daysBetween } from '../lib/plan';
import { countSolved } from '../lib/progress';
import { recommend } from '../lib/recommend';
import { mastery } from '../lib/srs';
import { answerAccuracy, MIN_TOPIC_ATTEMPTS, moduleAccuracy, strongAndWeak } from '../lib/stats';
import { moduleHref } from '../router';
import { hasActiveExam, useStudyOverview } from '../studyOverview';

const KIND_ICON: Record<string, string> = { aula: '📘', quiz: '✔', simulado: '⏱', exercicio: '✎', revisao: '↻' };

export function Dashboard({ asTitle = false }: { asTitle?: boolean }) {
  const { state, today, due, perf, plan, todaySessions } = useStudyOverview();
  const lessons = MODULES.length;
  const done = MODULES.filter((m) => state.completedModules.includes(m.id)).length;
  const next = MODULES.find((m) => !state.completedModules.includes(m.id)) ?? null;
  const exSolved = countSolved(state.solvedExercises, EXERCISES.map((e) => e.id));
  const revSolved = countSolved(state.solvedExercises, REVISAO.map((e) => e.id));
  const acc = answerAccuracy(state.questionStats);
  const sw = strongAndWeak(perf);
  const intervals = state.settings.srsIntervals;
  const cards = Object.entries(state.reviews).filter(([id]) => QUESTIONS.some((q) => q.id === id));
  const mastered = cards.filter(([, c]) => mastery(c, intervals) === 'dominada').length;
  const modAcc = moduleAccuracy(perf);
  const lastSim = [...state.attempts].reverse().find((a) => a.mode === 'simulado');
  const planOn = state.plan?.enabled ? state.plan : null;
  const todayOpen = planOn ? todaySessions.find((s) => !planOn.done[s.id]) ?? null : null;
  const rec = recommend({
    activeExam: hasActiveExam(),
    dueReviews: due.length,
    todayPlan: todayOpen,
    nextModule: next && next.id !== 'm7' ? next : null,
    startedTrail: state.visitedModules.length > 0,
    weakest: sw.weak[0] ?? null,
  });
  const resume = state.activity[0];
  const daysLeft = planOn ? daysBetween(today, planOn.examDate) : null;

  return (
    <section className="dashboard" aria-labelledby="dash-t">
      <div className="dashboard__head">
        {asTitle ? <h1 id="dash-t">Seu painel de preparação</h1> : <h2 id="dash-t">Seu painel de preparação</h2>}
        {planOn && daysLeft !== null ? (
          <a className="countdown" href="#/plano">
            {daysLeft > 1 ? `Prova em ${daysLeft} dias` : daysLeft === 1 ? 'Prova amanhã' : daysLeft === 0 ? 'Prova hoje' : 'Data da prova passou'} • ver plano
          </a>
        ) : (
          <a className="btn btn--link" href="#/plano">
            Criar meu plano de estudos
          </a>
        )}
      </div>

      <div className="next-card">
        <p className="kicker">Próxima atividade recomendada</p>
        <h3>{rec.title}</h3>
        <p className="muted">{rec.reason}</p>
        <div className="row">
          <a className="btn btn--big" href={rec.href}>
            {rec.cta}
          </a>
          {resume && resume.href !== rec.href && (
            <a className="btn btn--ghost" href={resume.href}>
              Continuar de onde parei: {resume.label.length > 48 ? `${resume.label.slice(0, 46)}…` : resume.label}
            </a>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat__value">
            {done}/{lessons}
          </span>
          <span className="stat__label">aulas concluídas ({Math.round((done / lessons) * 100)}%)</span>
          <span className="stat__note">conclusão não é domínio</span>
        </div>
        <div className="stat">
          <span className="stat__value">
            {exSolved}/{EXERCISES.length}
          </span>
          <span className="stat__label">exercícios resolvidos</span>
          <span className="stat__note">
            lista de revisão: {revSolved}/{REVISAO.length}
          </span>
        </div>
        <div className={`stat ${acc ? (acc.percent >= 70 ? 'stat--ok' : 'stat--bad') : ''}`}>
          <span className="stat__value">{acc ? `${acc.percent}%` : '—'}</span>
          <span className="stat__label">taxa de acerto nas questões</span>
          <span className="stat__note">{acc ? `${acc.correct} de ${acc.total} respostas` : 'responda questões para medir'}</span>
        </div>
        <div className="stat">
          <span className="stat__value">
            {mastered}/{QUESTIONS.length}
          </span>
          <span className="stat__label">questões dominadas</span>
          <span className="stat__note">{cards.length ? `${cards.length} em revisão espaçada` : 'nenhuma em revisão ainda'}</span>
        </div>
        <div className={`stat ${due.length ? 'stat--hot' : ''}`}>
          <span className="stat__value">{due.length}</span>
          <span className="stat__label">revisões para hoje</span>
          {lastSim && <span className="stat__note">último simulado: {Math.round((lastSim.correct / lastSim.total) * 100)}%</span>}
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>Precisam de reforço</h3>
          {!sw.enough ? (
            <p className="muted">Ainda não há respostas suficientes (mínimo {MIN_TOPIC_ATTEMPTS} por assunto) para apontar pontos fracos.</p>
          ) : sw.weak.length ? (
            <ul>
              {sw.weak.map((t) => (
                <li key={t.topic}>
                  <a href={moduleHref(t.module, t.section)}>{t.topic}</a> — {Math.round(t.accuracy * 100)}% ({t.correct}/{t.attempts})
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhum assunto abaixo de 70% de acerto. Continue revisando.</p>
          )}
        </div>
        <div className="panel">
          <h3>Pontos fortes</h3>
          {!sw.enough ? (
            <p className="muted">Responda mais questões para identificar seus pontos fortes.</p>
          ) : sw.strong.length ? (
            <ul>
              {sw.strong.map((t) => (
                <li key={t.topic}>
                  {t.topic} — {Math.round(t.accuracy * 100)}% ({t.correct}/{t.attempts})
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhum assunto com 80% ou mais de acerto ainda.</p>
          )}
        </div>
      </div>

      <details className="panel module-overview" open={state.visitedModules.length > 0}>
        <summary>Visão geral por módulo</summary>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Visão geral por módulo">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Módulo</th>
                <th scope="col">Aula</th>
                <th scope="col">Acerto nas questões</th>
                <th scope="col">Exercícios</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.filter((m) => m.id !== 'm7').map((m) => {
                const ex = EXERCISES.filter((e) => e.module === m.id);
                const a = modAcc[m.id];
                return (
                  <tr key={m.id}>
                    <td>
                      <a href={moduleHref(m.id)}>
                        {m.num}. {m.short}
                      </a>
                    </td>
                    <td>{state.completedModules.includes(m.id) ? '✓ concluída' : state.visitedModules.includes(m.id) ? 'em andamento' : '—'}</td>
                    <td>{a ? `${a.percent}% (${a.total} resp.)` : 'sem respostas'}</td>
                    <td>{ex.length ? `${countSolved(state.solvedExercises, ex.map((e) => e.id))}/${ex.length}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <div className="panel">
        <h3>Últimas atividades</h3>
        {state.activity.length === 0 ? (
          <p className="muted">Nada registrado ainda. Suas aulas, quizzes, simulados, exercícios e revisões aparecerão aqui.</p>
        ) : (
          <ul className="activity">
            {state.activity.slice(0, 5).map((a) => (
              <li key={a.date + a.href}>
                <span aria-hidden="true">{KIND_ICON[a.kind] ?? '•'}</span> <a href={a.href}>{a.label}</a>{' '}
                <span className="muted small">— {new Date(a.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        )}
        {plan && planOn && <p className="muted small">Plano de estudos ativo: {plan.days.length} dia(s) planejado(s).</p>}
      </div>
    </section>
  );
}
