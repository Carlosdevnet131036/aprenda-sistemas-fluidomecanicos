import type { Module } from '../types';
import { box, calc, diagram, exercise, formula, list, ol, p, sym, table, vf, worked } from '../blocks';

export const m5: Module = {
  id: 'm5',
  num: 5,
  title: 'Pressão, Lei de Stevin e manometria',
  short: 'Manometria',
  description: 'Conceito de pressão, pressão hidrostática, absoluta e manométrica, e como resolver manômetros de tubo em U passo a passo.',
  source: 'Seção 6 do material (Aula 5 • exercícios do caderno) + seção 12 (Exercícios da Aula 5)',
  minutes: 45,
  sections: [
    {
      id: 'intro',
      kind: 'intro',
      title: 'O que você vai aprender',
      origin: 'complemento',
      blocks: [
        p('Quem já mergulhou fundo numa piscina sentiu o ouvido “apertar”. Isso é a **pressão** aumentando com a profundidade. Neste módulo você aprende a calcular esse aumento (Lei de Stevin) e a usar essa ideia para ler **manômetros**, instrumentos que medem pressão comparando colunas de fluido.'),
      ],
    },
    {
      id: 'pressao',
      kind: 'basics',
      title: 'O que é pressão',
      origin: 'complemento',
      blocks: [
        p('Andar na neve com tênis afunda; com raquetes de neve, não. O peso é o mesmo, mas a raquete espalha a força numa área maior. **Pressão** é exatamente isso: quanta força age em cada metro quadrado.'),
        formula(String.raw`p = \dfrac{F}{A}`, {
          caption: 'Definição de pressão',
          symbols: [sym('p', 'pressão', 'Pa = N/m²'), sym('F', 'força perpendicular à superfície', 'N'), sym('A', 'área', 'm²')],
          when: 'Definição geral. Nos fluidos em repouso, a pressão age igualmente em todas as direções num mesmo ponto.',
        }),
        table(['Unidade', 'Equivale a'], [
          ['1 Pa (pascal)', '1 N/m²'],
          ['1 kPa', '1000 Pa'],
          ['1 atm (atmosfera padrão)', '101 325 Pa ≈ 101,3 kPa'],
        ]),
        box('conceito', 'Pressão atmosférica',
          'O ar acima de nós também tem peso e exerce pressão: a **pressão atmosférica** (patm). Ao nível do mar vale cerca de 101 kPa; em lugares altos é menor (no Exercício 1 da Aula 5, patm = 85,6 kPa).'),
      ],
    },
    {
      id: 'stevin',
      kind: 'formulas',
      title: 'Lei de Stevin: a pressão cresce com a profundidade',
      origin: 'material',
      blocks: [
        p('**De onde vem (complemento):** num ponto a uma profundidade h, o fluido acima forma uma coluna de peso ρ·g·(A·h). Dividindo pela área A da base, sobra ρ·g·h. Por isso a pressão aumenta exatamente ρ·g·h ao descer h metros.'),
        diagram('stevin'),
        formula(String.raw`p_{\text{fundo}} = p_{\text{topo}} + \rho \cdot g \cdot h = p_{\text{topo}} + \gamma \cdot h`, {
          caption: 'Lei de Stevin',
          symbols: [
            sym(String.raw`\rho`, 'massa específica do fluido', 'kg/m³'),
            sym('g', 'gravidade', 'm/s²'),
            sym('h', 'diferença de altura (profundidade)', 'm'),
            sym(String.raw`\gamma = \rho g`, 'peso específico', 'N/m³'),
          ],
          when: 'Fluido em repouso e contínuo (o mesmo fluido entre os dois pontos).',
        }),
        formula(String.raw`p_{\text{absoluta}} = p_{\text{atm}} + p_{\text{manométrica}}`, {
          caption: 'Pressão absoluta × manométrica',
          when: 'Manométrica é medida em relação à atmosfera; absoluta é medida em relação ao vácuo.',
        }),
        list([
          'Ao **descer** h metros dentro de um fluido, a pressão **aumenta** ρ·g·h. Ao **subir**, diminui.',
          'Dois pontos na **mesma altura**, no mesmo fluido contínuo e em repouso, têm a **mesma pressão**.',
          'Num reservatório aberto, a pressão manométrica a uma profundidade h é só γ·h; a absoluta soma patm.',
        ]),
        box('complemento', 'Manométrica negativa (complemento)',
          'Se a pressão absoluta for menor que a atmosférica, a manométrica fica negativa (vácuo parcial). A absoluta, porém, nunca é negativa.'),
        calc('stevin', 'Testar no Laboratório: pressão hidrostática'),
      ],
      simpler: [
        p('Cada metro de água acima de você soma cerca de 10 kPa de pressão (γ ≈ 10 000 N/m³). Desceu, aumentou; subiu, diminuiu.'),
      ],
    },
    {
      id: 'receita',
      kind: 'technical',
      title: 'Receita da manometria (“caminhar pelo tubo”)',
      origin: 'material',
      blocks: [
        ol([
          'Comece no ponto onde a pressão é desconhecida (ex.: p1 ou pA).',
          'Caminhe pelo tubo, fluido por fluido. **Desceu ⇒ soma** ρ·g·h daquele fluido. **Subiu ⇒ subtrai** ρ·g·h.',
          'Termine no ponto conhecido (patm ou pB) e escreva a igualdade.',
          'Use em cada trecho a densidade (ou γ) do fluido que está **naquele trecho**.',
          'Se a questão der γ (N/m³), use direto γ·h; se der ρ (kg/m³), use ρ·g·h.',
        ]),
        p('Acompanhe abaixo o manômetro da Aula 5 (tanque → água desce h1 → óleo desce h2 → mercúrio sobe h3 → atmosfera). Use os botões para caminhar trecho por trecho e veja cada parcela entrando na equação.'),
        diagram('manometro'),
        formula(String.raw`p_1 + \rho_{\text{água}}\, g\, h_1 + \rho_{\text{óleo}}\, g\, h_2 - \rho_{\text{Hg}}\, g\, h_3 = p_{\text{atm}}`, {
          caption: 'Equação do manômetro do Exercício 1 da Aula 5',
        }),
        calc('manometro', 'Montar seu próprio caminho no Laboratório'),
      ],
      simpler: [
        p('É como descer e subir escadas carregando uma mochila: a cada lance para baixo, a mochila (pressão) fica mais pesada; para cima, mais leve. O peso de cada lance depende do fluido daquele trecho.'),
      ],
    },
    {
      id: 'exemplo',
      kind: 'example',
      title: 'Exemplo resolvido: manômetro de vários fluidos',
      origin: 'material',
      blocks: [
        worked(
          'Pressão do ar no tanque (Çengel, Ex. 3-3)',
          'Tanque com ar pressurizado sobre água; patm = 85,6 kPa; h1 = 0,1 m (água), h2 = 0,2 m (óleo), h3 = 0,35 m (mercúrio); ρ = 1000, 850 e 13 600 kg/m³. Determine p1.',
          [
            ['Conceito', 'Stevin: caminhar do ponto 1 até a atmosfera. Desce na água (+), desce no óleo (+), sobe no mercúrio (−).'],
            ['Equação', 'p1 + ρa·g·h1 + ρo·g·h2 − ρHg·g·h3 = patm  ⇒  p1 = patm − ρa·g·h1 − ρo·g·h2 + ρHg·g·h3'],
            ['Cálculo', 'ρa·g·h1 = 1000 × 9,81 × 0,1 = 981 Pa'],
            ['Cálculo', 'ρo·g·h2 = 850 × 9,81 × 0,2 = 1667,7 Pa'],
            ['Cálculo', 'ρHg·g·h3 = 13 600 × 9,81 × 0,35 = 46 695,6 Pa'],
            ['Cálculo', 'p1 = 85 600 − 981 − 1667,7 + 46 695,6 = 129 646,9 Pa'],
            ['Resultado', 'p1 ≈ 129,6 kPa ≈ 130 kPa (valor do livro: 130 kPa)'],
            ['Interpretação', 'p1 > patm: o ar do tanque está pressurizado (≈ 44 kPa manométricos).'],
            ['Atenção', 'No caderno da aula está escrito 124,6 kPa: a equação e as parcelas estão certas, mas a soma final está errada. O valor correto é 129,6 kPa (conferido aqui).'],
          ],
          'Exercício 1 da Aula 5 (seção 12 do material)',
        ),
      ],
    },
    {
      id: 'pratica',
      kind: 'practice',
      title: 'Prática guiada',
      origin: 'material',
      blocks: [exercise('m5-reservatorio'), exercise('m5-tubo-u'), exercise('a5-ex1'), exercise('a5-ex2')],
    },
    {
      id: 'verificacao',
      kind: 'check',
      title: 'Verificação de aprendizagem',
      origin: 'complemento',
      blocks: [vf('m5-02', 'm5-04', 'm5-05', 'm5-06', 'm5-09', 'm5-10', 'm5-12')],
    },
  ],
  summary: {
    essentials: [
      'Pressão = força/área; 1 Pa = 1 N/m²; 1 kPa = 1000 Pa.',
      'Stevin: p2 = p1 + ρ·g·h = p1 + γ·h.',
      'pabs = patm + pman.',
      'Mesma altura, mesmo fluido contínuo em repouso ⇒ mesma pressão.',
      'Manômetro: comece no ponto desconhecido; desce soma, sobe subtrai; use o ρ de cada trecho.',
    ],
    mistakes: [
      'Inverter os sinais (somar ao subir).',
      'Usar a densidade do mercúrio em todos os trechos.',
      'Multiplicar γ por g de novo.',
      'Confundir pressão manométrica com absoluta.',
      'Errar a soma final (como no caderno: 124,6 em vez de 129,6 kPa).',
    ],
  },
};
