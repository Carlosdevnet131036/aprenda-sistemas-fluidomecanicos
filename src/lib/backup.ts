// Backup dos dados de estudo: exportação para um arquivo JSON e importação
// com validação. O arquivo leva um identificador do aplicativo e a versão da
// estrutura; versões antigas são migradas e versões mais novas são recusadas.
// Desde a versão 3 o arquivo também leva as anotações (destaques e cadernos);
// backups antigos, sem anotações, mantêm as anotações atuais do navegador.
import { notesSummary, sanitizeNotes, type NotesState } from './notes';
import { DATA_VERSION, sanitize, type ProgressState } from './progress';

export const BACKUP_APP = 'aprenda-sistemas-fluidomecanicos';

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: ProgressState;
  notes?: NotesState;
}

export function exportBackup(state: ProgressState, now: Date = new Date(), notes?: NotesState): string {
  const file: BackupFile = { app: BACKUP_APP, version: DATA_VERSION, exportedAt: now.toISOString(), data: state, ...(notes ? { notes } : {}) };
  return JSON.stringify(file, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  return `estudo-fluidomecanicos-${now.toISOString().slice(0, 10)}.json`;
}

export interface BackupSummary {
  exportedAt: string;
  completedModules: number;
  solvedExercises: number;
  answeredQuestions: number;
  attempts: number;
  hasPlan: boolean;
  /** null quando o backup não traz anotações */
  notebooks: number | null;
  highlights: number | null;
}

export type ImportResult = { ok: true; state: ProgressState; notes: NotesState | null; summary: BackupSummary } | { ok: false; error: string };

// 10 MB: acima de qualquer backup real (o próprio localStorage guarda cerca de 5 MB)
const MAX_SIZE = 10_000_000;

export function parseBackup(text: string): ImportResult {
  if (text.length > MAX_SIZE) return { ok: false, error: 'Arquivo grande demais para ser um backup deste site.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Formato não reconhecido.' };
  const f = raw as Partial<BackupFile>;
  if (f.app !== BACKUP_APP) return { ok: false, error: 'Este arquivo não é um backup do Aprenda Sistemas Fluidomecânicos.' };
  if (typeof f.version !== 'number' || !Number.isInteger(f.version) || f.version < 1) return { ok: false, error: 'O backup não informa uma versão válida.' };
  if (f.version > DATA_VERSION) return { ok: false, error: `O backup foi criado por uma versão mais nova do site (estrutura ${f.version}). Atualize a página antes de importar.` };
  if (!f.data || typeof f.data !== 'object') return { ok: false, error: 'O backup não contém dados de estudo.' };
  const state = sanitize({ ...(f.data as object), version: (f.data as { version?: number }).version ?? f.version });
  const notes = f.notes && typeof f.notes === 'object' ? sanitizeNotes(f.notes) : null;
  const ns = notes ? notesSummary(notes) : null;
  return {
    ok: true,
    state,
    notes,
    summary: {
      exportedAt: typeof f.exportedAt === 'string' ? f.exportedAt : '',
      completedModules: state.completedModules.length,
      solvedExercises: state.solvedExercises.length,
      answeredQuestions: Object.keys(state.questionStats).length,
      attempts: state.attempts.length,
      hasPlan: state.plan !== null,
      notebooks: ns ? ns.notebooks : null,
      highlights: ns ? ns.highlights : null,
    },
  };
}
