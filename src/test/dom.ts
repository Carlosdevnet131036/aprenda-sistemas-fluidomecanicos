// Preparação comum dos testes de tela (rodam em jsdom). Importe este arquivo
// no topo de cada *.test.tsx, logo após a diretiva `@vitest-environment jsdom`.
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
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

beforeEach(() => {
  progressStore.reset();
  sessionStorage.clear();
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
});
