import { useEffect, useRef, useState } from 'react';
import { getModule } from './content/modules';
import { useRoute } from './router';
import { Home, useOverall } from './pages/Home';
import { ModulePage } from './pages/ModulePage';
import { QuizPage } from './pages/QuizPage';
import { RevisaoPage } from './pages/RevisaoPage';
import { RevisarPage } from './pages/RevisarPage';
import { SimuladoPage } from './pages/SimuladoPage';
import { PlanoPage } from './pages/PlanoPage';
import { ConverterPage, ExercisesPage, FormulasPage, GlossaryPage, LabPage, StudyPage, TrailPage } from './pages/Pages';

// Menu em dois grupos: o que se faz para estudar e o que se consulta.
const NAV: { group: string; items: { href: string; label: string; match: string[]; hot?: boolean }[] }[] = [
  {
    group: 'Estudar',
    items: [
      { href: '#/', label: 'Painel', match: [''] },
      { href: '#/revisao', label: '★ Revisão da prova', match: ['revisao'], hot: true },
      { href: '#/trilha', label: 'Trilha', match: ['trilha', 'modulo'] },
      { href: '#/exercicios', label: 'Exercícios', match: ['exercicios'] },
      { href: '#/revisar', label: 'Revisões', match: ['revisar'] },
      { href: '#/simulado', label: 'Simulado', match: ['simulado'] },
      { href: '#/plano', label: 'Plano', match: ['plano'] },
    ],
  },
  {
    group: 'Consultar',
    items: [
      { href: '#/quiz', label: 'Quiz V/F', match: ['quiz'] },
      { href: '#/laboratorio', label: 'Laboratório', match: ['laboratorio'] },
      { href: '#/formulario', label: 'Formulário', match: ['formulario'] },
      { href: '#/glossario', label: 'Glossário', match: ['glossario'] },
      { href: '#/conversor', label: 'Conversor', match: ['conversor'] },
      { href: '#/estudo', label: 'Meu estudo', match: ['estudo'] },
    ],
  },
];

export function App() {
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { pct } = useOverall();
  const [head, a] = route.parts;

  // Ao trocar de página: fecha o menu, volta ao topo e move o foco para o conteúdo.
  useEffect(() => {
    setMenu(false);
    if (!route.query.get('sec')) window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [route.raw]);

  let page: JSX.Element;
  let title = 'Aprenda Sistemas Fluidomecânicos';
  switch (head) {
    case undefined:
      page = <Home />;
      break;
    case 'trilha':
      page = <TrailPage />;
      title = 'Trilha';
      break;
    case 'modulo': {
      const mod = getModule(a ?? '');
      page = mod ? <ModulePage key={mod.id} mod={mod} sec={route.query.get('sec')} /> : <NotFound />;
      if (mod) title = `Módulo ${mod.num}: ${mod.title}`;
      break;
    }
    case 'revisao':
      page = <RevisaoPage key={a ?? 'lista'} id={a} sec={route.query.get('sec')} />;
      title = 'Revisão da prova';
      break;
    case 'quiz':
      page = <QuizPage key={route.raw} query={route.query} />;
      title = 'Quiz';
      break;
    case 'laboratorio':
      page = <LabPage id={a} />;
      title = 'Laboratório de Fórmulas';
      break;
    case 'exercicios':
      page = <ExercisesPage key={a ?? route.raw} id={a} query={route.query} />;
      title = 'Exercícios';
      break;
    case 'formulario':
      page = <FormulasPage />;
      title = 'Formulário';
      break;
    case 'glossario':
      page = <GlossaryPage />;
      title = 'Glossário';
      break;
    case 'conversor':
      page = <ConverterPage />;
      title = 'Conversor de unidades';
      break;
    case 'simulado':
      page = <SimuladoPage key={route.raw} query={route.query} />;
      title = 'Simulado de prova';
      break;
    case 'plano':
      page = <PlanoPage />;
      title = 'Plano de estudos';
      break;
    case 'revisar':
      page = <RevisarPage />;
      title = 'Revisão inteligente';
      break;
    case 'estudo':
      page = <StudyPage />;
      title = 'Meu estudo';
      break;
    default:
      page = <NotFound />;
  }
  useEffect(() => {
    document.title = head && title !== 'Aprenda Sistemas Fluidomecânicos' ? `${title} • Aprenda Sistemas Fluidomecânicos` : title;
  }, [title, head]);

  return (
    <>
      <a href="#conteudo" className="skip" onClick={(e) => (e.preventDefault(), mainRef.current?.focus())}>
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <a href="#/" className="brand" aria-label="Início — Aprenda Sistemas Fluidomecânicos">
            <span className="brand__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M12 2c3.5 4.6 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.4 6-11z" fill="currentColor" />
              </svg>
            </span>
            <span className="brand__text">Aprenda Sistemas Fluidomecânicos</span>
          </a>
          <div className="topbar__progress" title="Progresso geral">
            <span className="bar bar--thin" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
            <span className="small">{pct}%</span>
          </div>
          <button type="button" className="menu-btn" aria-expanded={menu} aria-controls="nav" onClick={() => setMenu((m) => !m)}>
            {menu ? 'Fechar' : 'Menu'}
          </button>
        </div>
        <nav id="nav" className={`nav ${menu ? 'nav--open' : ''}`} aria-label="Principal">
          {NAV.map((g) => (
            <div key={g.group} className="nav__group" role="group" aria-label={g.group}>
              <span className="nav__group-label" aria-hidden="true">
                {g.group}
              </span>
              {g.items.map((n) => (
                <a key={n.href} href={n.href} className={n.hot ? 'nav__hot' : undefined} aria-current={n.match.includes(head ?? '') ? 'page' : undefined}>
                  {n.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </header>
      <main id="conteudo" ref={mainRef} tabIndex={-1}>
        {page}
      </main>
      <footer className="footer">
        <p>
          Baseado no material “Revisão A1 — Sistemas Fluidomecânicos” (Prof. Dr. Ronyclei R. Silva). Conteúdo marcado como “Complemento didático” foi
          acrescentado para iniciantes. Progresso salvo apenas neste navegador.
        </p>
      </footer>
    </>
  );
}

function NotFound() {
  return (
    <div className="page page--narrow">
      <h1>Página não encontrada</h1>
      <p>
        Esse endereço não existe. <a href="#/">Voltar ao início</a>.
      </p>
    </div>
  );
}
