## 🆕 NOVA FEATURE: Tipos de Conteúdo para Card Blocks

### 📋 Visão Geral
Expandir o sistema atual de CardFeatures para suportar **3 tipos de conteúdo**:
- **Código** (já implementado) - snippets com syntax highlighting
- **Texto** (novo) - conteúdo markdown/rich text para documentação
- **Terminal** (novo) - comandos e outputs simulados

### 🏗️ Análise da Arquitetura Atual

#### Estrutura Existente:
- **Database**: `CardFeatureScreen` possui apenas `code` field
- **Backend**: Model trabalha com array de screens com código
- **Frontend**: UI otimizada para exibição de código com SyntaxHighlighter
- **Types**: Interface focada em linguagens de programação

### 🔄 Mudanças Necessárias

#### 1. **DATABASE SCHEMA** - Supabase Table Update

```sql
-- Adicionar campo 'content_type' na tabela card_features
ALTER TABLE card_features 
ADD COLUMN content_type VARCHAR(20) DEFAULT 'code' CHECK (content_type IN ('code', 'text', 'terminal'));

-- Atualizar estrutura do campo screens (JSONB)
-- Novo formato: screens: [{ name, description, content, content_type, language?, route? }]
```

#### 2. **BACKEND CHANGES**

**Arquivos a modificar:**

**`backend/src/types/cardfeature.ts`**:
```typescript
// Adicionar enum para tipos de conteúdo
export enum ContentType {
  CODE = 'code',
  TEXT = 'text', 
  TERMINAL = 'terminal'
}

// Atualizar CardFeatureScreen
export interface CardFeatureScreen {
  name: string
  description: string
  content: string              // Renomear 'code' para 'content'
  content_type: ContentType    // Novo campo
  language?: string           // Opcional para text/terminal
  route?: string             // Opcional
}

// Atualizar CardFeatureRow
export interface CardFeatureRow {
  id: string
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType    // Novo campo principal
  screens: CardFeatureScreen[]
  created_at: string
  updated_at: string
}
```

**`backend/src/models/CardFeatureModel.ts`**:
- Atualizar método `transformToResponse` para incluir `content_type`
- Modificar filtros para suportar busca por tipo de conteúdo
- Adicionar validação para diferentes tipos de conteúdo

**`backend/src/controllers/CardFeatureController.ts`**:
- Validação de content_type em create/update
- Tratamento específico para cada tipo de conteúdo

#### 3. **FRONTEND CHANGES**

**Novos Tipos (`frontend/types/cardfeature.ts`)**:
```typescript
export enum ContentType {
  CODE = 'code',
  TEXT = 'text',
  TERMINAL = 'terminal'
}

export interface CardFeatureScreen {
  name: string
  description: string
  content: string              // Renomear de 'code'
  content_type: ContentType    // Novo campo
  language?: string           // Opcional
  route?: string
}

export interface CardFeature {
  id: string
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType    // Novo campo principal
  screens: CardFeatureScreen[]
  createdAt: string
  updatedAt: string
}
```

**Componentes a Modificar:**

**`frontend/components/CardFeature.tsx`**:
- Renderização condicional baseada em `content_type`
- Novo componente `ContentRenderer` para gerenciar diferentes tipos
- Badges específicos para cada tipo de conteúdo

**`frontend/components/CardFeatureForm.tsx`**:
- Selector para tipo de conteúdo
- Campos condicionais baseados no tipo selecionado
- Validação específica por tipo

#### 4. **NOVOS COMPONENTES NECESSÁRIOS**

**`frontend/components/ContentRenderer.tsx`**:
```typescript
interface ContentRendererProps {
  content: string
  contentType: ContentType
  language?: string
  className?: string
}

// Renderiza: SyntaxHighlighter | MarkdownRenderer | TerminalRenderer
```

**`frontend/components/MarkdownRenderer.tsx`**:
- Renderização de markdown com react-markdown
- Suporte a syntax highlighting em blocos de código
- Estilos customizados para documentação

**`frontend/components/TerminalRenderer.tsx`**:
- Simulação de interface de terminal
- Highlighting para comandos vs outputs
- Animações opcionais de typing
- Temas (dark/light terminal)

**`frontend/components/ContentTypeSelector.tsx`**:
- Selector visual para escolher tipo de conteúdo
- Preview/icons para cada tipo
- Integração com CardFeatureForm

#### 5. **PACKAGES NECESSÁRIOS**

```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",
    "@types/react-markdown": "^8.0.0", 
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-raw": "^7.0.0"
  }
}
```

### 🎨 Considerações de UX/UI

#### 1. **Visual Design**
- **Código**: Mantém syntax highlighting atual
- **Texto**: Layout limpo estilo documentação com tipografia clara
- **Terminal**: Fundo escuro, fonte monospace, prompt simulado

#### 2. **Filtros e Busca**
- Filtro por tipo de conteúdo na sidebar
- Badges visuais diferenciados por tipo
- Busca inteligente baseada no tipo de conteúdo

#### 3. **Form Experience**
- Wizard-like flow: primeiro seleciona tipo, depois campos específicos
- Preview em tempo real para cada tipo
- Templates/examples para terminal e texto

### 🚀 Implementação Step-by-Step

#### **FASE 1: Backend Foundation**
1. Alterar schema do banco (migration)
2. Atualizar types e enums
3. Modificar CardFeatureModel
4. Atualizar controller e validações
5. Testes das APIs

#### **FASE 2: Frontend Core** 
1. Atualizar types do frontend
2. Criar ContentRenderer base
3. Modificar CardFeature component
4. Atualizar CardFeatureForm

#### **FASE 3: Novos Renderers**
1. Implementar MarkdownRenderer
2. Implementar TerminalRenderer  
3. Criar ContentTypeSelector
4. Integrar com formulários

#### **FASE 4: UX/UI Polish**
1. Filtros por tipo de conteúdo
2. Badges e visual design
3. Templates e examples
4. Animações e transições

#### **FASE 5: Testing & Migration**
1. Migração de dados existentes
2. Testes de integração
3. Documentação
4. Deploy

### 🔧 Considerações Técnicas

#### **Migration Strategy**
- Todos os CardFeatures existentes recebem `content_type: 'code'`
- Campo `code` migra para `content` sem perda de dados
- Backward compatibility mantida

#### **Performance**
- Bundle splitting para renderers (lazy loading)
- Memoização de componentes pesados
- Cache inteligente por tipo de conteúdo

#### **Acessibilidade**
- Screen readers para diferentes tipos de conteúdo
- Keyboard navigation
- Alto contraste para terminal theme
