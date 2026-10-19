// Revisão inteligente: questões vencidas na revisão espaçada, sessão rápida,
// assuntos com erros recorrentes, exercícios para refazer e configuração dos
// intervalos. Tudo vem dos dados salvos neste navegador.
import { useMemo, useState } from 'react';
import { QUESTIONS, getQuestion } from '../content/questions';
import { getExercise } from '../content/exercises';
import { getRevisao } from '../content/revisao';
import { moduleLabel } from '../content/modules';
import { ReviewSession } from '../components/ReviewSession';
import { dueIds, mastery, nextDue, parseIntervals, weakestIds, type MasteryLevel } from '../lib/srs';
import { STEP_LABEL } from '../components/MyResolution';
import { recurringErrors, topicPerformance } from '../lib/stats';
import { useProgress } from '../progressContext';
import { moduleHref } from '../router';

const LEVELS: { id: MasteryLevel; label: string }[] = [
  { id: 'aprendendo', label: 'Aprendendo' },
  { id: 'revisando', label: 'Revisando' },
  { id: 'consolidando', label: 'Consolidando' },
  { id: 'dominada', label: 'Dominada' },
];

const ERROR_LABEL: Record<string, string> = {
  sinal: 'sinal trocado',
  unidade: 'unidade de outra grandeza',
  potencia10: 'potência de 10 (conversão)',
  incorreto: 'valor incorreto',
  invalido: 'número inválido',
};

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function RevisarPage() {
  const [state, progress] = useProgress();
  const [session, setSession] = useState<{ ids: string[]; title: string } | null>(null);
  const now = new Date();
  const intervals = state.settings.srsIntervals;
  const cards = useMemo(() => Object.fromEntries(Object.entries(state.reviews).filter(([id]) => getQuestion(id))), [state.reviews]);
  const due = dueIds(cards, now);
  const weak = weakestIds(cards, now);
  const total = Object.keys(cards).length;
  const counts = LEVELS.map((l) => ({ ...l, n: Object.values(cards).filter((c) => mastery(c, intervals) === l.id).length }));
  const perf = useMemo(() => topicPerformance(state.questionStats, QUESTIONS), [state.questionStats]);
  const recurring = recurringErrors(perf).slice(0, 6);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const last7 = state.reviewLog.filter((e) => e.date >= weekAgo).length;

  const exercisesToRedo = Object.entries(state.exerciseStats)
    .filter(([id, s]) => Object.keys(s.errors).length > 0 && !state.solvedExercises.includes(id))
    .map(([id, s]) => {
      const ex = getExercise(id) ?? getRevisao(id);
      return ex ? { id, title: ex.title, href: getExercise(id) ? `#/exercicios/${id}` : `#/revisao/${id}`, s } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Exercícios na revisão espaçada (autoavaliação de "Minha resolução").
  const exDue = dueIds(state.exerciseReviews, now)
    .map((id) => {
      const ex = getExercise(id) ?? getRevisao(id);
      const last = state.reflections[id]?.[state.reflections[id].length - 1];
      return ex ? { id, title: ex.title, href: getExercise(id) ? `#/exercicios/${id}` : `#/revisao/${id}`, last } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const exNext = nextDue(Object.fromEntries(Object.entries(state.exerciseReviews).filter(([id]) => !exDue.some((e) => e.id === id))));

  if (session) {
    return (
      <div className="page page--narrow">
        <ReviewSession key={session.title + session.ids.join()} ids={session.ids} title={session.title} onExit={() => setSession(null)} />
      </div>
    );
  }

  const nd = nextDue(cards);
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Revisão inteligente</h1>
        <p className="lead">
          Questões que você errou voltam hoje; as que acertou voltam em intervalos cada vez maiores. Assim você revisa no momento certo, sem perder tempo
          com o que já domina.
        </p>
      </header>

      {total === 0 ? (
        <div className="panel empty-state">
          <h2>Ainda não há nada para revisar</h2>
          <p>
            As questões entram aqui automaticamente quando você responde o <a href="#/quiz">Quiz V/F</a>, a verificação no fim de cada aula ou um{' '}
            <a href="#/simulado">simulado</a>. Comece por um quiz curto.
          </p>
          <a className="btn" href="#/quiz?modo=aprendizagem&n=10">
            Fazer um quiz de 10 questões
          </a>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat stat--hot">
              <span className="stat__value">{due.length}</span>
              <span className="stat__label">para revisar hoje</span>
            </div>
            <div className="stat">
              <span className="stat__value">{total}</span>
              <span className="stat__label">questões na revisão</span>
            </div>
            <div className="stat">
              <span className="stat__value">{counts[3].n}</span>
              <span className="stat__label">dominadas</span>
            </div>
            <div className="stat">
              <span className="stat__value">{last7}</span>
              <span className="stat__label">revisões nos últimos 7 dias</span>
            </div>
          </div>

          <section className="panel" aria-labelledby="rv-hoje">
            <h2 id="rv-hoje">Revisar agora</h2>
            {due.length > 0 ? (
              <>
                <p>
                  {due.length} questão(ões) vencida(s). A revisão rápida leva cerca de {Math.max(2, Math.round(Math.min(5, due.length) * 0.8))} minutos.
                </p>
                <div className="row">
                  <button type="button" className="btn btn--big" onClick={() => setSession({ ids: due.slice(0, 5), title: 'Revisão rápida' })}>
                    Revisão rápida ({Math.min(5, due.length)})
                  </button>
                  {due.length > 5 && (
                    <button type="button" className="btn btn--ghost" onClick={() => setSession({ ids: due, title: 'Todas as pendentes' })}>
                      Todas as pendentes ({due.length})
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p>Nada vencido hoje. {nd ? `Próxima revisão programada para ${fmtDay(nd)}.` : ''}</p>
                {weak.length > 0 && (
                  <button type="button" className="btn btn--ghost" onClick={() => setSession({ ids: weak.slice(0, 5), title: 'Adiantando as mais fracas' })}>
                    Adiantar: {Math.min(5, weak.length)} questões mais fracas
                  </button>
                )}
              </>
            )}
          </section>

          <section className="panel" aria-labelledby="rv-nivel">
            <h2 id="rv-nivel">Nível de domínio</h2>
            <ul className="mastery">
              {counts.map((c) => (
                <li key={c.id} className={`mastery__item mastery__item--${c.id}`}>
                  <span className="mastery__label">{c.label}</span>
                  <span className="bar" aria-hidden="true">
                    <span style={{ width: `${total ? (c.n / total) * 100 : 0}%` }} />
                  </span>
                  <span className="mastery__n">{c.n}</span>
                </li>
              ))}
            </ul>
            <p className="muted small">
              “Dominada” exige acertos em revisões espaçadas até a última caixa ({intervals[intervals.length - 1]} dias). Um único acerto não basta.
            </p>
          </section>
        </>
      )}

      <section className="panel" aria-labelledby="rv-rec">
        <h2 id="rv-rec">Assuntos com erros recorrentes</h2>
        {recurring.length === 0 ? (
          <p className="empty">Nenhum assunto com dois ou mais erros registrados até agora.</p>
        ) : (
          <ul className="topic-list">
            {recurring.map((t) => (
              <li key={t.topic}>
                <div>
                  <strong>{t.topic}</strong>
                  <span className="muted small">
                    {' '}
                    — {t.wrong} erro(s) em {t.attempts} resposta(s) • {moduleLabel(t.module)}
                  </span>
                </div>
                <div className="row">
                  <button type="button" className="btn btn--ghost" onClick={() => setSession({ ids: t.questionIds, title: t.topic })}>
                    Revisar este assunto
                  </button>
                  <a className="btn btn--link" href={moduleHref(t.module, t.section)}>
                    Voltar à teoria
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="rv-exs">
        <h2 id="rv-exs">Exercícios para refazer hoje</h2>
        <p className="muted small">
          Vêm do registro “Minha resolução”: o que você não conseguiu volta hoje; o que resolveu volta em intervalos cada vez maiores.
        </p>
        {exDue.length === 0 ? (
          <p className="empty">
            Nenhum exercício vencido.{' '}
            {exNext ? `Próximo em ${fmtDay(exNext)}.` : 'Ao conferir a resolução de um exercício, registre como foi para ele entrar aqui.'}
          </p>
        ) : (
          <ul className="topic-list">
            {exDue.map((e) => (
              <li key={e.id}>
                <div>
                  <a href={e.href}>{e.title}</a>
                  {e.last && (
                    <span className="muted small">
                      {' '}
                      — último registro: {e.last.result === 'acertei' ? 'resolvido' : e.last.result === 'dificuldade' ? 'com dificuldade' : 'não conseguiu'}
                      {e.last.difficultStep ? ` • etapa difícil: ${STEP_LABEL[e.last.difficultStep]}` : ''}
                      {e.last.concept ? ` • revisar: ${e.last.concept}` : ''}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="rv-ex">
        <h2 id="rv-ex">Exercícios com resposta errada</h2>
        {exercisesToRedo.length === 0 ? (
          <p className="empty">Nenhum exercício com resposta errada pendente.</p>
        ) : (
          <ul className="topic-list">
            {exercisesToRedo.map((e) => (
              <li key={e.id}>
                <div>
                  <a href={e.href}>{e.title}</a>
                  <span className="muted small">
                    {' '}
                    — {e.s.attempts} tentativa(s); erros: {Object.entries(e.s.errors).map(([k, n]) => `${ERROR_LABEL[k] ?? k} (${n})`).join(', ')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <IntervalSettings intervals={intervals} onSave={(xs) => progress.setIntervals(xs)} />

      {state.reviewLog.length > 0 && (
        <section className="panel" aria-labelledby="rv-log">
          <h2 id="rv-log">Últimas revisões</h2>
          <ol className="log">
            {[...state.reviewLog].reverse().slice(0, 8).map((e, k) => (
              <li key={k}>
                <span className={e.correct ? 'plus' : 'minus'}>{e.correct ? '✓' : '✗'}</span> {getQuestion(e.id)?.topic ?? e.id}
                <span className="muted small">
                  {' '}
                  — {new Date(e.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  {e.rating ? ` • ${e.rating === 'facil' ? 'fácil' : e.rating === 'media' ? 'média' : 'difícil'}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function IntervalSettings({ intervals, onSave }: { intervals: number[]; onSave: (xs: number[]) => void }) {
  const [text, setText] = useState(intervals.join(', '));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <section className="panel" aria-labelledby="rv-cfg">
      <h2 id="rv-cfg">Como funciona e intervalos</h2>
      <ol className="list">
        <li>Errou → a questão vai para a caixa 0 e volta hoje.</li>
        <li>Acertou num quiz → sobe uma caixa e volta depois do intervalo dela.</li>
        <li>Na revisão, você diz como foi lembrar: “fácil” sobe duas caixas, “média” sobe uma, “difícil” mantém.</li>
      </ol>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          const r = parseIntervals(text);
          if (!r.ok) return setMsg({ ok: false, text: r.error });
          onSave(r.value);
          setMsg({ ok: true, text: `Intervalos salvos: ${r.value.join(', ')} dias.` });
        }}
      >
        <label htmlFor="rv-int" className="field__label">
          Intervalos das caixas 1 a N, em dias
        </label>
        <div className="field__row">
          <input id="rv-int" value={text} onChange={(e) => (setText(e.target.value), setMsg(null))} inputMode="numeric" aria-describedby="rv-int-msg" />
          <button type="submit" className="btn">
            Salvar
          </button>
        </div>
        <p id="rv-int-msg" className={msg ? `check check--${msg.ok ? 'ok' : 'bad'}` : 'muted small'} role="status">
          {msg ? msg.text : 'Padrão: 1, 3, 7, 14, 30. Valores crescentes, de 2 a 8 caixas.'}
        </p>
      </form>
    </section>
  );
}
