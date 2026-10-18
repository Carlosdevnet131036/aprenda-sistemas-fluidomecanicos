# Aprenda Sistemas Fluidomecânicos

Plataforma de estudo para a A1, construída a partir de `Revisao_A1_Sistemas_Fluidomecanicos.pdf`.

## Como abrir

- **Sem instalar nada:** abra `dist/index.html` com dois cliques. É um arquivo único (≈ 2 MB), funciona offline e pode ser copiado para o celular.
- **Desenvolvimento:** `npm install`, depois `npm run dev`.
- **Verificações:** `npm test` (135 testes), `npm run typecheck`, `npm run build`.

## O que tem

| Área | Conteúdo |
|---|---|
| Trilha | Módulos 0–7 em 10 etapas didáticas (introdução → resumo), com “Explique de outra forma” e o selo de origem de cada seção (material × complemento) |
| Laboratório | 14 calculadoras com conversões, substituição, passos, resultado, significado e alertas |
| Exercícios | 39 exercícios (Lista 01, Lista da Aula 03, Aula 5, slides) com 3 dicas progressivas e verificação de valor + sinal + unidade |
| Quiz V/F | 106 afirmações em 3 níveis; modo aprendizagem e modo avaliação (sem correção até a entrega) |
| Consulta | Formulário pesquisável, glossário (50 termos), conversor de unidades, 12 pegadinhas, checklist da véspera |
| Meu estudo | Progresso por módulo, tentativas, revisão de erros e botão para apagar os dados |

## Arquitetura

- `src/content/` — dados didáticos (módulos, questões, exercícios, glossário). Nenhuma regra de correção aqui.
- `src/lib/` — regras puras e testadas: `physics.ts` (fórmulas), `units.ts`, `answerCheck.ts`, `quiz.ts`, `calculators.ts`, `progress.ts`.
- `src/components/`, `src/pages/` — interface (React + TypeScript, KaTeX para fórmulas).

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
