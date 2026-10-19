// No Node 25, o `localStorage` do próprio Node (sem --localstorage-file) se
// sobrepõe ao do jsdom e não grava nada. Os testes de tela precisam de um
// localStorage que funcione, então este arquivo instala um em memória — e
// precisa ser importado antes de qualquer módulo que crie os armazenamentos.
class MemoryStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

let works = false;
try {
  window.localStorage.setItem('__teste__', '1');
  window.localStorage.removeItem('__teste__');
  works = true;
} catch {
  works = false;
}
if (!works) {
  const mem = new MemoryStorage();
  Object.defineProperty(window, 'localStorage', { value: mem, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: mem, configurable: true });
}

// O jsdom não tem PointerEvent: sem ele, pointerId e pointerType se perdem nos eventos de teste.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, configurable: true });
  Object.defineProperty(globalThis, 'PointerEvent', { value: PointerEventPolyfill, configurable: true });
}
