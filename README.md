# Aprenda Sistemas Fluidomecânicos

Plataforma de estudo para a A1, construída a partir de `Revisao_A1_Sistemas_Fluidomecanicos.pdf`.

## Como abrir

- **Sem instalar nada:** gere com `npm run build` e abra `dist/index.html` com dois cliques. É um arquivo único (≈ 2,3 MB), funciona offline e pode ser copiado para o celular.
- **GitHub Pages:** `npm run build:pages` gera `dist-pages/` com arquivos separados (≈ 260 kB compactados no primeiro acesso, e as fontes do KaTeX só são baixadas quando usadas). É o build que o workflow publica.
- **Desenvolvimento:** `npm install`, depois `npm run dev`.
- **Verificações:** `npm test` (190 testes: regras, conteúdo e telas), `npm run typecheck`, `npm run build`, `npm run build:pages`.

## O que tem

| Área | Conteúdo |
|---|---|
| Trilha | Módulos 0–7 em 10 etapas didáticas (introdução → resumo), com “Explique de outra forma” e o selo de origem de cada seção (material × complemento) |
| Painel | Próxima atividade recomendada, “continuar de onde parei”, aulas concluídas × domínio (acertos e questões dominadas), pontos fortes e fracos, visão por módulo e atividades recentes — só com dados reais |
| Plano | Data da prova + minutos por dia + módulos prioritários → cronograma diário (revisão, teoria, exercícios, simulados), previsto × realizado, sessões atrasadas e ajustes de hoje pelo desempenho |
| Revisões | Revisão espaçada (caixas de Leitner, intervalos configuráveis — padrão 1, 3, 7, 14, 30 dias), sessão rápida com autoavaliação fácil/média/difícil, assuntos com erros recorrentes e exercícios para refazer |
| Simulado | Prova com tempo, uma questão por vez, marcação para revisar, retomada após recarregar, entrega automática ao fim do tempo e revisão comentada; modo aprendizagem separado |
| Laboratório | 15 calculadoras (incluindo prensa hidráulica e cilindro hidráulico) + 2 laboratórios interativos, com fenômeno, condições de uso, conversões, passos, resultado, significado e alertas de valores suspeitos |
| Exercícios | 39 exercícios (Lista 01, Lista da Aula 03, Aula 5, slides) + 15 da lista de revisão, com 3 dicas progressivas, roteiro guiado em 9 passos, verificação de valor + sinal + unidade, comparação com o esperado, histórico de tentativas e filtros por módulo, assunto e situação |
| Quiz V/F | 111 afirmações em 3 níveis; modo aprendizagem e modo avaliação (sem correção até a entrega) |
| Consulta | Formulário pesquisável, glossário (52 termos), conversor de unidades, 12 pegadinhas, checklist da véspera |
| Meu estudo | Progresso por módulo, tentativas, revisão de erros, backup (exportar/importar JSON) e botão para apagar os dados |

## Dados salvos

Tudo fica no `localStorage` do navegador (chave `asf-progresso-v1`), sem cadastro nem internet. A estrutura é versionada (`version: 2`); dados da versão 1 são migrados automaticamente. Se o conteúdo salvo estiver ilegível, ele é copiado para `asf-progresso-corrompido` antes de recomeçar. Em **Meu estudo** é possível exportar um backup `.json` e importá-lo depois (o arquivo é validado e a importação pede confirmação). O simulado em andamento fica em `sessionStorage` para sobreviver a um recarregar.

## Arquitetura

- `src/content/` — dados didáticos (módulos, questões, exercícios, glossário). Nenhuma regra de correção aqui.
- `src/lib/` — regras puras e testadas: `physics.ts` (fórmulas), `units.ts`, `answerCheck.ts`, `quiz.ts`, `calculators.ts`, `progress.ts` (dados v2), `srs.ts` (revisão espaçada), `stats.ts` (indicadores), `plan.ts` (plano de estudos), `recommend.ts`, `exam.ts` (simulado), `backup.ts`.
- `src/components/`, `src/pages/` — interface (React + TypeScript, KaTeX para fórmulas).
- `src/test/` — testes de tela com Testing Library em jsdom (quiz, simulado, revisão, exercício, ampliar fórmula, navegação, painel e plano).

## Auditoria do material

Todos os resultados numéricos do PDF foram recalculados nos testes (`src/content/content.test.ts` e `src/lib/physics.test.ts`).

1. **Aula 5 – Ex. 1:** o caderno traz p1 = 124,6 kPa; o correto é **129,6 kPa** (o próprio PDF já aponta o erro de soma). O site usa 129,6 kPa.
2. **Aula 5 – Ex. 2:** o caderno copia “136 600” na substituição, mas o resultado (132 100 Pa) usa 136 000, que está correto. A figura original não está no PDF, então a geometria segue a descrição do material.
3. **Quiz Q3, alternativa C (188,5 kg):** a justificativa do PDF (“usou π·r·D”) não reproduz esse valor (π·r·D·h·ρ daria 565,5 kg). A questão virou V/F e essa justificativa não foi usada.
4. **1 cal = 4,18 J:** valor arredondado do material (referência usual: 4,186 J). Mantido, com nota.
5. **Lista Aula 03 – Q7:** F = 14,34 N (o PDF arredonda para 14,3 N). As duas formas são aceitas.
6. **Ciclo a vapor:** a tabela “bomba: compressão adiabática Tf → Tq” segue o modelo idealizado de Carnot da disciplina. Há uma nota avisando que, em centrais reais (ciclo Rankine), a bomba quase não altera a temperatura.
7. **Slides – Exemplo 2 (motor de 6 kW):** o PDF trata os 6 kW como calor recebido (Qq). O site segue essa leitura e deixa isso explícito.

As listas do PDF trazem só os dados de cada questão. Quando o enunciado precisou ser reescrito, o exercício indica “enunciado reconstruído a partir dos dados do material”.
