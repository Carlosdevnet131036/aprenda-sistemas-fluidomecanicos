import { useEffect, useRef, useState } from 'react';
import { getModule } from './content/modules';
import { useRoute } from './router';
import { Home, useOverall } from './pages/Home';
import { ModulePage } from './pages/ModulePage';
import { QuizPage } from './pages/QuizPage';
import { RevisaoPage } from './pages/RevisaoPage';
import { ConverterPage, ExercisesPage, FormulasPage, GlossaryPage, LabPage, StudyPage, TrailPage } from './pages/Pages';

const NAV = [
  { href: '#/revisao', label: '★ Revisão da prova', match: ['revisao'], hot: true },
  { href: '#/trilha', label: 'Trilha', match: ['trilha', 'modulo'] },
  { href: '#/laboratorio', label: 'Laboratório', match: ['laboratorio'] },
  { href: '#/exercicios', label: 'Exercícios', match: ['exercicios'] },
  { href: '#/quiz', label: 'Quiz V/F', match: ['quiz'] },
  { href: '#/formulario', label: 'Formulário', match: ['formulario'] },
  { href: '#/glossario', label: 'Glossário', match: ['glossario'] },
  { href: '#/conversor', label: 'Conversor', match: ['conversor'] },
  { href: '#/estudo', label: 'Meu estudo', match: ['estudo'] },
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
      page = <RevisaoPage key={a ?? 'lista'} id={a} />;
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
      page = <ExercisesPage key={a ?? 'lista'} id={a} />;
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
    case 'estudo':
      page = <StudyPage />;
      title = 'Meu estudo';
      break;
    default:
      page = <NotFound />;
  }
  useEffect(() => {
    document.title = head ? `${title} • Aprenda Sistemas Fluidomecânicos` : title;
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
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={n.hot ? 'nav__hot' : undefined} aria-current={n.match.includes(head ?? '') ? 'page' : undefined}>
              {n.label}
            </a>
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
