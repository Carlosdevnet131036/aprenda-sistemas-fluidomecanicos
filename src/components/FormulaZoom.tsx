// Botão "Ampliar fórmula" + diálogo nativo (<dialog>) com a fórmula em tamanho
// maior. O <dialog> com showModal() já prende o foco, deixa o resto da página
// inerte e fecha com Escape; ao fechar, o foco volta para o botão.
import { useEffect, useId, useRef, useState } from 'react';
import type { SymbolDef } from '../content/types';
import { Tex } from './Tex';

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

export function FormulaZoom({ tex, title, symbols }: { tex: string; title?: string; symbols?: SymbolDef[] }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  function handleClose() {
    setOpen(false);
    setZoom(ZOOM_MIN);
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  return (
    <>
      <button ref={openerRef} type="button" className="btn btn--ghost formula__zoom" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span aria-hidden="true">⤢</span> Ampliar fórmula
        {title && <span className="sr-only">: {title}</span>}
      </button>
      {open && (
        <dialog
          ref={dialogRef}
          className="formula-dialog"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClose={handleClose}
          onClick={(e) => {
            // clique no fundo escurecido (fora do conteúdo) fecha o diálogo
            if (e.target === e.currentTarget) dialogRef.current?.close();
          }}
        >
          <div className="formula-dialog__inner">
            <div className="formula-dialog__head">
              <h2 id={titleId}>{title ?? 'Fórmula ampliada'}</h2>
              <button type="button" className="btn btn--ghost" onClick={() => dialogRef.current?.close()}>
                Fechar
              </button>
            </div>
            <p id={descId} className="muted small">
              Versão ampliada da fórmula. Use os botões de tamanho se precisar; feche com Esc ou com o botão Fechar.
            </p>
            <div className="formula-dialog__tools" role="group" aria-label="Tamanho da fórmula">
              <button type="button" className="btn btn--ghost" aria-label="Diminuir fórmula" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}>
                A−
              </button>
              <span className="small" aria-live="polite">
                {Math.round(zoom * 100)}%
              </span>
              <button type="button" className="btn btn--ghost" aria-label="Aumentar fórmula" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}>
                A+
              </button>
            </div>
            <div className="formula-dialog__tex" style={{ ['--zoom' as string]: zoom }} tabIndex={0} role="region" aria-label="Fórmula ampliada">
              <Tex tex={tex} block />
            </div>
            {symbols && <SymbolCards symbols={symbols} always />}
          </div>
        </dialog>
      )}
    </>
  );
}

/** Legenda da fórmula em cartões (símbolo, significado e unidade SI juntos). */
export function SymbolCards({ symbols, always = false }: { symbols: SymbolDef[]; always?: boolean }) {
  return (
    <ul className={`symbol-cards ${always ? 'symbol-cards--always' : ''}`} aria-label="Símbolos da fórmula">
      {symbols.map((s) => (
        <li key={s.sym} className="symbol-card">
          <dl>
            <div>
              <dt>Símbolo</dt>
              <dd>
                <Tex tex={s.sym} />
              </dd>
            </div>
            <div>
              <dt>Significado</dt>
              <dd>{s.name}</dd>
            </div>
            <div>
              <dt>Unidade (SI)</dt>
              <dd>{s.unit}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
