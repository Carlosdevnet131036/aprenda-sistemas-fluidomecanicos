// @vitest-environment jsdom
import './dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { Dashboard } from '../components/Dashboard';
import { PlanoPage } from '../pages/PlanoPage';
import { addDays, dayKey } from '../lib/srs';
import { ProgressProvider, progressStore } from '../progressContext';

const go = async (hash: string) => {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

describe('navegação', () => {
  it('abre as páginas principais pelo endereço e mostra aviso em rota inexistente', async () => {
    render(
      <ProgressProvider>
        <App />
      </ProgressProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Aprenda Sistemas Fluidomecânicos' })).toBeTruthy();
    const pages: [string, string][] = [
      ['#/revisao', 'Lista de revisão do professor'],
      ['#/simulado', 'Simulado de prova'],
      ['#/revisar', 'Revisão inteligente'],
      ['#/plano', 'Plano de estudos'],
      ['#/exercicios', 'Exercícios resolvidos'],
      ['#/estudo', 'Meu estudo'],
      ['#/rota-que-nao-existe', 'Página não encontrada'],
    ];
    for (const [hash, title] of pages) {
      await go(hash);
      expect(screen.getByRole('heading', { level: 1, name: title }), hash).toBeTruthy();
    }
    expect(document.title).toBe('Aprenda Sistemas Fluidomecânicos');
  });
  it('menu tem os grupos Estudar e Consultar e marca a página atual', async () => {
    render(
      <ProgressProvider>
        <App />
      </ProgressProvider>,
    );
    await go('#/simulado');
    expect(screen.getByRole('group', { name: 'Estudar' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Consultar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Simulado' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('painel', () => {
  it('sem histórico, não inventa números e recomenda começar pela trilha', () => {
    render(
      <ProgressProvider>
        <Dashboard />
      </ProgressProvider>,
    );
    expect(screen.getByText('responda questões para medir')).toBeTruthy();
    expect(screen.getByText(/Começar: Módulo 0/)).toBeTruthy();
    expect(screen.getByText(/Ainda não há respostas suficientes/)).toBeTruthy();
  });
  it('com revisões vencidas, recomenda revisar primeiro', () => {
    progressStore.recordAnswer('m1-01', false);
    render(
      <ProgressProvider>
        <Dashboard />
      </ProgressProvider>,
    );
    expect(screen.getByText(/Revisar 1 questão\(ões\) vencida/)).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });
});

describe('plano de estudos', () => {
  it('valida os campos e monta o cronograma de hoje', async () => {
    const user = userEvent.setup();
    render(
      <ProgressProvider>
        <PlanoPage />
      </ProgressProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Criar meu plano' }));
    expect(screen.getByText('Informe a data da prova.')).toBeTruthy();
    expect(screen.getByText(/Informe os minutos por dia/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: dayKey(addDays(new Date(), 10)) } });
    await user.type(screen.getByLabelText('Minutos de estudo por dia'), '60');
    await user.click(screen.getByRole('button', { name: 'Criar meu plano' }));

    expect(screen.getByText(/faltam 10 dias/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Hoje' })).toBeTruthy();
    const plan = progressStore.get().plan!;
    expect(plan).toMatchObject({ minutesPerDay: 60, enabled: true });
    const firstBox = screen.getAllByRole('checkbox')[0];
    await user.click(firstBox);
    expect(Object.keys(progressStore.get().plan!.done)).toHaveLength(1);
  });
});
