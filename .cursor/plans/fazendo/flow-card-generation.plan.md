---
name: flow_card_generation
overview: Quando uma busca dentro de um projeto não retorna resultados, o sistema sugere criar um card de flow. O usuário clica e a IA busca nos blocos já importados do projeto (código completo), traça o caminho crítico seguindo referências reais e gera um card novo com screens por arquivo.
todos:
  - id: backend_endpoint
    content: Endpoint POST /api/projects/:id/cards/generate-flow — recebe searchTerm, orquestra as 2 fases, cria e retorna o card
    status: pending
  - id: pre_filter_and_ai_call
    content: "Pré-filtro server-side (grep no route/content pelo searchTerm) + chamada única ao Grok via llmClient.ts com: blocos filtrados (conteúdo completo) + lista de todos os routes (só paths)"
    status: pending
  - id: frontend_suggestion_card
    content: Componente CardSugeridoFlow — aparece no lugar da lista vazia quando busca no projeto não tem resultados
    status: pending
  - id: frontend_generation_state
    content: Estado de loading/erro durante geração — botão vira spinner "Analisando fluxo..." e trata erros
    status: pending
  - id: frontend_redirect
    content: Após geração bem-sucedida, redirecionar/abrir o card criado automaticamente
    status: pending
isProject: false
---

# Flow Card Generation

## Visão geral

Usuário busca "sync" dentro de um projeto. Se nenhum card existir com esse termo, aparece um card-sugestao no lugar da lista vazia. O usuário clica em "Criar card para 'sync'", a IA usa o código já importado no projeto (o import puxa todos os arquivos úteis do repo via `fileFilters.ts`) para traçar o caminho crítico seguindo referências reais — como um grep + leitura sequencial de arquivos.

Esse card gerado é igual a qualquer outro card do sistema — pode ser editado, ter o flow block gerado depois (feature separada).

---

## Fluxo completo

```
[Usuário digita "sync" na busca do projeto]
          │
          ▼
[Busca retorna zero resultados]
          │
          ▼
[CardSugeridoFlow aparece]
  "Nenhum card encontrado para 'sync'.
   Quer que a IA gere um card com o fluxo?"
   [Gerar card]
          │
          ▼
[POST /api/projects/:id/cards/generate-flow]
  body: { searchTerm: "sync" }
          │
          ▼
[Backend: busca todos os blocos do projeto]
          │
          ▼
[Pré-filtro server-side]
  grep no route/content pelo searchTerm
  → blocos com match: conteúdo completo
  → demais blocos: só lista de routes (sem conteúdo)
          │
          ▼
[Chamada única ao Claude]
  contexto: blocos filtrados + lista de routes disponíveis
  instrução: trace o flow "sync" do entry point até o banco
  → retorna: estrutura completa do card
          │
          ▼
[Backend cria o card via CardFeatureModel + associa ao projeto]
          │
          ▼
[Frontend abre o card criado]
```

---

## Passo a passo de implementação

### 1. Frontend — Componente CardSugeridoFlow

- Criar `frontend/components/CardSugeridoFlow.tsx`
- Exibir quando `results.length === 0` e `searchTerm !== ''` na lista do projeto
- Mostrar mensagem e botão "Gerar card para '${searchTerm}'"
- Ao clicar: chamar o endpoint, gerenciar estados idle / loading / erro

### 2. Frontend — Integração na lista do projeto

- Localizar onde a lista de cards do projeto é renderizada
- Adicionar condição: se busca ativa e sem resultados, renderizar `CardSugeridoFlow` passando o `searchTerm` e o `projectId`

### 3. Backend — Endpoint

- Criar método `generateFlowCard(projectId, searchTerm, userId)` no `CardFeatureController`
- Adicionar rota `POST /api/projects/:id/cards/generate-flow` em `cardFeatureRoutes.ts` com auth obrigatória

### 4. Backend — Pré-filtro e chamada única à IA

- Buscar todos os cards do projeto com seus blocos via `ProjectModel`
- Montar mapa completo `route → { content, language }` de todos os blocos
- Pré-filtro: separar blocos onde `route` ou `content` contém `searchTerm` (case-insensitive)
- Montar contexto para Claude: blocos filtrados com conteúdo completo + lista de todos os routes (só paths, sem conteúdo)
- Enviar para Grok via `llmClient.ts` (`callChatCompletions`) em uma única chamada
- Grok usa os blocos filtrados como entry points, consulta a lista de routes para seguir a cadeia e retorna o card

### 5. Backend — Criação do card

- Validar que a resposta tem `title` e ao menos uma screen com um bloco
- Criar o card via `CardFeatureModel.create()` com `card_type: 'codigos'`, `visibility: 'unlisted'`, `created_in_project_id`
- Associar ao projeto via `ProjectModel.addCard()`
- Retornar o card criado

### 6. Frontend — Redirect pós-geração

- Após resposta bem-sucedida do endpoint, abrir o card criado (modal ou navegação)
- O card deve aparecer na lista do projeto normalmente (refetch ou append no estado local)

---

## Backend

### Endpoint

```
POST /api/projects/:id/cards/generate-flow
Auth: obrigatória
Body: { searchTerm: string }
Response: CardFeatureResponse (o card criado)
```

**Arquivo:** novo método em `CardFeatureController` + rota em `cardFeatureRoutes.ts`

### Lógica

1. Buscar todos os cards do projeto com seus blocos via `ProjectModel`
2. Montar mapa `route → { content, language }` de todos os blocos
3. Pré-filtro server-side: separar blocos onde `route` ou `content` contém `searchTerm`
4. Chamar Grok via `llmClient.ts` com: blocos filtrados (conteúdo completo) + lista de todos os routes (só paths)
5. Grok identifica entry points nos blocos filtrados, segue a cadeia usando a lista de routes e retorna o card
6. Validar resposta, criar o card e associar ao projeto

### Prompt — Chamada única

```
Você é um especialista em arquitetura de software.

O usuário quer entender o flow de: "${searchTerm}"

## Arquivos com match direto (conteúdo completo)

Esses arquivos contêm referências diretas ao termo "${searchTerm}".
Use-os como ponto de entrada para traçar o flow.

[blocos filtrados: route + content + language]

## Todos os arquivos disponíveis no projeto (só paths)

Se o flow referenciar arquivos que não estão acima, consulte esta lista
para saber quais existem. Use os paths para nomear as screens mesmo sem o conteúdo.

[lista de routes]

## Instrução

Trace o caminho crítico de execução do flow "${searchTerm}":
1. Identifique o entry point (geralmente no frontend)
2. Siga as chamadas: componente → API call → rota → controller → service → model → query
3. Pare nas queries do banco — não inclua schema ou migrations
4. Para cada arquivo no caminho, extraia apenas os trechos diretamente envolvidos

Gere um card com uma screen por arquivo, ordenadas pela execução:
frontend → api → backend → database.

Retorne apenas JSON válido:
{
  "title": "string",
  "description": "string — o que esse flow faz em 1-2 frases",
  "tags": ["string"],
  "screens": [
    {
      "name": "string — nome do arquivo",
      "description": "string — papel no fluxo",
      "route": "string — path completo",
      "blocks": [
        {
          "id": "uuid",
          "type": "code",
          "title": "string — nome da função/método",
          "content": "string — trecho de código",
          "language": "string",
          "route": "string",
          "order": number
        }
      ]
    }
  ]
}
```

**Modelo:** Grok via `llmClient.ts` (já configurado — `GROK_API_KEY` + endpoint `x.ai`)

---

## Frontend

### CardSugeridoFlow

Componente novo exibido na lista do projeto quando `results.length === 0` e `searchTerm !== ''`.

```
┌─────────────────────────────────────────────┐
│  Nenhum card encontrado para "sync"         │
│                                             │
│  Quer que a IA gere um card com o fluxo?   │
│                                             │
│  [  Gerar card para "sync"  ]               │
└─────────────────────────────────────────────┘
```

Estados do botão:

- idle: "Gerar card para 'sync'"
- loading: "Analisando fluxo..." (spinner)
- erro: mensagem inline + botão "Tentar novamente"

**Arquivo:** `frontend/components/CardSugeridoFlow.tsx`

### Após geração

- Card criado → abrir modal de visualização do card (ou navegar para ele)
- Card aparece na lista do projeto normalmente

---

## O que muda vs o que não muda


|                            | Muda?                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| Estrutura de `CardFeature` | Nao — card gerado e identico a qualquer outro                       |
| Schema do banco            | Nao                                                                 |
| Fluxo de busca no projeto  | Sim — adicionar estado "zero resultados com searchTerm"             |
| `CardFeatureController`    | Sim — novo metodo `generateFlowCard`                                |
| Rotas backend              | Sim — nova rota no `cardFeatureRoutes.ts`                           |
| `ProjectModel`             | Nao — ja tem `addCard`                                              |
| Frontend lista do projeto  | Sim — renderizar `CardSugeridoFlow` quando vazio + searchTerm ativo |


---

## Dependencias

- Projeto precisa ter cards importados com blocos de codigo — sem eles, exibir mensagem: "Importe o repositorio primeiro para gerar flows automaticamente"
- Import ja puxa todos os arquivos uteis via `fileFilters.ts` (exclui node_modules, dist, lock files) — codigo completo disponivel nos blocos
- Nao usa GitHub API — tudo vem do banco local
- Feature de Flow Block (`flow-cardBlock.plan.md`) e independente — vira depois

