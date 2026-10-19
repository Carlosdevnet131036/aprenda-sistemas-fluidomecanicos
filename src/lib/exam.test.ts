import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../content/questions';
import { buildExam, formatClock, parseActiveExam, remainingSeconds, suggestedMinutes } from './exam';

const all = { modules: [], topics: [], levels: [], timeLimitMin: 30 };

describe('simulado de prova', () => {
  it('monta o simulado sem repetir questões e de forma reprodutível pela semente', () => {
    const a = buildExam(QUESTIONS, { ...all, count: 20 }, 42);
    const b = buildExam(QUESTIONS, { ...all, count: 20 }, 42);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(new Set(a.questions.map((q) => q.id)).size).toBe(20);
    expect(a.shortfall).toBe(0);
  });
  it('filtra por assunto e informa quando o banco não tem questões suficientes', () => {
    const topic = QUESTIONS[0].topic;
    const n = QUESTIONS.filter((q) => q.topic === topic).length;
    const r = buildExam(QUESTIONS, { ...all, topics: [topic], count: n + 5 }, 1);
    expect(r.questions.every((q) => q.topic === topic)).toBe(true);
    expect(r.available).toBe(n);
    expect(r.shortfall).toBe(5);
    expect(buildExam(QUESTIONS, { ...all, topics: ['inexistente'], count: 10 }, 1).questions).toEqual([]);
  });
  it('relógio: tempo restante nunca negativo; sem limite devolve null', () => {
    expect(remainingSeconds(0, 30, 60_000)).toBe(29 * 60);
    expect(remainingSeconds(0, 1, 10 * 60_000)).toBe(0);
    expect(remainingSeconds(0, 0, 999)).toBeNull();
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(suggestedMinutes(20)).toBe(30);
  });
  it('prova em andamento: aceita estado válido e descarta dados adulterados', () => {
    const ids = new Set(QUESTIONS.map((q) => q.id));
    const ok = parseActiveExam(JSON.stringify({ ids: ['m1-01', 'm1-02'], answers: { 'm1-01': true, x: false }, flags: ['m1-02', 'y'], index: 1, startedAt: 1, timeLimitMin: 10, scope: 'S' }), ids);
    expect(ok).toMatchObject({ answers: { 'm1-01': true }, flags: ['m1-02'], index: 1 });
    expect(parseActiveExam(JSON.stringify({ ids: ['nao-existe'], startedAt: 1, timeLimitMin: 10 }), ids)).toBeNull();
    expect(parseActiveExam('{', ids)).toBeNull();
    expect(parseActiveExam(null, ids)).toBeNull();
  });
});
