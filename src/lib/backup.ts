// Backup dos dados de estudo: exportação para um arquivo JSON e importação
// com validação. O arquivo leva um identificador do aplicativo e a versão da
// estrutura; versões antigas são migradas e versões mais novas são recusadas.
import { DATA_VERSION, sanitize, type ProgressState } from './progress';

export const BACKUP_APP = 'aprenda-sistemas-fluidomecanicos';

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: ProgressState;
}

export function exportBackup(state: ProgressState, now: Date = new Date()): string {
  const file: BackupFile = { app: BACKUP_APP, version: DATA_VERSION, exportedAt: now.toISOString(), data: state };
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
}

export type ImportResult = { ok: true; state: ProgressState; summary: BackupSummary } | { ok: false; error: string };

const MAX_SIZE = 2_000_000; // 2 MB: muito acima de qualquer backup real

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
  return {
    ok: true,
    state,
    summary: {
      exportedAt: typeof f.exportedAt === 'string' ? f.exportedAt : '',
      completedModules: state.completedModules.length,
      solvedExercises: state.solvedExercises.length,
      answeredQuestions: Object.keys(state.questionStats).length,
      attempts: state.attempts.length,
      hasPlan: state.plan !== null,
    },
  };
}
