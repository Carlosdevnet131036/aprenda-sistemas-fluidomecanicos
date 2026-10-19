import { useEffect, useState } from 'react';
import type { Module, Origin, Section, SectionKind } from '../content/types';
import { MODULES } from '../content/modules';
import { Blocks } from '../components/Blocks';
import { NotebookButton, NotebookHost } from '../components/Notebook';
import { moduleNotebookKey } from '../lib/notes';
import { useProgress } from '../progressContext';
import { moduleHref } from '../router';

const KIND: Record<SectionKind, string> = {
  intro: 'Introdução',
  basics: 'Conhecimentos básicos',
  intuition: 'Explicação intuitiva',
  technical: 'Explicação técnica',
  visual: 'Representação visual',
  formulas: 'Fórmulas explicadas',
  example: 'Exemplo resolvido',
  practice: 'Prática guiada',
  check: 'Verificação de aprendizagem',
};

const ORIGIN: Record<Origin, string> = {
  material: 'Do material',
  complemento: 'Complemento didático',
  misto: 'Material + complemento',
};

export function ModulePage({ mod, sec }: { mod: Module; sec: string | null }) {
  const [state, progress] = useProgress();
  const done = state.completedModules.includes(mod.id);
  const idx = MODULES.findIndex((m) => m.id === mod.id);
  const prev = MODULES[idx - 1];
  const next = MODULES[idx + 1];

  useEffect(() => {
    progress.visitModule(mod.id, `Aula: Módulo ${mod.num} — ${mod.title}`);
  }, [mod.id, mod.num, mod.title, progress]);

  useEffect(() => {
    if (!sec) return;
    const el = document.getElementById(`sec-${sec}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }, [mod.id, sec]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="module-layout">
      <aside className="toc" aria-label="Seções desta aula">
        <p className="toc__title">Nesta aula</p>
        <ol>
          {mod.sections.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => scrollTo(`sec-${s.id}`)}>
                {s.title}
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => scrollTo('sec-resumo')}>
              Resumo do módulo
            </button>
          </li>
        </ol>
      </aside>

      <article className="module">
        <nav className="crumbs" aria-label="Você está em">
          <a href="#/">Início</a> › <a href="#/trilha">Trilha</a> › <span aria-current="page">Módulo {mod.num}</span>
        </nav>
        <details className="toc-mobile">
          <summary>Nesta aula: {mod.sections.length + 1} seções</summary>
          <ol>
            {mod.sections.map((s) => (
              <li key={s.id}>
                <a href={moduleHref(mod.id, s.id)}>{s.title}</a>
              </li>
            ))}
            <li>
              <a href={moduleHref(mod.id, 'resumo')}>Resumo do módulo</a>
            </li>
          </ol>
        </details>
        <header className="module__head">
          <p className="kicker">
            Módulo {mod.num} de {MODULES.length - 1} • ≈ {mod.minutes} min {done && <span className="badge badge--ok">Concluído</span>}
          </p>
          <h1>{mod.title}</h1>
          <p className="lead">{mod.description}</p>
          <p className="muted small">Fonte: {mod.source}</p>
          <div className="row">
            <NotebookButton nb={{ key: moduleNotebookKey(mod.id), title: `Observações gerais — Módulo ${mod.num}: ${mod.short}`, kind: 'modulo' }} label="Caderno do módulo" />
          </div>
          <NotebookHost nbKey={moduleNotebookKey(mod.id)} />
        </header>

        {mod.sections.map((s) => (
          <SectionView key={s.id} s={s} />
        ))}

        <section id="sec-resumo" className="section section--summary">
          <p className="section__kind">Resumo do módulo</p>
          <h2>O que levar desta aula</h2>
          <div className="grid2">
            <div className="panel panel--ok">
              <h3>Conceitos essenciais</h3>
              <ul>{mod.summary.essentials.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
            <div className="panel panel--warn">
              <h3>Erros a evitar</h3>
              <ul>{mod.summary.mistakes.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          </div>
          <div className="complete">
            <button type="button" className={`btn ${done ? 'btn--ghost' : ''}`} aria-pressed={done} onClick={() => progress.setModuleCompleted(mod.id, !done)}>
              {done ? '✓ Aula concluída (desmarcar)' : 'Marcar aula como concluída'}
            </button>
            {mod.id !== 'm7' && mod.id !== 'm0' && (
              <a className="btn btn--ghost" href={`#/quiz?modulos=${mod.id}&modo=aprendizagem&n=10`}>
                Quiz deste módulo
              </a>
            )}
          </div>
        </section>

        <nav className="pager" aria-label="Navegação entre aulas">
          {prev ? (
            <a className="pager__link" href={moduleHref(prev.id)}>
              <span className="muted small">← Aula anterior</span>
              <span>
                Módulo {prev.num}: {prev.short}
              </span>
            </a>
          ) : (
            <span />
          )}
          {next && (
            <a className="pager__link pager__link--next" href={moduleHref(next.id)}>
              <span className="muted small">Próxima aula →</span>
              <span>
                Módulo {next.num}: {next.short}
              </span>
            </a>
          )}
        </nav>
      </article>
    </div>
  );
}

function SectionView({ s }: { s: Section }) {
  const [simple, setSimple] = useState(false);
  return (
    <section id={`sec-${s.id}`} className={`section section--${s.kind}`} aria-labelledby={`h-${s.id}`}>
      <p className="section__kind">
        {KIND[s.kind]} <span className={`origin origin--${s.origin}`}>{ORIGIN[s.origin]}</span>
      </p>
      <h2 id={`h-${s.id}`}>{s.title}</h2>
      <Blocks blocks={s.blocks} />
      {s.simpler && (
        <div className="simpler">
          <button type="button" className="btn btn--soft" aria-expanded={simple} onClick={() => setSimple((x) => !x)}>
            {simple ? 'Fechar explicação simples' : '💡 Explique de outra forma'}
          </button>
          {simple && (
            <div className="simpler__body">
              <Blocks blocks={s.simpler} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
