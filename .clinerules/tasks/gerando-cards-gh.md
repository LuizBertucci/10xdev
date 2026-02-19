# Task: Melhoria do Processo de Geração de Cards via GitHub Import

**Status**: 🔄 Em Planejamento  
**Prioridade**: 🔴 Alta  
**Branch Base**: `improve/import`

---

## Contexto

O sistema atual de importação do GitHub está fundindo incorretamente cards de "Importação" e "Agrupamento" em um único card quando deveriam ser features distintas. O CodeRabbit AI propôs uma arquitetura estrutural mais robusta (Issue #90), mas para o momento precisamos de uma solução pragmática que resolve o problema imediato.

**Problema**: Cards como "Importação GitHub" e "Agrupamento IA" não estão sendo separados individualmente, mesmo sendo features próprias e diferentes.

**⚠️ IMPORTANTE - Regra de Negócio**: 
- **TODAS as funcionalidades** do sistema devem virar cards, sem exceção
- **Importação GitHub** = funcionalidade completa → **card próprio** ✅
- **Agrupamento IA** = funcionalidade completa → **card próprio** ✅  
- **NÃO existem "jobs" vs "features"** - se tem código, tem funcionalidade, vira card
- O problema é a **fusão incorreta**, não a criação de cards para infraestrutura

---

## 🎯 Objetivo

Implementar uma solução multi-camada que garanta:
1. **Todas as funcionalidades** sejam extraídas como cards independentes
2. **Features distintas** (como Importação vs Agrupamento) sejam **separadas** corretamente
3. **Nenhuma fusão incorreta** de funcionalidades diferentes no mesmo card

---

## 🛠️ Fase 1: Solução Imediata (Multi-Camada) - PRIORITÁRIO

### **Camada A: Detecção de Intent Pré-Consolidação**
**Arquivo**: `backend/src/services/githubService.ts`

- [ ] **1.1** Adicionar constante `INTENT_KEYWORDS` com mapeamento de palavras-chave por família:
  - `github_import`: import, github, sync, tarball, octokit, webhook, clone, repository, download
  - `ai_grouping`: group, agrup, macro_category, cluster, aiCardGrouping, consolidate, categorize
  - Note: São features COMPLETAS do sistema, não apenas "jobs" de infraestrutura

- [ ] **1.2** Criar função `detectIntent(files: string[]): string[]` que analisa paths e retorna intents detectados

- [ ] **1.3** Criar função `splitByIntent(groupedFiles: Map<string, string[]>): Map<string, string[]>` que:
  - Recebe arquivos agrupados por feature
  - Detecta múltiplos intents no mesmo grupo
  - Separa em chaves distintas usando prefixo: `import::featureName`, `group::featureName`

- [ ] **1.4** Modificar `consolidateFeatures()` para executar `splitByIntent()` ANTES da consolidação

---

### **Camada B: Refinamento do FEATURE_SEMANTIC_MAP**
**Arquivo**: `backend/src/services/githubService.ts`

- [ ] **2.1** Criar buckets MUTUAMENTE EXCLUSIVOS para:
  - `IMPORTATION`: keywords relacionadas a GitHub, sync, webhooks, importação
  - `GROUPING`: keywords relacionadas a agrupamento, clustering, categorização

- [ ] **2.2** Remover overlap atual onde 'import' e 'group' caem no mesmo bucket

- [ ] **2.3** Adicionar validação que lança warning se um arquivo é mapeado para múltiplos buckets

---

### **Camada C: Instruções Explícitas na IA**
**Arquivo**: `backend/src/services/aiCardGroupingService.ts`

- [ ] **3.1** Criar tipo `SplitHint`:
  ```typescript
  type SplitHint = {
    featureName: string
    mustSplit: boolean
    reasons: string[]
    suggestedNames: string[]
  }
  ```

- [ ] **3.2** Modificar `refineGrouping()` para aceitar `splitHints: SplitHint[]` como parâmetro

- [ ] **3.3** Atualizar o prompt da IA com regras explícitas:
  ```
  REGRAS DE SEPARAÇÃO (OBRIGATÓRIAS):
  - NUNCA misture Importação e Agrupamento no mesmo card
  - Importação: arquivos relacionados a GitHub, sync, webhooks, octokit
  - Agrupamento: arquivos relacionados a clustering, categorização, AI grouping
  - Se um card tem screens de ambos, DIVIDA imediatamente
  ```

- [ ] **3.4** Passar `splitHints` detectados na Camada A para o serviço de IA

---

### **Camada D: Validação Pós-IA**
**Arquivo**: `backend/src/services/aiCardGroupingService.ts`

- [ ] **4.1** Criar função `splitMixedCards(aiResult: any, hints: SplitHint[]): any`:
  - Inspeciona cada card retornado pela IA
  - Detecta cards que misturam intents (por análise de keywords nos nomes das screens)
  - Divide cards misturados em múltiplos cards
  - Redistribui screens baseado no intent predominante de cada arquivo

- [ ] **4.2** Aplicar `splitMixedCards()` no resultado da IA antes de retornar

- [ ] **4.3** Adicionar logging detalhado para cards que foram divididos

---

### **Camada E: Configuração Global**
**Arquivo**: `backend/src/services/githubService.ts`

- [ ] **5.1** Adicionar flag `options.strictFeatureSeparation` (default: `true` quando `useAi=true`)

- [ ] **5.2** Quando `strictFeatureSeparation=true`, habilitar todas as camadas A-D

- [ ] **5.3** Adicionar métricas de separação no log de importação:
  - Número de features originais
  - Número de features após separação
  - Lista de features que foram divididas

---

## 🧪 Fase 2: Testes e Validação

- [ ] **6.1** Criar testes unitários para `detectIntent()`:
  - Testar detecção de importação em paths típicos
  - Testar detecção de agrupamento
  - Testar arquivos com múltiplos intents

- [ ] **6.2** Criar testes de integração:
  - Importar o próprio repositório 10xdev
  - Verificar que "Importação GitHub" e "Agrupamento IA" são cards separados
  - Verificar que cada card tem screens coesas

- [ ] **6.3** Testes de regressão:
  - Garantir que outras features não sejam afetadas negativamente
  - Verificar performance (não aumentar tempo de importação >20%)

---

## 📊 Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Cards com intents misturados | >30% | <5% |
| Features bem definidas (coesão) | ~60% | >85% |
| Tempo de importação | baseline | +0-20% |
| Precisão de agrupamento | ~70% | >90% |

---

## 🚨 Invariantes (Regras Que Nunca Devem Ser Quebradas)

1. **TODAS as funcionalidades viram cards** - não existe distinção "job vs feature"
2. **Importação e Agrupamento NUNCA no mesmo card** (são features diferentes)
3. **Cada card deve ter pelo menos 2 arquivos** (evita singletons)
4. **Cada card deve ter coesão semântica** (todos os arquivos relacionados ao mesmo domínio)
5. **Um arquivo não pode pertencer a múltiplos cards** (mutuamente exclusivo)

---

## 🔍 Arquivos a Modificar

```
backend/src/
├── services/
│   ├── githubService.ts           [MAJOR] - Camadas A, B, E
│   └── aiCardGroupingService.ts   [MAJOR] - Camadas C, D
├── types/
│   └── github.ts                  [MINOR] - Adicionar SplitHint type
└── tests/
    └── githubService.test.ts      [NEW]   - Testes da Fase 2
```

---

## 🎯 Checklist de Implementação

- [ ] **Dia 1**: Implementar Camada A (detectIntent + splitByIntent)
- [ ] **Dia 1**: Implementar Camada B (FEATURE_SEMANTIC_MAP refatorado)
- [ ] **Dia 2**: Implementar Camada C (prompt atualizado + SplitHint)
- [ ] **Dia 2**: Implementar Camada D (splitMixedCards)
- [ ] **Dia 3**: Implementar Camada E (flag strictFeatureSeparation)
- [ ] **Dia 3**: Testes unitários
- [ ] **Dia 4**: Testes de integração com 10xdev
- [ ] **Dia 4**: Documentação e ajustes finais

---

## 🚀 Abordagem Alternativa: Solução Baseada em Prompt (Recomendada)

**Status**: 🔄 Proposta para teste  
**Abordagem**: Delegar toda a separação e análise para a IA via prompt estruturado  
**Vantagem**: Implementação rápida, flexível, menos código para manter

### 📋 Prompt Mestre para Extração de Features

Use este prompt no serviço `AiCardGroupingService` para substituir as Camadas A-E:

```
Você é um engenheiro de software sênio especializado em análise de arquitetura de código.
Sua tarefa é analisar um repositório de código e extrair TODAS as funcionalidades (features) 
como cards independentes.

## 📁 DADOS DE ENTRADA

1. Lista de arquivos do repositório:
   - Cada arquivo com: path, conteúdo (primeiras 50 linhas), linguagem, tamanho
   - Estrutura de diretórios completa
   - package.json / dependências (se houver)

2. Metadados:
   - Tipo de projeto (frontend, backend, fullstack, mobile, etc.)
   - Frameworks detectados (React, Express, Django, etc.)
   - Linguagens principais

## 🎯 OBJETIVO PRINCIPAL

Criar cards que representem funcionalidades COMPLETAS do sistema.
Cada card deve representar uma feature que:
- Tem propósito de negócio definido
- É independente e autossuficiente
- Pode ser entendida sem contexto de outras features

## ⚠️ REGRAS CRÍTICAS (NUNCA QUEBRAR)

### Regra 1: TODAS as funcionalidades viram cards
- Se um conjunto de arquivos implementa uma funcionalidade → vira card
- NÃO filtre por "infraestrutura" vs "negócio"
- GitHub Import = card ✓ | AI Grouping = card ✓ | Auth = card ✓

### Regra 2: SEPARE funcionalidades distintas
- Analise os arquivos e identifique domínios diferentes
- CADA domínio diferente = card diferente
- Exemplos de SEPARAÇÃO OBRIGATÓRIA:
  * GitHub Import (download, sync, webhooks) ≠ AI Grouping (clustering, categorização)
  * Autenticação (login, registro) ≠ Dashboard (visualização)
  * User Management ≠ Order Processing
  * Payment ≠ Notification

### Regra 3: JUNTE arquivos relacionados
- Se arquivos compartilham: propósito, dados, fluxo de execução → mesmo card
- Frontend + Backend da mesma feature = mesmo card (diferentes screens)
- Controller + Service + Model da mesma feature = mesmo card

### Regra 4: Análise estrutural (aprendizado do CodeRabbit)
Ao invés de apenas keywords, analise:

a) **Dependências entre arquivos**:
   - Arquivo A importa arquivo B → provavelmente mesma feature
   - Arquivo A chama funções de arquivo B → mesma feature
   - Arquivo A exporta classe usada por B → mesma feature

b) **Padrões de co-mudança**:
   - Arquivos que tipicamente são modificados juntos → mesma feature
   - Controller + Service + Test → mesma feature

c) **Camadas arquiteturais**:
   - Uma feature completa tem representação em múltiplas camadas
   - Exemplo: Auth = LoginPage (UI) + AuthController (API) + UserModel (Data)
   - Se falta uma camada, pode ser uma feature incompleta

d) **Domínio semântico**:
   - Analise nomes de classes, funções, variáveis
   - Palavras-chave do domínio (user, order, payment, notification)
   - Consistência de vocabulário dentro da feature

### Regra 5: Boundaries naturais
- Respeite boundaries existentes: namespaces, módulos, pacotes
- Não crie cards que misturem múltiplos domínios de negócio
- Um card deve ter uma "história" coerente

## 📊 ESTRUTURA DE SAÍDA (COMPATÍVEL COM SCHEMA)

**⚠️ IMPORTANTE**: Use exatamente esta estrutura JSON para compatibilidade com o sistema:

```json
{
  "cards": [
    {
      "title": "Nome Descritivo da Feature",
      "description": "Propósito e responsabilidade desta funcionalidade em 2-3 frases",
      "category": "Feature",
      "tech": "React, Node.js",
      "language": "typescript",
      "macroCategory": "CRUD|AUTH|INTEGRATION|WORKFLOW|INFRASTRUCTURE|UI|UTILITY",
      "tags": ["auth", "jwt", "login"],
      "screens": [
        {
          "name": "Backend - Controllers",
          "description": "Camada de controle da feature",
          "files": ["src/controllers/authController.ts"]
        },
        {
          "name": "Backend - Services", 
          "description": "Camada de serviço/business logic",
          "files": ["src/services/authService.ts"]
        },
        {
          "name": "Frontend - Components",
          "description": "UI components da feature", 
          "files": ["src/components/LoginForm.tsx"]
        }
      ]
    }
  ]
}
```

**Campos obrigatórios**:
- `title`: string (mínimo 1 caractere)
- `screens`: array com mínimo 1 screen
- `screens[].name`: string (mínimo 1 caractere)
- `screens[].files`: array com mínimo 1 arquivo

**Campos opcionais**:
- `description`: string
- `category`: string (sugestão: "Feature")
- `tech`: string (tecnologias principais)
- `language`: string (linguagem principal)
- `macroCategory`: enum (CRUD, AUTH, INTEGRATION, WORKFLOW, INFRASTRUCTURE, UI, UTILITY)
- `tags`: array de strings

**NOTA**: Retorne APENAS o objeto com campo `cards`, sem campos extras como `analysis` ou `metadata`.

## 🔍 PROCESSO DE ANÁLISE (passo a passo)

### Passo 1: Mapeamento inicial
- Leia TODOS os arquivos fornecidos
- Identifique imports, exports, e dependências
- Crie grafo mental de conexões entre arquivos

### Passo 2: Detecção de domínios
- Analise nomes de diretórios e arquivos
- Identifique palavras-chave de domínio
- Agrupe arquivos por vocabulário similar

### Passo 3: Validação de coesão
- Para cada grupo candidato:
  * Os arquivos compartilham um propósito comum?
  * Há conexões (imports/calls) entre eles?
  * Fazem sentido estar juntos?

### Passo 4: Separação de domínios
- Se um grupo tem múltiplos propósitos → divida
- Se um grupo mistura palavras de domínio diferentes → divida
- Exemplo: "import github files" e "group cards with AI" = 2 features

### Passo 5: Organização em screens
- Dentro de cada feature, organize por camadas:
  * Backend: controllers, services, models, middleware
  * Frontend: components, hooks, services, pages
  * Database: schemas, migrations
  * Tests: unit, integration, e2e

### Passo 6: Validação final
- Verifique: cada feature tem nome claro?
- Verifique: arquivos estão no lugar certo?
- Verifique: não há features muito grandes (>30 arquivos)?
- Verifique: não há features muito pequenas (1 arquivo)?

## 🚫 PROIBIDO

1. NUNCA misture features de domínios diferentes no mesmo card
2. NUNCA crie cards sem nome descritivo claro
3. NUNCA deixe um arquivo fora de uma feature (a não ser que seja utilitário global)
4. NUNCA funda "GitHub Import" e "AI Grouping" - são features distintas!

## 💡 EXEMPLOS DE SAÍDA JSON (Schema Válido)

### Exemplo 1: Sistema de Importação GitHub

```json
{
  "cards": [
    {
      "title": "GitHub Repository Import",
      "description": "Sistema completo para importação de repositórios GitHub via API, incluindo download de ZIP, extração de arquivos e sincronização",
      "category": "Feature",
      "tech": "Node.js, TypeScript, Octokit",
      "language": "typescript",
      "macroCategory": "INTEGRATION",
      "tags": ["github", "import", "sync", "api"],
      "screens": [
        {
          "name": "Backend - Services",
          "description": "Serviços de integração com GitHub",
          "files": [
            "src/services/githubService.ts",
            "src/services/gitSyncService.ts"
          ]
        },
        {
          "name": "Backend - Controllers",
          "description": "API endpoints para importação",
          "files": [
            "src/controllers/importController.ts"
          ]
        }
      ]
    },
    {
      "title": "AI Card Grouping Engine",
      "description": "Motor de inteligência artificial para agrupar e organizar arquivos em cards por funcionalidade",
      "category": "Feature",
      "tech": "Node.js, TypeScript, OpenAI",
      "language": "typescript",
      "macroCategory": "INFRASTRUCTURE",
      "tags": ["ai", "grouping", "clustering", "cards"],
      "screens": [
        {
          "name": "Backend - Services",
          "description": "Serviços de agrupamento IA",
          "files": [
            "src/services/aiCardGroupingService.ts",
            "src/services/cardQualitySupervisor.ts"
          ]
        }
      ]
    }
  ]
}
```

### Exemplo 2: E-commerce - Separação de Domínios

```json
{
  "cards": [
    {
      "title": "User Management",
      "description": "Gerenciamento completo de usuários: cadastro, autenticação, perfis e permissões",
      "category": "Feature",
      "tech": "Node.js, React",
      "language": "typescript",
      "macroCategory": "AUTH",
      "tags": ["users", "auth", "profile"],
      "screens": [
        {
          "name": "Backend - Controllers",
          "description": "API de usuários",
          "files": ["src/controllers/userController.ts"]
        },
        {
          "name": "Backend - Services",
          "description": "Lógica de negócio de usuários",
          "files": ["src/services/userService.ts"]
        },
        {
          "name": "Backend - Models",
          "description": "Modelos de dados de usuários",
          "files": ["src/models/userModel.ts"]
        }
      ]
    },
    {
      "title": "Order Processing",
      "description": "Processamento de pedidos: criação, status, histórico e gestão",
      "category": "Feature",
      "tech": "Node.js",
      "language": "typescript",
      "macroCategory": "WORKFLOW",
      "tags": ["orders", "workflow", "processing"],
      "screens": [
        {
          "name": "Backend - Controllers",
          "description": "API de pedidos",
          "files": ["src/controllers/orderController.ts"]
        },
        {
          "name": "Backend - Services",
          "description": "Lógica de pedidos",
          "files": ["src/services/orderService.ts"]
        },
        {
          "name": "Backend - Models",
          "description": "Modelos de pedidos",
          "files": ["src/models/orderModel.ts"]
        }
      ]
    }
  ]
}
```

## 📏 CRITÉRIOS DE QUALIDADE

Uma boa separação de features deve ter:

1. **Alta Coesão**: Arquivos dentro de uma feature devem estar fortemente relacionados
2. **Baixo Acoplamento**: Features diferentes devem ter poucas dependências entre si
3. **Balanceamento**: Features não devem ter <3 arquivos (pequenas demais) nem >30 arquivos (grandes demais)
4. **Completude**: Cada feature deve representar uma funcionalidade que faz sentido sozinha

## 🎬 OUTPUT ESPERADO

Após processar os arquivos, você deve retornar:
1. Lista de features identificadas
2. Para cada feature: nome, descrição, categoria, screens, arquivos
3. Metadados de análise: total de arquivos, features encontradas, confiança, warnings
4. Justificativa breve para cada separação importante feita

**Lembre-se**: Sua análise deve ser conservadora na SEPARAÇÃO mas agressiva na COBERTURA.
É melhor ter 8 features bem definidas do que 4 features mal definidas.
```

### 📝 Implementação

**Arquivo**: `backend/src/services/aiCardGroupingService.ts`

1. **Substituir o prompt atual** pelo prompt mestre acima
2. **Enviar contexto completo**: 
   - Lista de arquivos com conteúdo
   - Estrutura de diretórios
   - Dependências detectadas
3. **Receber JSON estruturado** e converter para CardFeatures
4. **Aplicar validações mínimas** pós-IA:
   - Verificar que não há cards vazios
   - Verificar que todos os arquivos foram atribuídos
   - Logar warnings da IA

### ✅ Vantagens desta Abordagem

- **Implementação rápida**: 1-2 dias vs 1 semana
- **Flexibilidade**: Funciona com qualquer tipo de projeto
- **Manutenção**: Apenas ajustar o prompt, não código
- **Inteligência**: IA captura nuances que heurísticas não pegam
- **Escalabilidade**: Não adiciona complexidade ao codebase

### ⚠️ Considerações

- **Custo de tokens**: Enviar código completo pode ser caro
  - *Mitigação*: Enviar apenas primeiras 50 linhas de cada arquivo
- **Consistência**: Resultados podem variar entre execuções
  - *Mitigação*: Temperature=0, seed fixo, validações estruturais pós-IA
- **Debug**: Mais difícil entender por que a IA decidiu X
  - *Mitigação*: Solicitar justificativas no output

---

## 📚 Referências

- Issue #90: https://github.com/LuizBertucci/10xdev/issues/90
- Comentário 3893426553: Arquitetura estrutural proposta pelo CodeRabbit
- Comentário 3892229782: Solução multi-camada condensada

---

**Notas de Implementação**:
- Manter código em inglês (variáveis, funções, tipos)
- Mensagens em português para logs e erros
- Sempre usar `strict: true` no TypeScript
- Preferir path aliases (`@/services/...`) ao invés de relative imports

---

## ✅ Implementação Realizada

**Data**: 2026-02-12  
**Branch**: `fix/projeto-id`  
**Arquivo Modificado**: `backend/src/services/aiCardGroupingService.ts` (linhas 252-336)

### Alterações Feitas:

1. **Substituído o system prompt completo** (~85 linhas)
   - Removido: Prompt antigo focado em categorização e consolidação
   - Adicionado: Novo prompt com foco em **separação de features distintas**

2. **Novas instruções críticas adicionadas**:
   - ✅ Regra 1: TODAS as funcionalidades viram cards
   - ✅ Regra 2: SEPARE funcionalidades DISTINTAS (ex: Importação ≠ Agrupamento)
   - ✅ Regra 3: JUNTE arquivos relacionados
   - ✅ Regra 4: Análise estrutural (dependências, camadas, domínio)

3. **Mantida compatibilidade com schema**:
   - Estrutura JSON com `cards[]` preservada
   - Campos obrigatórios: `title`, `screens[]`
   - Campos opcionais: `description`, `category`, `tech`, `tags`, `macroCategory`

4. **Verificações de qualidade**:
   - ✅ Lint passou sem erros
   - ✅ TypeScript compilou sem erros

### Próximo Passo: Teste

Para validar a nova abordagem:

1. **Teste local**: Importar um repo simples e verificar separação
2. **Teste com 10xdev**: Importar o próprio repositório
   - Verificar se "Importação GitHub" e "Agrupamento IA" são cards separados
   - Verificar se outras features (Auth, CardFeatures) estão corretas
3. **Métricas**: Comparar qualidade dos cards gerados

### Rollback

Caso necessário, o prompt anterior está disponível no histórico do git:
```bash
git show HEAD~1:backend/src/services/aiCardGroupingService.ts | sed -n '252,336p'
```
