import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { createProgressStore, type ProgressState, type ProgressStore } from './lib/progress';

const store = createProgressStore();
/** Instância única do progresso (exportada para os testes de tela poderem zerá-la). */
export const progressStore = store;
const Ctx = createContext<ProgressStore>(store);

export function ProgressProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useProgress(): [ProgressState, ProgressStore] {
  const s = useContext(Ctx);
  const state = useSyncExternalStore(s.subscribe, s.get, s.get);
  return [state, s];
}
