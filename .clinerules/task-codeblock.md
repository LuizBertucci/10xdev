# Task: Sistema de Card Features com Múltiplos Tipos de Conteúdo

## 📋 Visão Geral
Sistema completo de CardFeatures que suporta 3 tipos de conteúdo em estrutura de blocos múltiplos:
- **💻 Código** - snippets com syntax highlighting  
- **📄 Texto** - conteúdo markdown/documentação
- **⚡ Terminal** - comandos e outputs simulados

## 🎯 Funcionalidades Principais Implementadas
- [X] Hook useCardFeatures com controle de modais (startEditing, cancelEditing, etc.)
- [X] Formulário de criação e edição funcional
- [X] Edição com dados pré-populados
- [X] Navegação após salvar mantém na aba "codes"
- [X] Remoção de todas as validações obrigatórias (campos podem ficar vazios)
- [X] Sistema de tipos ContentType (CODE, TEXT, TERMINAL)
- [X] Estrutura de blocos múltiplos por screen/aba

## 📝 Tasks Detalhadas

### ✅ FASE 1: Backend Foundation - [CONCLUÍDA]

#### 1.1 Database Schema
- [X] **Adicionar campo content_type na tabela card_features**
  - [X] Campo VARCHAR(20) DEFAULT 'code' 
  - [X] CHECK constraint para ('code', 'text', 'terminal')
  - [X] Atualizar registros existentes para 'code'

#### 1.2 Types & Interfaces  
- [X] **Criar enum ContentType** (`backend/src/types/cardfeature.ts`)
  - [X] ContentType.CODE = 'code'
  - [X] ContentType.TEXT = 'text'  
  - [X] ContentType.TERMINAL = 'terminal'

- [X] **Atualizar interface ContentBlock**
  - [X] id: string (UUID único)
  - [X] type: ContentType  
  - [X] content: string
  - [X] language?: string
  - [X] title?: string
  - [X] order: number

- [X] **Atualizar interface CardFeatureScreen**
  - [X] name: string
  - [X] description: string
  - [X] blocks: ContentBlock[] (ao invés de content único)

- [X] **Atualizar interface CardFeatureRow**
  - [X] Adicionar content_type: ContentType
  - [X] screens: CardFeatureScreen[] (com nova estrutura)

#### 1.3 Model Layer
- [X] **Modificar CardFeatureModel.ts**
  - [X] transformToResponse inclui content_type
  - [X] buildQuery com filtro por content_type
  - [X] Processamento de blocos múltiplos no create()
  - [X] Valores default para campos vazios (title || '', description || '')

#### 1.4 Controller Layer  
- [X] **Atualizar CardFeatureController.ts**
  - [X] Remover todas as validações obrigatórias
  - [X] create() aceita content_type
  - [X] update() aceita content_type  
  - [X] bulkCreate() aceita content_type
  - [X] Compilar para JavaScript (.js)

### ✅ FASE 2: Frontend Core - [CONCLUÍDA]

#### 2.1 Types Frontend
- [X] **Atualizar frontend/types/index.ts**
  - [X] Enum ContentType (CODE, TEXT, TERMINAL)
  - [X] Interface CreateBlockData com todos os campos
  - [X] Interface CreateScreenData com blocks: CreateBlockData[]
  - [X] Interface CardFeature com content_type

#### 2.2 Hook Principal
- [X] **Implementar useCardFeatures completo**
  - [X] Estados de modal (isCreating, isEditing, editingItem)
  - [X] Funções de controle (startCreating, cancelCreating, startEditing, cancelEditing)
  - [X] CRUD completo (create, update, delete)
  - [X] Loading states para cada operação
  - [X] Error handling com logs detalhados

#### 2.3 Componente Base
- [X] **Criar ContentRenderer** (`frontend/components/ContentRenderer.tsx`)
  - [X] Switch para renderizar por ContentType
  - [X] Integração com SyntaxHighlighter existente
  - [X] Placeholder para TEXT (pre com whitespace-pre-wrap)
  - [X] Placeholder para TERMINAL (bg-black text-green-400)

#### 2.4 Componentes de Exibição
- [X] **Atualizar CardFeature.tsx**
  - [X] Usar ContentRenderer ao invés de SyntaxHighlighter direto
  - [X] Renderização de múltiplos blocos por screen
  - [X] Navegação entre blocos
  - [X] Badges por tipo de conteúdo

- [X] **Atualizar CardFeatureCompact.tsx**  
  - [X] Exibir content_type nos badges
  - [X] Suportar estrutura de blocos múltiplos

#### 2.5 Formulários
- [X] **Atualizar CardFeatureForm.tsx**
  - [X] Campo content_type com Select
  - [X] Múltiplos blocos por screen
  - [X] Botões para adicionar/remover blocos
  - [X] Seleção de tipo por bloco (💻 Código, 📄 Texto, ⚡ Terminal)
  - [X] useEffect para popular dados na edição
  - [X] Remover validação obrigatória de description
  - [X] Labels sem asterisco (campos opcionais)

#### 2.6 Páginas
- [X] **Atualizar Codes.tsx**
  - [X] Integração com useCardFeatures atualizado
  - [X] Handlers para create e edit
  - [X] Não redirecionar para home após salvar
  - [X] Error handling melhorado

### 🚧 FASE 3: Renderers Avançados - [PENDENTE]

#### 3.1 MarkdownRenderer 
- [ ] **Instalar dependências**
  ```bash
  npm install react-markdown remark-gfm rehype-highlight
  npm install -D @types/react-markdown
  ```

- [ ] **Implementar MarkdownRenderer.tsx**
  - [ ] Componente base com ReactMarkdown
  - [ ] Plugin remark-gfm para tabelas/strikethrough
  - [ ] Plugin rehype-highlight para código
  - [ ] Componentes customizados (h1, h2, p, code, ul, ol, blockquote)
  - [ ] Estilos prose para tipografia
  - [ ] Classes Tailwind customizadas

- [ ] **Integrar no ContentRenderer**
  - [ ] Case ContentType.TEXT retorna MarkdownRenderer
  - [ ] Remover placeholder atual
  - [ ] Testes com markdown complexo

#### 3.2 TerminalRenderer
- [ ] **Implementar TerminalRenderer.tsx**
  - [ ] Header com botões simulados (vermelho, amarelo, verde)
  - [ ] Parser para identificar comandos ($, #, >) vs outputs
  - [ ] Cores diferenciadas (azul para comandos, verde para outputs)
  - [ ] Suporte a temas (dark/light)
  - [ ] Animação de typing opcional
  - [ ] Cursor piscante
  
- [ ] **Features avançadas**
  - [ ] Múltiplas linhas com indentação
  - [ ] Syntax highlighting básico para comandos conhecidos
  - [ ] Simulação de delay entre comandos

- [ ] **Integrar no ContentRenderer**
  - [ ] Case ContentType.TERMINAL retorna TerminalRenderer
  - [ ] Remover placeholder atual
  - [ ] Configurações padrão (theme='dark', animated=false)

#### 3.3 ContentTypeSelector
- [ ] **Implementar ContentTypeSelector.tsx**
  - [ ] Grid de 3 cards clicáveis
  - [ ] Ícones lucide-react (Code, FileText, Terminal)
  - [ ] Estados visuais (selecionado vs não-selecionado)
  - [ ] Cores por tipo (azul, verde, cinza)
  - [ ] Descrições explicativas
  - [ ] Animações de hover/click

- [ ] **Integrar no CardFeatureForm**
  - [ ] Substituir Select atual por ContentTypeSelector
  - [ ] Callback para atualizar tipo principal
  - [ ] Callback para atualizar tipos dos blocos existentes
  - [ ] Validation de mudança de tipo

### 🎨 FASE 4: UX/UI Polish - [PENDENTE]

#### 4.1 Sistema de Filtros
- [ ] **Implementar ContentTypeFilter.tsx**
  - [ ] Select com ícones por tipo
  - [ ] Opção "Todos os tipos"
  - [ ] Integração com hook de filtros existente
  - [ ] Contadores por tipo

- [ ] **Atualizar useCardFeatures**
  - [ ] Filtro por content_type
  - [ ] Combinar com filtros existentes (tech, search)
  - [ ] Estado selectedContentType
  - [ ] Função setSelectedContentType

#### 4.2 Badges e Visual Design
- [ ] **Implementar contentTypeUtils.ts**
  - [ ] Função getContentTypeBadge() 
  - [ ] Configurações de cor por tipo
  - [ ] Ícones emoji por tipo
  - [ ] Labels localizados

- [ ] **Aplicar em componentes**
  - [ ] CardFeature badges melhorados
  - [ ] CardFeatureCompact badges consistentes
  - [ ] Cores harmonizadas com tema

#### 4.3 Melhorias de Formulário
- [ ] **Templates por tipo**
  - [ ] Template CODE com exemplo React/TypeScript
  - [ ] Template TEXT com estrutura markdown
  - [ ] Template TERMINAL com comandos npm/git
  - [ ] Botão "Usar template" no formulário

- [ ] **Preview em tempo real**
  - [ ] Toggle preview/edit nos blocos
  - [ ] Renderização live durante digitação
  - [ ] Split view opcional (edit + preview)

### 🧪 FASE 5: Testes e Refinamentos - [PENDENTE]

#### 5.1 Testes Backend
- [ ] **Testes de API**
  - [ ] POST /api/card-features com content_type
  - [ ] GET com filtro por content_type  
  - [ ] PUT com mudança de content_type
  - [ ] Validation de enum ContentType

#### 5.2 Testes Frontend  
- [ ] **Testes de componentes**
  - [ ] ContentRenderer com diferentes types
  - [ ] MarkdownRenderer com markdown complexo
  - [ ] TerminalRenderer com comandos/outputs
  - [ ] ContentTypeSelector seleção/mudança

#### 5.3 Migração de Dados
- [ ] **Script de migração**
  - [ ] Converter screens existentes para estrutura de blocos
  - [ ] Manter compatibilidade com dados antigos
  - [ ] Verificação de integridade pós-migração

### 🚧 FASE 6: Correção de Bugs Críticos - [EM ANDAMENTO]

#### 6.1 Problemas de Disconnect Form ↔ Index
- [X] **Análise completa dos problemas**
  - [X] Investigar routes não aparecendo no Index
  - [X] Analisar ordenação de blocos incorreta  
  - [X] Entender separação de tipos de conteúdo

#### 6.2 Fixes Estruturais Identificados
- [ ] **Fix #1: Route Storage Mismatch**
  - [ ] Form armazena routes em `ContentBlock.route`
  - [ ] Display procura routes em `CardFeatureScreen.route`
  - [ ] **Solução:** Modificar display components para ler de ContentBlocks

- [ ] **Fix #2: Block Ordering Missing**
  - [ ] Form nunca define campo `order` ao criar blocos
  - [ ] Display depende do campo `order` para ordenação
  - [ ] **Solução:** Atualizar form para atribuir `order` sequencial

- [ ] **Fix #3: Code-Only Display Mode**
  - [ ] ContentRenderer mostra todos os tipos com títulos/ícones
  - [ ] User quer "código apenas código" na área de display
  - [ ] **Solução:** Criar modo "code-only" no ContentRenderer

### 📦 FASE 7: Deploy e Documentação - [PENDENTE]

#### 7.1 Build e Deploy
- [ ] **Verificar builds**
  - [ ] Backend compila sem erros TypeScript
  - [ ] Frontend builda com novas dependências
  - [ ] Testes de produção

#### 7.2 Documentação
- [ ] **README atualizado**
  - [ ] Documentar novos tipos de conteúdo
  - [ ] Exemplos de uso para cada tipo
  - [ ] Screenshots dos novos componentes

---

## 🔥 PLANO DE AÇÃO URGENTE - DISCONNECT FORM ↔ INDEX

### **PROBLEMA IDENTIFICADO:**
Existe uma desconexão estrutural entre como o Form salva os dados e como o Index exibe. Três issues críticos:

1. **🚨 ROUTES NÃO APARECEM:** Form salva `block.route`, Index procura `screen.route`
2. **🚨 BLOCOS FORA DE ORDEM:** Form não atribui campo `order`, Index ordena por esse campo
3. **🚨 CÓDIGO MISTURADO:** ContentRenderer mostra todos os tipos, user quer só código na área de código

### **ANÁLISE TÉCNICA DETALHADA:**

#### **Issue #1: Route Storage Mismatch**
```typescript
// ❌ FORM: Armazena em ContentBlock (CardFeatureForm.tsx:517)
value={block.route || ''}
onChange={(e) => handleBlockChange(index, blockIndex, 'route', e.target.value)}

// ❌ INDEX: Procura em Screen (CardFeature.tsx:128)
{activeScreen.route || 'Sem rota definida'}
```

#### **Issue #2: Missing Order Assignment** 
```typescript  
// ❌ FORM: Nunca define order (CardFeatureForm.tsx:109-113)
const newBlock: CreateBlockData = {
  type,
  content: '',
  language: type === ContentType.CODE ? 'typescript' : undefined
  // 🚫 FALTANDO: order field!
}

// ✅ INDEX: Tenta ordenar por order (ContentRenderer.tsx:87)
const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)
```

#### **Issue #3: Content Type Separation**
```typescript
// 🔄 CURRENT: Mostra todos os tipos com títulos (ContentRenderer.tsx:21-25)
<div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
  {getBlockIcon(block.type)}
  <span>{getBlockTitle(block.type)}</span>
</div>

// 🎯 DESIRED: Área de código só código, sem títulos/ícones para CODE blocks
```

### **PLANO DE IMPLEMENTAÇÃO:**

#### **✅ FASE 6A: Route Display Fix**
1. **Modificar CardFeature.tsx lines 125-130**
   - Trocar `activeScreen.route` por lógica que busca routes dos blocks CODE
   - Implementar `getCodeBlockRoutes(blocks)` helper
   
2. **Modificar CardFeatureCompact.tsx lines 170-177**  
   - Mesma lógica de buscar routes dos ContentBlocks
   - Exibir múltiplas routes se houver múltiplos blocos CODE

#### **✅ FASE 6B: Block Ordering Fix**
1. **Modificar CardFeatureForm.tsx addBlock function (line 108)**
   - Calcular próximo índice sequencial
   - Atribuir `order: screen.blocks.length` ao criar bloco
   
2. **Modificar moveBlockUp/moveBlockDown functions (lines 152-188)**
   - Atualizar campos `order` após reordenação
   - Garantir sequência contínua 0, 1, 2, 3...

#### **🚧 FASE 6C: Renderização Sequencial com Containers Específicos**
- [X] **1. Modificar ContentRenderer.tsx - Renderização por Ordem**
  - [X] **MANTER** ordenação sequencial por campo `order` (não agrupar por tipo)
  - [X] Iterar pelos blocos ordenados e renderizar cada um em seu container específico
  - [X] Preservar ordem exata do Form: texto → terminal → código (se for essa a ordem)
   
- [X] **2. Criar Componentes de Container Específicos**
  - [X] **CodeBlockContainer**: Área azul clara (#f8f8ff) + syntax highlighting
  - [X] **TextBlockContainer**: Área branca + tipografia prose/markdown  
  - [X] **TerminalBlockContainer**: Área preta/verde + font mono
   
- [X] **3. Implementar Renderização Individual**
  - [X] Remover títulos/ícones globais (💻, 📄, ⚡)
  - [X] Para cada block: `switch(block.type)` → renderizar no container correto
  - [X] Manter separação visual, mas **ordem do Form**
   
- [ ] **4. Layout da Renderização Final (Exemplo)**
  ```
  Se Form tem ordem: texto → terminal → código
  
  [TEXT BLOCK - Área Branca]
  texto aqui...
  
  [TERMINAL BLOCK - Área Preta/Verde] 
  $ comando aqui...
  
  [CODE BLOCK - Área Azul Clara]
  código aqui...
  ```

- [ ] **5. Detalhes de Implementação**
  - [ ] **Ordenação**: `sortedBlocks.map(block => renderByType(block))`
  - [ ] **CodeBlockContainer**: SyntaxHighlighter + fundo azul (atual) sem título
  - [ ] **TextBlockContainer**: ReactMarkdown ou pre + fundo branco + prose
  - [ ] **TerminalBlockContainer**: Pre + fundo preto + texto verde + font mono
  - [ ] **Espaçamento**: Gap entre containers para separação visual clara

```

## ⚡ Status Atual: FASE 1, 2 CONCLUÍDAS + BUGS CRÍTICOS IDENTIFICADOS

**O que está funcionando:**
- ✅ Sistema de tipos de conteúdo implementado
- ✅ Backend com suporte completo a múltiplos blocos
- ✅ Frontend com formulários funcionais
- ✅ CRUD completo operacional  
- ✅ Hooks e estado gerenciados corretamente
- ✅ Validações removidas (campos opcionais)
- ✅ Navegação corrigida (permanece em "codes")

**🔥 Problemas Críticos Identificados:**
- ✅ Routes do Form não aparecem no Index (RESOLVIDO - FASE 6A)
- ✅ Ordenação de blocos não preservada (RESOLVIDO - FASE 6B)
- 🚨 Área de código mostra todos os tipos (EM ANDAMENTO - FASE 6C)

**Próximo passo:** FASE 6C - Separar visualização por tipo de conteúdo (cada tipo em seu próprio container visual).