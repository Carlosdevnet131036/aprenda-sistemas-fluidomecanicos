// Escrita à mão do caderno. Os traços ficam em coordenadas de uma folha de
// largura fixa (PAGE_W unidades), independentes do tamanho da tela: a mesma
// anotação aparece igual no celular e no computador. Cada traço guarda a cor,
// a espessura e os pontos achatados [x0, y0, x1, y1, …] arredondados.

export const PAGE_W = 1000;
export const PAGE_H_DEFAULT = 1400;
export const PAGE_H_STEP = 700;
export const PAGE_H_MAX = 7000;

export const INK_COLORS = [
  { id: '#1f2937', label: 'Grafite' },
  { id: '#1d4ed8', label: 'Azul' },
  { id: '#b91c1c', label: 'Vermelho' },
  { id: '#15803d', label: 'Verde' },
];

export const INK_WIDTHS = [
  { id: 2, label: 'Fino' },
  { id: 4, label: 'Médio' },
  { id: 8, label: 'Grosso' },
];

export interface Stroke {
  /** cor (#rrggbb) */
  c: string;
  /** espessura em unidades da folha */
  w: number;
  /** pontos achatados x, y */
  p: number[];
}

/** Acrescenta um ponto se ele estiver longe o bastante do anterior (traço mais leve). */
export function pushPoint(p: number[], x: number, y: number, minDist = 1.5): boolean {
  const n = p.length;
  const rx = Math.round(x * 10) / 10;
  const ry = Math.round(y * 10) / 10;
  if (n >= 2) {
    const dx = rx - p[n - 2];
    const dy = ry - p[n - 1];
    if (dx * dx + dy * dy < minDist * minDist) return false;
  }
  p.push(rx, ry);
  return true;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** O ponto (x, y) toca o traço? Usado pela borracha, que apaga traços inteiros. */
export function hitsStroke(s: Stroke, x: number, y: number, radius: number): boolean {
  const r = radius + s.w / 2;
  const p = s.p;
  if (p.length === 2) return Math.hypot(x - p[0], y - p[1]) <= r;
  for (let i = 0; i + 3 < p.length; i += 2) if (distToSegment(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) <= r) return true;
  return false;
}

/** Desenha os traços num contexto 2D já escalado para unidades da folha. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.strokeStyle = s.c;
    ctx.fillStyle = s.c;
    ctx.lineWidth = s.w;
    const p = s.p;
    if (p.length === 2) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], s.w / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    // curvas suaves passando pelos pontos médios
    for (let i = 2; i + 3 < p.length; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2;
      const my = (p[i + 1] + p[i + 3]) / 2;
      ctx.quadraticCurveTo(p[i], p[i + 1], mx, my);
    }
    ctx.lineTo(p[p.length - 2], p[p.length - 1]);
    ctx.stroke();
  }
}

export type Paper = 'liso' | 'pautado' | 'quadriculado';

/** Fundo da folha (pautas ou quadriculado), em unidades da folha. */
export function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, height: number) {
  ctx.fillStyle = '#fffef9';
  ctx.fillRect(0, 0, PAGE_W, height);
  if (paper === 'liso') return;
  ctx.strokeStyle = paper === 'pautado' ? '#c9d7ea' : '#dde6f1';
  ctx.lineWidth = 1;
  const step = paper === 'pautado' ? 40 : 25;
  ctx.beginPath();
  for (let y = step; y < height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(PAGE_W, y);
  }
  if (paper === 'quadriculado') {
    for (let x = step; x < PAGE_W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
  }
  ctx.stroke();
}

export function sanitizeStrokes(x: unknown): Stroke[] {
  if (!Array.isArray(x)) return [];
  const out: Stroke[] = [];
  for (const s of x) {
    if (!s || typeof s !== 'object') continue;
    const { c, w, p } = s as Partial<Stroke>;
    if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) continue;
    if (typeof w !== 'number' || !(w > 0 && w <= 40)) continue;
    if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0 || p.some((v) => typeof v !== 'number' || !Number.isFinite(v))) continue;
    out.push({ c, w, p });
  }
  return out;
}
