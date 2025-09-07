## 🆕 NOVA FEATURE: Tipos de Conteúdo para Card Blocks

### 📋 Visão Geral
Expandir o sistema atual de CardFeatures para suportar **3 tipos de conteúdo**:
- **Código** (já implementado) - snippets com syntax highlighting
- **Texto** (novo) - conteúdo markdown/rich text para documentação
- **Terminal** (novo) - comandos e outputs simulados

### 🔄 MUDANÇA ARQUITETURAL IMPORTANTE

**NOVA PROPOSTA**: Cada aba pode ter **múltiplos blocos de conteúdo** ao invés de um conteúdo único.

#### Exemplo de uma aba "Setup Completo":
```
# Como configurar o projeto  [TEXTO]

Primeiro, clone o repositório:  [TEXTO]
$ git clone https://github.com/user/repo.git  [TERMINAL]
$ cd repo  [TERMINAL]

Configure o arquivo de ambiente:  [TEXTO]
// .env  [CÓDIGO - javascript]
DATABASE_URL="postgresql://..."
API_KEY="your-api-key"

Execute o projeto:  [TEXTO]
$ npm run dev  [TERMINAL]
```

#### Vantagens:
- **Documentação rica**: Misturar explicações, comandos e código
- **Flexibilidade total**: Cada bloco tem seu tipo específico
- **UX melhor**: Usuário constrói passo-a-paso a documentação
- **Casos de uso reais**: Tutoriais, guias de setup, troubleshooting

### 🏗️ Análise da Arquitetura Atual

#### Estrutura Existente:
- **Database**: `CardFeatureScreen` possui apenas `code` field
- **Backend**: Model trabalha com array de screens com código
- **Frontend**: UI otimizada para exibição de código com SyntaxHighlighter
- **Types**: Interface focada em linguagens de programação

#### Nova Estrutura Necessária:

```typescript
// Bloco individual de conteúdo
interface ContentBlock {
  id: string                    // UUID único do bloco
  type: ContentType            // 'code' | 'text' | 'terminal'
  content: string              // Conteúdo do bloco
  language?: string            // Para código: 'typescript', 'javascript', etc
  title?: string               // Título opcional do bloco
  order: number                // Ordem do bloco na aba
}

// Screen/Aba atualizada
interface CardFeatureScreen {
  name: string                 // Nome da aba
  description: string          // Descrição da aba  
  blocks: ContentBlock[]       // Array de blocos de conteúdo
  route?: string              // Rota opcional
}

// CardFeature atualizado
interface CardFeature {
  id: string
  title: string
  tech: string
  language: string            // Linguagem principal (para compatibilidade)
  description: string
  content_type: ContentType   // Tipo principal (para filtros/organização)
  screens: CardFeatureScreen[]
  createdAt: string
  updatedAt: string
}
```

### 🔄 Mudanças Necessárias

#### 1. **DATABASE SCHEMA** - Supabase Table Update

```sql
-- Adicionar campo 'content_type' na tabela card_features (JÁ FEITO)
ALTER TABLE card_features 
ADD COLUMN content_type VARCHAR(20) DEFAULT 'code' CHECK (content_type IN ('code', 'text', 'terminal'));

-- Atualizar estrutura do campo screens (JSONB)
-- NOVA estrutura com blocos múltiplos:
-- screens: [{ 
--   name: string, 
--   description: string, 
--   blocks: [
--     { id: string, type: ContentType, content: string, language?: string, title?: string, order: number }
--   ],
--   route?: string 
-- }]

-- Script de migração para converter dados existentes
UPDATE card_features 
SET screens = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', screen->>'name',
      'description', screen->>'description', 
      'route', screen->>'route',
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'type', 'code',
          'content', screen->>'code',
          'language', screen->>'language',
          'order', 0
        )
      )
    )
  )
  FROM jsonb_array_elements(screens) AS screen
)
WHERE screens IS NOT NULL;
```

#### 2. **BACKEND CHANGES**

**Arquivos a modificar:**

**`backend/src/types/cardfeature.ts`**:
```typescript
// Enum para tipos de conteúdo (JÁ FEITO)
export enum ContentType {
  CODE = 'code',
  TEXT = 'text', 
  TERMINAL = 'terminal'
}

// NOVA estrutura - Bloco individual de conteúdo
export interface ContentBlock {
  id: string                    // UUID único
  type: ContentType            // Tipo do bloco
  content: string              // Conteúdo
  language?: string            // Linguagem (para código)
  title?: string               // Título opcional
  order: number                // Ordem do bloco
}

// ATUALIZAR CardFeatureScreen - agora com blocos múltiplos
export interface CardFeatureScreen {
  name: string                 // Nome da aba
  description: string          // Descrição da aba
  blocks: ContentBlock[]       // Array de blocos ao invés de content único
  route?: string              // Rota opcional
}

// CardFeatureRow permanece igual (JÁ ATUALIZADO)
export interface CardFeatureRow {
  id: string
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType    // Campo principal
  screens: CardFeatureScreen[] // Agora com nova estrutura de blocks
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

- [x] 1. Alterar schema do banco (migration)
```sql
-- Adicionar campo 'content_type' na tabela card_features
ALTER TABLE card_features 
ADD COLUMN content_type VARCHAR(20) DEFAULT 'code' CHECK (content_type IN ('code', 'text', 'terminal'));

-- Opcional: Migrar dados existentes
UPDATE card_features SET content_type = 'code' WHERE content_type IS NULL;
```

- [x] 2. Atualizar types e enums (ATUALIZADO para blocos múltiplos) 
```typescript
// backend/src/types/cardfeature.ts
export enum ContentType {
  CODE = 'code',
  TEXT = 'text', 
  TERMINAL = 'terminal'
}

export interface CardFeatureScreen {
  name: string
  description: string
  content: string              // Renomear 'code' para 'content'
  content_type: ContentType    // Novo campo
  language?: string           // Opcional para text/terminal
  route?: string             // Opcional
}

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

- [x] 3. Modificar CardFeatureModel
```typescript
// backend/src/models/CardFeatureModel.ts
private static transformToResponse(row: CardFeatureRow): CardFeatureResponse {
  return {
    id: row.id,
    title: row.title,
    tech: row.tech,
    language: row.language,
    description: row.description,
    content_type: row.content_type,  // Adicionar campo
    screens: row.screens,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Adicionar filtro por content_type
private static buildQuery(params: CardFeatureQueryParams = {}) {
  let query = supabaseTyped
    .from(this.tableName)
    .select('*', { count: 'exact' })

  if (params.content_type) {
    query = query.eq('content_type', params.content_type)
  }
  
  // ... resto da query
}
```

- [x] 4. Atualizar controller e validações (ATUALIZADO para blocos múltiplos)
```typescript
// backend/src/controllers/CardFeatureController.ts
// Adicionar validação de content_type
const validateContentType = (content_type: string): boolean => {
  return Object.values(ContentType).includes(content_type as ContentType)
}

// Atualizar create method
static async create(req: Request, res: Response) {
  const { content_type = 'code', ...data } = req.body
  
  if (!validateContentType(content_type)) {
    return res.status(400).json({
      success: false,
      error: 'Tipo de conteúdo inválido'
    })
  }
  
  const result = await CardFeatureModel.create({ ...data, content_type })
  // ... resto do método
}
```

- [ ] 5. Testes das APIs (pular por enquanto)
```typescript
// Exemplo de teste para novo endpoint
describe('CardFeature API with ContentType', () => {
  it('should create text content', async () => {
    const response = await request(app)
      .post('/api/card-features')
      .send({
        title: 'Documentação API',
        tech: 'Node.js',
        language: 'markdown',
        description: 'Guia de uso da API',
        content_type: 'text',
        screens: [{ name: 'README', description: 'Doc principal', content: '# API Guide', content_type: 'text' }]
      })
    
    expect(response.status).toBe(201)
    expect(response.body.data.content_type).toBe('text')
  })
})

#### **FASE 2: Frontend Core** 

- [x] 1. Atualizar types do frontend
```typescript
// frontend/types/cardfeature.ts
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

- [x] 2. Criar ContentRenderer base (CRIADO com suporte a blocos múltiplos)
```typescript
// frontend/components/ContentRenderer.tsx
import React from 'react'
import SyntaxHighlighter from './SyntaxHighlighter'
import { ContentType } from '@/types'

interface ContentRendererProps {
  content: string
  contentType: ContentType
  language?: string
  className?: string
}

export default function ContentRenderer({ 
  content, 
  contentType, 
  language, 
  className 
}: ContentRendererProps) {
  switch (contentType) {
    case ContentType.CODE:
      return (
        <SyntaxHighlighter
          code={content}
          language={language}
          className={className}
        />
      )
    
    case ContentType.TEXT:
      // Placeholder até implementar MarkdownRenderer
      return (
        <div className={`text-content ${className}`}>
          <pre className="whitespace-pre-wrap font-sans">{content}</pre>
        </div>
      )
    
    case ContentType.TERMINAL:
      // Placeholder até implementar TerminalRenderer
      return (
        <div className={`terminal-content bg-black text-green-400 p-4 rounded font-mono ${className}`}>
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      )
    
    default:
      return <div>Tipo de conteúdo não suportado</div>
  }
}
```

- [x] 3. Modificar CardFeature component (ATUALIZADO para usar ContentRenderer com blocos)
```typescript
// frontend/components/CardFeature.tsx - Principais mudanças
import ContentRenderer from './ContentRenderer'
import { ContentType } from '@/types'

// Substituir SyntaxHighlighter por ContentRenderer
<div className="codeblock-scroll relative z-10 h-full overflow-y-auto -mx-6 px-6 pt-8">
  <ContentRenderer
    content={activeScreen.content}  // Mudança de 'code' para 'content'
    contentType={activeScreen.content_type || ContentType.CODE}
    language={snippet.language}
  />
</div>

// Adicionar badge para tipo de conteúdo
<Badge className={`text-xs rounded-md ${getContentTypeBadge(snippet.content_type)}`}>
  {snippet.content_type}
</Badge>
```

- [ ] 4. Atualizar CardFeatureForm
```typescript
// frontend/components/CardFeatureForm.tsx - Principais mudanças
import { ContentType } from '@/types'

interface FormData {
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType  // Novo campo
  screens: CreateScreenData[]
}

const DEFAULT_FORM_DATA: FormData = {
  title: '',
  tech: 'React',
  language: 'typescript',
  description: '',
  content_type: ContentType.CODE,  // Default
  screens: [
    {
      name: 'Main',
      description: 'Arquivo principal',
      content: '',  // Mudança de 'code' para 'content'
      content_type: ContentType.CODE
    }
  ]
}

// Adicionar selector de tipo de conteúdo
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Tipo de Conteúdo *
  </label>
  <Select
    value={formData.content_type}
    onValueChange={(value) => handleInputChange('content_type', value as ContentType)}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ContentType.CODE}>Código</SelectItem>
      <SelectItem value={ContentType.TEXT}>Texto/Markdown</SelectItem>
      <SelectItem value={ContentType.TERMINAL}>Terminal</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### **FASE 3: Novos Renderers**

- [ ] 1. Implementar MarkdownRenderer
```typescript
// frontend/components/MarkdownRenderer.tsx
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-medium mb-2">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || '')
            return match ? (
              <pre className="bg-gray-100 rounded p-3 overflow-x-auto">
                <code className={className}>{children}</code>
              </pre>
            ) : (
              <code className="bg-gray-100 px-1 rounded text-sm">{children}</code>
            )
          },
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 mb-3">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] 2. Implementar TerminalRenderer
```typescript
// frontend/components/TerminalRenderer.tsx
import React, { useState, useEffect } from 'react'

interface TerminalRendererProps {
  content: string
  className?: string
  animated?: boolean
  theme?: 'dark' | 'light'
}

export default function TerminalRenderer({ 
  content, 
  className, 
  animated = false,
  theme = 'dark'
}: TerminalRendererProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  
  useEffect(() => {
    if (animated) {
      let index = 0
      const interval = setInterval(() => {
        setDisplayedContent(content.slice(0, index))
        index++
        if (index > content.length) {
          clearInterval(interval)
        }
      }, 50)
      return () => clearInterval(interval)
    } else {
      setDisplayedContent(content)
    }
  }, [content, animated])

  const themeClasses = theme === 'dark' 
    ? 'bg-gray-900 text-green-400' 
    : 'bg-gray-100 text-gray-800'

  // Parsear linhas para identificar comandos vs outputs
  const lines = displayedContent.split('\n')
  
  return (
    <div className={`terminal-renderer ${themeClasses} font-mono text-sm p-4 rounded-lg ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center mb-3 pb-2 border-b border-gray-600">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="ml-4 text-xs opacity-70">Terminal</div>
      </div>
      
      {/* Terminal Content */}
      <div className="space-y-1">
        {lines.map((line, index) => {
          const isCommand = line.startsWith('$') || line.startsWith('#') || line.startsWith('>')
          return (
            <div key={index} className="flex">
              {isCommand ? (
                <>
                  <span className="text-blue-400 mr-2">$</span>
                  <span className="text-white">{line.replace(/^[$#>]\s*/, '')}</span>
                </>
              ) : (
                <span className="text-green-300 pl-4">{line}</span>
              )}
            </div>
          )
        })}
        
        {/* Cursor piscante para animação */}
        {animated && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></span>
        )}
      </div>
    </div>
  )
}
```

- [ ] 3. Criar ContentTypeSelector
```typescript
// frontend/components/ContentTypeSelector.tsx
import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Code, FileText, Terminal } from 'lucide-react'
import { ContentType } from '@/types'

interface ContentTypeSelectorProps {
  selectedType: ContentType
  onTypeChange: (type: ContentType) => void
  className?: string
}

const contentTypeOptions = [
  {
    type: ContentType.CODE,
    label: 'Código',
    description: 'Snippets de código com syntax highlighting',
    icon: Code,
    color: 'border-blue-500 bg-blue-50'
  },
  {
    type: ContentType.TEXT,
    label: 'Texto',
    description: 'Documentação em Markdown',
    icon: FileText,
    color: 'border-green-500 bg-green-50'
  },
  {
    type: ContentType.TERMINAL,
    label: 'Terminal',
    description: 'Comandos e outputs de terminal',
    icon: Terminal,
    color: 'border-gray-500 bg-gray-50'
  }
]

export default function ContentTypeSelector({ 
  selectedType, 
  onTypeChange, 
  className 
}: ContentTypeSelectorProps) {
  return (
    <div className={`content-type-selector ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Tipo de Conteúdo *
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {contentTypeOptions.map((option) => {
          const IconComponent = option.icon
          const isSelected = selectedType === option.type
          
          return (
            <Card
              key={option.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? `${option.color} border-2 shadow-md` 
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onTypeChange(option.type)}
            >
              <CardContent className="p-4 text-center">
                <IconComponent 
                  className={`w-8 h-8 mx-auto mb-2 ${
                    isSelected ? 'text-gray-700' : 'text-gray-500'
                  }`} 
                />
                <h3 className="font-semibold text-sm mb-1">{option.label}</h3>
                <p className="text-xs text-gray-600">{option.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] 4. Integrar com formulários
```typescript
// frontend/components/CardFeatureForm.tsx - Integração do ContentTypeSelector
import ContentTypeSelector from './ContentTypeSelector'

// Substituir o Select por ContentTypeSelector
<ContentTypeSelector
  selectedType={formData.content_type}
  onTypeChange={(type) => {
    handleInputChange('content_type', type)
    // Atualizar screens existentes com novo tipo
    setFormData(prev => ({
      ...prev,
      screens: prev.screens.map(screen => ({
        ...screen,
        content_type: type
      }))
    }))
  }}
/>

// Atualizar label do textarea baseado no tipo
const getContentLabel = (contentType: ContentType) => {
  switch (contentType) {
    case ContentType.CODE: return 'Código'
    case ContentType.TEXT: return 'Texto/Markdown'
    case ContentType.TERMINAL: return 'Comandos de Terminal'
    default: return 'Conteúdo'
  }
}

// Atualizar placeholder do textarea
const getContentPlaceholder = (contentType: ContentType) => {
  switch (contentType) {
    case ContentType.CODE: return 'Cole seu código aqui...'
    case ContentType.TEXT: return 'Escreva sua documentação em Markdown...'
    case ContentType.TERMINAL: return '$ npm install\n$ npm run dev\n...'
    default: return 'Cole seu conteúdo aqui...'
  }
}
```

#### **FASE 4: UX/UI Polish**

- [ ] 1. Filtros por tipo de conteúdo
```typescript
// frontend/components/ContentTypeFilter.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ContentType } from '@/types'

interface ContentTypeFilterProps {
  selectedType: string
  onTypeChange: (type: string) => void
}

export default function ContentTypeFilter({ selectedType, onTypeChange }: ContentTypeFilterProps) {
  return (
    <Select value={selectedType} onValueChange={onTypeChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Tipo de conteúdo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os tipos</SelectItem>
        <SelectItem value={ContentType.CODE}>📝 Código</SelectItem>
        <SelectItem value={ContentType.TEXT}>📄 Texto</SelectItem>
        <SelectItem value={ContentType.TERMINAL}>⚡ Terminal</SelectItem>
      </SelectContent>
    </Select>
  )
}

// Integrar no Codes.tsx
<div className="flex gap-4 items-center">
  <ContentTypeFilter 
    selectedType={selectedContentType} 
    onTypeChange={setSelectedContentType} 
  />
  {/* outros filtros */}
</div>
```

- [ ] 2. Badges e visual design
```typescript
// frontend/components/utils/contentTypeUtils.ts
import { ContentType } from '@/types'

export const getContentTypeBadge = (contentType: ContentType) => {
  switch (contentType) {
    case ContentType.CODE:
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '💻',
        label: 'Código'
      }
    case ContentType.TEXT:
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '📄',
        label: 'Texto'
      }
    case ContentType.TERMINAL:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '⚡',
        label: 'Terminal'
      }
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '❓',
        label: 'Desconhecido'
      }
  }
}

// Usar no CardFeature.tsx
const badgeConfig = getContentTypeBadge(snippet.content_type)
<Badge className={`text-xs rounded-md ${badgeConfig.color}`}>
  <span className="mr-1">{badgeConfig.icon}</span>
  {badgeConfig.label}
</Badge>
```
