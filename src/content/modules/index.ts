import type { Module, ModuleId } from '../types';
import { m0 } from './m0';
import { m1 } from './m1';
import { m2 } from './m2';
import { m3 } from './m3';
import { m4 } from './m4';
import { m5 } from './m5';
import { m6 } from './m6';
import { m7 } from './m7';

export const MODULES: Module[] = [m0, m1, m2, m3, m4, m5, m6, m7];

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

export function moduleLabel(id: ModuleId): string {
  const m = getModule(id);
  return m ? `Módulo ${m.num} — ${m.title}` : id;
}
