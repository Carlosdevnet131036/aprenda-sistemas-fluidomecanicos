// Calculadoras com entrada em tabela: manômetro (caminho trecho a trecho)
// e classificação newtoniana a partir de um ensaio.
import { useMemo, useState } from 'react';
import { classifyNewtonian, PhysicsError, solveManometerStart, walkManometer, type ManometerSegment } from '../lib/physics';
import { fmt, parseNumber } from '../lib/units';
import { moduleHref } from '../router';
import { Tex } from './Tex';

interface SegRow {
  fluid: string;
  dens: string; // ρ (kg/m³) ou γ (N/m³), conforme o modo
  h: string;
  hUnit: 'm' | 'cm';
  dir: 'desce' | 'sobe';
}

const FLUIDS: Record<string, number> = { água: 1000, óleo: 850, mercúrio: 13600 };

const PRESETS: Record<string, { label: string; mode: 'rho' | 'gamma'; g: string; known: string; knownLabel: string; start: string; end: string; rows: SegRow[] }> = {
  ex1: {
    label: 'Aula 5 – Ex. 1 (tanque → atmosfera)',
    mode: 'rho', g: '9,81', known: '85,6', knownLabel: 'patm', start: 'p1', end: 'patm',
    rows: [
      { fluid: 'água', dens: '1000', h: '0,1', hUnit: 'm', dir: 'desce' },
      { fluid: 'óleo', dens: '850', h: '0,2', hUnit: 'm', dir: 'desce' },
      { fluid: 'mercúrio', dens: '13600', h: '0,35', hUnit: 'm', dir: 'sobe' },
    ],
  },
  ex2: {
    label: 'Aula 5 – Ex. 2 (diferencial A → B)',
    mode: 'gamma', g: '9,81', known: '0', knownLabel: 'pB (com 0, o resultado mostra pB − pA)', start: 'pA', end: 'pB',
    rows: [
      { fluid: 'água', dens: '10000', h: '25', hUnit: 'cm', dir: 'desce' },
      { fluid: 'mercúrio', dens: '136000', h: '100', hUnit: 'cm', dir: 'desce' },
      { fluid: 'óleo', dens: '8000', h: '80', hUnit: 'cm', dir: 'sobe' },
    ],
  },
  q22: {
    label: 'Tubo em U simples (Quiz Q22)',
    mode: 'rho', g: '9,81', known: '0', knownLabel: 'patm (0 = pressão manométrica)', start: 'pgás', end: 'patm',
    rows: [{ fluid: 'mercúrio', dens: '13600', h: '0,30', hUnit: 'm', dir: 'sobe' }],
  },
};

export function ManometerLab() {
  const [preset, setPreset] = useState('ex1');
  const p = PRESETS[preset];
  const [mode, setMode] = useState(p.mode);
  const [g, setG] = useState(p.g);
  const [known, setKnown] = useState(p.known);
  const [rows, setRows] = useState<SegRow[]>(p.rows);

  function load(k: string) {
    const x = PRESETS[k];
    setPreset(k);
    setMode(x.mode);
    setG(x.g);
    setKnown(x.known);
    setRows(x.rows);
  }

  const calc = useMemo(() => {
    const errors: string[] = [];
    const gv = parseNumber(g);
    const kv = parseNumber(known);
    if (mode === 'rho' && (gv === null || gv <= 0)) errors.push('Informe g > 0.');
    if (kv === null) errors.push('Informe a pressão conhecida no fim do caminho.');
    if (!rows.length) errors.push('Adicione pelo menos um trecho.');
    const segs: ManometerSegment[] = rows.map((r, i) => {
      const d = parseNumber(r.dens);
      const h = parseNumber(r.h);
      if (d === null || d <= 0) errors.push(`Trecho ${i + 1}: ${mode === 'rho' ? 'ρ' : 'γ'} deve ser maior que zero.`);
      if (h === null || h < 0) errors.push(`Trecho ${i + 1}: altura inválida.`);
      const hm = (h ?? 0) * (r.hUnit === 'cm' ? 0.01 : 1);
      const gamma = mode === 'rho' ? (d ?? 0) * (gv ?? 0) : d ?? 0;
      return { fluid: r.fluid, gamma, h: hm, dir: r.dir };
    });
    if (errors.length) return { ok: false as const, errors };
    try {
      const pEnd = (kv as number) * 1000;
      const pStart = solveManometerStart(pEnd, segs);
      const walk = walkManometer(pStart, segs);
      return { ok: true as const, pStart, pEnd, walk, segs };
    } catch (e) {
      return { ok: false as const, errors: [e instanceof PhysicsError ? e.message : String(e)] };
    }
  }, [mode, g, known, rows]);

  const upd = (i: number, patch: Partial<SegRow>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const symbol = mode === 'rho' ? 'ρ·g·h' : 'γ·h';

  return (
    <section className="calc" aria-labelledby="mano-t">
      <header className="calc__head">
        <h3 id="mano-t">Manômetro — caminhar pelo tubo</h3>
        <p className="muted">Monte o caminho do ponto desconhecido até o ponto conhecido. Desceu: soma; subiu: subtrai.</p>
        <Tex tex={String.raw`p_{\text{início}} + \sum_{\text{desce}} \rho g h - \sum_{\text{sobe}} \rho g h = p_{\text{fim}}`} block />
      </header>
      <div className="row wrap">
        {Object.entries(PRESETS).map(([k, x]) => (
          <button key={k} type="button" className={`chip ${preset === k ? 'chip--on' : ''}`} aria-pressed={preset === k} onClick={() => load(k)}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="calc__grid">
        <div className="calc__inputs">
          <label className="field">
            <span className="field__label">Dado de cada fluido</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'rho' | 'gamma')}>
              <option value="rho">Massa específica ρ (kg/m³) — parcela ρ·g·h</option>
              <option value="gamma">Peso específico γ (N/m³) — parcela γ·h</option>
            </select>
          </label>
          {mode === 'rho' && (
            <label className="field">
              <span className="field__label">g (m/s²)</span>
              <input inputMode="decimal" value={g} onChange={(e) => setG(e.target.value)} />
            </label>
          )}
          <label className="field">
            <span className="field__label">Pressão conhecida no fim — {p.knownLabel} (kPa)</span>
            <input inputMode="decimal" value={known} onChange={(e) => setKnown(e.target.value)} />
          </label>
          <fieldset className="segs">
            <legend>Trechos, na ordem do caminho</legend>
            {rows.map((r, i) => (
              <div key={i} className="seg">
                <span className="seg__n">{i + 1}</span>
                <select
                  aria-label={`Fluido do trecho ${i + 1}`}
                  value={r.fluid in FLUIDS ? r.fluid : 'outro'}
                  onChange={(e) => {
                    const f = e.target.value;
                    const base = FLUIDS[f];
                    upd(i, { fluid: f, dens: base ? String(mode === 'rho' ? base : base * 10) : r.dens });
                  }}
                >
                  {Object.keys(FLUIDS).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                  <option value="outro">outro</option>
                </select>
                <input aria-label={`${mode === 'rho' ? 'ρ' : 'γ'} do trecho ${i + 1}`} inputMode="decimal" value={r.dens} onChange={(e) => upd(i, { dens: e.target.value })} />
                <select aria-label={`Sentido do trecho ${i + 1}`} value={r.dir} onChange={(e) => upd(i, { dir: e.target.value as 'desce' | 'sobe' })}>
                  <option value="desce">desce ↓ (+)</option>
                  <option value="sobe">sobe ↑ (−)</option>
                </select>
                <input aria-label={`Altura do trecho ${i + 1}`} inputMode="decimal" value={r.h} onChange={(e) => upd(i, { h: e.target.value })} />
                <select aria-label={`Unidade da altura do trecho ${i + 1}`} value={r.hUnit} onChange={(e) => upd(i, { hUnit: e.target.value as 'm' | 'cm' })}>
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                </select>
                <button type="button" className="icon-btn" aria-label={`Remover trecho ${i + 1}`} onClick={() => setRows(rows.filter((_, k) => k !== i))}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="btn btn--ghost" onClick={() => setRows([...rows, { fluid: 'água', dens: mode === 'rho' ? '1000' : '9810', h: '0,1', hUnit: 'm', dir: 'desce' }])}>
              + Adicionar trecho
            </button>
          </fieldset>
          <a className="btn btn--link" href={moduleHref('m5', 'receita')}>
            Ver a teoria
          </a>
        </div>
        <div className="calc__output" aria-live="polite">
          {!calc.ok ? (
            <div className="callout callout--erro" role="alert">
              <ul>{calc.errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          ) : (
            <>
              <p className="eq-line">
                {p.start}
                {calc.walk.terms.map((t, i) => (
                  <span key={i} className={t.delta >= 0 ? 'plus' : 'minus'}>
                    {' '}
                    {t.delta >= 0 ? '+' : '−'} {symbol}({t.segment.fluid})
                  </span>
                ))}{' '}
                = {p.end}
              </p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Trecho</th>
                    <th>Parcela</th>
                    <th>Pressão após o trecho</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>início ({p.start})</td>
                    <td>—</td>
                    <td>{fmt(calc.pStart, 7)} Pa</td>
                  </tr>
                  {calc.walk.terms.map((t, i) => (
                    <tr key={i}>
                      <td>
                        {i + 1}. {t.segment.dir} {fmt(t.segment.h, 4)} m em {t.segment.fluid}
                      </td>
                      <td className={t.delta >= 0 ? 'plus' : 'minus'}>
                        {t.delta >= 0 ? '+' : '−'}
                        {fmt(t.segment.gamma, 6)} × {fmt(t.segment.h, 4)} = {t.delta >= 0 ? '+' : '−'}
                        {fmt(Math.abs(t.delta), 6)} Pa
                      </td>
                      <td>{fmt(t.pressureAfter, 7)} Pa</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="results">
                <div className="result">
                  <span className="result__label">{p.start} (ponto inicial)</span>
                  <span className="result__value">
                    {fmt(calc.pStart / 1000, 5)} <small>kPa</small>
                  </span>
                </div>
                <div className="result">
                  <span className="result__label">
                    {p.end} − {p.start}
                  </span>
                  <span className="result__value">
                    {fmt((calc.pEnd - calc.pStart) / 1000, 5)} <small>kPa</small>
                  </span>
                </div>
              </div>
              <p className="meaning">
                <strong>O que isso significa:</strong>{' '}
                {calc.pStart > calc.pEnd
                  ? `${p.start} é maior que ${p.end} em ${fmt((calc.pStart - calc.pEnd) / 1000, 4)} kPa.`
                  : calc.pStart < calc.pEnd
                    ? `${p.start} é menor que ${p.end} em ${fmt((calc.pEnd - calc.pStart) / 1000, 4)} kPa.`
                    : `${p.start} e ${p.end} são iguais.`}
              </p>
              <div className="callout callout--alerta">
                <p className="callout__title">Atenção</p>
                <ul>
                  <li>Use em cada trecho a densidade do fluido daquele trecho.</li>
                  <li>{mode === 'gamma' ? 'Com γ, não multiplique por g de novo.' : 'Com ρ, a parcela é ρ·g·h.'}</li>
                  <li>Refaça a soma final: no caderno da Aula 5 houve erro de soma (124,6 em vez de 129,6 kPa).</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

interface PointRow {
  rate: string;
  stress: string;
}

const RHEO: Record<string, { label: string; rows: PointRow[]; xs: string; ys: string }> = {
  q10: { label: 'Lista Aula 03 – Q10', xs: 'dv/dy (s⁻¹)', ys: 'τ (Pa)', rows: [{ rate: '25', stress: '8' }, { rate: '50', stress: '16' }, { rate: '75', stress: '24' }] },
  a: { label: 'Slides – fluido A (F × v)', xs: 'v (m/s)', ys: 'F (N)', rows: [{ rate: '5', stress: '2' }, { rate: '10', stress: '4' }, { rate: '15', stress: '6' }, { rate: '20', stress: '8' }, { rate: '25', stress: '10' }] },
  b: { label: 'Slides – fluido B (F × v)', xs: 'v (m/s)', ys: 'F (N)', rows: [{ rate: '7,5', stress: '1' }, { rate: '14', stress: '2' }, { rate: '18', stress: '3' }, { rate: '20', stress: '4' }] },
};

export function NewtonianLab() {
  const [preset, setPreset] = useState('q10');
  const [rows, setRows] = useState(RHEO.q10.rows);
  const cfg = RHEO[preset];
  const res = useMemo(() => {
    const pts = rows.map((r) => ({ rate: parseNumber(r.rate) ?? NaN, stress: parseNumber(r.stress) ?? NaN }));
    try {
      return { ok: true as const, r: classifyNewtonian(pts), pts };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  }, [rows]);

  return (
    <section className="calc" aria-labelledby="newt-t">
      <header className="calc__head">
        <h3 id="newt-t">Fluido newtoniano? (teste da tabela)</h3>
        <p className="muted">Divida τ por dv/dy (ou F por v) em cada linha. Razão constante ⇒ newtoniano.</p>
        <Tex tex={String.raw`\mu = \dfrac{\tau}{dv/dy}\ \text{constante} \Leftrightarrow \text{newtoniano}`} block />
      </header>
      <div className="row wrap">
        {Object.entries(RHEO).map(([k, x]) => (
          <button key={k} type="button" className={`chip ${preset === k ? 'chip--on' : ''}`} aria-pressed={preset === k} onClick={() => (setPreset(k), setRows(x.rows))}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="calc__grid">
        <div className="calc__inputs">
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela do ensaio">
            <table className="table">
              <thead>
                <tr>
                  <th>{cfg.xs}</th>
                  <th>{cfg.ys}</th>
                  <th>Razão</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <input aria-label={`${cfg.xs}, linha ${i + 1}`} inputMode="decimal" value={r.rate} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, rate: e.target.value } : x)))} />
                    </td>
                    <td>
                      <input aria-label={`${cfg.ys}, linha ${i + 1}`} inputMode="decimal" value={r.stress} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, stress: e.target.value } : x)))} />
                    </td>
                    <td>{res.ok ? fmt(res.r.ratios[i], 3) : '—'}</td>
                    <td>
                      <button type="button" className="icon-btn" aria-label={`Remover linha ${i + 1}`} onClick={() => setRows(rows.filter((_, k) => k !== i))}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => setRows([...rows, { rate: '', stress: '' }])}>
            + Adicionar linha
          </button>
          <a className="btn btn--link" href={moduleHref('m4', 'newtoniano')}>
            Ver a teoria
          </a>
        </div>
        <div className="calc__output" aria-live="polite">
          {!res.ok ? (
            <div className="callout callout--erro" role="alert">
              <p>{res.error}</p>
            </div>
          ) : (
            <>
              <div className="results">
                <div className="result">
                  <span className="result__label">Classificação</span>
                  <span className="result__value">{res.r.newtonian ? 'Newtoniano' : 'Não newtoniano'}</span>
                </div>
                {res.r.newtonian && (
                  <div className="result">
                    <span className="result__label">Razão constante{preset === 'q10' ? ' = μ' : ''}</span>
                    <span className="result__value">
                      {fmt(res.r.mean, 3)} {preset === 'q10' && <small>Pa·s</small>}
                    </span>
                  </div>
                )}
              </div>
              <p className="meaning">
                <strong>O que isso significa:</strong>{' '}
                {res.r.newtonian
                  ? 'A razão é a mesma em todas as linhas (tolerância de 2%): a tensão é proporcional à taxa de deformação.'
                  : `As razões variam de ${fmt(Math.min(...res.r.ratios), 3)} a ${fmt(Math.max(...res.r.ratios), 3)}: a “viscosidade” muda com a taxa de deformação.`}
              </p>
              <div className="callout callout--alerta">
                <p className="callout__title">Atenção</p>
                <ul>
                  <li>“A tensão aumenta” não prova nada: o que decide é a razão ser constante.</li>
                  <li>A razão τ/(dv/dy) é a viscosidade DINÂMICA (Pa·s), não a cinemática.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
