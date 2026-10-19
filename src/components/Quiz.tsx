// Quiz de Verdadeiro ou Falso. Modo aprendizagem: feedback imediato.
// Modo avaliação: nenhuma correção até a entrega; o aluno pode rever e
// mudar respostas antes de entregar.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../content/types';
import { gradeQuiz, isCorrect, performanceMessage, type Answers, type QuizSummary } from '../lib/quiz';
import { moduleLabel } from '../content/modules';
import { moduleHref } from '../router';
import { useProgress } from '../progressContext';

export type QuizMode = 'aprendizagem' | 'avaliacao';

const LEVEL: Record<Question['level'], string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };

interface Props {
  questions: Question[];
  mode: QuizMode;
  scope: string;
  compact?: boolean;
  onRetry?: () => void;
}

export function Quiz({ questions, mode, scope, compact = false, onRetry }: Props) {
  const [, progress] = useProgress();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);
  const recorded = useRef(false);

  // Reinicia quando o conjunto de questões muda (nova tentativa).
  useEffect(() => {
    setIndex(0);
    setAnswers({});
    setFinished(false);
    setConfirming(false);
    recorded.current = false;
  }, [questions]);

  const q = questions[index];
  const given = q ? answers[q.id] : undefined;
  const answered = Object.keys(answers).filter((k) => answers[k] !== undefined).length;
  const summary = useMemo(() => (finished ? gradeQuiz(questions, answers) : null), [finished, questions, answers]);

  useEffect(() => {
    if (!finished || recorded.current || !summary) return;
    recorded.current = true;
    if (mode === 'avaliacao') summary.results.forEach((r) => progress.recordAnswer(r.question.id, r.correct));
    progress.recordAttempt({ date: new Date().toISOString(), mode, scope, correct: summary.correct, total: summary.total });
  }, [finished, summary, mode, scope, progress]);

  if (!questions.length) {
    return <p className="empty">Nenhuma questão encontrada para esta seleção. Escolha outros módulos ou níveis.</p>;
  }

  function choose(value: boolean) {
    if (mode === 'aprendizagem' && given !== undefined) return;
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (mode === 'aprendizagem') progress.recordAnswer(q.id, value === q.answer);
  }

  function goTo(i: number) {
    setIndex(i);
    setConfirming(false);
    headRef.current?.focus();
  }

  function finish() {
    if (mode === 'avaliacao' && answered < questions.length && !confirming) {
      setConfirming(true);
      return;
    }
    setFinished(true);
  }

  if (finished && summary) {
    return <QuizResult summary={summary} mode={mode} compact={compact} onRetry={onRetry} />;
  }

  const last = index === questions.length - 1;
  const revealed = mode === 'aprendizagem' && given !== undefined;

  return (
    <div className={`quiz ${compact ? 'quiz--compact' : ''}`}>
      <div className="quiz__top">
        <span className="quiz__count" ref={headRef} tabIndex={-1}>
          Questão {index + 1} de {questions.length}
        </span>
        <span className={`tag tag--${q.level}`}>{LEVEL[q.level]}</span>
        <span className="quiz__topic">{q.topic}</span>
      </div>
      <div className="bar" role="progressbar" aria-label="Progresso do quiz" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered}>
        <span style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>

      <p className="quiz__statement">{q.statement}</p>

      <div className="quiz__choices" role="group" aria-label="Sua resposta">
        {[true, false].map((v) => {
          const sel = given === v;
          const state = revealed ? (v === q.answer ? 'right' : sel ? 'wrong' : 'idle') : sel ? 'selected' : 'idle';
          return (
            <button
              key={String(v)}
              type="button"
              className={`choice choice--${state}`}
              aria-pressed={sel}
              disabled={revealed && !sel && v !== q.answer}
              onClick={() => choose(v)}
            >
              {v ? 'Verdadeiro' : 'Falso'}
            </button>
          );
        })}
      </div>

      {mode === 'avaliacao' && given !== undefined && <p className="muted small">Resposta registrada. Você pode mudá-la até entregar.</p>}

      {revealed && <Feedback q={q} given={given} />}

      <div className="quiz__nav">
        {mode === 'avaliacao' && (
          <button type="button" className="btn btn--ghost" disabled={index === 0} onClick={() => goTo(index - 1)}>
            ← Anterior
          </button>
        )}
        {!last && (
          <button
            type="button"
            className="btn"
            disabled={mode === 'aprendizagem' && given === undefined}
            onClick={() => goTo(index + 1)}
          >
            Próxima questão →
          </button>
        )}
        {(last || mode === 'avaliacao') && (
          <button
            type="button"
            className={`btn ${last ? '' : 'btn--ghost'}`}
            disabled={mode === 'aprendizagem' && given === undefined}
            onClick={finish}
          >
            {mode === 'avaliacao' ? 'Entregar avaliação' : 'Ver resultado'}
          </button>
        )}
      </div>

      {confirming && (
        <div className="callout callout--alerta" role="alert">
          <p>
            Você deixou {questions.length - answered} questão(ões) sem resposta. Questões em branco contam como erro.
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={finish}>
              Entregar mesmo assim
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => goTo(questions.findIndex((x) => answers[x.id] === undefined))}>
              Ir para a primeira em branco
            </button>
          </div>
        </div>
      )}

      {mode === 'avaliacao' && (
        <nav className="dots" aria-label="Ir para a questão">
          {questions.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className={`dot ${answers[x.id] !== undefined ? 'dot--done' : ''} ${i === index ? 'dot--current' : ''}`}
              aria-label={`Questão ${i + 1}${answers[x.id] !== undefined ? ', respondida' : ', em branco'}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export function Feedback({ q, given }: { q: Question; given: boolean | undefined }) {
  const ok = isCorrect(q, given);
  return (
    <div className={`feedback ${ok ? 'feedback--ok' : 'feedback--bad'}`} role="status" aria-live="polite">
      <p className="feedback__title">
        {given === undefined ? '○ Sem resposta.' : ok ? '✓ Julgamento correto!' : '✗ Julgamento incorreto.'} A afirmação é{' '}
        <strong>{q.answer ? 'VERDADEIRA' : 'FALSA'}</strong>.
      </p>
      <p>{q.explanation}</p>
      {!q.answer && q.correction && (
        <p className="feedback__fix">
          <strong>Versão corrigida:</strong> {q.correction}
        </p>
      )}
      {!ok && (
        <p className="feedback__review">
          <strong>Para revisar:</strong> {q.review}
        </p>
      )}
      <p className="feedback__links">
        <a href={moduleHref(q.module, q.section)}>Voltar ao conteúdo relacionado →</a>
        {q.fromMaterial && <span className="muted small"> • Baseada no material: {q.fromMaterial}</span>}
      </p>
    </div>
  );
}

export function QuizResult({ summary, mode, compact, onRetry }: { summary: QuizSummary; mode: QuizMode; compact: boolean; onRetry?: () => void }) {
  const wrong = summary.results.filter((r) => !r.correct);
  const [showAll, setShowAll] = useState(mode === 'avaliacao');
  const list = showAll ? summary.results : wrong;
  return (
    <div className={`quiz quiz--result ${compact ? 'quiz--compact' : ''}`}>
      <div className="score">
        <div className="score__ring" style={{ ['--pct' as string]: summary.percent }} aria-hidden="true">
          <span>{summary.percent}%</span>
        </div>
        <div>
          <h3>
            {summary.correct} de {summary.total} acertos
          </h3>
          <p>{performanceMessage(summary.percent)}</p>
          {summary.unanswered > 0 && <p className="muted small">{summary.unanswered} questão(ões) ficaram em branco.</p>}
        </div>
      </div>

      {!compact && (
        <div className="grid2">
          <div className="panel">
            <h4>Pontos fortes</h4>
            {summary.strengths.length ? (
              <ul>{summary.strengths.map((t) => <li key={t.topic}>{t.topic} ({t.correct}/{t.total})</li>)}</ul>
            ) : (
              <p className="muted">Ainda nenhum tema com 100% de acertos.</p>
            )}
          </div>
          <div className="panel">
            <h4>Temas para revisar</h4>
            {summary.toReview.length ? (
              <ul>
                {summary.toReview.map((t) => (
                  <li key={t.topic}>
                    <a href={moduleHref(t.module)}>{t.topic}</a> ({t.correct}/{t.total}) — {moduleLabel(t.module)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhum. Parabéns!</p>
            )}
          </div>
        </div>
      )}

      <div className="row">
        {onRetry && (
          <button type="button" className="btn" onClick={onRetry}>
            Refazer {compact ? 'verificação' : 'com novas questões'}
          </button>
        )}
        {wrong.length > 0 && wrong.length < summary.total && (
          <button type="button" className="btn btn--ghost" onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Mostrar só os erros' : 'Mostrar todas as questões'}
          </button>
        )}
      </div>

      {list.length > 0 && (
        <>
          <h4>{showAll ? 'Correção completa' : 'Correção dos erros'}</h4>
          <ol className="review-list">
            {list.map((r) => (
              <li key={r.question.id}>
                <p className="quiz__statement small-statement">{r.question.statement}</p>
                <p className="muted small">
                  Sua resposta: {r.given === undefined ? 'em branco' : r.given ? 'Verdadeiro' : 'Falso'}
                </p>
                <Feedback q={r.question} given={r.given} />
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
