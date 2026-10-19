// @vitest-environment jsdom
import './dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Quiz } from '../components/Quiz';
import { Exam } from '../components/Exam';
import { ReviewSession } from '../components/ReviewSession';
import { ExerciseCard } from '../components/ExerciseCard';
import { FormulaZoom } from '../components/FormulaZoom';
import { getQuestion } from '../content/questions';
import { getExercise } from '../content/exercises';
import { ACTIVE_EXAM_KEY } from '../lib/exam';
import { ProgressProvider, progressStore } from '../progressContext';

const qFalse = getQuestion('m1-01')!; // a massa NÃO muda na Lua → falsa
const qTrue = getQuestion('m1-02')!; // peso em newtons → verdadeira

const wrap = (ui: React.ReactElement) => render(<ProgressProvider>{ui}</ProgressProvider>);

describe('quiz no modo aprendizagem', () => {
  it('mostra a correção na hora e conta cada questão uma única vez', async () => {
    const user = userEvent.setup();
    wrap(<Quiz questions={[qFalse, qTrue]} mode="aprendizagem" scope="teste" />);
    await user.click(screen.getByRole('button', { name: 'Verdadeiro' }));
    expect(screen.getByText(/Julgamento incorreto/)).toBeTruthy();
    // insistir não muda a resposta nem soma outra tentativa
    await user.click(screen.getByRole('button', { name: 'Falso' }));
    await user.click(screen.getByRole('button', { name: 'Verdadeiro' }));
    expect(progressStore.get().questionStats[qFalse.id]).toMatchObject({ attempts: 1, correct: 0 });
    expect(progressStore.get().reviews[qFalse.id].box).toBe(0);
    await user.click(screen.getByRole('button', { name: /Próxima questão/ }));
    await user.click(screen.getByRole('button', { name: 'Verdadeiro' }));
    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    expect(screen.getByText('1 de 2 acertos')).toBeTruthy();
  });
});

describe('simulado com tempo', () => {
  const exam = () => ({ ids: [qFalse.id, qTrue.id], answers: {}, flags: [], index: 0, startedAt: Date.now(), timeLimitMin: 0, scope: 'teste' });

  it('não revela gabarito antes da entrega; confirma, corrige e registra o simulado', async () => {
    const user = userEvent.setup();
    wrap(<Exam exam={exam()} questions={[qFalse, qTrue]} onRetry={() => {}} onExit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Falso' }));
    await user.click(screen.getByRole('button', { name: /Marcar para revisar/ }));
    expect(screen.queryByText(/Julgamento/)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(ACTIVE_EXAM_KEY)!).flags).toEqual([qFalse.id]);

    await user.click(screen.getByRole('button', { name: 'Entregar simulado' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/1 questão\(ões\) em branco/)).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Entregar agora' }));

    expect(screen.getByText('de acertos').previousElementSibling?.textContent).toBe('50%');
    expect(screen.getByText('pontuação').previousElementSibling?.textContent).toBe('1/2');
    // revisão comentada completa: a respondida e a em branco
    expect(screen.getAllByText(/Julgamento correto/)).toHaveLength(1);
    expect(screen.getAllByText(/Sem resposta/)).toHaveLength(1);
    const last = progressStore.get().attempts[progressStore.get().attempts.length - 1];
    expect(last).toMatchObject({ mode: 'simulado', correct: 1, total: 2, unanswered: 1 });
    expect(sessionStorage.getItem(ACTIVE_EXAM_KEY)).toBeNull();
  });
});

describe('sessão de revisão espaçada', () => {
  it('erro volta para a caixa 0; acerto pede autoavaliação e sobe de caixa', async () => {
    const user = userEvent.setup();
    wrap(<ReviewSession ids={[qFalse.id, qTrue.id]} title="Revisão" onExit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Verdadeiro' })); // errado
    expect(progressStore.get().reviews[qFalse.id].box).toBe(0);
    await user.click(screen.getByRole('button', { name: /Próxima questão/ }));
    await user.click(screen.getByRole('button', { name: 'Verdadeiro' })); // certo
    expect(screen.getByText('Como foi lembrar a resposta?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Média/ }));
    expect(progressStore.get().reviews[qTrue.id].box).toBe(1);
    expect(progressStore.get().reviewLog).toHaveLength(2);
    expect(screen.getByText('Sessão concluída')).toBeTruthy();
  });
});

describe('exercício numérico', () => {
  it('valida o sinal, só mostra o esperado depois do acerto e permite refazer', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={getExercise('l01-q6')!} open />);
    const input = screen.getByLabelText(/digite sua resposta/);
    await user.type(input, '800');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText(/SINAL está trocado/)).toBeTruthy();
    expect(screen.getByText(/aparece quando você acertar/)).toBeTruthy();

    await user.clear(input);
    await user.type(input, '-800');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText(/Correto: valor, sinal e unidade/)).toBeTruthy();
    expect(screen.getByText(/tolerância de ±1%/)).toBeTruthy();
    expect(progressStore.get().solvedExercises).toContain('l01-q6');
    expect(progressStore.get().exerciseStats['l01-q6']).toMatchObject({ attempts: 2, errors: { sinal: 1 } });

    await user.click(screen.getByRole('button', { name: 'Refazer do zero' }));
    expect((screen.getByLabelText(/digite sua resposta/) as HTMLInputElement).value).toBe('');
    expect(progressStore.get().solvedExercises).toContain('l01-q6');
  });
  it('roteiro guiado revela um passo de cada vez', async () => {
    const user = userEvent.setup();
    wrap(<ExerciseCard ex={getExercise('l01-q6')!} open />);
    await user.click(screen.getByRole('button', { name: 'Resolver passo a passo' }));
    expect(screen.getByText(/Passo 1 de 9/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /mostrar este passo/ }));
    expect(screen.getByText(/Passo 2 de 9/)).toBeTruthy();
  });
});

describe('ampliar fórmula', () => {
  it('abre um diálogo com título e devolve o foco ao botão ao fechar', async () => {
    const user = userEvent.setup();
    render(<FormulaZoom tex="P = m \cdot g" title="Peso" />);
    const opener = screen.getByRole('button', { name: /Ampliar fórmula/ });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Peso' });
    expect(dialog.querySelector('.katex')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
