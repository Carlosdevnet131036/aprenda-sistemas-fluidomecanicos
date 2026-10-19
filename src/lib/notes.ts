// Anotações do estudante: destaques dos enunciados e cadernos de cálculo.
// Ficam numa chave própria do localStorage, separada do progresso, porque a
// escrita à mão pode ocupar bem mais espaço e não deve pesar a cada resposta
// de quiz. Como no progresso, toda leitura e escrita é protegida: se o
// navegador recusar a gravação (modo privado ou falta de espaço) os dados
// continuam na memória desta aba e a interface avisa o estudante.
//
// Cadernos:
//   ex:<id do exercício>  — um caderno permanente por exercício
//   mod:<id do módulo>    — caderno geral de observações do módulo
// Os simulados usam só questões V/F, que não têm caderno; assim os cadernos
// dos exercícios nunca se misturam com uma sessão de simulado.
import type { ModuleId } from '../content/types';
import type { HighlightColor, Highlight } from './highlights';
import { PAGE_H_DEFAULT, PAGE_H_MAX, sanitizeStrokes, type Paper, type Stroke } from './ink';
import type { StorageLike } from './progress';

export const NOTES_KEY = 'asf-anotacoes-v1';
export const NOTES_CORRUPT_KEY = 'asf-anotacoes-corrompido';
export const NOTES_VERSION = 1;

export type NotebookMode = 'texto' | 'manuscrito';

export interface Notebook {
  text: string;
  ink: Stroke[];
  /** altura da folha manuscrita, em unidades (a largura é fixa) */
  inkHeight: number;
  updatedAt: string;
}

export interface NotesPrefs {
  paper: Paper;
  mode: NotebookMode;
}

export interface NotesState {
  version: 1;
  /** id do exercício → destaques */
  highlights: Record<string, Highlight[]>;
  /** chave do caderno (ex:… ou mod:…) → conteúdo */
  notebooks: Record<string, Notebook>;
  prefs: NotesPrefs;
}

export const exerciseNotebookKey = (id: string) => `ex:${id}`;
export const moduleNotebookKey = (id: ModuleId) => `mod:${id}`;

export function emptyNotes(): NotesState {
  return { version: 1, highlights: {}, notebooks: {}, prefs: { paper: 'quadriculado', mode: 'texto' } };
}

export const emptyNotebook = (): Notebook => ({ text: '', ink: [], inkHeight: PAGE_H_DEFAULT, updatedAt: '' });

export const notebookHasContent = (nb: Notebook | undefined) => !!nb && (nb.text.trim().length > 0 || nb.ink.length > 0);

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const COLORS: HighlightColor[] = ['dado', 'objetivo', 'condicao'];
const PAPERS: Paper[] = ['liso', 'pautado', 'quadriculado'];
const MAX_TEXT = 100_000;

function sanitizeHighlights(x: unknown): Highlight[] {
  if (!Array.isArray(x)) return [];
  return x.filter(
    (h): h is Highlight =>
      isObj(h) &&
      typeof h.id === 'string' &&
      typeof h.field === 'string' &&
      Number.isInteger(h.start) &&
      Number.isInteger(h.end) &&
      (h.start as number) >= 0 &&
      (h.end as number) > (h.start as number) &&
      COLORS.includes(h.color as HighlightColor) &&
      typeof h.quote === 'string' &&
      h.quote.length === (h.end as number) - (h.start as number),
  ).map((h) => ({ id: h.id, field: h.field, start: h.start, end: h.end, color: h.color, quote: h.quote }));
}

/** Valida dados lidos do armazenamento ou de um backup, descartando só o que estiver corrompido. */
export function sanitizeNotes(raw: unknown): NotesState {
  const base = emptyNotes();
  if (!isObj(raw)) return base;
  if (isObj(raw.highlights)) {
    for (const [id, list] of Object.entries(raw.highlights)) {
      const hs = sanitizeHighlights(list);
      if (hs.length) base.highlights[id] = hs;
    }
  }
  if (isObj(raw.notebooks)) {
    for (const [key, nb] of Object.entries(raw.notebooks)) {
      if (!/^(ex|mod):[\w-]+$/.test(key) || !isObj(nb)) continue;
      const text = typeof nb.text === 'string' ? nb.text.slice(0, MAX_TEXT) : '';
      const ink = sanitizeStrokes(nb.ink);
      const h = typeof nb.inkHeight === 'number' && Number.isFinite(nb.inkHeight) ? Math.min(PAGE_H_MAX, Math.max(PAGE_H_DEFAULT, Math.round(nb.inkHeight))) : PAGE_H_DEFAULT;
      if (!text && ink.length === 0) continue;
      base.notebooks[key] = { text, ink, inkHeight: h, updatedAt: typeof nb.updatedAt === 'string' ? nb.updatedAt : '' };
    }
  }
  if (isObj(raw.prefs)) {
    if (PAPERS.includes(raw.prefs.paper as Paper)) base.prefs.paper = raw.prefs.paper as Paper;
    if (raw.prefs.mode === 'texto' || raw.prefs.mode === 'manuscrito') base.prefs.mode = raw.prefs.mode;
  }
  return base;
}

export type SaveIssue = null | 'cheio' | 'indisponivel';

export interface SaveStatus {
  /** última gravação deu certo */
  ok: boolean;
  issue: SaveIssue;
  savedAt: string | null;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const { name, code } = e as { name?: string; code?: number };
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014;
}

export function createNotesStore(storage: StorageLike | null = defaultStorage(), clock: () => Date = () => new Date()) {
  let loadIssue: null | 'corrompido' = null;
  let state = load();
  let status: SaveStatus = { ok: storage !== null, issue: storage ? null : 'indisponivel', savedAt: null };
  const listeners = new Set<() => void>();

  function load(): NotesState {
    let txt: string | null = null;
    try {
      txt = storage?.getItem(NOTES_KEY) ?? null;
    } catch {
      return emptyNotes();
    }
    if (!txt) return emptyNotes();
    try {
      return sanitizeNotes(JSON.parse(txt));
    } catch {
      loadIssue = 'corrompido';
      try {
        storage?.setItem(NOTES_CORRUPT_KEY, txt);
      } catch {
        /* sem espaço: segue sem a cópia */
      }
      return emptyNotes();
    }
  }

  function save() {
    if (!storage) {
      status = { ok: false, issue: 'indisponivel', savedAt: null };
      return;
    }
    try {
      storage.setItem(NOTES_KEY, JSON.stringify(state));
      status = { ok: true, issue: null, savedAt: clock().toISOString() };
    } catch (e) {
      status = { ok: false, issue: isQuotaError(e) ? 'cheio' : 'indisponivel', savedAt: status.savedAt };
    }
  }

  function update(fn: (s: NotesState) => NotesState) {
    const next = fn(state);
    if (next === state) return;
    state = next;
    save();
    listeners.forEach((l) => l());
  }

  function setNotebook(key: string, fn: (nb: Notebook) => Notebook) {
    update((s) => {
      const nb = fn(s.notebooks[key] ?? emptyNotebook());
      const notebooks = { ...s.notebooks };
      if (notebookHasContent(nb)) notebooks[key] = { ...nb, updatedAt: clock().toISOString() };
      else delete notebooks[key];
      return { ...s, notebooks };
    });
  }

  return {
    get: () => state,
    status: () => status,
    loadIssue: () => loadIssue,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    /** Grava de novo (ex.: depois de liberar espaço). */
    retry() {
      save();
      listeners.forEach((l) => l());
    },
    setHighlights(exerciseId: string, list: Highlight[]) {
      update((s) => {
        const highlights = { ...s.highlights };
        if (list.length) highlights[exerciseId] = list;
        else delete highlights[exerciseId];
        return { ...s, highlights };
      });
    },
    setText(key: string, text: string) {
      if ((state.notebooks[key]?.text ?? '') === text) return;
      setNotebook(key, (nb) => ({ ...nb, text: text.slice(0, MAX_TEXT) }));
    },
    setInk(key: string, ink: Stroke[], inkHeight: number) {
      setNotebook(key, (nb) => ({ ...nb, ink, inkHeight }));
    },
    setPrefs(p: Partial<NotesPrefs>) {
      update((s) => ({ ...s, prefs: { ...s.prefs, ...p } }));
    },
    /** Substitui todas as anotações (importação de backup já validada). */
    replace(next: NotesState) {
      update(() => sanitizeNotes(next));
    },
    reset() {
      try {
        storage?.removeItem(NOTES_KEY);
      } catch {
        /* estado em memória é zerado de qualquer forma */
      }
      state = emptyNotes();
      status = { ok: storage !== null, issue: storage ? null : 'indisponivel', savedAt: null };
      listeners.forEach((l) => l());
    },
  };
}

export type NotesStore = ReturnType<typeof createNotesStore>;

export function notesSummary(s: NotesState) {
  return {
    notebooks: Object.keys(s.notebooks).length,
    highlights: Object.values(s.highlights).reduce((n, l) => n + l.length, 0),
  };
}
