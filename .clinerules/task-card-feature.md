# 🚀 **Task: Sistema CRUD para CardFeatures**

## 🎯 **Objetivo da Funcionalidade**

Transformar a aba **Codes** de uma visualização estática em um **sistema CRUD completo**, permitindo que usuários criem, editem, visualizem e removam CardFeatures de forma interativa. Cada CardFeature terá **abas internas** para organizar diferentes arquivos (Model, Controller, etc.).

## 📋 **Requisitos Funcionais**

### **🔍 1. Visualização (Read)**
- ✅ **Já implementado** - Grid de CardFeatures com filtros e busca
- 🆕 **Nova funcionalidade** - **Abas internas** no modal para navegar entre arquivos (Model, Controller, etc.)
- 🔄 **Melhoria pendente** - Adicionar indicadores visuais (data criação, autor, status)

### **➕ 2. Criação (Create)**
- **Formulário de criação** com campos:
  - `title` (string, obrigatório)
  - `tech` (select, obrigatório) 
  - `language` (select, obrigatório)
  - `description` (textarea, obrigatório)
  - `screens[]` (array dinâmico com **sistema de abas**):
    - `name` (string, obrigatório) - Nome da aba (ex: "Model", "Controller")
    - `description` (string, obrigatório) - Descrição do arquivo
    - `code` (textarea com syntax highlighting, obrigatório)
- **Validação** em tempo real
- **Preview com abas** antes de salvar
- **Botão "Novo CardFeature"** na interface

### **✏️ 3. Edição (Update)**
- **Formulário de edição** (mesmo layout da criação)
- **Carregamento** dos dados existentes com abas preservadas
- **Botão "Editar"** em cada CardFeature
- **Gerenciamento de abas** (adicionar/remover/reordenar)
- **Salvamento** com confirmação

### **🗑️ 4. Remoção (Delete)**
- **Botão "Remover"** em cada CardFeature
- **Modal de confirmação** com preview do item
- **Remoção** da lista e persistência

## 🏗️ **Arquitetura Técnica Planejada**

### **📁 Estrutura de Arquivos**
```
frontend/
├── components/
│   ├── CardFeatures/
│   │   ├── CardFeatureCard.tsx        ✅ (extrair do Codes.tsx)
│   │   ├── CardFeatureModal.tsx       ✅ (extrair do Codes.tsx com abas)
│   │   ├── CardFeatureForm.tsx        🆕 (formulário create/edit)
│   │   ├── CardFeatureFormFields.tsx  🆕 (campos reutilizáveis)
│   │   ├── CardFeatureTabEditor.tsx   🆕 (editor de abas/screens)
│   │   ├── CardFeatureDeleteModal.tsx 🆕 (confirmação de remoção)
│   │   └── CardFeatureTabs.tsx        🆕 (componente de abas)
│   └── ui/
│       ├── code-editor.tsx            🆕 (editor com syntax highlighting)
│       ├── confirm-dialog.tsx         🆕 (modal de confirmação)
│       └── tabs.tsx                   🆕 (sistema de abas customizado)
├── hooks/
│   ├── useCardFeatures.ts            🆕 (CRUD operations)
│   ├── useCardFeatureForm.ts         🆕 (form state management)
│   └── useLocalStorage.ts            🆕 (persistência local)
├── lib/
│   ├── cardfeature-validation.ts     🆕 (validações)
│   └── cardfeature-utils.ts          🆕 (utilitários)
└── types/
    └── cardfeature.ts                🆕 (tipos específicos)
```

### **🔄 Fluxo de Estados**
```typescript
interface CardFeatureState {
  items: CardFeature[]
  loading: boolean
  error: string | null
  selectedItem: CardFeature | null
  editingItem: CardFeature | null
  isCreating: boolean
  isEditing: boolean
  showDeleteConfirm: boolean
  activeTab: string // Para controlar aba ativa no modal
}

interface CardFeatureActions {
  // Create
  createCardFeature: (data: CreateCardFeatureData) => Promise<void>
  startCreating: () => void
  cancelCreating: () => void
  
  // Read
  fetchCardFeatures: () => Promise<void>
  selectCardFeature: (id: string) => void
  setActiveTab: (tabName: string) => void
  
  // Update  
  updateCardFeature: (id: string, data: UpdateCardFeatureData) => Promise<void>
  startEditing: (id: string) => void
  cancelEditing: () => void
  
  // Delete
  deleteCardFeature: (id: string) => Promise<void>
  showDeleteConfirmation: (id: string) => void
  cancelDelete: () => void
}

interface CardFeature {
  id: string
  title: string
  tech: string
  language: string
  description: string
  screens: {
    name: string        // Nome da aba (Model, Controller, etc.)
    description: string // Descrição do arquivo
    code: string       // Código do arquivo
  }[]
  createdAt: Date
  updatedAt: Date
}
```

## 🎨 **Interface de Usuário Planejada**

### **📱 Layout da Aba Codes Atualizada**
```
┌─────────────────────────────────────────────────────────┐
│ [Início] > [Biblioteca de Códigos] > [React]           │
├─────────────────────────────────────────────────────────┤
│ [🔍 Buscar features...] [🔽 Filtro Tech] [➕ Novo CardFeature] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │ CardFeature1│ │ CardFeature2│ │ CardFeature3│         │
│ │             │ │             │ │             │         │
│ │ [👁️][✏️][🗑️] │ │ [👁️][✏️][🗑️] │ │ [👁️][✏️][🗑️] │         │
│ └─────────────┘ └─────────────┘ └─────────────┘         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │ CardFeature4│ │ CardFeature5│ │ CardFeature6│         │
│ └─────────────┘ └─────────────┘ └─────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### **📝 Modal de Criação/Edição**
```
┌─────────────────────────────────────────────────────────┐
│ ✨ Novo CardFeature                            [❌]     │
├─────────────────────────────────────────────────────────┤
│ Título: [________________________________]              │
│ Tecnologia: [React ▼]  Linguagem: [TypeScript ▼]      │
│ Descrição:                                              │
│ [_________________________________________________]      │
│ [_________________________________________________]      │
│                                                         │
│ 🗂️ Arquivos/Abas:                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Model] [Controller] [+Nova Aba]                   │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Nome da Aba: [Model________] [❌]               │ │ │
│ │ │ Descrição: [Classe User com auth___________]    │ │ │
│ │ │ ┌─────────────────────────────────────────────┐ │ │ │
│ │ │ │ import bcrypt from 'bcrypt'                │ │ │ │
│ │ │ │                                            │ │ │ │
│ │ │ │ export class User {                        │ │ │ │
│ │ │ │   // ... código                            │ │ │ │
│ │ │ │ }                                          │ │ │ │
│ │ │ └─────────────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [👁️ Preview com Abas] [💾 Salvar] [❌ Cancelar]         │
└─────────────────────────────────────────────────────────┘
```

### **👁️ Modal de Visualização com Abas**
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Sistema de Autenticação JWT                  [❌]    │
├─────────────────────────────────────────────────────────┤
│ [Model] [Controller] [Middleware] [Routes]              │
├─────────────────────────────────────────────────────────┤
│ Model - Classe User com métodos de autenticação        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ import bcrypt from 'bcrypt'                        │ │
│ │ import jwt from 'jsonwebtoken'                     │ │
│ │                                                    │ │
│ │ export class User {                                │ │
│ │   // ... código do modelo                          │ │
│ │ }                                                  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## ⚙️ **Implementação por Fases**

### **🔥 Fase 1: Fundação**
1. **Extrair componentes** atuais do `Codes.tsx`:
   - `CardFeature.tsx` 
   - `CardFeatureModal.tsx` (com sistema de abas)
2. **Criar hooks base**:
   - `useCardFeatures.ts` (CRUD básico)
   - `useLocalStorage.ts` (persistência)
3. **Definir tipos** em `types/cardfeature.ts`

### **🚀 Fase 2: Criação**
1. **Implementar formulário**:
   - `CardFeatureForm.tsx`
   - `CardFeatureTabEditor.tsx` (editor de abas)
2. **Adicionar validações**:
   - `lib/cardfeature-validation.ts`
3. **Integrar botão "Novo CardFeature"** na interface

### **✏️ Fase 3: Edição**
1. **Adaptar formulário** para modo edição
2. **Implementar carregamento** de dados existentes com abas
4. **Gerenciamento de abas** (adicionar/remover/reordenar)
3. **Adicionar botões "Editar"** nos cards

### **🗑️ Fase 4: Remoção**
1. **Criar modal** de confirmação
2. **Implementar lógica** de remoção
3. **Adicionar botões "Remover"** nos cards

### **🎨 Fase 5: Melhorias UX**
1. **Code editor** com syntax highlighting
2. **Preview com abas** em tempo real
3. **Animações** de transição entre abas
4. **Drag & drop** para reordenar abas
5. **Validação** aprimorada

## 🧪 **Estratégia de Testes**

### **🔍 Testes Unitários**
- Hooks de CRUD (`useCardFeatures.ts`)
- Validações (`cardfeature-validation.ts`)
- Utilitários (`cardfeature-utils.ts`)

### **🖱️ Testes de Integração**
- Fluxo completo: Criar → Visualizar → Editar → Remover
- Persistência no localStorage
- Filtros e busca com novos itens

### **👤 Testes de Usabilidade**
- Formulário intuitivo e responsivo
- Feedback claro para ações do usuário
- Confirmações adequadas para ações destrutivas

## 📊 **Métricas de Sucesso**

| Critério | Meta |
|----------|------|
| **Tempo para criar CardFeature** | < 2 minutos |
| **Tempo para editar CardFeature** | < 1 minuto |
| **Taxa de erro em formulários** | < 5% |
| **Satisfação do usuário** | > 4.5/5 |
| **Performance** | Sem impacto na navegação |

## 🎯 **Resultado Esperado**

Ao final da implementação, a aba **Codes** será uma **ferramenta completa** para gerenciar CardFeatures, permitindo:

1. **📝 Criação rápida** de novos snippets de código
2. **✏️ Edição simples** de conteúdo existente  
3. **👁️ Visualização otimizada** com modal expandido
4. **🗑️ Remoção segura** com confirmação
5. **🔍 Busca e filtros** funcionando com dados dinâmicos
6. **💾 Persistência local** para não perder dados

**🚀 Meta final:** Transformar o 10xDev em uma plataforma interativa onde desenvolvedores podem contribuir e gerenciar seus próprios CardFeatures com **sistema de abas organizadas**!