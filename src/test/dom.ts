// Preparação comum dos testes de tela (rodam em jsdom). Importe este arquivo
// no topo de cada *.test.tsx, logo após a diretiva `@vitest-environment jsdom`.
import './storage'; // primeiro: os armazenamentos são criados ao importar os contextos
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { notebookUi, notesStore } from '../notesContext';
import { progressStore } from '../progressContext';

// APIs que o jsdom não implementa e que a interface usa.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
window.scrollTo = () => {};
Element.prototype.scrollIntoView = function scrollIntoView() {};
// O jsdom não desenha em <canvas>: sem contexto 2D, o caderno só registra os traços.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];

beforeEach(() => {
  progressStore.reset();
  notesStore.reset();
  notebookUi.close();
  sessionStorage.clear();
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
});
