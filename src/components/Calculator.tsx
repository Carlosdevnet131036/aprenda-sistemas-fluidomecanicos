import { useId, useMemo, useState } from 'react';
import { defaults, runCalculator, type CalculatorDef } from '../lib/calculators';
import { fmt, getUnit } from '../lib/units';
import { moduleHref } from '../router';
import { Tex } from './Tex';

export function Calculator({ def }: { def: CalculatorDef }) {
  const init = useMemo(() => defaults(def), [def]);
  const [text, setText] = useState(init.text);
  const [units, setUnits] = useState(init.units);
  const [opt, setOpt] = useState(init.opt);
  const out = useMemo(() => runCalculator(def, text, units, opt), [def, text, units, opt]);
  const uid = useId();

  function reset() {
    setText(init.text);
    setUnits(init.units);
    setOpt(init.opt);
  }

  return (
    <section className="calc" aria-labelledby={`${uid}-t`}>
      <header className="calc__head">
        <h3 id={`${uid}-t`}>{def.title}</h3>
        <p className="muted">{def.summary}</p>
        <Tex tex={def.tex} block />
        <dl className="calc__about">
          <div>
            <dt>Fenômeno</dt>
            <dd>{def.about}</dd>
          </div>
          <div>
            <dt>Quando usar</dt>
            <dd>{def.conditions}</dd>
          </div>
        </dl>
      </header>
      <div className="calc__grid">
        <div className="calc__inputs">
          {def.selects?.map((s) => (
            <label key={s.key} className="field">
              <span className="field__label">{s.label}</span>
              <select value={opt[s.key]} onChange={(e) => setOpt({ ...opt, [s.key]: e.target.value })}>
                {s.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {def.inputs
            .filter((i) => !i.showIf || i.showIf(opt))
            .map((i) => {
              const id = `${uid}-${i.key}`;
              return (
                <div key={i.key} className="field">
                  <label htmlFor={id} className="field__label">
                    {i.label} <span className="sym">({i.sym})</span>
                    {i.optional && <span className="muted small"> — opcional</span>}
                  </label>
                  <div className="field__row">
                    <input
                      id={id}
                      inputMode="decimal"
                      autoComplete="off"
                      value={text[i.key] ?? ''}
                      onChange={(e) => setText({ ...text, [i.key]: e.target.value })}
                    />
                    {i.units.length > 1 ? (
                      <select aria-label={`Unidade de ${i.label}`} value={units[i.key]} onChange={(e) => setUnits({ ...units, [i.key]: e.target.value })}>
                        {i.units.map((u) => (
                          <option key={u} value={u}>
                            {getUnit(u).label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="unit">{getUnit(i.units[0]).label}</span>
                    )}
                  </div>
                  {i.presets && (
                    <div className="chips">
                      {i.presets.map((p) => (
                        <button key={p.label} type="button" className="chip" onClick={() => setText({ ...text, [i.key]: p.value })}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {i.help && <span className="muted small">{i.help}</span>}
                </div>
              );
            })}
          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Restaurar exemplo
            </button>
            <a className="btn btn--link" href={moduleHref(def.module, def.section)}>
              Ver a teoria
            </a>
          </div>
        </div>

        <div className="calc__output" aria-live="polite">
          {!out.ok ? (
            <div className="callout callout--erro" role="alert">
              <p className="callout__title">Confira os dados</p>
              <ul>{out.errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          ) : (
            <>
              <ol className="calc-steps">
                {out.steps.map((s, k) => (
                  <li key={k}>
                    <span className="calc-steps__label">{s.label}</span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
              <div className="results">
                {out.results.map((r, k) => (
                  <div key={k} className="result">
                    <span className="result__label">{r.label}</span>
                    <span className="result__value">
                      {fmt(r.value, r.sig ?? 4)} <small>{r.unit}</small>
                    </span>
                  </div>
                ))}
              </div>
              <p className="meaning">
                <strong>O que isso significa:</strong> {out.meaning}
              </p>
              {out.warnings.length > 0 && (
                <div className="callout callout--alerta">
                  <p className="callout__title">Atenção</p>
                  <ul>{out.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
