import { useSyncExternalStore } from 'react';
import { createNotesStore, type NotesState, type NotesStore, type SaveStatus } from './lib/notes';

/** Instância única das anotações (exportada para os testes de tela poderem zerá-la). */
export const notesStore = createNotesStore();

export function useNotes(): [NotesState, NotesStore] {
  const state = useSyncExternalStore(notesStore.subscribe, notesStore.get, notesStore.get);
  return [state, notesStore];
}

export function useNotesStatus(): SaveStatus {
  return useSyncExternalStore(notesStore.subscribe, notesStore.status, notesStore.status);
}

// Qual caderno está aberto (no máximo um por vez). Fica fora do React para
// que abrir o caderno de um exercício feche o de outro.
export interface OpenNotebook {
  key: string;
  /** título exibido no painel, ex.: nome do exercício */
  title: string;
  kind: 'exercicio' | 'modulo';
}

let open: OpenNotebook | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const notebookUi = {
  get: () => open,
  open(nb: OpenNotebook) {
    open = nb;
    emit();
  },
  close(key?: string) {
    if (key && open?.key !== key) return;
    open = null;
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useOpenNotebook(): OpenNotebook | null {
  return useSyncExternalStore(notebookUi.subscribe, notebookUi.get, notebookUi.get);
}
