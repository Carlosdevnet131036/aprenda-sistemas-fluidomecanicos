import type { Module } from '../types';
import { box, calc, diagram, exercise, formula, list, p, sym, table, vf, worked } from '../blocks';

export const m3: Module = {
  id: 'm3',
  num: 3,
  title: '2ª Lei e ciclo de Carnot',
  short: 'Carnot',
  description: 'Direção espontânea do calor, Kelvin-Planck e Clausius, máquinas térmicas, rendimento, ciclo de Carnot e a conversão °C → K.',
  source: 'Seção 4 do material (Aula 3 • Lista da Aula 03, Q1, Q2, Q3, Q8, Q9 • Exemplos 1 a 3 dos slides)',
  minutes: 45,
  sections: [
    {
      id: 'intro',
      kind: 'intro',
      title: 'Por que existe uma 2ª Lei?',
      origin: 'material',
      blocks: [
        p('A 1ª Lei só diz que a energia se conserva. Ela **não proíbe** que um café frio esquente sozinho tirando calor do ar — as contas fechariam. Mas isso nunca acontece. A **2ª Lei** dá a direção: o calor flui espontaneamente do quente para o frio, nunca o contrário.'),
        p('A 2ª Lei também limita as máquinas: nenhum motor, por melhor que seja, transforma todo o calor em trabalho. Neste módulo você aprende a calcular esse limite (o rendimento de Carnot).'),
      ],
    },
    {
      id: 'basicos',
      kind: 'basics',
      title: 'Vocabulário essencial',
      origin: 'complemento',
      blocks: [
        table(['Termo', 'Significado'], [
          ['Reservatório térmico', 'Corpo tão grande que fornece ou recebe calor sem mudar de temperatura (a caldeira, um rio, a atmosfera).'],
          ['Ciclo', 'Sequência de processos que leva o fluido de volta ao estado inicial. Por isso, num ciclo, ΔU = 0.'],
          ['Máquina térmica', 'Dispositivo que opera em ciclo, recebe calor de uma fonte quente, produz trabalho e rejeita calor numa fonte fria.'],
          ['Qq e Qf', 'Calor recebido do reservatório quente (Qq) e calor rejeitado no frio (Qf). Ambos usados em módulo (positivos).'],
          ['Rendimento (η, “eta”)', 'Fração do calor recebido que vira trabalho. Adimensional; costuma ser dado em %.'],
          ['Processo reversível', 'Processo ideal, sem atrito nem perdas, que poderia ser desfeito sem deixar rastro.'],
          ['Kelvin (K)', 'Escala absoluta de temperatura: 0 K é o zero absoluto. T(K) = T(°C) + 273,15.'],
        ]),
      ],
    },
    {
      id: 'enunciados',
      kind: 'technical',
      title: 'Enunciados de Kelvin-Planck e Clausius',
      origin: 'material',
      blocks: [
        table(
          ['Enunciado', 'O que diz', 'Tradução'],
          [
            ['Kelvin-Planck', 'É impossível, num processo cíclico, converter TODO o calor absorvido em trabalho.', 'Nenhuma máquina térmica tem η = 100%. Sempre há Qf rejeitado.'],
            ['Clausius', 'É impossível um ciclo cujo único efeito seja passar calor do frio para o quente.', 'Geladeira precisa de trabalho externo (compressor).'],
          ],
        ),
        box('analogia', 'Analogia da cachoeira (complemento)',
          'Uma roda d’água só gira porque a água cai de um nível alto para um nível baixo — e a água sai por baixo, ela não some. Na máquina térmica, o calor “cai” do reservatório quente para o frio; no caminho, parte vira trabalho, mas o resto (Qf) obrigatoriamente chega embaixo.'),
      ],
      simpler: [
        p('Calor só desce do quente para o frio sozinho. Para fazer subir (geladeira) precisa gastar energia. E nenhum motor aproveita 100%: sempre sobra calor jogado fora.'),
      ],
    },
    {
      id: 'maquina',
      kind: 'formulas',
      title: 'Máquina térmica: balanço e rendimento',
      origin: 'material',
      blocks: [
        p('A máquina recebe Qq do reservatório quente → produz trabalho W → rejeita Qf para o reservatório frio. Como opera em ciclo, ΔU = 0, e a 1ª Lei vira um balanço simples:'),
        diagram('maquinaTermica'),
        formula(String.raw`W = Q_q - Q_f \qquad\qquad \eta = \dfrac{W}{Q_q} = 1 - \dfrac{Q_f}{Q_q}`, {
          caption: 'Balanço de energia e rendimento de uma máquina térmica',
          symbols: [
            sym('W', 'trabalho (ou potência) líquido produzido', 'J ou W'),
            sym('Q_q', 'calor recebido do reservatório quente', 'J ou W'),
            sym('Q_f', 'calor rejeitado ao reservatório frio', 'J ou W'),
            sym(String.raw`\eta`, 'rendimento', 'adimensional (×100 → %)'),
          ],
          when: 'Para qualquer máquina térmica em ciclo. As mesmas fórmulas valem com potências (kW, MW).',
        }),
        calc('rendimento', 'Testar no Laboratório: rendimento de máquina térmica'),
      ],
    },
    {
      id: 'carnot',
      kind: 'formulas',
      title: 'Rendimento de Carnot (máximo possível)',
      origin: 'material',
      blocks: [
        formula(String.raw`\eta_{\text{Carnot}} = 1 - \dfrac{T_f}{T_q} \qquad (T \text{ em KELVIN!})`, {
          caption: 'Rendimento máximo entre dois reservatórios',
          symbols: [sym('T_q', 'temperatura do reservatório quente', 'K'), sym('T_f', 'temperatura do reservatório frio', 'K')],
          when: 'Para o ciclo ideal (reversível) de Carnot, ou como limite máximo de qualquer máquina real entre as mesmas temperaturas.',
        }),
        formula(String.raw`T(\text{K}) = T(^{\circ}\text{C}) + 273{,}15`, { caption: 'Conversão obrigatória' }),
        box('complemento', 'Por que tem que ser em kelvin? (complemento)',
          'A fórmula usa uma **razão** Tf/Tq. Razões só fazem sentido numa escala que começa no zero verdadeiro: 0 K é a ausência total de agitação térmica. O zero da escala Celsius (gelo fundindo) é arbitrário. Exemplo: 20 °C não é “o dobro” de 10 °C, mas 600 K é de fato o dobro de 300 K.'),
        box('alerta', 'Teste do absurdo (do material)',
          'Entre 327 °C e 27 °C, usar °C daria 1 − 27/327 = 91,7%, um absurdo. Em kelvin dá ≈ 50%. Se o seu resultado de Carnot passar de 90% numa questão comum, desconfie de que usou °C.'),
        formula(String.raw`\eta_{\text{real}} = (\text{fração}) \cdot \eta_{\text{Carnot}} \qquad Q_q = \dfrac{W}{\eta_{\text{real}}} \qquad Q_f = Q_q - W`, {
          caption: 'Quando a eficiência real é uma fração da de Carnot',
          when: 'Lista Aula 03 – Q2 e Exemplo 1 dos slides.',
        }),
        calc('carnot', 'Testar no Laboratório: rendimento de Carnot com conversão °C → K'),
      ],
    },
    {
      id: 'teorema',
      kind: 'technical',
      title: 'Teorema de Carnot — 3 ideias que caem em objetiva',
      origin: 'material',
      blocks: [
        list([
          '1) Entre as mesmas duas temperaturas, nenhuma máquina real supera a de Carnot (reversível, sem atrito).',
          '2) A eficiência de Carnot depende só das temperaturas, não do fluido (água, gás, óleo…) nem da vazão.',
          '3) η = 100% exigiria Tf = 0 K (zero absoluto), que é inatingível ⇒ η < 100% sempre.',
        ], true),
        box('dica', 'Teste de viabilidade',
          'Se alguém propõe η maior que 1 − Tf/Tq, a máquina é impossível. Ex.: entre 900 K e 300 K o máximo é 66,7%; uma máquina de 75% é impossível.'),
      ],
    },
    {
      id: 'ciclo-vapor',
      kind: 'visual',
      title: 'Central a vapor: bomba, caldeira, turbina e condensador',
      origin: 'material',
      blocks: [
        diagram('cicloVapor'),
        table(
          ['Componente (ordem do ciclo)', 'Processo ideal (Carnot)', 'Energia principal'],
          [
            ['1. Bomba', 'Compressão adiabática (Tf → Tq)', 'RECEBE trabalho; eleva a pressão da água líquida'],
            ['2. Caldeira', 'Aquecimento isotérmico a Tq', 'RECEBE calor Qq (água → vapor)'],
            ['3. Turbina', 'Expansão adiabática (Tq → Tf)', 'PRODUZ trabalho de eixo W'],
            ['4. Condensador', 'Rejeição isotérmica de calor a Tf', 'REJEITA calor Qf (vapor → líquido)'],
          ],
        ),
        p('Por que a central não converte todo o calor em trabalho? Pelo enunciado de Kelvin-Planck, num ciclo é obrigatório rejeitar Qf a um reservatório frio (o condensador); η = 100% exigiria Tf = 0 K, inatingível.'),
        box('complemento', 'Nota sobre o modelo (complemento)',
          'A tabela segue o modelo idealizado de Carnot usado na disciplina. Em centrais reais (ciclo Rankine), a bomba comprime água líquida e quase não altera sua temperatura; o aquecimento até Tq acontece na caldeira. Para a prova, use o modelo do material.'),
      ],
      simpler: [
        p('Bomba empurra a água (gasta trabalho) → caldeira ferve (recebe calor) → turbina gira (produz trabalho) → condensador esfria o vapor (joga calor fora) → volta para a bomba.'),
      ],
    },
    {
      id: 'exemplo',
      kind: 'example',
      title: 'Exemplo resolvido — o roteiro padrão de Carnot',
      origin: 'material',
      blocks: [
        worked(
          'η, W e Qf de uma máquina de Carnot',
          'Uma máquina de Carnot opera entre 327 °C e 27 °C e recebe 10 kW do reservatório quente. Calcule η, W e Qf.',
          [
            ['Dados', 'Tq = 327 °C; Tf = 27 °C; Qq = 10 kW'],
            ['Converter', 'Tq = 327 + 273,15 = 600,15 K; Tf = 27 + 273,15 = 300,15 K'],
            ['Conceito', 'Ciclo reversível de Carnot: eficiência máxima, função só das temperaturas absolutas.'],
            ['Equação', 'η = 1 − Tf/Tq;  W = η·Qq;  Qf = Qq − W'],
            ['Cálculo', 'Tf/Tq = 300,15/600,15 = 0,5001 → η = 1 − 0,5001 = 0,4999 ≈ 0,50'],
            ['Cálculo', 'W = 0,50 × 10 = 5,0 kW → Qf = 10 − 5,0 = 5,0 kW'],
            ['Resultado', 'η ≈ 50%; W ≈ 5,0 kW; Qf ≈ 5,0 kW'],
            ['Interpretação', 'Mesmo idealmente, metade do calor é obrigatoriamente descartada no reservatório frio.'],
            ['Atenção', 'Com °C daria 1 − 27/327 = 91,7% — absurdo. Sempre kelvin!'],
          ],
          'Exemplo do Módulo 3 do material',
        ),
      ],
    },
    {
      id: 'pratica',
      kind: 'practice',
      title: 'Prática guiada — Lista da Aula 03 e slides',
      origin: 'material',
      blocks: [
        exercise('a3-q1'),
        exercise('a3-q2'),
        exercise('a3-q3'),
        exercise('a3-q8'),
        exercise('a3-q9'),
        exercise('s3-ex1'),
        exercise('s3-ex2'),
        exercise('s3-ex3'),
      ],
    },
    {
      id: 'verificacao',
      kind: 'check',
      title: 'Verificação de aprendizagem',
      origin: 'complemento',
      blocks: [vf('m3-02', 'm3-05', 'm3-07', 'm3-08', 'm3-09', 'm3-11', 'm3-15')],
    },
  ],
  summary: {
    essentials: [
      'Calor flui espontaneamente do quente para o frio (2ª Lei).',
      'Kelvin-Planck: nenhuma máquina tem η = 100%. Clausius: levar calor do frio ao quente exige trabalho.',
      'Máquina térmica: W = Qq − Qf; η = W/Qq = 1 − Qf/Qq.',
      'Carnot: η = 1 − Tf/Tq com T em kelvin; depende só das temperaturas.',
      'Nenhuma máquina real supera Carnot entre as mesmas temperaturas.',
      'Bomba recebe W → caldeira recebe Qq → turbina produz W → condensador rejeita Qf.',
    ],
    mistakes: [
      'Usar °C em η = 1 − Tf/Tq (dá eficiências absurdas, acima de 90%).',
      'Confundir o trabalho W com o calor rejeitado Qf.',
      'Achar que Carnot depende do fluido ou da vazão.',
      'Esquecer o “1 −” e responder Tf/Tq.',
      'Atribuir à caldeira a produção de trabalho.',
    ],
  },
};
