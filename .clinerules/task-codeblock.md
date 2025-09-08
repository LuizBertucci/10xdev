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

### 📦 FASE 6: Deploy e Documentação - [PENDENTE]

#### 6.1 Build e Deploy
- [ ] **Verificar builds**
  - [ ] Backend compila sem erros TypeScript
  - [ ] Frontend builda com novas dependências
  - [ ] Testes de produção

#### 6.2 Documentação
- [ ] **README atualizado**
  - [ ] Documentar novos tipos de conteúdo
  - [ ] Exemplos de uso para cada tipo
  - [ ] Screenshots dos novos componentes

## 🔧 Comandos Úteis

### Backend
```bash
cd backend
npm run dev          # Desenvolvimento
npm run build        # Compilar TypeScript
npm run start        # Produção
```

### Frontend  
```bash
cd frontend
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run lint         # Linter
```

### Database
```sql
-- Verificar estrutura atual
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'card_features';

-- Testar novos tipos
INSERT INTO card_features (title, content_type, ...) 
VALUES ('Teste Terminal', 'terminal', ...);
```

## ✅ Status Atual: FASE 1 e 2 CONCLUÍDAS

**O que está funcionando:**
- ✅ Sistema de tipos de conteúdo implementado
- ✅ Backend com suporte completo a múltiplos blocos
- ✅ Frontend com formulários funcionais
- ✅ CRUD completo operacional  
- ✅ Hooks e estado gerenciados corretamente
- ✅ Validações removidas (campos opcionais)
- ✅ Navegação corrigida (permanece em "codes")

**Próximo passo:** FASE 3 - Implementar MarkdownRenderer e TerminalRenderer para renderização completa dos novos tipos de conteúdo.