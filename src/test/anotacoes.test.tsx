// @vitest-environment jsdom
import './dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExerciseCard } from '../components/ExerciseCard';
import { getExercise } from '../content/exercises';
import { getModule } from '../content/modules';
import { createNotesStore, NOTES_KEY } from '../lib/notes';
import { notesStore } from '../notesContext';
import { ModulePage } from '../pages/ModulePage';
import { ProgressProvider, progressStore } from '../progressContext';

const ex6 = getExercise('l01-q6')!;
const ex1 = getExercise('l01-q1')!;
const wrap = (ui: React.ReactElement) => render(<ProgressProvider>{ui}</ProgressProvider>);

/** Seleciona `quote` dentro do campo destacável, como o estudante faria com o mouse ou o dedo. */
function select(field: string, quote: string) {
  const el = document.querySelector(`[data-hl-field="${field}"]`)!;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const i = node.textContent!.indexOf(quote);
    if (i === -1) continue;
    const r = document.createRange();
    r.setStart(node, i);
    r.setEnd(node, i + quote.length);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
    act(() => void document.dispatchEvent(new Event('selectionchange')));
    return;
  }
  throw new Error(`trecho não encontrado: ${quote}`);
}

const marks = () => [...document.querySelectorAll('.exercise__text mark.hl')].filter((m) => !m.closest('.hl-list')).map((m) => `${m.className.split(' ')[1]}:${m.textContent}`);

afterEach(() => vi.restoreAllMocks());

describe('marca-texto', () => {
  it('só destaca com ação explícita, preserva o texto e lembra os destaques ao voltar', async () => {
    const user = userEvent.setup();
    const view = wrap(<ExerciseCard ex={ex6} open />);
    const statement = document.querySelector('.exercise__statement')!;
    select('enunciado', '200 kPa');
    expect(marks()).toEqual([]); // selecionar não destaca sozinho
    expect(screen.getByText(/Trecho selecionado: “200 kPa”/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Destacar em amarelo/ }));
    select('pede', 'ΔV');
    await user.click(screen.getByRole('button', { name: /Destacar em rosa/ }));
    select('dado:1', '6 dm³');
    await user.click(screen.getByRole('button', { name: /Destacar em verde/ }));
    expect(marks()).toEqual(['hl--dado:200 kPa', 'hl--condicao:6 dm³', 'hl--objetivo:ΔV']); // ordem da página
    expect(statement.textContent).toBe(ex6.statement); // pontuação e texto intactos

    // sair do exercício e voltar; depois, "recarregar" lendo do localStorage
    view.unmount();
    wrap(<ExerciseCard ex={ex6} open />);
    expect(marks()).toHaveLength(3);
    const reloaded = createNotesStore(window.localStorage);
    expect(reloaded.get().highlights['l01-q6'].map((h) => h.quote).sort()).toEqual(['200 kPa', '6 dm³', 'ΔV'].sort());
  });

  it('remove um destaque clicando nele e limpa todos com confirmação', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={ex6} open />);
    select('enunciado', '200 kPa');
    await user.click(screen.getByRole('button', { name: /Destacar em amarelo/ }));
    select('enunciado', 'Calcule ΔV');
    await user.click(screen.getByRole('button', { name: /Destacar em rosa/ }));
    select('enunciado', 'interprete o sinal');
    await user.click(screen.getByRole('button', { name: /Destacar em verde/ }));

    await user.click(document.querySelector('.exercise__statement mark.hl--dado')!);
    await user.click(screen.getByRole('button', { name: 'Remover destaque' }));
    expect(marks()).toEqual(['hl--objetivo:Calcule ΔV', 'hl--condicao:interprete o sinal']);

    await user.click(screen.getByText(/Destaques deste exercício \(2\)/));
    await user.click(screen.getByRole('button', { name: 'Limpar todos os destaques' }));
    expect(marks()).toHaveLength(2); // ainda pede confirmação
    await user.click(screen.getByRole('button', { name: 'Remover todos' }));
    expect(marks()).toEqual([]);
    expect(notesStore.get().highlights['l01-q6']).toBeUndefined();
  });

  it('não restaura destaque cujo trecho não existe mais no enunciado', () => {
    notesStore.setHighlights('l01-q6', [
      { id: 'velho', field: 'enunciado', start: 0, end: 9, color: 'dado', quote: 'Um tanque' },
      { id: 'ok', field: 'pede', start: 0, end: 2, color: 'objetivo', quote: 'ΔV' },
    ]);
    wrap(<ExerciseCard ex={ex6} open />);
    expect(marks()).toEqual(['hl--objetivo:ΔV']);
    expect(screen.getByText(/1 destaque\(s\) antigo\(s\) não correspondia/)).toBeTruthy();
    expect(notesStore.get().highlights['l01-q6'].map((h) => h.id)).toEqual(['ok']);
  });
});

describe('caderno de cálculos', () => {
  it('salva sozinho, recupera ao reabrir e mantém cadernos separados por exercício', async () => {
    const user = userEvent.setup();
    wrap(
      <>
        <ExerciseCard ex={ex6} open />
        <ExerciseCard ex={ex1} open />
      </>,
    );
    const [b6, b1] = screen.getAllByRole('button', { name: 'Caderno de cálculos' });
    await user.click(b6);
    const panel = screen.getByRole('complementary', { name: 'Caderno de cálculos' });
    expect(within(panel).getByText(ex6.title)).toBeTruthy();
    const ta = within(panel).getByLabelText('Anotações e cálculos');
    expect(document.activeElement).toBe(ta);
    await user.type(ta, 'W = p·ΔV{Enter}W = -800 J');
    await user.click(within(panel).getByRole('button', { name: 'Fechar caderno' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(notesStore.get().notebooks['ex:l01-q6'].text).toBe('W = p·ΔV\nW = -800 J');

    await user.click(b1); // outro exercício: caderno vazio
    expect((screen.getByLabelText('Anotações e cálculos') as HTMLTextAreaElement).value).toBe('');
    await user.click(screen.getAllByRole('button', { name: /caderno de cálculos/i })[0]); // volta ao da q6
    expect((screen.getByLabelText('Anotações e cálculos') as HTMLTextAreaElement).value).toBe('W = p·ΔV\nW = -800 J');
    expect(screen.getAllByRole('complementary')).toHaveLength(1); // um caderno aberto por vez
    expect(JSON.parse(localStorage.getItem(NOTES_KEY)!).notebooks['ex:l01-q6'].text).toBe('W = p·ΔV\nW = -800 J');
  });

  it('desfazer, refazer, roteiro, símbolo e limpar com confirmação', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={ex6} open />);
    await user.click(screen.getByRole('button', { name: 'Caderno de cálculos' }));
    const ta = screen.getByLabelText('Anotações e cálculos') as HTMLTextAreaElement;
    await user.type(ta, 'p = 200 kPa');
    await user.click(screen.getByRole('button', { name: 'Roteiro' }));
    expect(ta.value).toMatch(/^p = 200 kPaDADOS:\n\nINCÓGNITA:/);
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(ta.value).toBe('p = 200 kPa');
    await user.click(screen.getByRole('button', { name: 'Refazer' }));
    expect(ta.value).toMatch(/RESULTADO:\n$/);
    await user.click(screen.getByText('Inserir símbolo'));
    await user.click(screen.getByRole('button', { name: 'Inserir ρ' }));
    expect(ta.value.endsWith('ρ')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(ta.value).not.toBe(''); // só apaga depois de confirmar
    await user.click(screen.getByRole('button', { name: 'Apagar texto' }));
    expect(ta.value).toBe('');
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(ta.value.endsWith('ρ')).toBe(true);
  });

  it('modo manuscrito: registra traços, desfaz e guarda ao fechar', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={ex6} open />);
    await user.click(screen.getByRole('button', { name: 'Caderno de cálculos' }));
    await user.click(screen.getByRole('button', { name: 'Manuscrito' }));
    const canvas = screen.getByRole('img', { name: /Folha manuscrita com 0 traço/ });
    expect(canvas.style.touchAction).toBe('none'); // o toque escreve em vez de rolar a página
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 60, clientY: 40 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 50 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 50 });
    expect(screen.getByRole('img', { name: /com 1 traço/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cor Azul' }));
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: 'pen', button: 0, clientX: 10, clientY: 200 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: 'pen', clientX: 200, clientY: 200 });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: 'pen' });
    // com caneta em uso, o toque da palma da mão é ignorado
    fireEvent.pointerDown(canvas, { pointerId: 3, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerMove(canvas, { pointerId: 3, pointerType: 'touch', clientX: 350, clientY: 350 });
    fireEvent.pointerUp(canvas, { pointerId: 3, pointerType: 'touch' });
    expect(screen.getByRole('img', { name: /com 2 traço/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Desfazer traço' }));
    expect(screen.getByRole('img', { name: /com 1 traço/ })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Fechar caderno' }));
    const ink = notesStore.get().notebooks['ex:l01-q6'].ink;
    expect(ink).toHaveLength(1);
    expect(ink[0]).toMatchObject({ c: '#1f2937', w: 4 });
    expect(ink[0].p).toEqual([10, 10, 60, 40, 120, 50]);
  });

  it('avisa quando o navegador está sem espaço, sem perder o texto da tela', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={ex6} open />);
    await user.click(screen.getByRole('button', { name: 'Caderno de cálculos' }));
    // no jsdom o método fica no protótipo (Storage); no armazenamento em memória dos testes, na instância
    const target = typeof Storage !== 'undefined' && window.localStorage instanceof Storage ? Storage.prototype : window.localStorage;
    vi.spyOn(target, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError');
    });
    const ta = screen.getByLabelText('Anotações e cálculos') as HTMLTextAreaElement;
    await user.type(ta, 'conta');
    act(() => ta.blur());
    expect(screen.getByRole('alert').textContent).toMatch(/sem espaço/);
    expect(screen.getByText('Não salvo: sem espaço')).toBeTruthy();
    expect(ta.value).toBe('conta');
    vi.restoreAllMocks();
    await user.click(screen.getByRole('button', { name: 'Tentar salvar de novo' }));
    expect(JSON.parse(localStorage.getItem(NOTES_KEY)!).notebooks['ex:l01-q6'].text).toBe('conta');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('o caderno do módulo é separado dos cadernos dos exercícios', async () => {
    const user = userEvent.setup();
    wrap(<ModulePage mod={getModule('m1')!} sec={null} />);
    await user.click(screen.getByRole('button', { name: 'Caderno do módulo' }));
    const panel = screen.getByRole('complementary', { name: 'Caderno do módulo' });
    await user.type(within(panel).getByLabelText('Anotações e cálculos'), 'peso ≠ massa');
    expect(within(panel).queryByRole('button', { name: 'Roteiro' })).toBeNull();
    await user.click(within(panel).getByRole('button', { name: 'Fechar caderno' }));
    expect(Object.keys(notesStore.get().notebooks)).toEqual(['mod:m1']);
  });
});

describe('Minha resolução', () => {
  it('resolução fica oculta até “Conferir resolução”, mostra o caderno e registra a autoavaliação', async () => {
    const user = userEvent.setup();
    notesStore.setText('ex:l01-q6', 'W = 200000 · (−0,004) = −800 J');
    wrap(<ExerciseCard ex={ex6} open />);
    expect(screen.queryByText(/Resolução oficial\./)).toBeNull();
    expect(screen.queryByText(ex6.result)).toBeNull();

    // o botão avisa que o caderno já tem anotações
    await user.click(screen.getByRole('button', { name: 'Caderno de cálculos com anotações' }));
    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: 'Conferir resolução' }));
    expect(screen.getByText(/Resolução oficial\./)).toBeTruthy();
    expect(screen.getByText(ex6.result)).toBeTruthy();
    const mine = screen.getByText('Minha resolução (do caderno)').closest('details')!;
    expect(within(mine).getByText('W = 200000 · (−0,004) = −800 J')).toBeTruthy();

    await user.click(within(screen.getByRole('group', { name: 'Como foi a etapa Conversões' })).getByRole('button', { name: 'Preciso revisar' }));
    await user.click(screen.getByRole('button', { name: 'Registrar no histórico' }));
    expect(screen.getByText('Escolha como foi a sua resolução.')).toBeTruthy(); // não registra sem autoavaliação
    await user.click(screen.getByLabelText(/Resolvi corretamente/));
    expect((screen.getByLabelText('Etapa que gerou dificuldade') as HTMLSelectElement).value).toBe('conversoes');
    await user.type(screen.getByLabelText('Observação pessoal sobre o erro'), 'esqueci dm³ → m³');
    await user.click(screen.getByRole('button', { name: 'Registrar no histórico' }));

    expect(screen.getByText(/Registrado\. Próxima revisão/)).toBeTruthy();
    const [r] = progressStore.get().reflections['l01-q6'];
    expect(r).toMatchObject({ result: 'acertei', steps: { conversoes: 'revisar' }, difficultStep: 'conversoes', note: 'esqueci dm³ → m³', autoCheck: null });
    expect(progressStore.get().exerciseReviews['l01-q6'].box).toBe(1); // etapa “preciso revisar” não deixa subir mais
    expect(notesStore.get().notebooks['ex:l01-q6'].text).toBe('W = 200000 · (−0,004) = −800 J'); // caderno intacto
    expect(screen.getByText('Registros anteriores (1)')).toBeTruthy();
  });

  it('informa o corretor numérico só quando há resposta verificável', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={ex6} open />);
    await user.type(screen.getByLabelText(/digite sua resposta/), '800');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    await user.click(screen.getByRole('button', { name: 'Conferir resolução' }));
    expect(screen.getByText(/Verificação automática: na sua última resposta numérica, o sinal estava trocado/)).toBeTruthy();
    await user.click(screen.getByLabelText(/Resolvi corretamente/));
    expect(screen.getByText(/não conferiu com o resultado oficial/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Registrar no histórico' }));
    expect(progressStore.get().reflections['l01-q6'][0]).toMatchObject({ result: 'acertei', autoCheck: 'incorreto' });
  });

  it('“Refazer do zero” esconde a resolução mas não apaga caderno nem destaques', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={ex6} open />);
    select('enunciado', '200 kPa');
    await user.click(screen.getByRole('button', { name: /Destacar em amarelo/ }));
    notesStore.setText('ex:l01-q6', 'minha conta');
    await user.click(screen.getByRole('button', { name: 'Conferir resolução' }));
    await user.click(screen.getByRole('button', { name: 'Refazer do zero' }));
    expect(screen.queryByText(/Resolução oficial\./)).toBeNull();
    expect(marks()).toEqual(['hl--dado:200 kPa']);
    expect(notesStore.get().notebooks['ex:l01-q6'].text).toBe('minha conta');
  });
});
