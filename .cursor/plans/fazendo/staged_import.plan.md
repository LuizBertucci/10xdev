---
name: staged_import
overview: Melhorar a importação de repositórios com streaming de cards em tempo real, modal de progresso rico, e capacidade de dar feedback por card para a IA buscar arquivos faltantes no repo.
todos:
  - id: modal_progresso
    content: Modal de progresso de importação com cards aparecendo em tempo real
    status: completed
  - id: streaming_cards
    content: Cards aparecem no projeto assim que cada um é construído pela IA
    status: completed
  - id: feedback_por_card
    content: Mecanismo de feedback por card que aciona IA para buscar arquivos faltantes
    status: pending
  - id: reimport_projeto_existente
    content: Trigger de nova importação em projeto já existente
    status: pending
  - id: relatorio_arquivos
    content: Visibilidade de arquivos incluídos vs ignorados no modal
    status: completed
isProject: false
---

# Import Melhorado: Stream + Feedback

## Visão geral

Três mudanças de paradigma em relação ao fluxo atual:

1. **Sem aprovação prévia** — cards são criados conforme a IA os gera, sem etapa de revisão antes de salvar. O controle vem depois, por feedback individual.
2. **Streaming** — primeiro card aparece assim que fica pronto, não precisa esperar o processo terminar.
3. **Feedback pós-import** — cada card tem um mecanismo para dizer o que está faltando; a IA vai no repo buscar e completa o card.

---

## Decisões fechadas

1. **"Melhorar card"** → atualiza o card existente, adicionando novas screens/arquivos ao final. O conteúdo já existente é preservado.
2. **Re-import com arquivo relacionado a card existente** → funde com o card existente, adicionando uma nova aba/screen ao final. Ex: novo `useAuth.ts` → nova screen "useAuth" adicionada ao card "Sistema de Autenticação" já existente.
3. **Modal com toggle** → abre como modal fixo, com botão para virar painel lateral. Detalhado na seção 1.

---

## Flow Completo (novo vs. antigo)

### Antes

```
Import → background silencioso → widget no canto
→ termina → todos os cards aparecem de vez
→ sem visibilidade, sem controle, sem feedback
```

### Depois

```
Import → modal abre com progresso em tempo real
       → cards aparecem conforme são gerados (stream)
       → arquivos ignorados visíveis no modal
       → modal pode ser fechado; import continua em bg
       → projeto ganha cards gradualmente

Pós-import → usuário revisa cards no projeto
           → card incompleto → "Melhorar card"
           → feedback em linguagem natural
           → IA busca no repo e completa o card

Re-import → botão no projeto existente
          → mesmo modal
          → só gera cards para o que ainda não está coberto
```

---

## 1. Modal de Progresso + Streaming (com toggle Painel Lateral)

Quando o usuário inicia uma importação (nova ou em projeto existente), um modal abre imediatamente. Cards aparecem um a um conforme a IA os gera — sem esperar o processo terminar.

**MODO MODAL (padrão)**

```
┌──────────────────────────────────────────────────────────┐
│  Importando: facebook/react          [⇥ Painel]  [✕]    │
│  ──────────────────────────────────────────────────────  │
│  ████████████████░░░░░░░░  68%                           │
│  "IA organizando cards por funcionalidade..."            │
│  52 arquivos · 4 cards criados                           │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  Cards criados                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ✓  Sistema de Autenticação                         │  │
│  │    Backend + Frontend · 8 arquivos                 │  │
│  │                                                    │  │
│  │ ✓  API de Projetos                                 │  │
│  │    Backend · 5 arquivos                            │  │
│  │                                                    │  │
│  │ ✓  Componentes UI                                  │  │
│  │    Frontend · 12 arquivos                          │  │
│  │                                                    │  │
│  │ ⟳  Gerando próximo card...                         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Arquivos ignorados: 143  ↓ (expansível)                 │
│  ──────────────────────────────────────────────────────  │
│                                        [Ver Projeto →]  │
└──────────────────────────────────────────────────────────┘
```

**MODO PAINEL LATERAL (após toggle `[⇥ Painel]`)**

```
┌────────────────────────────────────┬─────────────────────┐
│  PROJETO (visível e interativo)    │  [⇤ Modal]    [✕]   │
│                                    │ ─────────────────── │
│  Sistema de Autenticação    [⟳]   │ 68%  · 4 cards      │
│  API de Projetos            [⟳]   │ ─────────────────── │
│  Componentes UI             [⟳]   │ ✓  Autenticação     │
│                                    │     Back+Front · 8  │
│  ⟳ importando...                  │                     │
│                                    │ ✓  API de Projetos  │
│                                    │     Backend · 5     │
│                                    │                     │
│                                    │ ✓  Componentes UI   │
│                                    │     Frontend · 12   │
│                                    │                     │
│                                    │ ⟳  Gerando...       │
│                                    │ ─────────────────── │
│                                    │ ignorados: 143  ↓   │
└────────────────────────────────────┴─────────────────────┘
```

**Comportamento:**

- Abre automaticamente quando o import começa
- Cards aparecem um a um conforme ficam prontos (realtime via Supabase) — no modal e simultaneamente no projeto
- `[Ver Projeto →]` fecha o modal e navega pro projeto — import continua em background; o widget do canto inferior direito retoma
- `[✕]` no header faz o mesmo quando já está na página do projeto
- `[⇥ Painel]`: transforma em painel lateral fixo (~320px à direita) — projeto fica visível e interativo ao lado; o usuário pode abrir cards enquanto o import ainda rola
- `[⇤ Modal]`: volta ao modal centralizado
- Preferência (modal vs. painel) salva em `localStorage` — próxima importação já abre no modo preferido
- Seção "Arquivos ignorados" expansível em ambos os modos: mostra paths e motivo (diretório ignorado, extensão não suportada, arquivo de config)

**Streaming — flow de dados:**

```
IA analisa repo inteiro
    │
    └─► gera card 1 → salva no banco → realtime → aparece no modal/painel + no projeto
    └─► gera card 2 → salva no banco → realtime → aparece no modal/painel + no projeto
    └─► gera card N → ...
```

Cards no projeto aparecem com badge sutil "Importado agora" por alguns segundos. No modo painel lateral, essa sincronia fica completamente visível side-by-side.

### Arquivos ignorados (seção expansível)

Disponível em ambos os modos — modal e painel:

```
  Arquivos ignorados: 143  ↓
  ──────────────────────────────────────────
  Diretórios ignorados (89)
    node_modules/ · .git/ · dist/ · .next/

  Extensões não suportadas (31)
    .png · .jpg · .svg · .ico · .map

  Arquivos de configuração (23)
    package-lock.json · tailwind.config.ts · ...
```

Responde "por que meu arquivo X não foi importado?" sem precisar de uma UI separada.

### O que já foi feito (Etapa 1)

**Backend**

- `fileFilters.ts`: `classifyFile()` e `FileExclusionReason` para relatório de arquivos ignorados
- `ImportJobModel`: coluna `progress_log` (JSONB) para logs em streaming
- `ProjectController`: callback `onLog` em `generateCardGroupsFromRepo`, atualiza `progress_log` e `message` com token usage
- `aiCardGroupingService`: `extractJsonFromAiResponse` para tratar JSON inválido/truncado da IA; `max_tokens: 32768` para evitar truncamento
- `llmClient`: retorna `usage` (prompt_tokens, completion_tokens)

**Frontend**

- `ImportProgressModal.tsx`: modal com progress bar, cards em realtime agrupados por categoria, log colapsável, seção "Arquivos ignorados" (aberta por padrão), badge de tokens (prompt/saída formatados), toggle modal/painel lateral, botão "Ver Projeto"
- `ImportProgressWidget`: modo inline no header da página do projeto (à esquerda de Configurações); modo flutuante em outras páginas; exibe "Importação concluída" com "Ver detalhes" para reabrir o modal
- `layout.tsx`: ImportProgressModal + ImportProgressWidget; widget flutuante oculto na página do projeto
- `ProjectDetail.tsx`: widget inline quando há import ativa para o projeto
- `importJobUtils.ts`: tipo `ImportJob` com `progress_log` e `file_report_json`

### Lições aprendidas

1. **exactOptionalPropertyTypes (backend)**: não é possível passar `undefined` explicitamente para propriedades opcionais. Usar spread condicional: `...(valor && { prop: valor })`.
2. **Resposta da IA**: a IA pode retornar JSON inválido, truncado ou envolto em markdown. Usar `extractJsonFromAiResponse` para extrair JSON de blocos de código, texto extra ou entre chaves. Definir `max_tokens` alto (ex.: 32768) para evitar truncamento.
3. **App Router vs Pages**: rotas do dashboard usam `app/(dashboard)/layout.tsx`. O modal precisa estar nesse layout, não só em `pages/_app.tsx`, para aparecer em todas as rotas do dashboard.
4. **Re-sincronização após navegação**: `router.push` pode ocorrer antes do React aplicar o estado. Usar `useEffect` com `pathname` para re-sincronizar com `localStorage` quando a rota muda.
5. **Scroll do modal**: aplicar `overflow-y-auto` no conteúdo do modal inteiro, não em seções individuais, para evitar scroll aninhado e conteúdo cortado.

### Observações

#### CardQualitySupervisor — análise roda, correções desabilitadas

O supervisor tem duas fases:

1. `**analyzeQuality`** → **roda** — detecta cards duplicados/fragmentados e loga as sugestões
2. `**applyCorrections`** → **não é chamada** — substituída por hardcode `{ correctedCards: builtCards, mergesApplied: 0, cardsRemoved: 0 }`

Resultado: os logs mostram sugestões de merge (ex: 7 cards para merge em 17 gerados), mas nenhum merge é aplicado. Os cards criados são o resultado sem correções.

**Por que foi desabilitado** (`aiCardGroupingService.ts` linha ~192):

- `applyMerges()` remove cards do array, deslocando os índices. `removeCards()` usa os índices do relatório original — que já não batem após os merges. **Bug crítico.**
- `checkSubcategoryFragmentation` modifica o array de entrada in-place (`cards[targetIndex]!.title = ...`) em vez de trabalhar em cópia.

**Para reativar:** corrigir `applyCorrections` em `cardQualitySupervisor.ts` para trabalhar com snapshots de índice (ou IDs) em vez de índices mutáveis, e substituir o hardcode na linha ~192 por `CardQualitySupervisor.applyCorrections(builtCards, qualityReport, { onLog })`.

---

## 2. Feedback por Card (Melhoria Pós-Import)

Após o import, o usuário revisa os cards no projeto normalmente. Quando percebe que um card está incompleto (faltam arquivos, a descrição está errada, etc), pode dar feedback diretamente.

### UX do Feedback

Dentro de cada card (no contexto do projeto), um botão discreto:

```
┌────────────────────────────────────────────────┐
│  Sistema de Autenticação                       │
│  Backend + Frontend · 8 arquivos               │
│                                                 │
│  [Visão Geral]  [Login]  [Sessão]  ...         │
│                               [✦ Melhorar card] │
└────────────────────────────────────────────────┘
```

Clicando em "Melhorar card", abre um pequeno painel/modal:

```
┌────────────────────────────────────────────────┐
│  Melhorar: Sistema de Autenticação             │
│  ──────────────────────────────────────────    │
│  O que está faltando neste card?               │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Ex: "Faltam os arquivos de middleware   │  │
│  │  de auth e o hook useAuth do frontend"   │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  A IA vai buscar no repositório e completar    │
│  o card com os arquivos encontrados.           │
│                                                 │
│         [Cancelar]     [Melhorar com IA →]     │
└────────────────────────────────────────────────┘
```

**Flow depois do feedback:**

```
Usuário descreve o que falta
    │
    └─► Backend recebe feedback + card atual + URL do repo
    └─► IA analisa: "dado esse card e esse feedback, quais arquivos buscar?"
    └─► IA retorna lista de caminhos relevantes
    └─► Backend baixa esses arquivos do repo
    └─► IA gera as screens/blocos adicionais
    └─► Card é atualizado com o novo conteúdo
    └─► Realtime → usuário vê o card se expandindo
```

**O que a IA recebe no prompt de melhoria:**

- Título e descrição do card
- Screens e arquivos já mapeados
- Feedback do usuário em linguagem natural
- Estrutura de arquivos do repo (sem conteúdo — só os paths) para navegar

**Saída esperada da IA:**

- Lista de paths no repo que devem ser adicionados ao card
- Opcional: sugestão de reorganização das screens existentes

---

## 3. Re-import em Projeto Existente

Dois cenários:

### Cenário A: Repo evoluiu

O projeto foi importado há 1 mês. O repo ganhou novas features. O usuário quer adicionar cards para essas novidades.

**Trigger:** botão nas configurações do projeto (quando `repositoryUrl` existe).

**Flow:**

```
Usuário clica "Importar atualizações do GitHub"
    │
    └─► Modal de progresso abre
    └─► Backend extrai paths já cobertos pelos cards atuais (via code blocks)
    └─► IA recebe lista de arquivos do repo + lista de "já cobertos"
    └─► IA gera cards APENAS para o que ainda não está coberto
    └─► Cards novos aparecem no modal + no projeto em streaming
```

**Dedup:** a IA recebe no prompt: "esses arquivos já estão mapeados, foque no restante." Simples, sem lógica complexa de merge.

### Cenário B: Import falhou parcialmente

O import criou 3 cards de 10 esperados e parou por erro. O usuário quer completar.

**Flow:** mesmo botão, mesma lógica. O que já existe é ignorado, o que falta é gerado.