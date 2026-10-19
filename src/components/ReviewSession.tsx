// Sessão de revisão espaçada: uma questão por vez; depois de responder, o
// estudante vê a correção e, se acertou, diz como foi lembrar (fácil, média
// ou difícil). Erros voltam automaticamente para a caixa 0.
import { useEffect, useRef, useState } from 'react';
import type { Rating } from '../lib/srs';
import { getQuestion } from '../content/questions';
import { useProgress } from '../progressContext';
import { Feedback } from './Quiz';

const RATINGS: { id: Rating; label: string; hint: string }[] = [
  { id: 'dificil', label: 'Difícil', hint: 'lembrei com esforço — mesmo intervalo' },
  { id: 'media', label: 'Média', hint: 'lembrei com alguma dúvida — próxima caixa' },
  { id: 'facil', label: 'Fácil', hint: 'lembrei na hora — pula uma caixa' },
];

export function ReviewSession({ ids, title, onExit }: { ids: string[]; title: string; onExit: () => void }) {
  const [, progress] = useProgress();
  const [queue] = useState(() => ids.filter((id) => getQuestion(id)));
  const [i, setI] = useState(0);
  const [given, setGiven] = useState<boolean | undefined>(undefined);
  const [score, setScore] = useState({ correct: 0, done: 0 });
  const headRef = useRef<HTMLHeadingElement>(null);
  const logged = useRef(false);

  const q = queue[i] ? getQuestion(queue[i])! : null;
  const finished = i >= queue.length;

  useEffect(() => {
    if (!finished || logged.current || score.done === 0) return;
    logged.current = true;
    progress.logActivity({ kind: 'revisao', label: `Revisão — ${score.correct}/${score.done} acertos`, href: '#/revisar' });
  }, [finished, score, progress]);

  if (!q) {
    return (
      <section className="panel review-done" aria-live="polite">
        <h2>Sessão concluída</h2>
        <p>
          {score.done === 0
            ? 'Nenhuma questão foi revisada.'
            : `Você revisou ${score.done} questão(ões) e acertou ${score.correct}. As próximas datas de revisão já foram calculadas.`}
        </p>
        <button type="button" className="btn" onClick={onExit}>
          Voltar às revisões
        </button>
      </section>
    );
  }

  function answer(v: boolean) {
    if (given !== undefined || !q) return;
    setGiven(v);
    if (v !== q.answer) {
      progress.recordReview(q.id, false, null);
      setScore((s) => ({ correct: s.correct, done: s.done + 1 }));
    }
  }

  function next(rating?: Rating) {
    if (!q) return;
    if (rating) {
      progress.recordReview(q.id, true, rating);
      setScore((s) => ({ correct: s.correct + 1, done: s.done + 1 }));
    }
    setGiven(undefined);
    setI((x) => x + 1);
    requestAnimationFrame(() => headRef.current?.focus());
  }

  const correct = given !== undefined && given === q.answer;

  return (
    <section className="panel review-session" aria-labelledby="rs-t">
      <div className="quiz__top">
        <h2 id="rs-t" ref={headRef} tabIndex={-1} className="quiz__count">
          {title} — questão {i + 1} de {queue.length}
        </h2>
        <span className="quiz__topic">{q.topic}</span>
      </div>
      <div className="bar" role="progressbar" aria-label="Progresso da revisão" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={i}>
        <span style={{ width: `${(i / queue.length) * 100}%` }} />
      </div>
      <p className="quiz__statement">{q.statement}</p>
      <div className="quiz__choices" role="group" aria-label="Sua resposta">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            className={`choice choice--${given === undefined ? 'idle' : v === q.answer ? 'right' : given === v ? 'wrong' : 'idle'}`}
            aria-pressed={given === v}
            disabled={given !== undefined}
            onClick={() => answer(v)}
          >
            {v ? 'Verdadeiro' : 'Falso'}
          </button>
        ))}
      </div>
      {given !== undefined && <Feedback q={q} given={given} />}
      {given !== undefined && correct && (
        <div className="rating" role="group" aria-label="Como foi lembrar a resposta?">
          <p className="rating__title">Como foi lembrar a resposta?</p>
          <div className="row">
            {RATINGS.map((r) => (
              <button key={r.id} type="button" className="btn btn--ghost rating__btn" onClick={() => next(r.id)}>
                <strong>{r.label}</strong>
                <span className="small muted">{r.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {given !== undefined && !correct && (
        <div className="row">
          <button type="button" className="btn" onClick={() => next()}>
            {i + 1 < queue.length ? 'Próxima questão →' : 'Concluir sessão'}
          </button>
          <span className="muted small">Questão errada: ela volta hoje para nova revisão.</span>
        </div>
      )}
      <div className="row review-session__exit">
        <button type="button" className="btn btn--link" onClick={onExit}>
          Encerrar sessão
        </button>
      </div>
    </section>
  );
}
