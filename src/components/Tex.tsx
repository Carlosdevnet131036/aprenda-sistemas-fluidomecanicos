import katex from 'katex';
import { useMemo } from 'react';

/** Renderiza TeX com KaTeX; em caso de erro mostra o texto original. */
export function Tex({ tex, block = false, label }: { tex: string; block?: boolean; label?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' });
    } catch {
      return null;
    }
  }, [tex, block]);
  if (html === null) return <code>{tex}</code>;
  const Tag = block ? 'div' : 'span';
  return <Tag className={block ? 'tex-block' : 'tex-inline'} aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />;
}
