// Exportar e importar os dados de estudo (arquivo JSON local, sem internet).
import { useRef, useState } from 'react';
import { backupFileName, exportBackup, parseBackup, type BackupSummary } from '../lib/backup';
import type { NotesState } from '../lib/notes';
import type { ProgressState } from '../lib/progress';
import { notesStore } from '../notesContext';
import { useProgress } from '../progressContext';

export function BackupPanel() {
  const [state, progress] = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ state: ProgressState; notes: NotesState | null; summary: BackupSummary } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function download() {
    const blob = new Blob([exportBackup(state, new Date(), notesStore.get())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: 'Backup gerado. Guarde o arquivo em um lugar seguro.' });
  }

  async function onFile(f: File | undefined) {
    setPending(null);
    if (!f) return;
    const r = parseBackup(await f.text());
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return;
    }
    setMsg(null);
    setPending({ state: r.state, notes: r.notes, summary: r.summary });
  }

  return (
    <section className="panel" aria-labelledby="bk-t">
      <h2 id="bk-t">Backup dos dados de estudo</h2>
      <p>
        Seu progresso e suas anotações (cadernos e destaques) ficam só neste navegador. Exporte um arquivo para não perder nada ao trocar de
        computador ou limpar o navegador, e importe-o depois.
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={download}>
          Exportar backup (.json)
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
          Importar backup…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {msg && (
        <p className={`check check--${msg.ok ? 'ok' : 'bad'}`} role="status">
          {msg.text}
        </p>
      )}
      {pending && (
        <div className="callout callout--alerta" role="alert">
          <p className="callout__title">Substituir o progresso atual?</p>
          <p>
            O backup{pending.summary.exportedAt ? ` de ${new Date(pending.summary.exportedAt).toLocaleString('pt-BR')}` : ''} tem{' '}
            {pending.summary.completedModules} aula(s) concluída(s), {pending.summary.solvedExercises} exercício(s) resolvido(s),{' '}
            {pending.summary.answeredQuestions} questão(ões) respondida(s) e {pending.summary.attempts} tentativa(s) de quiz
            {pending.summary.hasPlan ? ', além de um plano de estudos' : ''}. Os dados atuais deste navegador serão substituídos.
          </p>
          <p>
            {pending.notes
              ? `Anotações: ${pending.summary.notebooks} caderno(s) e ${pending.summary.highlights} destaque(s), que substituem as anotações atuais.`
              : 'Este backup não traz anotações: os cadernos e destaques atuais serão mantidos.'}
          </p>
          <div className="row">
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                progress.replace(pending.state);
                if (pending.notes) notesStore.replace(pending.notes);
                setPending(null);
                setMsg({ ok: true, text: 'Backup importado com sucesso.' });
              }}
            >
              Sim, importar
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
