// Pilha de desfazer/refazer usada pelo caderno (texto e manuscrito).
// Imutável: cada operação devolve um novo histórico.

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

const LIMIT = 200;

export const initHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });

/** Registra um novo estado (apaga o "refazer"). */
export function commit<T>(h: History<T>, next: T): History<T> {
  if (Object.is(next, h.present)) return h;
  return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [] };
}

/** Troca o estado atual sem criar um passo novo (ex.: digitação contínua). */
export function amend<T>(h: History<T>, next: T): History<T> {
  return { ...h, present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
