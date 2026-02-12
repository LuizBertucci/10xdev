---
name: Drag and Drop Categorias
overview: Implementar funcionalidade de arrastar e soltar (drag-and-drop) para reordenar categorias na tela de Sumário do Projeto, permitindo que o usuário organize as categorias na ordem desejada e persistindo essa ordem no backend.
todos:
  - id: backend-types
    content: Adicionar categoryOrder ao UpdateProjectRequest e ProjectResponse em backend/src/types/project.ts
    status: completed
  - id: backend-model
    content: Atualizar ProjectModel.transformToResponse e ProjectModel.update para suportar category_order
    status: completed
  - id: frontend-types
    content: Adicionar categoryOrder aos tipos Project e UpdateProjectData em frontend/services/projectService.ts
    status: completed
  - id: load-order
    content: Carregar categoryOrder do projeto ao abrir modal e inicializar orderedCategories em ProjectSummary
    status: completed
  - id: dnd-setup
    content: Configurar DndContext, sensores e SortableContext no ProjectSummary
    status: completed
  - id: sortable-item
    content: Criar componente SortableCategoryItem com useSortable e handle de arrasto
    status: completed
  - id: drag-handler
    content: Implementar handleDragEnd para atualizar orderedCategories e persistir no backend
    status: completed
  - id: ui-integration
    content: Integrar drag-and-drop na UI, substituindo lista estática por lista sortable com indicadores visuais
    status: completed
isProject: false
---

# Implementar Drag-and-Drop de Categorias no Project Summary

## Contexto

O componente `ProjectSummary` exibe categorias (tags) dos cards em uma lista à esquerda, ordenadas alfabeticamente. O usuário deseja poder arrastar essas categorias para reordená-las. A biblioteca `@dnd-kit` já está instalada no projeto e é usada em `CardFeatureForm.tsx` como referência.

## Análise Técnica

### Estado Atual

- **Frontend**: `ProjectSummary.tsx` ordena categorias alfabeticamente via `summaryCategories.sort((a, b) => a.localeCompare(b, "pt-BR"))`
- **Backend**: O campo `category_order?: string[] | null` existe em `ProjectRow` e `ProjectInsert`, mas:
  - Não está em `ProjectUpdate` (não pode ser atualizado)
  - Não está em `ProjectResponse` (não é retornado)
  - Não há endpoint/método para atualizar a ordem
- **Banco de Dados**: ✅ **Migration aplicada** - A coluna `category_order TEXT[]` foi criada na tabela `projects` via MCP Supabase (migration: `add_category_order_to_projects`)

### Bibliotecas Disponíveis

- `@dnd-kit/core`: ^6.3.1 ✅
- `@dnd-kit/sortable`: ^10.0.0 ✅
- `@dnd-kit/utilities`: ^3.2.2 ✅

### Referência de Implementação

`CardFeatureForm.tsx` (linhas 10-13, 242-248, 426-427) já implementa drag-and-drop usando:

- `DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`
- `SortableContext`, `verticalListSortingStrategy`
- `useSortable` hook para itens sortables

## Implementação

### 1. Backend - Adicionar suporte para `category_order`

**Arquivo**: `backend/src/types/project.ts`

- Adicionar `categoryOrder?: string[]` ao `UpdateProjectRequest`
- Adicionar `categoryOrder?: string[]` ao `ProjectResponse`

**Arquivo**: `backend/src/models/ProjectModel.ts`

- Atualizar `transformToResponse` para incluir `categoryOrder: row.category_order || null`
- Atualizar `update` para aceitar e persistir `category_order` quando fornecido em `data`

**Arquivo**: `backend/src/controllers/ProjectController.ts`

- O método `update` já está preparado, apenas precisa aceitar `categoryOrder` do body e passar para o model

### 2. Frontend - Atualizar tipos e service

**Arquivo**: `frontend/services/projectService.ts`

- Adicionar `categoryOrder?: string[]` ao tipo `UpdateProjectData`
- Adicionar `categoryOrder?: string[]` ao tipo `Project`

### 3. Frontend - Implementar drag-and-drop

**Arquivo**: `frontend/components/ProjectSummary.tsx`

#### 3.1. Imports e setup

- Importar componentes do `@dnd-kit`:
  - `DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors`, `DragEndEvent`
  - `arrayMove`, `SortableContext`, `sortableKeyboardCoordinates`, `verticalListSortingStrategy`
  - `useSortable` hook
  - `CSS` utility

#### 3.2. Estado e lógica

- Adicionar estado `orderedCategories` para manter a ordem customizada
- Carregar `categoryOrder` do projeto ao abrir o modal (via `projectService.getById`)
- Se `categoryOrder` existir, usar essa ordem; caso contrário, usar ordem alfabética
- Implementar `handleDragEnd` para atualizar `orderedCategories` localmente
- Persistir ordem no backend após drag (debounce de ~500ms ou salvar imediatamente)

#### 3.3. Componente SortableItem

- Criar componente `SortableCategoryItem` usando `useSortable`
- Adicionar handle de arrasto (ícone `GripVertical` do lucide-react)
- Aplicar estilos de drag (opacity, transform) via `CSS.Transform.toString(transform)`

#### 3.4. UI

- Envolver lista de categorias com `DndContext` e `SortableContext`
- Substituir `summaryCategories.map` por renderização usando `orderedCategories`
- Adicionar indicador visual de arrasto (handle, hover states)

### 4. Persistência

- Criar função `saveCategoryOrder` que chama `projectService.update(projectId, { categoryOrder: orderedCategories })`
- Chamar após `handleDragEnd` (com debounce opcional para evitar muitas requisições)
- Mostrar toast de sucesso/erro

## Estrutura de Dados

```typescript
// Ordem salva no backend
category_order: ["API", "Autenticação Supabase", "CardFeature", "Geral", ...]

// Se category_order existe: usar essa ordem
// Se não existe: usar ordem alfabética como fallback
// Ao adicionar nova categoria: adicionar ao final da lista ordenada
```

## Considerações

1. **Novas categorias**: Quando uma nova tag aparece (não está em `categoryOrder`), adicionar ao final da lista ordenada
2. **Categorias removidas**: Se uma categoria não existe mais mas está em `categoryOrder`, filtrar da lista
3. **Permissões**: Verificar se usuário tem permissão para atualizar projeto (owner/admin)
4. **Performance**: Debounce de salvamento para evitar muitas requisições durante arrastos rápidos
5. **Feedback visual**: Mostrar estado de loading durante salvamento

## Arquivos a Modificar

- `backend/src/types/project.ts` - Adicionar `categoryOrder` aos tipos
- `backend/src/models/ProjectModel.ts` - Suporte para atualizar/retornar `category_order`
- `frontend/services/projectService.ts` - Adicionar `categoryOrder` aos tipos
- `frontend/components/ProjectSummary.tsx` - Implementar drag-and-drop completo