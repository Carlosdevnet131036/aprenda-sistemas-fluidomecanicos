// Caderno de Cálculos: um painel lateral (telas largas) ou uma folha que sobe
// da base da tela (celular), com modo texto e modo manuscrito. O conteúdo é
// salvo sozinho no navegador; fechar o painel ou sair da página não apaga nada.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { amend, commit, initHistory, redo, undo, type History } from '../lib/history';
import { drawPaper, drawStrokes, hitsStroke, INK_COLORS, INK_WIDTHS, PAGE_H_DEFAULT, PAGE_H_MAX, PAGE_H_STEP, PAGE_W, pushPoint, type Paper, type Stroke } from '../lib/ink';
import { notebookHasContent, type NotebookMode } from '../lib/notes';
import { notebookUi, useNotes, useNotesStatus, useOpenNotebook, type OpenNotebook } from '../notesContext';

const TEXT_SAVE_MS = 500;
const INK_SAVE_MS = 700;

/** Botão que abre (ou fecha) o caderno indicado. */
export function NotebookButton({ nb, label = 'Caderno de cálculos' }: { nb: OpenNotebook; label?: string }) {
  const open = useOpenNotebook();
  const [notes] = useNotes();
  const isOpen = open?.key === nb.key;
  const has = notebookHasContent(notes.notebooks[nb.key]);
  return (
    <button
      type="button"
      className={`btn btn--ghost notebook-btn${isOpen ? ' notebook-btn--on' : ''}`}
      aria-expanded={isOpen}
      onClick={() => (isOpen ? notebookUi.close(nb.key) : notebookUi.open(nb))}
    >
      <span aria-hidden="true">✎</span> {isOpen ? `Fechar ${label.toLowerCase()}` : label}
      {has && !isOpen && <span className="notebook-btn__dot">com anotações</span>}
    </button>
  );
}

/**
 * Mostra o painel quando o caderno `nbKey` está aberto. Fica no componente
 * que "possui" o caderno (o exercício ou a aula): se ele sair da tela, o
 * painel fecha — o conteúdo já está salvo.
 */
export function NotebookHost({ nbKey, footer }: { nbKey: string; footer?: ReactNode }) {
  const open = useOpenNotebook();
  useEffect(() => () => notebookUi.close(nbKey), [nbKey]);
  if (open?.key !== nbKey || typeof document === 'undefined') return null;
  return createPortal(<NotebookPanel nb={open} footer={footer} />, document.body);
}

function NotebookPanel({ nb, footer }: { nb: OpenNotebook; footer?: ReactNode }) {
  const [notes, store] = useNotes();
  const [wide, setWide] = useState(false);
  const [dirty, setDirty] = useState(false);
  const mode = notes.prefs.mode;
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement;
    const p = panelRef.current;
    (p?.querySelector<HTMLElement>('textarea') ?? p?.querySelector<HTMLElement>('.notebook__mode button[aria-pressed="true"]'))?.focus({ preventScroll: true });
    const root = document.documentElement;
    root.classList.add('has-notebook');
    return () => root.classList.remove('has-notebook', 'has-notebook-wide');
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('has-notebook-wide', wide);
  }, [wide]);

  function close() {
    const back = returnTo.current;
    notebookUi.close(nb.key);
    if (back instanceof HTMLElement && back.isConnected) requestAnimationFrame(() => back.focus({ preventScroll: true }));
  }

  return (
    <aside
      ref={panelRef}
      className={`notebook${wide ? ' notebook--wide' : ''}`}
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="notebook__head">
        <div className="notebook__title">
          <h2 id={titleId}>{nb.kind === 'modulo' ? 'Caderno do módulo' : 'Caderno de cálculos'}</h2>
          <p className="muted small">{nb.title}</p>
          <SaveIndicator dirty={dirty} />
        </div>
        <div className="notebook__actions">
          <button type="button" className="btn btn--ghost btn--sm" aria-pressed={wide} onClick={() => setWide((w) => !w)}>
            {wide ? 'Reduzir' : 'Expandir'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={close} aria-label="Fechar caderno">
            Fechar
          </button>
        </div>
      </div>
      <div className="notebook__mode" role="group" aria-label="Modo do caderno">
        {(['texto', 'manuscrito'] as NotebookMode[]).map((m) => (
          <button key={m} type="button" className="seg-btn" aria-pressed={mode === m} onClick={() => store.setPrefs({ mode: m })}>
            {m === 'texto' ? 'Texto' : 'Manuscrito'}
          </button>
        ))}
        <label className="notebook__paper">
          <span>Folha</span>
          <select value={notes.prefs.paper} onChange={(e) => store.setPrefs({ paper: e.target.value as Paper })}>
            <option value="quadriculado">Quadriculada</option>
            <option value="pautado">Pautada</option>
            <option value="liso">Lisa</option>
          </select>
        </label>
      </div>
      <SaveProblem />
      <div className="notebook__body">
        {mode === 'texto' ? (
          <TextEditor key={nb.key} nbKey={nb.key} template={nb.kind === 'exercicio'} paper={notes.prefs.paper} onDirty={setDirty} />
        ) : (
          <InkPad key={nb.key} nbKey={nb.key} paper={notes.prefs.paper} onDirty={setDirty} />
        )}
      </div>
      {footer && <div className="notebook__foot">{footer}</div>}
    </aside>
  );
}

function SaveIndicator({ dirty }: { dirty: boolean }) {
  const st = useNotesStatus();
  let text = 'Salvo automaticamente';
  let cls = '';
  if (st.issue === 'cheio') (text = 'Não salvo: sem espaço'), (cls = 'save--bad');
  else if (st.issue === 'indisponivel') (text = 'Não salvo neste navegador'), (cls = 'save--bad');
  else if (dirty) text = 'Salvando…';
  else if (st.savedAt) text = `Salvo às ${new Date(st.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <p className={`save small ${cls}`}>
      {text}
    </p>
  );
}

function SaveProblem() {
  const st = useNotesStatus();
  const [, store] = useNotes();
  if (!st.issue) return null;
  return (
    <div className="callout callout--erro small" role="alert">
      {st.issue === 'cheio' ? (
        <p>
          O navegador ficou sem espaço e as últimas alterações estão só nesta aba. Libere espaço (por exemplo, limpando folhas manuscritas antigas) ou
          exporte um backup em “Meu estudo” antes de fechar a página.
        </p>
      ) : (
        <p>Este navegador não permite salvar dados (modo privado ou armazenamento bloqueado). As anotações serão perdidas ao fechar a página.</p>
      )}
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => store.retry()}>
        Tentar salvar de novo
      </button>
    </div>
  );
}

// ---------- Modo texto ----------

const SYMBOLS = ['ρ', 'γ', 'μ', 'ν', 'τ', 'η', 'Δ', 'π', 'θ', '·', '×', '÷', '±', '√', '²', '³', '⁻¹', '≈', '≠', '≤', '≥', '→', '°'];
const TEMPLATE = 'DADOS:\n\nINCÓGNITA:\n\nFÓRMULA:\n\nCONVERSÕES:\n\nCÁLCULO:\n\nRESULTADO:\n';
const SECTION = '\n──────────\n';

function TextEditor({ nbKey, template, paper, onDirty }: { nbKey: string; template: boolean; paper: Paper; onDirty: (d: boolean) => void }) {
  const [, store] = useNotes();
  const [h, setH] = useState<History<string>>(() => initHistory(store.get().notebooks[nbKey]?.text ?? ''));
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lastEdit = useRef(0);
  const pending = useRef<string | null>(null);
  const timer = useRef<number>();
  const labelId = useId();

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (pending.current === null) return;
    store.setText(nbKey, pending.current);
    pending.current = null;
    onDirty(false);
  }, [nbKey, store, onDirty]);

  const saveSoon = (text: string) => {
    pending.current = text;
    onDirty(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, TEXT_SAVE_MS);
  };

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  function set(next: History<string>) {
    setH(next);
    saveSoon(next.present);
  }

  function insert(snippet: string) {
    const ta = taRef.current;
    const v = h.present;
    const s = ta?.selectionStart ?? v.length;
    const e = ta?.selectionEnd ?? v.length;
    const next = v.slice(0, s) + snippet + v.slice(e);
    lastEdit.current = 0;
    set(commit(h, next));
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(s + snippet.length, s + snippet.length);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(h.present);
      setMsg('Anotações copiadas.');
    } catch {
      const ta = taRef.current;
      ta?.select();
      const ok = document.execCommand?.('copy');
      setMsg(ok ? 'Anotações copiadas.' : 'Não foi possível copiar automaticamente: selecione o texto e use Ctrl+C.');
    }
  }

  return (
    <div className="nb-text">
      <div className="nb-tools" role="toolbar" aria-label="Ferramentas do texto">
        <button type="button" className="tool-btn" onClick={() => set(undo(h))} disabled={h.past.length === 0} aria-label="Desfazer" title="Desfazer (Ctrl+Z)">
          ↶
        </button>
        <button type="button" className="tool-btn" onClick={() => set(redo(h))} disabled={h.future.length === 0} aria-label="Refazer" title="Refazer (Ctrl+Y)">
          ↷
        </button>
        <button type="button" className="tool-btn tool-btn--text" onClick={() => insert(SECTION)}>
          + Seção
        </button>
        {template && (
          <button type="button" className="tool-btn tool-btn--text" onClick={() => insert(TEMPLATE)} title="Insere os títulos Dados, Incógnita, Fórmula, Conversões, Cálculo e Resultado">
            Roteiro
          </button>
        )}
        <button type="button" className="tool-btn tool-btn--text" onClick={() => void copy()} disabled={!h.present}>
          Copiar
        </button>
        <button type="button" className="tool-btn tool-btn--text" onClick={() => setConfirmClear(true)} disabled={!h.present}>
          Limpar
        </button>
      </div>
      <details className="nb-symbols">
        <summary>Inserir símbolo</summary>
        <div className="nb-symbols__grid">
          {SYMBOLS.map((s) => (
            <button key={s} type="button" className="tool-btn" onClick={() => insert(s)} aria-label={`Inserir ${s}`}>
              {s}
            </button>
          ))}
        </div>
      </details>
      {confirmClear && (
        <div className="callout callout--alerta small" role="alert">
          <p>Apagar todo o texto deste caderno? Até fechar o caderno, “Desfazer” ainda recupera o texto.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                lastEdit.current = 0;
                set(commit(h, ''));
                setConfirmClear(false);
                setMsg('Texto apagado.');
              }}
            >
              Apagar texto
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <label id={labelId} className="sr-only" htmlFor={`${labelId}-ta`}>
        Anotações e cálculos
      </label>
      <textarea
        id={`${labelId}-ta`}
        ref={taRef}
        className={`nb-textarea paper--${paper}`}
        value={h.present}
        spellCheck={false}
        placeholder={'Escreva livremente: dados, fórmula, conversões, contas e resultado.\nEx.: ρ = m/V = 2 kg / 0,002 m³ = 1000 kg/m³'}
        onChange={(e) => {
          const v = e.target.value;
          const now = Date.now();
          // digitação contínua vira um único passo de "desfazer"
          set(now - lastEdit.current > 800 ? commit(h, v) : amend(h, v));
          lastEdit.current = now;
          setMsg(null);
        }}
        onBlur={flush}
        onKeyDown={(e) => {
          const mod = e.ctrlKey || e.metaKey;
          if (!mod) return;
          const k = e.key.toLowerCase();
          if (k === 'z' && !e.shiftKey) {
            e.preventDefault();
            set(undo(h));
          } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
            e.preventDefault();
            set(redo(h));
          }
        }}
      />
      {msg && (
        <p className="muted small" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

// ---------- Modo manuscrito ----------

type Tool = 'caneta' | 'borracha' | 'rolar';

function InkPad({ nbKey, paper, onDirty }: { nbKey: string; paper: Paper; onDirty: (d: boolean) => void }) {
  const [, store] = useNotes();
  const initial = store.get().notebooks[nbKey];
  const [h, setH] = useState<History<Stroke[]>>(() => initHistory(initial?.ink ?? []));
  const [height, setHeight] = useState(initial?.inkHeight ?? PAGE_H_DEFAULT);
  const [tool, setTool] = useState<Tool>('caneta');
  const [color, setColor] = useState(INK_COLORS[0].id);
  const [width, setWidth] = useState(INK_WIDTHS[1].id);
  const [confirmClear, setConfirmClear] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ id: number; stroke: Stroke } | null>(null);
  const erased = useRef<Set<Stroke>>(new Set());
  const penSeen = useRef(false);
  const pending = useRef<{ ink: Stroke[]; height: number } | null>(null);
  const timer = useRef<number>();

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!pending.current) return;
    store.setInk(nbKey, pending.current.ink, pending.current.height);
    pending.current = null;
    onDirty(false);
  }, [nbKey, store, onDirty]);

  // Grava só depois de uma pausa: nunca a cada movimento do traço.
  const saveSoon = (ink: Stroke[], hgt: number) => {
    pending.current = { ink, height: hgt };
    onDirty(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, INK_SAVE_MS);
  };

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const cssW = c.clientWidth || PAGE_W;
    const dpr = window.devicePixelRatio || 1;
    const scale = cssW / PAGE_W;
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(height * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawPaper(ctx, paper, height);
    drawStrokes(ctx, h.present.filter((s) => !erased.current.has(s)));
  }, [h.present, height, paper]);

  useLayoutEffect(redraw, [redraw]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  function toPage(e: { clientX: number; clientY: number }): [number, number] {
    const r = canvasRef.current!.getBoundingClientRect();
    const k = PAGE_W / (r.width || PAGE_W);
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
  }

  function eraseAt(x: number, y: number) {
    let hit = false;
    for (const s of h.present) if (!erased.current.has(s) && hitsStroke(s, x, y, 10)) erased.current.add(s), (hit = true);
    if (hit) redraw();
  }

  function onDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool === 'rolar' || drawing.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'pen') penSeen.current = true;
    // com caneta (stylus) em uso, o toque da palma da mão não risca a folha
    if (e.pointerType === 'touch' && penSeen.current) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* jsdom e navegadores antigos */
    }
    const [x, y] = toPage(e);
    drawing.current = { id: e.pointerId, stroke: { c: color, w: width, p: [] } };
    if (tool === 'borracha') eraseAt(x, y);
    else {
      pushPoint(drawing.current.stroke.p, x, y, 0);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawStrokes(ctx, [drawing.current.stroke]);
    }
  }

  function onMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = drawing.current;
    if (!d || d.id !== e.pointerId) return;
    e.preventDefault();
    const native = e.nativeEvent as PointerEvent;
    const evs = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const list = evs.length ? evs : [native];
    const ctx = canvasRef.current?.getContext('2d');
    for (const ev of list) {
      const [x, y] = toPage(ev);
      if (tool === 'borracha') {
        eraseAt(x, y);
        continue;
      }
      const p = d.stroke.p;
      const px = p[p.length - 2];
      const py = p[p.length - 1];
      if (pushPoint(p, x, y) && ctx) {
        ctx.strokeStyle = d.stroke.c;
        ctx.lineWidth = d.stroke.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p[p.length - 2], p[p.length - 1]);
        ctx.stroke();
      }
    }
  }

  function onUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = drawing.current;
    if (!d || d.id !== e.pointerId) return;
    drawing.current = null;
    let next = h.present;
    if (tool === 'borracha') {
      if (erased.current.size) next = h.present.filter((s) => !erased.current.has(s));
      erased.current = new Set();
    } else if (d.stroke.p.length >= 2) next = [...h.present, d.stroke];
    if (next !== h.present) {
      setH(commit(h, next));
      saveSoon(next, height);
    } else redraw();
  }

  function change(next: History<Stroke[]>) {
    setH(next);
    saveSoon(next.present, height);
  }

  return (
    <div className="nb-ink">
      <div className="nb-tools" role="toolbar" aria-label="Ferramentas da escrita à mão">
        <div className="tool-group" role="group" aria-label="Ferramenta">
          {(
            [
              ['caneta', '✎', 'Caneta'],
              ['borracha', '⌫', 'Borracha (apaga traços inteiros)'],
              ['rolar', '✋', 'Rolar a folha sem escrever'],
            ] as [Tool, string, string][]
          ).map(([t, icon, label]) => (
            <button key={t} type="button" className="tool-btn" aria-pressed={tool === t} aria-label={label} title={label} onClick={() => setTool(t)}>
              {icon}
            </button>
          ))}
        </div>
        <div className="tool-group" role="group" aria-label="Cor do traço">
          {INK_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="tool-btn swatch"
              aria-pressed={color === c.id}
              aria-label={`Cor ${c.label}`}
              title={c.label}
              onClick={() => (setColor(c.id), setTool('caneta'))}
            >
              <span style={{ background: c.id }} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="tool-group" role="group" aria-label="Espessura do traço">
          {INK_WIDTHS.map((w) => (
            <button
              key={w.id}
              type="button"
              className="tool-btn"
              aria-pressed={width === w.id}
              aria-label={`Traço ${w.label.toLowerCase()}`}
              title={w.label}
              onClick={() => (setWidth(w.id), setTool('caneta'))}
            >
              <span className="thick" style={{ height: `${w.id / 2 + 1}px` }} aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" className="tool-btn" onClick={() => change(undo(h))} disabled={h.past.length === 0} aria-label="Desfazer traço" title="Desfazer">
          ↶
        </button>
        <button type="button" className="tool-btn" onClick={() => change(redo(h))} disabled={h.future.length === 0} aria-label="Refazer traço" title="Refazer">
          ↷
        </button>
        <button type="button" className="tool-btn tool-btn--text" onClick={() => setConfirmClear(true)} disabled={h.present.length === 0}>
          Limpar folha
        </button>
      </div>
      {confirmClear && (
        <div className="callout callout--alerta small" role="alert">
          <p>Apagar todos os traços desta folha? Até fechar o caderno, “Desfazer” ainda recupera os traços.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                change(commit(h, []));
                setConfirmClear(false);
              }}
            >
              Apagar traços
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <p className="muted small nb-ink__hint">
        Escreva com mouse, dedo ou caneta. Para rolar sem riscar, use ✋.
      </p>
      <div className="nb-ink__sheet">
        <canvas
          ref={canvasRef}
          className="nb-canvas"
          role="img"
          aria-label={`Folha manuscrita com ${h.present.length} traço(s)`}
          style={{ aspectRatio: `${PAGE_W} / ${height}`, touchAction: tool === 'rolar' ? 'pan-x pan-y' : 'none', cursor: tool === 'rolar' ? 'grab' : 'crosshair' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => tool !== 'rolar' && e.preventDefault()}
        />
      </div>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={height >= PAGE_H_MAX}
        onClick={() => {
          const nh = Math.min(PAGE_H_MAX, height + PAGE_H_STEP);
          setHeight(nh);
          saveSoon(h.present, nh);
        }}
      >
        + Mais espaço na folha
      </button>
    </div>
  );
}

/** Folha manuscrita só para leitura (comparação com a resolução oficial). */
export function InkView({ strokes, height, paper, label }: { strokes: Stroke[]; height: number; paper: Paper; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const draw = useCallback(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const cssW = c.clientWidth || PAGE_W;
    const dpr = window.devicePixelRatio || 1;
    const scale = cssW / PAGE_W;
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(height * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawPaper(ctx, paper, height);
    drawStrokes(ctx, strokes);
  }, [strokes, height, paper]);
  useLayoutEffect(draw, [draw]);
  useEffect(() => {
    const c = ref.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(c);
    return () => ro.disconnect();
  }, [draw]);
  return <canvas ref={ref} className="nb-canvas nb-canvas--view" role="img" aria-label={label} style={{ aspectRatio: `${PAGE_W} / ${height}` }} />;
}
