// Diagramas didáticos em SVG. As cores vêm de variáveis CSS para funcionar
// no tema claro e no escuro.
import { useState, type ReactNode } from 'react';
import type { DiagramId } from '../content/types';
import { fmt } from '../lib/units';

function Fig({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="diagram">
      {children}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const Arrow = ({ id }: { id: string }) => (
  <defs>
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
    </marker>
  </defs>
);

function MassaPeso() {
  return (
    <Fig caption="A massa é a mesma nos dois lugares; o peso (a seta) é cerca de 6 vezes menor na Lua.">
      <svg viewBox="0 0 520 220" role="img" aria-label="Motor de 50 kg na Terra pesa 490,5 N; na Lua pesa 81 N">
        <Arrow id="ar-mp" />
        {[
          { x: 20, title: 'Terra', g: '9,81 m/s²', len: 110, P: '490,5 N', cls: 'fill-earth' },
          { x: 280, title: 'Lua', g: '1,62 m/s²', len: 20, P: '81 N', cls: 'fill-moon' },
        ].map((s) => (
          <g key={s.title} transform={`translate(${s.x},0)`}>
            <rect x="0" y="0" width="220" height="210" rx="12" className="fill-soft" />
            <text x="110" y="24" textAnchor="middle" className="t-strong">{s.title} (g = {s.g})</text>
            <rect x="70" y="40" width="80" height="50" rx="6" className="fill-primary" />
            <text x="110" y="71" textAnchor="middle" className="t-on">m = 50 kg</text>
            <line x1="110" y1="92" x2="110" y2={92 + s.len} className="stroke-accent" strokeWidth="4" markerEnd="url(#ar-mp)" />
            <text x="122" y={100 + s.len / 2} className="t-accent">P = {s.P}</text>
            <rect x="20" y="198" width="180" height="8" rx="4" className={s.cls} />
          </g>
        ))}
      </svg>
    </Fig>
  );
}

function Cilindro() {
  return (
    <Fig caption="O raio r é a metade do diâmetro D. V = área da base (π·r²) × altura h.">
      <svg viewBox="0 0 360 230" role="img" aria-label="Cilindro com diâmetro D, raio r e altura h">
        <Arrow id="ar-cil" />
        <path d="M80 50 L80 180 A100 26 0 0 0 280 180 L280 50" className="fill-water-soft stroke-line" />
        <ellipse cx="180" cy="50" rx="100" ry="26" className="fill-water stroke-line" />
        <line x1="80" y1="50" x2="280" y2="50" className="stroke-accent" strokeWidth="2" strokeDasharray="5 4" />
        <text x="180" y="20" textAnchor="middle" className="t-accent">D (diâmetro)</text>
        <line x1="180" y1="50" x2="280" y2="50" className="stroke-primary" strokeWidth="3" />
        <text x="230" y="68" textAnchor="middle" className="t-primary">r = D/2</text>
        <line x1="310" y1="50" x2="310" y2="180" className="stroke-line" strokeWidth="1.5" markerStart="url(#ar-cil)" markerEnd="url(#ar-cil)" />
        <text x="322" y="120" className="t-strong">h</text>
      </svg>
    </Fig>
  );
}

function Sistemas() {
  const box = (x: number, title: string, mass: boolean, energy: boolean, ex: string) => (
    <g transform={`translate(${x},0)`}>
      <rect x="10" y="40" width="140" height="110" rx="10" className="fill-soft stroke-primary" strokeWidth="2" strokeDasharray={mass ? '6 5' : undefined} />
      <text x="80" y="25" textAnchor="middle" className="t-strong">{title}</text>
      <g className={mass ? 'c-ok' : 'c-bad'}>
        <line x1="-6" y1="75" x2="40" y2="75" stroke="currentColor" strokeWidth="3" markerEnd="url(#ar-sys)" />
        <text x="44" y="80">{mass ? 'massa ✓' : 'massa ✗'}</text>
      </g>
      <g className={energy ? 'c-ok' : 'c-bad'}>
        <line x1="-6" y1="115" x2="40" y2="115" stroke="currentColor" strokeWidth="3" markerEnd="url(#ar-sys)" />
        <text x="44" y="120">{energy ? 'energia ✓' : 'energia ✗'}</text>
      </g>
      <text x="80" y="172" textAnchor="middle" className="t-muted">{ex}</text>
    </g>
  );
  return (
    <Fig caption="Olhe a fronteira: aberto troca massa e energia; fechado só energia; isolado nada.">
      <svg viewBox="0 0 510 185" role="img" aria-label="Sistemas aberto, fechado e isolado">
        <Arrow id="ar-sys" />
        {box(0, 'Aberto', true, true, 'bomba, compressor')}
        {box(170, 'Fechado', false, true, 'tanque selado aquecido')}
        {box(340, 'Isolado', false, false, 'garrafa térmica ideal')}
      </svg>
    </Fig>
  );
}

function LeiZero() {
  return (
    <Fig caption="O termômetro (C) compara A e B sem que eles se toquem.">
      <svg viewBox="0 0 480 150" role="img" aria-label="A em equilíbrio com C, B em equilíbrio com C, logo A e B em equilíbrio">
        {[
          { x: 30, l: 'A' },
          { x: 190, l: 'C' },
          { x: 350, l: 'B' },
        ].map((b) => (
          <g key={b.l}>
            <rect x={b.x} y="30" width="100" height="70" rx="10" className={b.l === 'C' ? 'fill-primary' : 'fill-soft stroke-line'} />
            <text x={b.x + 50} y="72" textAnchor="middle" className={b.l === 'C' ? 't-on t-big' : 't-strong t-big'}>{b.l}</text>
          </g>
        ))}
        <text x="160" y="58" textAnchor="middle" className="t-primary">=</text>
        <text x="320" y="58" textAnchor="middle" className="t-primary">=</text>
        <text x="160" y="120" textAnchor="middle" className="t-muted">TA = TC</text>
        <text x="320" y="120" textAnchor="middle" className="t-muted">TB = TC</text>
        <text x="240" y="142" textAnchor="middle" className="t-accent">⇒ TA = TB</text>
      </svg>
    </Fig>
  );
}

function PV() {
  return (
    <Fig caption="Lista 01 – Q10: o trabalho é a área sob a curva. Em A→B (pressão constante) é o retângulo; em B→C (volume constante) a área é zero.">
      <svg viewBox="0 0 420 250" role="img" aria-label="Diagrama p–V com trecho isobárico A-B e trecho isocórico B-C">
        <Arrow id="ar-pv" />
        <line x1="50" y1="220" x2="400" y2="220" className="stroke-line" strokeWidth="1.5" markerEnd="url(#ar-pv)" />
        <line x1="50" y1="220" x2="50" y2="20" className="stroke-line" strokeWidth="1.5" markerEnd="url(#ar-pv)" />
        <text x="395" y="240" className="t-muted">V (m³)</text>
        <text x="10" y="30" className="t-muted">p</text>
        <rect x="110" y="130" width="180" height="90" className="fill-primary-soft" />
        <text x="200" y="182" textAnchor="middle" className="t-primary">W = p·ΔV = 1,5 MJ</text>
        <line x1="110" y1="130" x2="290" y2="130" className="stroke-primary" strokeWidth="3" markerEnd="url(#ar-pv)" />
        <line x1="290" y1="130" x2="290" y2="60" className="stroke-accent" strokeWidth="3" markerEnd="url(#ar-pv)" />
        <circle cx="110" cy="130" r="5" className="fill-strong" />
        <circle cx="290" cy="130" r="5" className="fill-strong" />
        <circle cx="290" cy="60" r="5" className="fill-strong" />
        <text x="96" y="122" className="t-strong">A</text>
        <text x="298" y="146" className="t-strong">B</text>
        <text x="298" y="58" className="t-strong">C</text>
        <text x="300" y="100" className="t-accent">W = 0</text>
        <text x="110" y="238" textAnchor="middle" className="t-muted">2,0</text>
        <text x="290" y="238" textAnchor="middle" className="t-muted">5,0</text>
        <text x="46" y="134" textAnchor="end" className="t-muted small-t">5×10⁵ Pa</text>
      </svg>
    </Fig>
  );
}

function Transformacoes() {
  // a partir do ponto (V=1, p=1): isotérmica p = 1/V; adiabática p = V^-1,4
  const X = (v: number) => 60 + (v - 0.5) * 150;
  const Y = (p: number) => 210 - p * 90;
  const curve = (f: (v: number) => number) =>
    Array.from({ length: 30 }, (_, i) => 0.6 + (i * 1.6) / 29)
      .map((v, i) => `${i ? 'L' : 'M'}${X(v).toFixed(1)},${Y(f(v)).toFixed(1)}`)
      .join(' ');
  return (
    <Fig caption="As quatro transformações a partir do mesmo estado. A adiabática é mais inclinada que a isotérmica.">
      <svg viewBox="0 0 420 240" role="img" aria-label="Curvas isotérmica, adiabática, isobárica e isocórica no diagrama p–V">
        <Arrow id="ar-tr" />
        <line x1="50" y1="215" x2="400" y2="215" className="stroke-line" markerEnd="url(#ar-tr)" />
        <line x1="50" y1="215" x2="50" y2="15" className="stroke-line" markerEnd="url(#ar-tr)" />
        <text x="392" y="232" className="t-muted">V</text>
        <text x="30" y="26" className="t-muted">p</text>
        <path d={curve((v) => 1 / v)} className="stroke-primary" fill="none" strokeWidth="3" />
        <path d={curve((v) => Math.pow(v, -1.4))} className="stroke-accent" fill="none" strokeWidth="3" strokeDasharray="7 5" />
        <line x1={X(0.6)} y1={Y(1)} x2={X(2.2)} y2={Y(1)} className="stroke-ok" strokeWidth="3" />
        <line x1={X(1)} y1={Y(0.25)} x2={X(1)} y2={Y(1.9)} className="stroke-tip" strokeWidth="3" />
        <circle cx={X(1)} cy={Y(1)} r="5" className="fill-strong" />
        <g className="legend">
          <text x="270" y="40" className="t-primary">— isotérmica (T)</text>
          <text x="270" y="60" className="t-accent">- - adiabática (Q = 0)</text>
          <text x="270" y="80" className="t-ok">— isobárica (p)</text>
          <text x="270" y="100" className="t-tip">| isocórica (V)</text>
        </g>
      </svg>
    </Fig>
  );
}

function MaquinaTermica() {
  return (
    <Fig caption="O calor Qq entra, parte vira trabalho W e o restante Qf é obrigatoriamente rejeitado (Kelvin-Planck).">
      <svg viewBox="0 0 420 280" role="img" aria-label="Máquina térmica entre reservatório quente e frio">
        <Arrow id="ar-mt" />
        <rect x="90" y="10" width="240" height="46" rx="10" className="fill-hot" />
        <text x="210" y="39" textAnchor="middle" className="t-on">Reservatório quente — Tq</text>
        <line x1="210" y1="58" x2="210" y2="104" className="stroke-hot" strokeWidth="6" markerEnd="url(#ar-mt)" />
        <text x="222" y="86" className="t-strong">Qq</text>
        <circle cx="210" cy="140" r="34" className="fill-primary" />
        <text x="210" y="145" textAnchor="middle" className="t-on">Máquina</text>
        <line x1="246" y1="140" x2="350" y2="140" className="stroke-ok" strokeWidth="5" markerEnd="url(#ar-mt)" />
        <text x="252" y="126" className="t-ok">W = Qq − Qf</text>
        <line x1="210" y1="176" x2="210" y2="220" className="stroke-cold" strokeWidth="4" markerEnd="url(#ar-mt)" />
        <text x="222" y="204" className="t-strong">Qf</text>
        <rect x="90" y="224" width="240" height="46" rx="10" className="fill-cold" />
        <text x="210" y="253" textAnchor="middle" className="t-on">Reservatório frio — Tf</text>
      </svg>
    </Fig>
  );
}

function CicloVapor() {
  const comps = [
    { x: 30, y: 150, t: '1. Bomba', s: 'recebe W' },
    { x: 30, y: 20, t: '2. Caldeira', s: 'recebe Qq' },
    { x: 260, y: 20, t: '3. Turbina', s: 'produz W' },
    { x: 260, y: 150, t: '4. Condensador', s: 'rejeita Qf' },
  ];
  return (
    <Fig caption="Ciclo de uma central a vapor: bomba → caldeira → turbina → condensador → volta à bomba.">
      <svg viewBox="0 0 440 230" role="img" aria-label="Ciclo bomba, caldeira, turbina, condensador">
        <Arrow id="ar-cv" />
        {comps.map((c) => (
          <g key={c.t}>
            <rect x={c.x} y={c.y} width="150" height="60" rx="10" className="fill-soft stroke-primary" strokeWidth="2" />
            <text x={c.x + 75} y={c.y + 26} textAnchor="middle" className="t-strong">{c.t}</text>
            <text x={c.x + 75} y={c.y + 46} textAnchor="middle" className="t-muted">{c.s}</text>
          </g>
        ))}
        <line x1="105" y1="148" x2="105" y2="84" className="stroke-primary" strokeWidth="3" markerEnd="url(#ar-cv)" />
        <line x1="182" y1="50" x2="256" y2="50" className="stroke-primary" strokeWidth="3" markerEnd="url(#ar-cv)" />
        <line x1="335" y1="82" x2="335" y2="146" className="stroke-primary" strokeWidth="3" markerEnd="url(#ar-cv)" />
        <line x1="258" y1="180" x2="184" y2="180" className="stroke-primary" strokeWidth="3" markerEnd="url(#ar-cv)" />
        <text x="220" y="40" textAnchor="middle" className="t-muted small-t">vapor</text>
        <text x="220" y="198" textAnchor="middle" className="t-muted small-t">líquido</text>
      </svg>
    </Fig>
  );
}

function Viscosidade() {
  const ys = [40, 70, 100, 130];
  return (
    <Fig caption="Perfil linear: a camada junto à placa móvel anda a v; junto à placa fixa, fica parada. dv/dy = v/e.">
      <svg viewBox="0 0 420 200" role="img" aria-label="Placa móvel sobre película de óleo com perfil linear de velocidade">
        <Arrow id="ar-vs" />
        <rect x="40" y="18" width="320" height="14" className="fill-primary" />
        <line x1="300" y1="10" x2="390" y2="10" className="stroke-primary" strokeWidth="3" markerEnd="url(#ar-vs)" />
        <text x="392" y="14" className="t-primary">v</text>
        <rect x="40" y="32" width="320" height="120" className="fill-oil-soft" />
        {ys.map((y) => {
          const len = ((152 - y) / 120) * 200;
          return <line key={y} x1="80" y1={y} x2={80 + len} y2={y} className="stroke-accent" strokeWidth="2" markerEnd="url(#ar-vs)" />;
        })}
        <line x1="80" y1="32" x2="280" y2="32" className="stroke-accent" strokeDasharray="4 4" />
        <line x1="80" y1="32" x2="80" y2="152" className="stroke-line" />
        <line x1="280" y1="32" x2="80" y2="152" className="stroke-accent" strokeDasharray="4 4" />
        <rect x="40" y="152" width="320" height="14" className="fill-strong" />
        <text x="200" y="188" textAnchor="middle" className="t-muted">placa fixa (v = 0)</text>
        <line x1="20" y1="32" x2="20" y2="152" className="stroke-line" markerStart="url(#ar-vs)" markerEnd="url(#ar-vs)" />
        <text x="6" y="98" className="t-strong">e</text>
      </svg>
    </Fig>
  );
}

function Newtoniano() {
  const X = (x: number) => 50 + x * 300;
  const Y = (y: number) => 200 - y * 170;
  const path = (f: (x: number) => number) =>
    Array.from({ length: 25 }, (_, i) => i / 24).map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`).join(' ');
  return (
    <Fig caption="Newtoniano: reta pela origem (μ constante). Não newtonianos: a inclinação muda com a taxa de deformação.">
      <svg viewBox="0 0 420 230" role="img" aria-label="Gráfico tensão por taxa de deformação">
        <Arrow id="ar-nw" />
        <line x1="50" y1="200" x2="380" y2="200" className="stroke-line" markerEnd="url(#ar-nw)" />
        <line x1="50" y1="200" x2="50" y2="15" className="stroke-line" markerEnd="url(#ar-nw)" />
        <text x="340" y="222" className="t-muted">dv/dy</text>
        <text x="28" y="24" className="t-muted">τ</text>
        <path d={path((x) => 0.75 * x)} className="stroke-primary" fill="none" strokeWidth="3" />
        <path d={path((x) => 0.95 * x * x)} className="stroke-accent" fill="none" strokeWidth="3" strokeDasharray="7 5" />
        <path d={path((x) => 0.85 * Math.sqrt(x))} className="stroke-tip" fill="none" strokeWidth="3" strokeDasharray="2 5" />
        <text x="355" y={Y(0.75) + 4} className="t-primary">newtoniano</text>
        <text x="300" y="30" className="t-accent">engrossa (amido + água)</text>
        <text x="200" y={Y(0.85 * Math.sqrt(0.5)) - 12} className="t-tip">afina (tintas)</text>
      </svg>
    </Fig>
  );
}

function Stevin() {
  return (
    <Fig caption="A cada metro que se desce na água, a pressão aumenta γ·h ≈ 10 kPa. Na mesma altura, a pressão é igual.">
      <svg viewBox="0 0 420 240" role="img" aria-label="Tanque de água com pressão crescendo com a profundidade">
        <Arrow id="ar-st" />
        <rect x="60" y="40" width="220" height="180" className="fill-water-soft stroke-line" />
        <line x1="60" y1="40" x2="280" y2="40" className="stroke-primary" strokeWidth="3" />
        <text x="170" y="30" textAnchor="middle" className="t-muted">superfície: p = patm (pman = 0)</text>
        {[
          { y: 100, h: '1 m', p: '≈ 10 kPa' },
          { y: 160, h: '2 m', p: '≈ 20 kPa' },
          { y: 210, h: '2,5 m', p: '≈ 25 kPa' },
        ].map((pt) => (
          <g key={pt.h}>
            <circle cx="120" cy={pt.y} r="5" className="fill-strong" />
            <circle cx="230" cy={pt.y} r="5" className="fill-strong" />
            <line x1="125" y1={pt.y} x2="225" y2={pt.y} className="stroke-line" strokeDasharray="3 4" />
            <text x="295" y={pt.y + 5} className="t-strong">h = {pt.h}: pman {pt.p}</text>
          </g>
        ))}
        <line x1="40" y1="40" x2="40" y2="210" className="stroke-accent" strokeWidth="2" markerEnd="url(#ar-st)" />
        <text x="30" y="130" textAnchor="end" className="t-accent">h</text>
      </svg>
    </Fig>
  );
}

// ---------- Manômetro interativo (Aula 5 – Ex. 1) ----------
const MANO_STEPS = [
  { title: 'Início no ponto 1', text: 'Começamos no ponto onde a pressão é desconhecida: p1 (interface ar–água no tanque).', eq: 'p1', p: 129646.9 },
  { title: 'Desce 0,1 m na água', text: 'Desceu ⇒ soma ρágua·g·h1 = 1000 × 9,81 × 0,1 = 981 Pa.', eq: 'p1 + ρágua·g·h1', p: 129646.9 + 981 },
  { title: 'Desce 0,2 m no óleo', text: 'Desceu ⇒ soma ρóleo·g·h2 = 850 × 9,81 × 0,2 = 1667,7 Pa.', eq: 'p1 + ρágua·g·h1 + ρóleo·g·h2', p: 129646.9 + 981 + 1667.7 },
  { title: 'Sobe 0,35 m no mercúrio', text: 'Subiu ⇒ subtrai ρHg·g·h3 = 13 600 × 9,81 × 0,35 = 46 695,6 Pa. Chegamos à superfície aberta.', eq: 'p1 + ρágua·g·h1 + ρóleo·g·h2 − ρHg·g·h3', p: 85600 },
  { title: 'Igualar à atmosfera e isolar p1', text: 'p1 + 981 + 1667,7 − 46 695,6 = 85 600 ⇒ p1 = 85 600 − 981 − 1667,7 + 46 695,6 = 129 646,9 Pa ≈ 129,6 kPa.', eq: 'p1 + ρágua·g·h1 + ρóleo·g·h2 − ρHg·g·h3 = patm', p: 85600 },
];

function Manometro() {
  const [step, setStep] = useState(0);
  const s = MANO_STEPS[step];
  const on = (k: number) => (step >= k ? 'seg-on' : 'seg-off');
  // coordenadas: ponto 1 em y=90; água até 130; óleo até 210; mercúrio sobe à direita até 70
  const marker = [
    { x: 165, y: 90 },
    { x: 165, y: 130 },
    { x: 165, y: 210 },
    { x: 315, y: 70 },
    { x: 315, y: 70 },
  ][step];
  return (
    <figure className="diagram diagram--interactive">
      <div className="mano">
        <svg viewBox="0 0 420 290" role="img" aria-label="Manômetro com água, óleo e mercúrio; o caminho vai do ponto 1 até a atmosfera">
          <Arrow id="ar-mn" />
          {/* tanque */}
          <rect x="60" y="30" width="150" height="90" className="fill-air stroke-line" />
          <text x="135" y="60" textAnchor="middle" className="t-muted">ar</text>
          <rect x="60" y="90" width="150" height="30" className={`fill-water ${on(1)}`} />
          {/* perna esquerda */}
          <rect x="150" y="120" width="30" height="10" className={`fill-water ${on(1)}`} />
          <rect x="150" y="130" width="30" height="80" className={`fill-oil ${on(2)}`} />
          <rect x="150" y="210" width="30" height="50" className={`fill-hg ${on(3)}`} />
          {/* fundo e perna direita */}
          <rect x="150" y="260" width="180" height="20" className={`fill-hg ${on(3)}`} />
          <rect x="300" y="70" width="30" height="190" className={`fill-hg ${on(3)}`} />
          <path d="M150 120 L150 280 L330 280 L330 30 M300 30 L300 260 L180 260 L180 120" className="stroke-line" fill="none" strokeWidth="2" />
          <text x="315" y="22" textAnchor="middle" className="t-strong">patm</text>
          {/* cotas */}
          <line x1="120" y1="90" x2="120" y2="130" className="stroke-accent" markerStart="url(#ar-mn)" markerEnd="url(#ar-mn)" />
          <text x="114" y="114" textAnchor="end" className="t-accent">h1</text>
          <line x1="120" y1="130" x2="120" y2="210" className="stroke-accent" markerStart="url(#ar-mn)" markerEnd="url(#ar-mn)" />
          <text x="114" y="174" textAnchor="end" className="t-accent">h2</text>
          <line x1="360" y1="70" x2="360" y2="210" className="stroke-accent" markerStart="url(#ar-mn)" markerEnd="url(#ar-mn)" />
          <text x="368" y="144" className="t-accent">h3</text>
          <line x1="180" y1="210" x2="360" y2="210" className="stroke-line" strokeDasharray="3 4" />
          <text x="200" y="85" className="t-strong">1</text>
          <circle cx="195" cy="90" r="4" className="fill-strong" />
          {/* legenda */}
          <g transform="translate(220,120)">
            <rect width="12" height="12" className="fill-water" />
            <text x="18" y="11" className="t-muted small-t">água</text>
            <rect y="18" width="12" height="12" className="fill-oil" />
            <text x="18" y="29" className="t-muted small-t">óleo</text>
            <rect y="36" width="12" height="12" className="fill-hg" />
            <text x="18" y="47" className="t-muted small-t">mercúrio</text>
          </g>
          <circle key={step} cx={marker.x} cy={marker.y} r="8" className="marker" />
        </svg>
        <div className="mano__panel">
          <p className="mano__step">
            Passo {step + 1} de {MANO_STEPS.length}: <strong>{s.title}</strong>
          </p>
          <p aria-live="polite">{s.text}</p>
          <p className="eq-line">{s.eq}</p>
          <p className="muted small">Pressão no ponto do marcador: {fmt(s.p, 7)} Pa</p>
          <div className="row">
            <button type="button" className="btn btn--ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              ← Voltar
            </button>
            <button type="button" className="btn" disabled={step === MANO_STEPS.length - 1} onClick={() => setStep(step + 1)}>
              Próximo trecho →
            </button>
          </div>
        </div>
      </div>
      <figcaption>Aula 5 – Exercício 1: caminhe do ponto 1 até a atmosfera. Desce soma; sobe subtrai; cada trecho com o ρ do seu fluido. (Esquema fora de escala.)</figcaption>
    </figure>
  );
}

function Metodo() {
  const steps = ['Dados', 'Converter p/ SI', 'Incógnita', 'Conceito', 'Equação', 'Substituição', 'Cálculo', 'Resultado + unidade', 'Interpretação'];
  return (
    <figure className="diagram">
      <ol className="method">
        {steps.map((s, i) => (
          <li key={s}>
            <span className="method__n">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <figcaption>O método de 9 passos do material.</figcaption>
    </figure>
  );
}

const MAP: Record<DiagramId, () => JSX.Element> = {
  massaPeso: MassaPeso,
  cilindro: Cilindro,
  sistemas: Sistemas,
  leiZero: LeiZero,
  pv: PV,
  transformacoes: Transformacoes,
  maquinaTermica: MaquinaTermica,
  cicloVapor: CicloVapor,
  viscosidade: Viscosidade,
  newtoniano: Newtoniano,
  stevin: Stevin,
  manometro: Manometro,
  metodo: Metodo,
};

export function Diagram({ id }: { id: DiagramId }) {
  const C = MAP[id];
  return <C />;
}
