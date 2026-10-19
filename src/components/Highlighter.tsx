// Marca-texto dos enunciados. O texto do exercício nunca é alterado: cada
// campo (enunciado, dados, pede-se) é renderizado pelo React em pedaços, e os
// destacados ficam em <mark>. A seleção do navegador só é lida — convertida
// em posições de caracteres dentro do campo — e o destaque só é aplicado
// quando o estudante escolhe uma cor.
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Exercise } from '../content/types';
import { addHighlight, HIGHLIGHT_COLORS, removeHighlight, segments, validateHighlights, type Highlight, type HighlightColor } from '../lib/highlights';
import { useNotes } from '../notesContext';

const SHORT: Record<HighlightColor, string> = { dado: 'Dado', objetivo: 'Incógnita', condicao: 'Condição' };
const TITLE: Record<HighlightColor, string> = { dado: 'Destaque amarelo: dado fornecido', objetivo: 'Destaque rosa: objetivo ou incógnita', condicao: 'Destaque verde: condição ou restrição' };
const EMPTY: Highlight[] = [];

/** Campos destacáveis de um exercício: texto original de cada um. */
export function exerciseFields(ex: Exercise): Record<string, string> {
  const out: Record<string, string> = { enunciado: ex.statement, pede: ex.asked };
  ex.given.forEach((g, i) => (out[`dado:${i}`] = g));
  return out;
}

interface Pending {
  field: string;
  start: number;
  end: number;
  quote: string;
}

/** Posição (em caracteres de texto) de um ponto do DOM dentro do campo. */
function offsetIn(field: Element, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(field);
  r.setEnd(node, offset);
  return r.toString().length;
}

const fieldOf = (n: Node | null): Element | null => (n ? (n instanceof Element ? n : n.parentElement)?.closest('[data-hl-field]') ?? null : null);

const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function useHighlighter(ex: Exercise) {
  const [notes, store] = useNotes();
  const rootRef = useRef<HTMLDivElement>(null);
  const fields = useMemo(() => exerciseFields(ex), [ex]);
  const saved = notes.highlights[ex.id] ?? EMPTY;
  // Só aparecem destaques que ainda correspondem ao texto atual do exercício.
  const check = useMemo(() => validateHighlights(saved, fields), [saved, fields]);
  const marks = check.valid;
  const [pending, setPending] = useState<Pending | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Grava a versão validada quando o conteúdo do exercício mudou desde o destaque.
  useEffect(() => {
    if (check.dropped === 0 && check.relocated === 0) return;
    store.setHighlights(ex.id, check.valid);
    if (check.dropped > 0)
      setNotice(`${check.dropped} destaque(s) antigo(s) não correspondia(m) mais ao texto atual deste exercício e foi(ram) descartado(s).`);
  }, [check, ex.id, store]);

  useEffect(() => {
    function read() {
      const root = rootRef.current;
      const sel = document.getSelection();
      if (!root || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const f1 = fieldOf(range.startContainer);
      const f2 = fieldOf(range.endContainer);
      if (sel.isCollapsed) {
        // um toque/clique dentro do texto desfaz a seleção pendente
        if (f1 && root.contains(f1)) setPending(null);
        return;
      }
      if (!f1 || f1 !== f2 || !root.contains(f1)) return;
      const field = f1.getAttribute('data-hl-field')!;
      const text = fields[field];
      if (text === undefined) return;
      const start = offsetIn(f1, range.startContainer, range.startOffset);
      const end = offsetIn(f1, range.endContainer, range.endOffset);
      const quote = text.slice(start, end).trim();
      if (!quote) return;
      setPending({ field, start, end, quote });
      setActive(null);
    }
    document.addEventListener('selectionchange', read);
    return () => document.removeEventListener('selectionchange', read);
  }, [fields]);

  function save(list: Highlight[]) {
    store.setHighlights(ex.id, list);
  }

  function apply(color: HighlightColor) {
    if (!pending) return;
    const text = fields[pending.field];
    save(addHighlight(marks, pending.field, text, pending.start, pending.end, color));
    setPending(null);
    setNotice(null);
    document.getSelection()?.removeAllRanges();
  }

  function remove(id: string) {
    save(removeHighlight(marks, id));
    if (active === id) setActive(null);
  }

  function clearAll() {
    save([]);
    setActive(null);
    setConfirmClear(false);
  }

  // impede que o clique no botão tire o foco/seleção do texto antes de aplicar
  const keepSelection = (e: ReactMouseEvent) => e.preventDefault();

  function renderField(field: string, text: string) {
    const mine = marks.filter((m) => m.field === field);
    return (
      <span data-hl-field={field} className="hl-field">
        {segments(text, mine).map((s) =>
          s.mark ? (
            <mark
              key={s.mark.id}
              className={`hl hl--${s.mark.color}${active === s.mark.id ? ' hl--active' : ''}`}
              title={TITLE[s.mark.color]}
              onClick={() => {
                const sel = document.getSelection();
                if (sel && !sel.isCollapsed) return;
                setActive((a) => (a === s.mark!.id ? null : s.mark!.id));
                setPending(null);
              }}
            >
              {s.text}
            </mark>
          ) : (
            <span key={`t${s.start}`}>{s.text}</span>
          ),
        )}
      </span>
    );
  }

  const activeMark = marks.find((m) => m.id === active);

  // Barra fixa acima do texto (nada nela muda de tamanho, para o texto não
  // "pular" durante a seleção) e situação/lista abaixo do texto.
  const toolbar = (
    <div className="hl-tools">
      <div className="hl-bar" role="toolbar" aria-label="Marca-texto do enunciado">
        <span className="hl-bar__label" aria-hidden="true">
          Marca-texto
        </span>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`hl-btn hl-btn--${c.id}`}
            disabled={!pending}
            onMouseDown={keepSelection}
            onClick={() => apply(c.id)}
            aria-label={`Destacar em ${c.label.toLowerCase()} (${c.hint})`}
            title={`${c.label}: ${c.hint}`}
          >
            <span className="hl-btn__swatch" aria-hidden="true" />
            {SHORT[c.id]}
          </button>
        ))}
      </div>
    </div>
  );

  const status = (
    <div className="hl-status">
      <p className="hl-hint muted small" aria-live="polite">
        {pending
          ? `Trecho selecionado: “${short(pending.quote)}”. Escolha uma cor para destacar.`
          : activeMark
            ? `Destaque selecionado: “${short(activeMark.quote)}”.`
            : 'Selecione um trecho do enunciado, dos dados ou do que se pede e escolha uma cor no marca-texto.'}
        {activeMark && (
          <>
            {' '}
            <button type="button" className="btn btn--link" onClick={() => remove(activeMark.id)}>
              Remover destaque
            </button>
          </>
        )}
      </p>
      {notice && (
        <p className="callout callout--alerta small" role="status">
          {notice}
        </p>
      )}
      {marks.length > 0 && (
        <details className="hl-list">
          <summary>Destaques deste exercício ({marks.length})</summary>
          <ul>
            {marks.map((m) => (
              <li key={m.id}>
                <mark className={`hl hl--${m.color}`}>{short(m.quote, 80)}</mark>
                <button type="button" className="btn btn--link" onClick={() => remove(m.id)} aria-label={`Remover destaque “${short(m.quote, 40)}”`}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
          {confirmClear ? (
            <div className="row" role="alert">
              <span>Remover os {marks.length} destaques deste exercício?</span>
              <button type="button" className="btn btn--danger btn--sm" onClick={clearAll}>
                Remover todos
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn--link" onClick={() => (marks.length > 1 ? setConfirmClear(true) : clearAll())}>
              Limpar todos os destaques
            </button>
          )}
        </details>
      )}
    </div>
  );

  return { rootRef, renderField, toolbar, status };
}
