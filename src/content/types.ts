// Tipos do conteúdo didático. O conteúdo (aulas, questões, exercícios) é
// apenas dado; a interface o renderiza e as regras ficam em src/lib.

export type ModuleId = 'm0' | 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7';

export type Origin = 'material' | 'complemento' | 'misto';

export type CalloutKind = 'conceito' | 'analogia' | 'alerta' | 'dica' | 'exemplo' | 'fonte' | 'complemento' | 'erro';

export type DiagramId =
  | 'massaPeso'
  | 'cilindro'
  | 'sistemas'
  | 'leiZero'
  | 'pv'
  | 'transformacoes'
  | 'maquinaTermica'
  | 'cicloVapor'
  | 'viscosidade'
  | 'newtoniano'
  | 'stevin'
  | 'manometro'
  | 'metodo';

export interface SymbolDef {
  sym: string; // TeX
  name: string;
  unit: string;
}

export type Block =
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'formula'; tex: string; caption?: string; symbols?: SymbolDef[]; when?: string; origin?: string }
  | { t: 'callout'; kind: CalloutKind; title?: string; body: Block[] }
  | { t: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { t: 'worked'; title: string; statement: string; rows: { label: string; text: string }[]; source?: string }
  | { t: 'diagram'; id: DiagramId }
  | { t: 'exercise'; id: string }
  | { t: 'vf'; ids: string[] }
  | { t: 'calc'; id: string; label: string }
  | { t: 'link'; href: string; label: string; primary?: boolean }
  | { t: 'identify' }
  | { t: 'checklist' }
  | { t: 'pitfalls' };

export type SectionKind =
  | 'intro'
  | 'basics'
  | 'intuition'
  | 'technical'
  | 'visual'
  | 'formulas'
  | 'example'
  | 'practice'
  | 'check';

export interface Section {
  id: string;
  kind: SectionKind;
  title: string;
  origin: Origin;
  blocks: Block[];
  /** "Explique de outra forma": versão mais simples do conceito */
  simpler?: Block[];
}

export interface Module {
  id: ModuleId;
  num: number;
  title: string;
  short: string;
  description: string;
  source: string;
  minutes: number;
  sections: Section[];
  summary: { essentials: string[]; mistakes: string[] };
}

export type QuizLevel = 'iniciante' | 'intermediario' | 'avancado';

export interface Question {
  id: string;
  module: ModuleId;
  level: QuizLevel;
  topic: string;
  statement: string;
  answer: boolean;
  /** justificativa mostrada após a resposta */
  explanation: string;
  /** versão corrigida (obrigatória quando answer = false) */
  correction?: string;
  /** conceito a revisar quando o aluno erra */
  review: string;
  /** seção da aula relacionada */
  section?: string;
  /** questão adaptada do quiz do material */
  fromMaterial?: string;
}

export interface Exercise {
  id: string;
  module: ModuleId;
  section?: string;
  source: string;
  title: string;
  statement: string;
  given: string[];
  asked: string;
  concept: string;
  formulas: string[]; // TeX
  conversions: string[];
  substitution: string[];
  steps: string[];
  result: string;
  interpretation: string;
  mistakes: string[];
  hints: [string, string, string];
  answer?: { value: number; unit: string; label: string; units: string[]; relTol?: number };
  /** observação de auditoria (ex.: erro encontrado no caderno) */
  audit?: string;
}

export interface GlossaryTerm {
  term: string;
  def: string;
  module: ModuleId;
  symbol?: string;
}

export interface FormulaEntry {
  id: string;
  name: string;
  tex: string;
  module: ModuleId;
  vars: string;
  note: string;
  keywords: string;
  calc?: string;
}

export interface Pitfall {
  n: number;
  title: string;
  avoid: string;
  module: ModuleId;
}

export interface IdentifyItem {
  id: string;
  statement: string;
  block: 1 | 2 | 3 | 4 | 5;
  why: string;
}
