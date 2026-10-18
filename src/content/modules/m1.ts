import type { Module } from '../types';
import { box, calc, diagram, exercise, formula, list, p, sym, table, vf, worked } from '../blocks';

export const m1: Module = {
  id: 'm1',
  num: 1,
  title: 'Grandezas físicas e unidades',
  short: 'Grandezas',
  description: 'Massa, peso, volume de cilindros e caixas, capacidade em litros, porcentagem de preenchimento e massa do fluido.',
  source: 'Seção 2 do material (Aulas 1 e 2 • Lista 01, Q1 e Q2 • Fixações da Aula 2)',
  minutes: 35,
  sections: [
    {
      id: 'intro',
      kind: 'intro',
      title: 'Por que começar pelas grandezas',
      origin: 'complemento',
      blocks: [
        p('Antes de falar de calor ou pressão, precisamos saber medir as coisas mais básicas: **quanto de matéria** existe (massa), **com que força** a gravidade puxa essa matéria (peso) e **quanto espaço** ela ocupa (volume).'),
        p('Na indústria isso responde perguntas como: quantos litros cabem no reservatório? Quanto pesa o óleo? A estrutura de apoio aguenta? Ao final deste módulo você resolve as Questões 1 e 2 da Lista 01 sozinho.'),
      ],
    },
    {
      id: 'basicos',
      kind: 'basics',
      title: 'Palavras e símbolos deste módulo',
      origin: 'misto',
      blocks: [
        table(
          ['Grandeza', 'Símbolo', 'Unidade SI', 'O que é'],
          [
            ['Massa', 'm', 'kg', 'Quantidade de matéria; mede a inércia (resistência a mudar o movimento). É escalar.'],
            ['Peso', 'P (ou W)', 'N (newton)', 'Força com que a gravidade puxa a massa. É vetor (tem direção: para baixo).'],
            ['Aceleração da gravidade', 'g', 'm/s²', 'Terra: 9,81 m/s² (às vezes a questão manda usar 10). Lua: 1,62 m/s².'],
            ['Volume', 'V', 'm³', 'Espaço ocupado. 1 m³ = 1000 L.'],
            ['Raio', 'r', 'm', 'Distância do centro à borda do círculo.'],
            ['Diâmetro', 'D', 'm', 'Largura total do círculo: D = 2·r, ou seja, r = D/2.'],
            ['Altura', 'h', 'm', 'Altura do cilindro ou da caixa.'],
            ['Massa específica', 'ρ (rô)', 'kg/m³', 'Massa de cada metro cúbico do material. Água: 1000 kg/m³.'],
          ],
        ),
        box('dica', 'Escalar × vetor',
          'Uma grandeza **escalar** fica completa só com número e unidade (50 kg). Uma grandeza **vetorial** precisa também de direção e sentido (81 N, vertical, para baixo). Massa é escalar; peso é vetor.'),
      ],
    },
    {
      id: 'massa-peso',
      kind: 'intuition',
      title: 'Massa × peso: a Terra e a Lua',
      origin: 'material',
      blocks: [
        box('analogia', 'Analogia do material',
          'A massa é “quanto de você existe”; o peso é “quanto a Terra (ou a Lua) puxa você”. Na Lua você continua do mesmo tamanho, mas é puxado cerca de 6 vezes menos.'),
        diagram('massaPeso'),
        p('Leve um motor de 50 kg para a Lua. Nenhum átomo foi retirado dele, então a massa continua 50 kg. Mas a Lua puxa mais fraco (g = 1,62 m/s² em vez de 9,81 m/s²), então o peso cai de 490,5 N para 81 N.'),
        box('conceito', 'Definição técnica',
          '**Massa (m)** é a quantidade de matéria e mede a inércia do corpo. É escalar, medida em kg, e **não muda** de lugar para lugar.',
          '**Peso (P)** é uma força: a atração gravitacional sobre essa massa. É vetor, medido em newtons (N), e **depende do g local**.'),
      ],
      simpler: [
        p('Massa é o “tanto de coisa”. Peso é o “puxão”. Mudar de planeta muda o puxão, não o tanto de coisa. Por isso massa é kg e peso é N.'),
      ],
    },
    {
      id: 'formula-peso',
      kind: 'formulas',
      title: 'Fórmula do peso',
      origin: 'material',
      blocks: [
        formula(String.raw`P = m \cdot g`, {
          caption: 'Peso = massa × aceleração da gravidade',
          symbols: [sym('P', 'peso (força)', 'N'), sym('m', 'massa', 'kg'), sym('g', 'aceleração da gravidade local', 'm/s²')],
          when: 'Sempre que a questão pedir a força com que um corpo é puxado pela gravidade. A massa deve estar em kg.',
        }),
        p('**De onde vem:** é a 2ª Lei de Newton (força = massa × aceleração) aplicada à aceleração da gravidade. Por isso a unidade é [kg]·[m/s²] = N.'),
        p('**Como interpretar:** 1,0 kg pesa 9,81 N na Terra e 1,62 N na Lua. Se um resultado de peso vier em kg, há erro de unidade.'),
        calc('peso', 'Testar no Laboratório: calculadora de peso'),
      ],
    },
    {
      id: 'volume',
      kind: 'technical',
      title: 'Volume: cilindros, caixas e porcentagem',
      origin: 'material',
      blocks: [
        p('Um cilindro (tanque, eixo) é como uma pilha de moedas iguais: a área de uma moeda (o círculo da base) vezes a altura da pilha dá o volume. A área do círculo é π·r².'),
        diagram('cilindro'),
        formula(String.raw`V = \pi \cdot r^2 \cdot h = \dfrac{\pi \cdot D^2}{4} \cdot h`, {
          caption: 'Volume do cilindro',
          symbols: [sym('V', 'volume', 'm³'), sym('r', 'raio = D/2', 'm'), sym('D', 'diâmetro', 'm'), sym('h', 'altura', 'm')],
          when: 'Tanques, reservatórios cilíndricos e eixos maciços. Use o RAIO na primeira forma; a segunda já usa o diâmetro e divide por 4.',
        }),
        box('alerta', 'Cuidado: raio, não diâmetro',
          'r = D/2. Usar D no lugar de r multiplica o volume por 4 (porque o raio aparece ao quadrado: (2r)² = 4r²).'),
        formula(String.raw`V = a \cdot b \cdot c`, {
          caption: 'Volume do paralelepípedo (caixa)',
          symbols: [sym('a', 'comprimento', 'm'), sym('b', 'largura', 'm'), sym('c', 'altura', 'm')],
          when: 'Reservatórios em forma de caixa. Converta cm → m ANTES de multiplicar.',
        }),
        formula(String.raw`V_{\text{útil}} = (\text{fração}) \cdot V_{\text{total}}`, {
          caption: 'Fração do volume preenchida',
          when: '“Enchido a 80%” → multiplicar por 0,80.',
        }),
        table(['De', 'Para', 'Faça'], [
          ['m³', 'L', '× 1000'],
          ['L ou dm³', 'm³', '÷ 1000'],
          ['cm', 'm', '÷ 100'],
          ['mm', 'm', '÷ 1000'],
        ], '1 m³ = 1000 L = 1000 dm³'),
        calc('volume', 'Testar no Laboratório: volume de cilindros e caixas'),
      ],
    },
    {
      id: 'densidade',
      kind: 'formulas',
      title: 'Massa específica: do volume para a massa',
      origin: 'material',
      blocks: [
        formula(String.raw`\rho = \dfrac{m}{V} \qquad\Longleftrightarrow\qquad m = \rho \cdot V`, {
          caption: 'Massa específica (densidade absoluta)',
          symbols: [sym(String.raw`\rho`, 'massa específica (rô)', 'kg/m³'), sym('m', 'massa', 'kg'), sym('V', 'volume', 'm³')],
          when: 'Para descobrir a massa de fluido que cabe em um volume conhecido (ou vice-versa).',
        }),
        p('**Intuição:** ρ diz quantos quilos tem cada metro cúbico. Água: 1000 kg/m³, então 1 litro de água tem 1 kg. Óleo de 850 kg/m³ é mais leve: 1 litro tem 0,85 kg.'),
        box('fonte', 'Por que dimensões INTERNAS e por que não encher 100%? (do material)',
          list([
            'O fluido ocupa o espaço de dentro; a espessura da parede não guarda fluido. Usar a medida externa superestima a capacidade.',
            'Deixa-se espaço livre (ex.: 75–80%) para dilatação térmica do óleo, movimento/espuma do fluido, retorno de óleo dos atuadores, separação de ar e para evitar transbordamento e pressurização do reservatório.',
          ]),
        ),
        calc('massa', 'Testar no Laboratório: massa a partir de ρ e V'),
      ],
    },
    {
      id: 'exemplo',
      kind: 'example',
      title: 'Exemplo resolvido: tanque de óleo a 70%',
      origin: 'material',
      blocks: [
        worked(
          'Massa de óleo em um tanque cilíndrico',
          'Tanque cilíndrico com D interno = 1,0 m e h = 2,0 m, enchido a 70% com óleo de ρ = 900 kg/m³. Qual a massa de óleo?',
          [
            ['Dados', 'D = 1,0 m → r = D/2 = 0,50 m; h = 2,0 m; fração = 70% = 0,70; ρ = 900 kg/m³ (tudo já no SI)'],
            ['Incógnita', 'm (massa de óleo)'],
            ['Conceito', 'Volume do cilindro pelo raio; só 70% está ocupado; massa = massa específica × volume ocupado.'],
            ['Equação', 'V = π·r²·h;  Vóleo = 0,70·V;  m = ρ·Vóleo'],
            ['Substituição', 'V = 3,1416 × (0,50)² × 2,0 = 3,1416 × 0,25 × 2,0'],
            ['Cálculo', 'V = 1,571 m³ → Vóleo = 0,70 × 1,571 = 1,100 m³ → m = 900 × 1,100 = 989,6 kg'],
            ['Resultado', 'm ≈ 990 kg (volume total = 1571 L; óleo = 1100 L)'],
            ['Interpretação', 'Quase 1 tonelada de óleo: a estrutura de apoio deve suportar P = m·g ≈ 989,6 × 9,81 ≈ 9,7 kN.'],
          ],
          'Exemplo do Módulo 1 do material (números diferentes da lista)',
        ),
      ],
    },
    {
      id: 'pratica',
      kind: 'practice',
      title: 'Prática guiada',
      origin: 'material',
      blocks: [exercise('l01-q1'), exercise('l01-q2'), exercise('a2-fix1'), exercise('a2-fix2'), exercise('a2-fix3')],
    },
    {
      id: 'verificacao',
      kind: 'check',
      title: 'Verificação de aprendizagem',
      origin: 'complemento',
      blocks: [vf('m1-01', 'm1-03', 'm1-05', 'm1-07', 'm1-10', 'm1-11')],
    },
  ],
  summary: {
    essentials: [
      'Massa (kg) é quantidade de matéria e não muda de lugar; peso (N) é força: P = m·g.',
      'Cilindro: V = π·r²·h com r = D/2 (ou π·D²·h/4). Caixa: V = a·b·c.',
      '1 m³ = 1000 L; 1 L = 1 dm³ = 0,001 m³.',
      'Volume ocupado = fração × volume total; massa = ρ × volume ocupado.',
      'Use dimensões internas; reservatórios não são enchidos a 100%.',
    ],
    mistakes: [
      'Dizer que a massa muda na Lua, ou dar peso em kg.',
      'Usar o diâmetro no lugar do raio (volume 4× maior).',
      'Multiplicar cm por 100 em vez de dividir.',
      'Esquecer de aplicar a porcentagem de preenchimento.',
    ],
  },
};
