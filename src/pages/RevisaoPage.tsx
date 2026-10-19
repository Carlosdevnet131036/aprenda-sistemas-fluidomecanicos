import { ExerciseCard } from '../components/ExerciseCard';
import { getRevisao, REVISAO, REVISAO_CONSTANTES, REVISAO_GROUPS } from '../content/revisao';
import { useProgress } from '../progressContext';

export function RevisaoPage({ id }: { id?: string }) {
  const [state] = useProgress();
  const single = id ? getRevisao(id) : undefined;
  if (single) {
    return (
      <div className="page page--narrow">
        <nav className="crumbs">
          <a href="#/revisao">Revisão da prova</a> › <span aria-current="page">{single.title}</span>
        </nav>
        <ExerciseCard ex={single} open />
      </div>
    );
  }
  const solved = REVISAO.filter((e) => state.solvedExercises.includes(e.id)).length;
  const pct = Math.round((solved / REVISAO.length) * 100);
  return (
    <div className="page page--narrow">
      <header className="page__head">
        <p className="kicker kicker--hot">★ Prioridade máxima para a prova</p>
        <h1>Lista de revisão do professor</h1>
        <p className="lead">
          Lista de exercícios de Mecânica dos Fluidos (FAETI — Prof. Dr. Ronyclei R. Silva), passada como revisão para a prova. São 15 questões com
          resolução completa, dicas progressivas e verificação da resposta.
        </p>
        <div className="revisao__progress" aria-label="Progresso na lista de revisão">
          <span className="bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
          <span className="small">
            {solved} de {REVISAO.length} resolvidas
          </span>
        </div>
      </header>

      <div className="callout callout--alerta">
        <p className="callout__title">Orientações do professor</p>
        <p>
          Apresente as fórmulas utilizadas, as substituições, as unidades e o resultado final. Justifique as respostas conceituais e interprete os
          resultados físicos.
        </p>
        <p>
          <strong>Constantes da lista:</strong> {REVISAO_CONSTANTES.join(' • ')}.
        </p>
      </div>

      <nav className="chips" aria-label="Assuntos da lista">
        {REVISAO_GROUPS.map((g, i) => (
          <a key={g.title} className="chip" href={`#/revisao?sec=g${i}`} onClick={(e) => (e.preventDefault(), document.getElementById(`g${i}`)?.scrollIntoView({ behavior: 'smooth' }))}>
            {g.title}
          </a>
        ))}
      </nav>

      {REVISAO_GROUPS.map((g, i) => (
        <section key={g.title} id={`g${i}`} aria-labelledby={`g${i}-t`} className="revisao__group">
          <h2 id={`g${i}-t`}>{g.title}</h2>
          {g.ids.map((qid) => {
            const ex = getRevisao(qid)!;
            return <ExerciseCard key={qid} ex={ex} />;
          })}
        </section>
      ))}
    </div>
  );
}
