import { MODULES } from '../content/modules';
import { QUESTIONS } from '../content/questions';
import { EXERCISES } from '../content/exercises';
import { REVISAO, REVISAO_GROUPS } from '../content/revisao';
import { useProgress } from '../progressContext';
import { moduleHref } from '../router';

export function useOverall() {
  const [state] = useProgress();
  const done = MODULES.filter((m) => state.completedModules.includes(m.id)).length;
  const next = MODULES.find((m) => !state.completedModules.includes(m.id));
  return { done, total: MODULES.length, pct: Math.round((done / MODULES.length) * 100), next, state };
}

export function Home() {
  const { done, total, pct, next, state } = useOverall();
  const started = state.visitedModules.length > 0;
  return (
    <div className="home">
      <RevisaoBanner />
      <section className="hero">
        <div className="hero__text">
          <p className="kicker">Revisão para a A1 • do zero à prova</p>
          <h1>Aprenda Sistemas Fluidomecânicos</h1>
          <p className="lead">
            Nunca estudou o assunto ou está enferrujado? Sem problema. Aqui cada conceito é explicado desde o começo, com exemplos do dia a dia, fórmulas
            explicadas símbolo por símbolo e exercícios resolvidos passo a passo.
          </p>
          <div className="row">
            <a className="btn btn--big" href={moduleHref(next?.id ?? 'm0')}>
              {started && next ? `Continuar: Módulo ${next.num}` : 'Começar a aprender'}
            </a>
            <a className="btn btn--ghost btn--big" href="#/quiz">
              Testar meus conhecimentos
            </a>
          </div>
        </div>
        <div className="hero__progress" aria-label="Progresso geral">
          <div className="score__ring score__ring--big" style={{ ['--pct' as string]: pct }}>
            <span>{pct}%</span>
          </div>
          <p>
            <strong>
              {done} de {total}
            </strong>{' '}
            aulas concluídas
          </p>
          <p className="muted small">
            {state.solvedExercises.length} de {EXERCISES.length} exercícios resolvidos
          </p>
          {next ? (
            <p className="small">
              Próximo passo: <a href={moduleHref(next.id)}>Módulo {next.num} — {next.short}</a>
            </p>
          ) : (
            <p className="small">Trilha completa! Faça a avaliação final de novo para fixar.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="learn-t">
        <h2 id="learn-t">O que você vai aprender</h2>
        <div className="cards3">
          <div className="card">
            <h3>Termodinâmica</h3>
            <p>Sistemas, Lei Zero, calor, trabalho, 1ª Lei com a convenção de sinais, transformações, 2ª Lei e ciclo de Carnot.</p>
          </div>
          <div className="card">
            <h3>Propriedades dos fluidos</h3>
            <p>Massa, peso, volume, massa específica, densidade relativa, peso específico e viscosidade.</p>
          </div>
          <div className="card">
            <h3>Pressão e manometria</h3>
            <p>Lei de Stevin, pressão absoluta e manométrica e como “caminhar” por um manômetro de tubo em U.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="trail-t">
        <h2 id="trail-t">Trilha de aprendizagem</h2>
        <Trail />
      </section>

      <section aria-labelledby="how-t">
        <h2 id="how-t">Como funciona o aprendizado</h2>
        <ol className="how">
          <li>
            <strong>Leia a aula.</strong> Cada módulo segue a mesma ordem: introdução, palavras-chave, explicação intuitiva, explicação técnica, fórmulas
            explicadas, exemplo resolvido, prática e verificação.
          </li>
          <li>
            <strong>Pratique com dicas.</strong> Tente resolver cada exercício antes de abrir a resolução. As dicas aparecem uma de cada vez.
          </li>
          <li>
            <strong>Experimente no Laboratório.</strong> Mude os valores das fórmulas e veja a resolução passo a passo se refazer.
          </li>
          <li>
            <strong>Verifique com Verdadeiro ou Falso.</strong> {QUESTIONS.length} afirmações com justificativa; os erros vão para a sua revisão.
          </li>
          <li>
            <strong>Faça a avaliação final.</strong> Questões de todos os módulos, sem correção até a entrega.
          </li>
        </ol>
        <p className="muted small">
          Sem cadastro: seu progresso fica salvo apenas neste navegador. Você pode apagá-lo a qualquer momento em <a href="#/estudo">Meu estudo</a>.
        </p>
      </section>
    </div>
  );
}

export function Trail() {
  const { state } = useOverall();
  const firstOpen = MODULES.find((m) => !state.completedModules.includes(m.id))?.id;
  return (
    <ol className="trail">
      {MODULES.map((m) => {
        const done = state.completedModules.includes(m.id);
        const isNext = m.id === firstOpen;
        return (
          <li key={m.id} className={`trail__item ${done ? 'trail__item--done' : ''} ${isNext ? 'trail__item--next' : ''}`}>
            <span className="trail__n" aria-hidden="true">
              {done ? '✓' : m.num}
            </span>
            <a href={moduleHref(m.id)} className="trail__card">
              <span className="trail__meta">
                Módulo {m.num} • ≈ {m.minutes} min
                {done && <span className="badge badge--ok">Concluído</span>}
                {isNext && <span className="badge badge--next">Próximo passo</span>}
                {!done && !isNext && state.visitedModules.includes(m.id) && <span className="badge">Em andamento</span>}
              </span>
              <span className="trail__title">{m.title}</span>
              <span className="trail__desc">{m.description}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function RevisaoBanner() {
  const [state] = useProgress();
  const solved = REVISAO.filter((e) => state.solvedExercises.includes(e.id)).length;
  return (
    <section className="revisao-banner" aria-labelledby="rev-t">
      <p className="kicker kicker--hot">★ Novo • Prioridade para a prova</p>
      <h2 id="rev-t">Lista de revisão do professor</h2>
      <p>
        O professor passou a lista de revisão — questões dela devem cair na prova. São {REVISAO.length} questões resolvidas passo a passo:{' '}
        {REVISAO_GROUPS.map((g) => g.title.toLowerCase()).join('; ')}.
      </p>
      <div className="row">
        <a className="btn btn--big btn--hot" href="#/revisao">
          {solved > 0 ? `Continuar a revisão (${solved}/${REVISAO.length})` : 'Estudar a lista de revisão'}
        </a>
      </div>
    </section>
  );
}
