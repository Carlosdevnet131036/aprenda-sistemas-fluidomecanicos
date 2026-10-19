import type { Module } from '../types';
import { box, calc, diagram, exercise, formula, list, p, sym, table, vf, worked } from '../blocks';

export const m4: Module = {
  id: 'm4',
  num: 4,
  title: 'Propriedades dos fluidos e viscosidade',
  short: 'Viscosidade',
  description: 'Massa específica, densidade relativa, peso específico, viscosidade dinâmica e cinemática, tensão de cisalhamento e fluidos newtonianos.',
  source: 'Seção 5 do material (Aula 3 • Lista da Aula 03, Q4 a Q7 e Q10 • exercícios dos slides)',
  minutes: 45,
  sections: [
    {
      id: 'intro',
      kind: 'intro',
      title: 'O que você vai aprender',
      origin: 'complemento',
      blocks: [
        p('Para projetar um sistema hidráulico precisamos conhecer o fluido: quanto ele “pesa” por volume e quanto ele **resiste a escoar**. Mel e água têm comportamento muito diferente ao serem despejados — essa diferença se chama **viscosidade**.'),
        p('Você vai calcular as propriedades de óleos industriais (Lista da Aula 03, Q4 e Q5) e a força e a potência perdidas numa película de óleo (Q6 e Q7), além de classificar fluidos a partir de um ensaio (Q10).'),
      ],
    },
    {
      id: 'basicos',
      kind: 'basics',
      title: 'Palavras e símbolos deste módulo',
      origin: 'complemento',
      blocks: [
        table(['Termo', 'Significado'], [
          ['Adimensional', 'Grandeza sem unidade, resultado de dividir duas grandezas da mesma unidade (ex.: d = 0,87).'],
          ['Tensão de cisalhamento (τ, “tau”)', 'Força tangencial (paralela à superfície) dividida pela área. Unidade: Pa = N/m².'],
          ['Taxa de deformação (dv/dy)', 'Quão rápido a velocidade muda de uma camada de fluido para outra. Unidade: s⁻¹.'],
          ['Película', 'Camada fina de fluido entre duas superfícies, de espessura e.'],
          ['Viscosidade dinâmica (μ, “mi”)', 'Resistência do fluido ao deslizamento entre camadas. Unidade: Pa·s.'],
          ['Viscosidade cinemática (ν, “ni”)', 'Viscosidade dinâmica dividida pela massa específica. Unidade: m²/s.'],
        ]),
      ],
    },
    {
      id: 'propriedades',
      kind: 'technical',
      title: 'As 4 propriedades “estáticas”',
      origin: 'material',
      blocks: [
        table(
          ['Propriedade', 'Fórmula', 'Unidade', 'Água (referência)'],
          [
            ['Massa específica', 'ρ = m / V', 'kg/m³', '1000 kg/m³'],
            ['Densidade relativa', 'd = ρ / ρágua', 'adimensional', '1'],
            ['Peso específico', 'γ = ρ · g (= P/V)', 'N/m³', '10 000 N/m³ (g = 10) ou 9810 N/m³ (g = 9,81)'],
            ['Peso específico relativo', 'γr = γ / γágua', 'adimensional', '1'],
          ],
        ),
        formula(String.raw`\begin{gathered} \rho = \dfrac{m}{V} \qquad d = \dfrac{\rho}{\rho_{\text{água}}} \\ \gamma = \rho \cdot g \qquad \gamma_r = \dfrac{\gamma}{\gamma_{\text{água}}} \end{gathered}`, {
          caption: 'Propriedades dos fluidos',
          symbols: [
            sym(String.raw`\rho`, 'massa específica', 'kg/m³'),
            sym('d', 'densidade relativa', 'adimensional'),
            sym(String.raw`\gamma`, 'peso específico (gama)', 'N/m³'),
            sym(String.raw`\gamma_r`, 'peso específico relativo', 'adimensional'),
          ],
          when: 'ρ fala de massa por volume; γ fala de peso por volume. Use o g que a questão mandar (9,81 ou 10).',
        }),
        box('dica', 'd e γr dão o mesmo número (do material)',
          'O g se cancela: γr = (ρ·g)/(ρágua·g) = ρ/ρágua = d. Ex.: óleo com ρ = 870 kg/m³ ⇒ d = 0,87 e γr = 0,87. Mercúrio: d = 13,6.'),
        box('alerta', 'ρ não é P',
          'Massa específica é ρ (rô). P é pressão ou peso. Misturar os símbolos confunde o corretor e você mesmo.'),
        calc('propriedades', 'Testar no Laboratório: ρ, d, γ e γr'),
      ],
    },
    {
      id: 'viscosidade',
      kind: 'intuition',
      title: 'Viscosidade — o “atrito interno” do fluido',
      origin: 'material',
      blocks: [
        box('analogia', 'O baralho (do material)',
          'Imagine um baralho sobre a mesa: empurrando a carta de cima, cada carta arrasta a de baixo um pouco menos. Num fluido entre uma placa móvel (velocidade v) e uma fixa, a camada encostada na placa móvel anda a v e a encostada na fixa fica parada (princípio da aderência).'),
        diagram('viscosidade'),
        p('A viscosidade μ mede o quanto o fluido “resiste” a esse deslizamento entre camadas. Mel tem μ alto; água tem μ baixo.'),
      ],
      simpler: [
        p('Viscosidade é o quanto o fluido é “grosso”. Quanto mais viscoso, mais força é preciso para arrastar uma placa por cima dele.'),
      ],
    },
    {
      id: 'formulas-visc',
      kind: 'formulas',
      title: 'Fórmulas da viscosidade',
      origin: 'material',
      blocks: [
        formula(String.raw`\begin{gathered} \tau = \mu \cdot \dfrac{dv}{dy} \\ \text{perfil linear: } \dfrac{dv}{dy} = \dfrac{v}{e} \end{gathered}`, {
          caption: 'Lei de Newton da viscosidade',
          symbols: [
            sym(String.raw`\tau`, 'tensão de cisalhamento', 'Pa = N/m²'),
            sym(String.raw`\mu`, 'viscosidade dinâmica (absoluta)', 'Pa·s = N·s/m² = kg/(m·s)'),
            sym(String.raw`dv/dy = v/e`, 'taxa de deformação (gradiente de velocidade)', 's⁻¹'),
            sym('e', 'espessura da película (converter mm → m!)', 'm'),
          ],
          when: 'Película fina entre uma placa móvel e uma fixa, com perfil de velocidade linear, para fluido newtoniano.',
        }),
        formula(String.raw`\begin{gathered} F = \tau \cdot A \qquad \text{Pot} = F \cdot v \\ \nu = \dfrac{\mu}{\rho}\;\Longleftrightarrow\;\mu = \nu \cdot \rho \end{gathered}`, {
          caption: 'Força viscosa, potência dissipada e viscosidade cinemática',
          symbols: [
            sym('F', 'força viscosa (resistente ao movimento)', 'N'),
            sym('A', 'área de contato da placa', 'm²'),
            sym(String.raw`\text{Pot}`, 'potência dissipada', 'W'),
            sym(String.raw`\nu`, 'viscosidade cinemática', 'm²/s'),
          ],
          when: 'A velocidade constante, a força aplicada é igual à força viscosa. A potência vira calor no óleo.',
        }),
        box('alerta', 'μ × ν: não troque as unidades',
          'μ (dinâmica) em Pa·s; ν (cinemática) em m²/s. Uma alternativa com o valor certo e a unidade errada está errada.'),
        calc('cisalhamento', 'Testar no Laboratório: τ, F e potência'),
        calc('viscosidade', 'Testar no Laboratório: μ ↔ ν'),
      ],
    },
    {
      id: 'newtoniano',
      kind: 'technical',
      title: 'Newtoniano × não newtoniano',
      origin: 'material',
      blocks: [
        list([
          '**Newtoniano** (água, ar, óleos comuns): τ é diretamente proporcional a dv/dy ⇒ μ = τ/(dv/dy) é constante.',
          '**Não newtoniano** (amido de milho + água, polímeros, tintas): a razão τ/(dv/dy) muda.',
        ]),
        diagram('newtoniano'),
        box('dica', 'Como testar numa tabela',
          'Divida τ por dv/dy (ou F por v) em cada linha. Se der sempre o mesmo número ⇒ newtoniano, e esse número é μ. Atenção: “a tensão aumenta” não prova nada — o que importa é se a razão é constante.'),
        calc('newtoniano', 'Testar no Laboratório: classificar um fluido pelo ensaio'),
      ],
    },
    {
      id: 'exemplo',
      kind: 'example',
      title: 'Exemplo resolvido: placa sobre película de óleo',
      origin: 'material',
      blocks: [
        worked(
          'τ, F e potência',
          'Placa de 0,80 m² desliza a 0,50 m/s sobre película de óleo de 2,0 mm, μ = 0,10 Pa·s. Calcule τ, F e potência.',
          [
            ['Dados', 'A = 0,80 m²; v = 0,50 m/s; e = 2,0 mm; μ = 0,10 Pa·s'],
            ['Converter', 'e = 2,0 mm ÷ 1000 = 0,0020 m'],
            ['Equação', 'dv/dy = v/e;  τ = μ·v/e;  F = τ·A;  Pot = F·v'],
            ['Cálculo', 'dv/dy = 0,50/0,0020 = 250 s⁻¹ → τ = 0,10 × 250 = 25 Pa'],
            ['Cálculo', 'F = 25 × 0,80 = 20 N → Pot = 20 × 0,50 = 10 W'],
            ['Resultado', 'τ = 25 Pa; F = 20 N; Pot = 10 W'],
            ['Interpretação', 'Essa potência é perdida em calor no óleo: é por isso que mancais e guias esquentam.'],
          ],
          'Exemplo do Módulo 4 do material',
        ),
      ],
    },
    {
      id: 'pratica',
      kind: 'practice',
      title: 'Prática guiada — Lista da Aula 03 e slides',
      origin: 'material',
      blocks: [
        exercise('a3-q4'),
        exercise('a3-q5'),
        exercise('a3-q6'),
        exercise('a3-q7'),
        exercise('a3-q10'),
        exercise('s3-prop1'),
        exercise('s3-visc2'),
        exercise('s3-visc3'),
        exercise('s3-visc4'),
      ],
    },
    {
      id: 'verificacao',
      kind: 'check',
      title: 'Verificação de aprendizagem',
      origin: 'complemento',
      blocks: [vf('m4-02', 'm4-04', 'm4-06', 'm4-08', 'm4-10', 'm4-12', 'm4-15')],
    },
  ],
  summary: {
    essentials: [
      'ρ = m/V (kg/m³); d = ρ/ρágua (adimensional); γ = ρ·g (N/m³); γr = γ/γágua = d.',
      'τ = μ·v/e (Pa), com e em metros; F = τ·A (N); Pot = F·v (W).',
      'ν = μ/ρ (m²/s); μ = ν·ρ (Pa·s).',
      'Newtoniano: razão τ/(dv/dy) constante e igual a μ.',
    ],
    mistakes: [
      'Usar a espessura em mm na fórmula de τ.',
      'Trocar as unidades de μ (Pa·s) e ν (m²/s).',
      'Classificar como não newtoniano só porque “τ aumenta”.',
      'Confundir peso específico (N/m³) com massa específica (kg/m³).',
    ],
  },
};
