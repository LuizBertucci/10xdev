---
name: ""
overview: ""
todos: []
isProject: false
---

# Feedbacks UI/UX

## Menu / Hero


| #   | Tema           | Feedback                                                                           | Status |
| --- | -------------- | ---------------------------------------------------------------------------------- | ------ |
| 1   | Objetivo       | Criar um HERO imponente que deixe extremamente claro para que a ferramenta é usada |        |
| 2   | Headline       | Deve ser forte e direta                                                            |        |
| 3   | Subtítulo      | Deve explicar rapidamente o valor do produto                                       |        |
| 4   | Visual         | Moderno e de alto impacto                                                          |        |
| 5   | Cards — Bordas | 0.5px                                                                              |        |
| 6   | Cards — Cantos | Levemente arredondados (curvatura sutil e moderna)                                 |        |


---

## Seção Códigos — CTA e Cards


| #   | Tema                   | Feedback                                                          | Status |
| --- | ---------------------- | ----------------------------------------------------------------- | ------ |
| 7   | CTA Principal          | Alterar para "Subir Código"                                       | ✅      |
| 8   | Card — Interação       | Remover clique expansivo no card inteiro                          |        |
| 9   | Card — Expansão        | Deve acontecer apenas ao clicar em "Ver mais"                     | ✅      |
| 10  | Card — Rodapé          | Adicionar seta para baixo com "Ver mais"                          | ✅      |
| 11  | Card — Botão Principal | Substituir seta por botão highlightado com texto "Acessar Código" |        |


---

## Seção Códigos — Estados de Acesso


| #   | Tema               | Feedback                                                     | Status |
| --- | ------------------ | ------------------------------------------------------------ | ------ |
| 12  | Botão — Não logado | Fica cinza com ícone de cadeado                              |        |
| 13  | Botão — Hover      | Exibe "Logue para ter acesso completo"                       |        |
| 14  | Página do Código   | Aba "Visão Geral" liberada; demais abas bloqueadas até login |        |


---

## Seção Códigos — Filtros e Navegação


| #   | Tema      | Feedback                                           | Status          |
| --- | --------- | -------------------------------------------------- | --------------- |
| 15  | Filtros   | Criar filtro interativo conectado às tags          | 🔄 Em andamento |
| 16  | Tags      | Clicáveis, influenciam dinamicamente os resultados | 🔄 Em andamento |
| 17  | Navegação | Renomear "Seu Espaço" para "Meus Códigos"          | ✅               |


---

## Tela de Tutoriais


| #   | Tema                | Feedback                                               | Status |
| --- | ------------------- | ------------------------------------------------------ | ------ |
| 18  | Newsletter — Visual | Aparência de newsletter editorial (inspiração: Nubank) |        |
| 19  | Newsletter — Tom    | Institucional/editorial, não apenas captura de e-mail  |        |
| 20  | Estrutura — Vídeo   | Vídeo deve ser maior e ter prioridade visual           |        |
| 21  | Estrutura — Código  | Área para colar código deve ficar abaixo do vídeo      |        |


---

## Clareza Conceitual


| #   | Tema        | Feedback                                                     | Status |
| --- | ----------- | ------------------------------------------------------------ | ------ |
| 22  | Definição   | Separar claramente o que é Código, Tutorial e Newsletter     |        |
| 23  | Arquitetura | Cada um deve ter função clara, sem sobreposição de propósito |        |


---

## Plano: Filtros Clicáveis + Tags Temáticas (itens 15 e 16)

### Decisão de arquitetura: filtro por autor

O campo `author` é computado no backend a partir de `userData.name` — não é armazenado na tabela. O banco guarda `created_by` (UUID). Portanto:

- Clicar no nome do autor filtra por `createdBy` UUID (já disponível em `snippet.createdBy`)
- Backend recebe param `created_by` e faz `.eq('created_by', value)`
- UI exibe o nome do autor como label no `ActiveFilters`, mas envia o UUID na query

---

### Fase 1 — Cliques nos badges existentes


| #    | O que                                                                           | Onde                                              | Status |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| 1.1  | Clicar em **Tech** → filtra                                                     | `CardFeatureCompact`                              |        |
| 1.2  | Clicar em **Linguagem** → filtra                                                | `CardFeatureCompact`                              |        |
| 1.3a | Estratégia autor: filtrar por `createdBy` UUID; label usa `snippet.author`      | Arquitetura (sem código extra)                    | ✅      |
| 1.3b | Estender tipos com `selectedLanguage` + `selectedAuthor` (UUID)                 | `types/api.ts`, `types/cardfeature.ts`            |        |
| 1.3c | Clicar em **Autor** → filtra por `createdBy`; backend aceita param `created_by` | `CardFeatureCompact` + `CardFeatureModel.findAll` |        |
| 1.4  | Criar componente `ActiveFilters`                                                | `components/ActiveFilters.tsx`                    |        |
| 1.5  | Integrar `ActiveFilters` no `Codes.tsx`                                         | `Codes.tsx`                                       |        |


### Fase 2 — Tags temáticas


| #   | O que                                                                        | Onde                               | Status |
| --- | ---------------------------------------------------------------------------- | ---------------------------------- | ------ |
| 2.1 | Input simples de tags no formulário: digitar + Enter adiciona chip removível | `CardFeatureForm`                  |        |
| 2.2 | Exibir tags nos cards                                                        | `CardFeatureCompact`               |        |
| 2.3 | Param `tag` no `FilterParams` + `QueryParams`                                | `types/api.ts`                     |        |
| 2.4 | Filtro por tag no backend                                                    | `CardFeatureModel.findAll`         |        |
| 2.5 | Estado `selectedTag` no hook (seguir padrão `selectedTech`)                  | `useCardFeatures`                  |        |
| 2.6 | Conectar tag clicável → filtro                                               | `CardFeatureCompact` + `Codes.tsx` |        |


### Fase 3 — Polimento

> Nota: filtros combinados (tech + language + author + tag) já funcionam simultaneamente se todos passarem no mesmo `QueryParams`. Item 3.1 é apenas validação manual.


| #   | O que                                                      | Onde        | Status |
| --- | ---------------------------------------------------------- | ----------- | ------ |
| 3.1 | Validar filtros combinados simultâneos (smoke test manual) | QA          |        |
| 3.2 | Painel de tags disponíveis                                 | `Codes.tsx` |        |
| 3.3 | Contagem por tag                                           | Backend     |        |


