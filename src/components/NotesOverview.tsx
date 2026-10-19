// "Minhas anotações" em Meu estudo: lista os cadernos e os exercícios com
// destaques, com link para voltar a cada um.
import { getExercise } from '../content/exercises';
import { getModule } from '../content/modules';
import { getRevisao } from '../content/revisao';
import type { ModuleId } from '../content/types';
import { notesSummary } from '../lib/notes';
import { useNotes } from '../notesContext';
import { moduleHref } from '../router';

function describe(key: string): { title: string; href: string; kind: string } | null {
  const [kind, id] = key.split(':');
  if (kind === 'mod') {
    const m = getModule(id as ModuleId);
    return m ? { title: `Módulo ${m.num}: ${m.title}`, href: moduleHref(m.id), kind: 'Caderno do módulo' } : null;
  }
  const ex = getExercise(id) ?? getRevisao(id);
  if (!ex) return null;
  return { title: ex.title, href: getExercise(id) ? `#/exercicios/${id}` : `#/revisao/${id}`, kind: 'Exercício' };
}

export function NotesOverview() {
  const [notes, store] = useNotes();
  const sum = notesSummary(notes);
  const books = Object.entries(notes.notebooks)
    .map(([key, nb]) => ({ key, nb, d: describe(key) }))
    .sort((a, b) => (a.nb.updatedAt < b.nb.updatedAt ? 1 : -1));
  const highlighted = Object.entries(notes.highlights).filter(([id]) => !notes.notebooks[`ex:${id}`]);
  return (
    <section className="panel" aria-labelledby="nt-t">
      <h2 id="nt-t">Minhas anotações</h2>
      {store.loadIssue() === 'corrompido' && (
        <p className="callout callout--erro" role="alert">
          As anotações salvas estavam ilegíveis e não puderam ser carregadas. Uma cópia do conteúdo original foi guardada à parte; se tiver um backup,
          importe-o abaixo.
        </p>
      )}
      {sum.notebooks === 0 && sum.highlights === 0 ? (
        <p className="empty">
          Nenhuma anotação ainda. Abra um exercício, destaque o enunciado e use o “Caderno de cálculos”; em cada aula há também um “Caderno do
          módulo”.
        </p>
      ) : (
        <>
          <p className="muted small">
            {sum.notebooks} caderno(s) e {sum.highlights} destaque(s), salvos só neste navegador (entram no backup abaixo).
          </p>
          <ul className="topic-list">
            {books.map(({ key, nb, d }) => (
              <li key={key}>
                <div>
                  {d ? <a href={d.href}>{d.title}</a> : <span>{key}</span>}
                  <span className="muted small">
                    {' '}
                    — {d?.kind ?? 'Caderno'}
                    {nb.text.trim() ? ' • texto' : ''}
                    {nb.ink.length ? ` • ${nb.ink.length} traço(s) à mão` : ''}
                    {notes.highlights[key.slice(3)]?.length ? ` • ${notes.highlights[key.slice(3)].length} destaque(s)` : ''}
                    {nb.updatedAt ? ` • ${new Date(nb.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                  </span>
                </div>
              </li>
            ))}
            {highlighted.map(([id, list]) => {
              const d = describe(`ex:${id}`);
              return (
                <li key={id}>
                  <div>
                    {d ? <a href={d.href}>{d.title}</a> : <span>{id}</span>}
                    <span className="muted small"> — {list.length} destaque(s)</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
