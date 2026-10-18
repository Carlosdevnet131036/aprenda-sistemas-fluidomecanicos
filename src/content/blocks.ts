// Atalhos para escrever o conteúdo das aulas de forma compacta.
import type { Block, CalloutKind, DiagramId, SymbolDef } from './types';

export const p = (text: string): Block => ({ t: 'p', text });
export const list = (items: string[], ordered = false): Block => ({ t: 'list', items, ordered });
export const ol = (items: string[]): Block => list(items, true);
export const box = (kind: CalloutKind, title: string, ...body: (Block | string)[]): Block => ({
  t: 'callout',
  kind,
  title,
  body: body.map((b) => (typeof b === 'string' ? p(b) : b)),
});
export const formula = (
  tex: string,
  opts: { caption?: string; symbols?: SymbolDef[]; when?: string } = {},
): Block => ({ t: 'formula', tex, ...opts });
export const sym = (s: string, name: string, unit: string): SymbolDef => ({ sym: s, name, unit });
export const table = (head: string[], rows: string[][], caption?: string): Block => ({ t: 'table', head, rows, caption });
export const worked = (title: string, statement: string, rows: [string, string][], source?: string): Block => ({
  t: 'worked',
  title,
  statement,
  rows: rows.map(([label, text]) => ({ label, text })),
  source,
});
export const diagram = (id: DiagramId): Block => ({ t: 'diagram', id });
export const exercise = (id: string): Block => ({ t: 'exercise', id });
export const vf = (...ids: string[]): Block => ({ t: 'vf', ids });
export const calc = (id: string, label: string): Block => ({ t: 'calc', id, label });
export const link = (href: string, label: string, primary = false): Block => ({ t: 'link', href, label, primary });
