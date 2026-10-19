// Simulado com tempo: uma questão por vez, navegação livre, marcação para
// revisar e confirmação de entrega. Nada de gabarito ou justificativa antes
// da entrega. O estado fica em sessionStorage para sobreviver a um recarregar.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../content/types';
import { gradeQuiz, type Answers } from '../lib/quiz';
import { ACTIVE_EXAM_KEY, formatClock, remainingSeconds, type ActiveExam } from '../lib/exam';
import { useProgress } from '../progressContext';
import { QuizResult } from './Quiz';

function saveActive(a: ActiveExam | null) {
  try {
    if (a) sessionStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify(a));
    else sessionStorage.removeItem(ACTIVE_EXAM_KEY);
  } catch {
    /* sem sessionStorage: a prova só não poderá ser retomada */
  }
}

interface Props {
  exam: ActiveExam;
  questions: Question[];
  onRetry: () => void;
  onExit: () => void;
}

export function Exam({ exam, questions, onRetry, onExit }: Props) {
  const [, progress] = useProgress();
  const [answers, setAnswers] = useState<Answers>(exam.answers);
  const [flags, setFlags] = useState<string[]>(exam.flags);
  const [index, setIndex] = useState(exam.index);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ auto: boolean; durationSec: number } | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  const remaining = remainingSeconds(exam.startedAt, exam.timeLimitMin, now);
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const summary = useMemo(() => (result ? gradeQuiz(questions, answers) : null), [result, questions, answers]);

  // relógio
  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [result]);

  // salva o andamento a cada mudança
  useEffect(() => {
    if (!result) saveActive({ ...exam, answers, flags, index });
  }, [exam, answers, flags, index, result]);

  function finish(auto: boolean) {
    if (result) return;
    const durationSec = Math.round((Date.now() - exam.startedAt) / 1000);
    const s = gradeQuiz(questions, answers);
    s.results.forEach((r) => progress.recordAnswer(r.question.id, r.correct));
    progress.recordAttempt(
      {
        date: new Date().toISOString(),
        mode: 'simulado',
        scope: exam.scope,
        correct: s.correct,
        total: s.total,
        durationSec: exam.timeLimitMin > 0 ? Math.min(durationSec, exam.timeLimitMin * 60) : durationSec,
        timeLimitMin: exam.timeLimitMin,
        unanswered: s.unanswered,
      },
      '#/simulado',
    );
    saveActive(null);
    setConfirming(false);
    setResult({ auto, durationSec });
    window.scrollTo(0, 0);
  }

  // tempo esgotado → entrega automática
  useEffect(() => {
    if (remaining === 0 && !result) finish(true);
  }, [remaining, result]);

  if (result && summary) {
    const used = exam.timeLimitMin > 0 ? Math.min(result.durationSec, exam.timeLimitMin * 60) : result.durationSec;
    return (
      <div className="exam exam--result">
        {result.auto && (
          <p className="callout callout--alerta" role="alert">
            O tempo acabou e o simulado foi entregue automaticamente.
          </p>
        )}
        <div className="stat-grid">
          <div className={`stat ${summary.percent >= 70 ? 'stat--ok' : 'stat--bad'}`}>
            <span className="stat__value">{summary.percent}%</span>
            <span className="stat__label">de acertos</span>
          </div>
          <div className="stat">
            <span className="stat__value">
              {summary.correct}/{summary.total}
            </span>
            <span className="stat__label">pontuação</span>
          </div>
          <div className="stat">
            <span className="stat__value">{formatClock(used)}</span>
            <span className="stat__label">tempo usado{exam.timeLimitMin > 0 ? ` de ${exam.timeLimitMin} min` : ''}</span>
          </div>
          <div className="stat">
            <span className="stat__value">{summary.unanswered}</span>
            <span className="stat__label">em branco (contam como erro)</span>
          </div>
        </div>
        <QuizResult summary={summary} mode="avaliacao" compact={false} onRetry={onRetry} />
        <p className="muted small">As questões erradas já entraram na sua revisão espaçada.</p>
        <div className="row">
          <a className="btn btn--ghost" href="#/revisar">
            Ir para as revisões
          </a>
          <button type="button" className="btn btn--link" onClick={onExit}>
            Configurar outro simulado
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const given = answers[q.id];
  const flagged = flags.includes(q.id);
  const low = remaining !== null && remaining <= 60;

  function goTo(i: number) {
    setIndex(i);
    setConfirming(false);
    requestAnimationFrame(() => headRef.current?.focus());
  }

  return (
    <div className="exam">
      <div className="exam__bar">
        <span>
          Respondidas: <strong>{answered}</strong> de {questions.length}
          {flags.length > 0 && <> • marcadas: {flags.length}</>}
        </span>
        {remaining !== null ? (
          <span className={`exam__timer ${low ? 'exam__timer--low' : ''}`} role="timer" aria-label={`Tempo restante: ${formatClock(remaining)}`}>
            ⏱ {formatClock(remaining)}
          </span>
        ) : (
          <span className="muted small">Sem limite de tempo</span>
        )}
      </div>
      {remaining !== null && remaining <= 300 && remaining > 0 && (
        <p className="sr-only" role="status">
          Faltam 5 minutos.
        </p>
      )}

      <div className="panel">
        <div className="quiz__top">
          <h2 className="quiz__count" ref={headRef} tabIndex={-1}>
            Questão {index + 1} de {questions.length}
          </h2>
          <span className="quiz__topic">{q.topic}</span>
        </div>
        <p className="quiz__statement">{q.statement}</p>
        <div className="quiz__choices" role="group" aria-label="Sua resposta">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              className={`choice choice--${given === v ? 'selected' : 'idle'}`}
              aria-pressed={given === v}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
            >
              {v ? 'Verdadeiro' : 'Falso'}
            </button>
          ))}
        </div>
        <div className="row exam__tools">
          <button type="button" className={`btn btn--ghost ${flagged ? 'is-on' : ''}`} aria-pressed={flagged} onClick={() => setFlags((f) => (flagged ? f.filter((x) => x !== q.id) : [...f, q.id]))}>
            {flagged ? '★ Marcada para revisar' : '☆ Marcar para revisar'}
          </button>
          {given !== undefined && (
            <button type="button" className="btn btn--link" onClick={() => setAnswers((a) => ({ ...a, [q.id]: undefined }))}>
              Limpar resposta
            </button>
          )}
        </div>
        <div className="quiz__nav">
          <button type="button" className="btn btn--ghost" disabled={index === 0} onClick={() => goTo(index - 1)}>
            ← Anterior
          </button>
          {index < questions.length - 1 ? (
            <button type="button" className="btn" onClick={() => goTo(index + 1)}>
              Próxima →
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirming(true)}>
              Revisar e entregar
            </button>
          )}
        </div>
      </div>

      <nav className="dots" aria-label="Ir para a questão">
        {questions.map((x, i) => {
          const done = answers[x.id] !== undefined;
          const fl = flags.includes(x.id);
          return (
            <button
              key={x.id}
              type="button"
              className={`dot ${done ? 'dot--done' : ''} ${i === index ? 'dot--current' : ''} ${fl ? 'dot--flag' : ''}`}
              aria-label={`Questão ${i + 1}${done ? ', respondida' : ', em branco'}${fl ? ', marcada para revisar' : ''}`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => goTo(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>

      <div className="row">
        <button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>
          Entregar simulado
        </button>
      </div>

      {confirming && (
        <div className="callout callout--alerta" role="alertdialog" aria-labelledby="exam-confirm-t" aria-describedby="exam-confirm-d">
          <p className="callout__title" id="exam-confirm-t">
            Entregar o simulado?
          </p>
          <p id="exam-confirm-d">
            {answered === questions.length ? 'Todas as questões foram respondidas.' : `${questions.length - answered} questão(ões) em branco contam como erro.`}{' '}
            {flags.length > 0 ? `Você marcou ${flags.length} para revisar.` : ''} Depois de entregar, não é possível alterar as respostas.
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={() => finish(false)} autoFocus>
              Entregar agora
            </button>
            {flags.length > 0 && (
              <button type="button" className="btn btn--ghost" onClick={() => goTo(questions.findIndex((x) => flags.includes(x.id)))}>
                Ir para a primeira marcada
              </button>
            )}
            {answered < questions.length && (
              <button type="button" className="btn btn--ghost" onClick={() => goTo(questions.findIndex((x) => answers[x.id] === undefined))}>
                Ir para a primeira em branco
              </button>
            )}
            <button type="button" className="btn btn--link" onClick={() => setConfirming(false)}>
              Continuar respondendo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
