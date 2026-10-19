// Marca-texto dos enunciados. Cada destaque guarda o campo do exercício
// (enunciado, "pede-se" ou uma linha dos dados), o intervalo [start, end) em
// caracteres do texto original e uma cópia do trecho (`quote`). A interface
// nunca altera o texto: ela só o divide em pedaços e envolve os destacados
// em <mark>. Se o conteúdo do exercício mudar, `validateHighlights` confere
// cada trecho antes de restaurá-lo.

export type HighlightColor = 'dado' | 'objetivo' | 'condicao';

export const HIGHLIGHT_COLORS: { id: HighlightColor; label: string; hint: string }[] = [
  { id: 'dado', label: 'Amarelo', hint: 'dados e valores fornecidos' },
  { id: 'objetivo', label: 'Rosa', hint: 'objetivo ou incógnita' },
  { id: 'condicao', label: 'Verde', hint: 'condições e restrições' },
];

export interface Highlight {
  id: string;
  field: string;
  start: number;
  end: number;
  color: HighlightColor;
  quote: string;
}

export interface Segment {
  text: string;
  start: number;
  mark?: Highlight;
}

let seq = 0;
export const newHighlightId = () => `h${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Remove espaços nas pontas da seleção (o trecho destacado fica limpo). */
export function trimRange(text: string, start: number, end: number): [number, number] {
  let s = Math.max(0, Math.min(start, end));
  let e = Math.min(text.length, Math.max(start, end));
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  return [s, e];
}

/**
 * Aplica um destaque. Destaques que se sobrepõem ao novo trecho são cortados
 * (a cor mais recente vence); vizinhos da mesma cor, separados no máximo por
 * espaços, são unidos.
 */
export function addHighlight(
  list: Highlight[],
  field: string,
  text: string,
  start: number,
  end: number,
  color: HighlightColor,
  makeId: () => string = newHighlightId,
): Highlight[] {
  const [s, e] = trimRange(text, start, end);
  if (s >= e) return list;
  const others = list.filter((h) => h.field !== field);
  const kept: Highlight[] = [];
  for (const h of list.filter((x) => x.field === field)) {
    if (h.end <= s || h.start >= e) {
      kept.push(h);
      continue;
    }
    if (h.start < s) kept.push({ ...h, end: s, quote: text.slice(h.start, s) });
    if (h.end > e) kept.push({ ...h, id: makeId(), start: e, quote: text.slice(e, h.end) });
  }
  let mark: Highlight = { id: makeId(), field, start: s, end: e, color, quote: text.slice(s, e) };
  const merged: Highlight[] = [];
  for (const h of kept) {
    // vizinhos da mesma cor separados no máximo por espaços viram um só destaque
    const touches =
      (h.end <= mark.start && text.slice(h.end, mark.start).trim() === '') || (h.start >= mark.end && text.slice(mark.end, h.start).trim() === '');
    if (h.color === color && touches) {
      const ns = Math.min(h.start, mark.start);
      const ne = Math.max(h.end, mark.end);
      mark = { ...mark, start: ns, end: ne, quote: text.slice(ns, ne) };
    } else merged.push(h);
  }
  merged.push(mark);
  return [...others, ...merged.filter((h) => h.start < h.end).sort((a, b) => a.start - b.start)];
}

export function removeHighlight(list: Highlight[], id: string): Highlight[] {
  return list.filter((h) => h.id !== id);
}

/** Divide o texto em pedaços, marcando os destacados. O texto original é preservado. */
export function segments(text: string, marks: Highlight[]): Segment[] {
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const m of sorted) {
    if (m.start < pos || m.end > text.length || m.start >= m.end) continue;
    if (m.start > pos) out.push({ text: text.slice(pos, m.start), start: pos });
    out.push({ text: text.slice(m.start, m.end), start: m.start, mark: m });
    pos = m.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), start: pos });
  return out;
}

export interface ValidationResult {
  valid: Highlight[];
  relocated: number;
  dropped: number;
}

function occurrences(text: string, quote: string): number[] {
  const found: number[] = [];
  if (!quote) return found;
  let i = text.indexOf(quote);
  while (i !== -1) {
    found.push(i);
    i = text.indexOf(quote, i + 1);
  }
  return found;
}

/**
 * Confere os destaques salvos contra o texto atual de cada campo. Um destaque
 * é mantido se o trecho continua no mesmo lugar; é reposicionado se o mesmo
 * trecho aparece exatamente uma vez no texto novo; senão é descartado (nunca
 * se destaca um trecho diferente do que o estudante marcou).
 */
export function validateHighlights(list: Highlight[], fields: Record<string, string>): ValidationResult {
  const valid: Highlight[] = [];
  let relocated = 0;
  let dropped = 0;
  for (const h of list) {
    const text = fields[h.field];
    if (text === undefined) {
      dropped++;
      continue;
    }
    if (text.slice(h.start, h.end) === h.quote && h.quote.length > 0) {
      valid.push(h);
      continue;
    }
    const at = occurrences(text, h.quote);
    if (at.length === 1) {
      valid.push({ ...h, start: at[0], end: at[0] + h.quote.length });
      relocated++;
    } else dropped++;
  }
  // depois de reposicionar, dois destaques não podem ocupar o mesmo trecho
  const byField = new Map<string, Highlight[]>();
  for (const h of valid) byField.set(h.field, [...(byField.get(h.field) ?? []), h]);
  const out: Highlight[] = [];
  for (const hs of byField.values()) {
    let end = -1;
    for (const h of hs.sort((a, b) => a.start - b.start)) {
      if (h.start < end) {
        dropped++;
        continue;
      }
      out.push(h);
      end = h.end;
    }
  }
  return { valid: out, relocated, dropped };
}
