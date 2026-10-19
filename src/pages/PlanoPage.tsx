// Plano de estudos personalizado: data da prova, minutos por dia e módulos
// prioritários → cronograma diário com teoria, exercícios, revisão e
// simulados; previsto × realizado; ajustes de hoje conforme o desempenho.
import { useState } from 'react';
import type { ModuleId } from '../content/types';
import { MODULES } from '../content/modules';
import { daysBetween, MIN_MINUTES_PER_DAY, planProgress, todayAdjustments, type PlanDay, type PlanSession } from '../lib/plan';
import type { StudyPlanSettings } from '../lib/progress';
import { useStudyOverview } from '../studyOverview';

const PLAN_MODS = MODULES.filter((m) => m.id !== 'm7');
const KIND_LABEL: Record<PlanSession['kind'], string> = { teoria: 'Teoria', exercicios: 'Exercícios', revisao: 'Revisão', simulado: 'Simulado' };
const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', opts);

export function PlanoPage() {
  const { state, progress, today, due, weakModules, plan, todaySessions } = useStudyOverview();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const settings = state.plan;

  function save(examDate: string, minutesPerDay: number, priorityModules: ModuleId[]) {
    const next: StudyPlanSettings = {
      enabled: true,
      examDate,
      startDate: today,
      minutesPerDay,
      priorityModules,
      pendingModules: PLAN_MODS.filter((m) => !state.completedModules.includes(m.id)).map((m) => m.id),
      weakModules: weakModules.map((w) => w.module.id),
      done: settings?.done ?? {},
    };
    progress.setPlan(next);
    setEditing(false);
  }

  if (!settings || editing) {
    return (
      <div className="page page--narrow">
        <header className="page__head">
          <h1>Plano de estudos</h1>
          <p className="lead">Informe a data da prova e quanto tempo você tem por dia. O plano distribui teoria, exercícios, revisões e simulados até a véspera.</p>
        </header>
        <PlanForm initial={settings} today={today} onSave={save} onCancel={settings ? () => setEditing(false) : undefined} weak={weakModules.map((w) => w.module.id)} />
      </div>
    );
  }

  const daysLeft = daysBetween(today, settings.examDate);
  const pr = plan ? planProgress(plan, settings.done, today) : null;
  const adjustments = todayAdjustments(today, due.length, weakModules, todaySessions);
  const upcoming = plan ? plan.days.filter((d) => d.date > today).slice(0, showAll ? undefined : 6) : [];

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1>Plano de estudos</h1>
        <p className="lead">
          Prova em {fmtDay(settings.examDate, { weekday: 'long', day: '2-digit', month: 'long' })} —{' '}
          {daysLeft > 1 ? `faltam ${daysLeft} dias` : daysLeft === 1 ? 'é amanhã' : daysLeft === 0 ? 'é hoje' : 'a data já passou'} • {settings.minutesPerDay} min por dia
          {settings.priorityModules.length > 0 && ` • prioridade: ${settings.priorityModules.map((m) => `M${m.slice(1)}`).join(', ')}`}
        </p>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>
            Ajustar plano
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => save(settings.examDate, settings.minutesPerDay, settings.priorityModules)} title="Remonta o cronograma a partir de hoje com as aulas concluídas e o desempenho atual">
            Recalcular com meu desempenho atual
          </button>
          <button type="button" className="btn btn--ghost" aria-pressed={!settings.enabled} onClick={() => progress.setPlan({ ...settings, enabled: !settings.enabled })}>
            {settings.enabled ? 'Pausar plano' : 'Reativar plano'}
          </button>
        </div>
      </header>

      {!settings.enabled && (
        <p className="callout callout--alerta">Plano pausado: ele não aparece no painel nem nas recomendações. Seus outros dados não foram afetados.</p>
      )}
      {plan?.warnings.map((w) => (
        <p key={w} className="callout callout--alerta">
          {w}
        </p>
      ))}

      {pr && pr.totalSessions > 0 && (
        <div className="stat-grid">
          <div className="stat">
            <span className="stat__value">
              {pr.doneToDate}/{pr.plannedToDate}
            </span>
            <span className="stat__label">sessões até hoje (realizado/previsto)</span>
          </div>
          <div className="stat">
            <span className="stat__value">
              {pr.minutesDoneToDate}/{pr.minutesPlannedToDate}
            </span>
            <span className="stat__label">minutos até hoje</span>
          </div>
          <div className={`stat ${pr.overdue.length ? 'stat--bad' : 'stat--ok'}`}>
            <span className="stat__value">{pr.overdue.length}</span>
            <span className="stat__label">sessões atrasadas</span>
          </div>
          <div className="stat">
            <span className="stat__value">{Math.round((pr.totalDone / pr.totalSessions) * 100)}%</span>
            <span className="stat__label">do plano concluído</span>
          </div>
        </div>
      )}

      <section className="panel" aria-labelledby="pl-hoje">
        <h2 id="pl-hoje">Hoje</h2>
        {todaySessions.length === 0 ? (
          <p className="empty">{daysLeft <= 0 ? 'Não há sessões: a data da prova chegou. Boa prova!' : 'Nenhuma sessão para hoje neste cronograma. Clique em “Recalcular” para incluir o dia de hoje.'}</p>
        ) : (
          <SessionList sessions={todaySessions} done={settings.done} onToggle={(id) => progress.togglePlanSession(id)} />
        )}
        {adjustments.length > 0 && (
          <>
            <h3 className="small-heading">Ajustes de hoje, pelo seu desempenho</h3>
            <ul className="plan-list">
              {adjustments.map((a) => (
                <li key={a.id} className={settings.done[a.id] ? 'is-done' : ''}>
                  <label className="plan-check">
                    <input type="checkbox" checked={!!settings.done[a.id]} onChange={() => progress.togglePlanSession(a.id)} />
                    <span>
                      {a.label} <span className="muted small">— {a.reason}</span>
                    </span>
                  </label>
                  <a className="btn btn--link" href={a.href}>
                    Abrir
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {pr && pr.overdue.length > 0 && (
        <section className="panel" aria-labelledby="pl-atr">
          <h2 id="pl-atr">Sessões atrasadas</h2>
          <p className="muted small">Marque as que você já fez ou encaixe-as nos próximos dias. Se acumularem, use “Recalcular”.</p>
          <SessionList sessions={pr.overdue.slice(0, 10)} done={settings.done} onToggle={(id) => progress.togglePlanSession(id)} showDate />
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="panel" aria-labelledby="pl-prox">
          <h2 id="pl-prox">Próximos dias</h2>
          {upcoming.map((d) => (
            <DayBlock key={d.date} day={d} done={settings.done} onToggle={(id) => progress.togglePlanSession(id)} />
          ))}
          {plan && plan.days.filter((d) => d.date > today).length > 6 && (
            <button type="button" className="btn btn--ghost" aria-expanded={showAll} onClick={() => setShowAll((x) => !x)}>
              {showAll ? 'Mostrar só os próximos 6 dias' : 'Ver o cronograma completo'}
            </button>
          )}
        </section>
      )}

      <details className="panel">
        <summary>Como o plano é montado</summary>
        <ol className="list">
          <li>Todo dia começa com revisão espaçada (cerca de 20% do tempo, no mínimo 10 minutos).</li>
          <li>Teoria e exercícios dos módulos pendentes, na ordem da trilha. Módulos prioritários ou com acerto abaixo de 70% recebem o dobro de exercícios.</li>
          <li>Se o tempo não der para tudo, os módulos em foco vêm primeiro e o plano avisa o que ficou de fora.</li>
          <li>Cerca de 20% dos últimos dias ficam para simulados com tempo; a véspera é de revisão leve.</li>
          <li>O cronograma só muda quando você clica em “Recalcular”; os ajustes de hoje mudam sozinhos conforme seu desempenho.</li>
        </ol>
      </details>

      <section className="panel panel--warn">
        <h2>Excluir o plano</h2>
        <p>Remove só o plano de estudos (data, minutos e sessões marcadas). Aulas, exercícios, revisões e simulados continuam salvos.</p>
        {!confirmDelete ? (
          <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
            Excluir plano
          </button>
        ) : (
          <div className="row">
            <button type="button" className="btn btn--danger" onClick={() => (progress.setPlan(null), setConfirmDelete(false))}>
              Sim, excluir o plano
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function SessionList({ sessions, done, onToggle, showDate = false }: { sessions: PlanSession[]; done: Record<string, string>; onToggle: (id: string) => void; showDate?: boolean }) {
  return (
    <ul className="plan-list">
      {sessions.map((s) => (
        <li key={s.id} className={done[s.id] ? 'is-done' : ''}>
          <label className="plan-check">
            <input type="checkbox" checked={!!done[s.id]} onChange={() => onToggle(s.id)} />
            <span>
              <span className={`kind kind--${s.kind}`}>{KIND_LABEL[s.kind]}</span> {s.label}{' '}
              <span className="muted small">
                — {s.minutes} min{showDate ? ` • ${fmtDay(s.date)}` : ''}
              </span>
            </span>
          </label>
          <a className="btn btn--link" href={s.href}>
            Abrir
          </a>
        </li>
      ))}
    </ul>
  );
}

function DayBlock({ day, done, onToggle }: { day: PlanDay; done: Record<string, string>; onToggle: (id: string) => void }) {
  return (
    <div className="plan-day">
      <h3 className="small-heading">
        {fmtDay(day.date)} <span className="muted small">• {day.minutes} min</span>
      </h3>
      <SessionList sessions={day.sessions} done={done} onToggle={onToggle} />
    </div>
  );
}

function PlanForm({
  initial,
  today,
  weak,
  onSave,
  onCancel,
}: {
  initial: StudyPlanSettings | null;
  today: string;
  weak: ModuleId[];
  onSave: (examDate: string, minutes: number, priority: ModuleId[]) => void;
  onCancel?: () => void;
}) {
  const [examDate, setExamDate] = useState(initial?.examDate ?? '');
  const [minutes, setMinutes] = useState(initial ? String(initial.minutesPerDay) : '');
  const [priority, setPriority] = useState<ModuleId[]>(initial?.priorityModules ?? []);
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <form
      className="panel setup"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const errs: string[] = [];
        const m = Number(minutes);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) errs.push('Informe a data da prova.');
        else if (examDate <= today) errs.push('A data da prova precisa ser depois de hoje.');
        if (!Number.isInteger(m) || m < MIN_MINUTES_PER_DAY || m > 600) errs.push(`Informe os minutos por dia: um número inteiro entre ${MIN_MINUTES_PER_DAY} e 600.`);
        setErrors(errs);
        if (!errs.length) onSave(examDate, m, priority);
      }}
    >
      {errors.length > 0 && (
        <div className="callout callout--erro" role="alert">
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      <div className="setup__row">
        <label className="field">
          <span className="field__label">Data da prova</span>
          <input type="date" value={examDate} min={today} onChange={(e) => setExamDate(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field__label">Minutos de estudo por dia</span>
          <input inputMode="numeric" value={minutes} placeholder={`${MIN_MINUTES_PER_DAY} a 600`} onChange={(e) => setMinutes(e.target.value)} required />
        </label>
      </div>
      <fieldset>
        <legend>Módulos que você quer priorizar (opcional)</legend>
        {weak.length > 0 && <p className="muted small">Com acerto abaixo de 70% nas suas respostas: {weak.map((m) => `M${m.slice(1)}`).join(', ')} — esses já recebem reforço automaticamente.</p>}
        <div className="chips">
          {PLAN_MODS.map((m) => (
            <label key={m.id} className={`chip ${priority.includes(m.id) ? 'chip--on' : ''}`}>
              <input type="checkbox" className="sr-only" checked={priority.includes(m.id)} onChange={() => setPriority((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))} />
              {m.num}. {m.short}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="row">
        <button type="submit" className="btn btn--big">
          {initial ? 'Salvar e recalcular' : 'Criar meu plano'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
