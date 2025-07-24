# Plano de Reestruturação do Projeto

O arquivo `app/page.tsx` é bastante extenso e contém a lógica e a UI de várias seções da aplicação. Para reestruturá-lo e facilitar a manutenção, proponho o seguinte plano:

## 📊 **Análise do Problema Atual**

O `page.tsx` está sobrecarregado com:
- **6 abas diferentes** (home, codes, lessons, projects, ai, dashboard) - cada uma com 100-300 linhas
- **Lógica de estado complexa** misturada com UI
- **Dados hardcoded** dentro do componente (alguns já foram movidos para `/data`)
- **Componentes inline** que poderiam ser reutilizáveis
- **Falta de separação de responsabilidades**

O arquivo atual tem **~1.200 linhas** e contém 6 abas diferentes com lógica complexa misturada.

## 🎯 **Plano de Componentização Detalhado**

### **Fase 1: Criar Hook Customizado para Estado Global**
```typescript
// frontend/hooks/use-platform.ts
```
**Sub-etapa 1.1: Mover estado básico e seus setters (Concluído)**
- Mover `activeTab`, `searchTerm`, `selectedTech` e suas funções `setActiveTab`, `setSearchTerm`, `setSelectedTech` para `use-platform.ts`.

**Sub-etapa 1.2: Mover lógica de filtragem (Concluído)**
- Mover a lógica de `filteredSnippets` para `use-platform.ts`, retornando os snippets já filtrados.

**Sub-etapa 1.3: Mover estado de favoritos (Concluído)**
- Mover `favorites` e a função `toggleFavorite` para `use-platform.ts`.

### **Fase 2: Extrair Páginas por Aba**
Criar 6 páginas separadas em `frontend/pages/`:

**🏠 Home.tsx** (~200 linhas → 50 linhas)
- Hero Section
- Quick Access Blocks → `HomeQuickAccessBlock.tsx`
- Featured Videos → `HomeFeaturedVideoCard.tsx` 
- Featured Projects → `HomeFeaturedProjectCard.tsx`

**💻 Codes.tsx** (~300 linhas → 80 linhas)
- Breadcrumb → `CodeBreadcrumb.tsx`
- Search Bar → `CodeSearchBar.tsx`
- Code Cards → `CodeSnippetCard.tsx`
- Modal → `CodeExpansionModal.tsx`

**🎓 Lessons.tsx** (~250 linhas → 70 linhas)
- Progress Header → `LessonProgressHeader.tsx`
- Lesson Cards → `LessonCard.tsx`
- Track Tabs → Reutilizar componente existente

**📁 Projects.tsx** (~200 linhas → 60 linhas)
- Project Cards → `ProjectTemplateCard.tsx`
- Requirements List → Componente interno

**🤖 AI.tsx** (~400 linhas → 100 linhas)
- Automation Cards → `AIAutomationCard.tsx`
- Cursor Rules → `CursorRuleCard.tsx`
- MCP Servers Table → `MCPServerTable.tsx`
- Tips Cards → `AITipCard.tsx`

**📊 Dashboard.tsx** (~300 linhas → 80 linhas)
- Sidebar Features → `DashboardSidebar.tsx`
- Code Preview → `CodePreviewCard.tsx`
- Tabs Content → Componentes menores

### **Fase 3: Componentes Reutilizáveis**
Criar 15+ componentes em `frontend/components/`:

**Cards e Containers:**
- `HomeQuickAccessBlock.tsx` - Blocos de acesso rápido
- `HomeFeaturedVideoCard.tsx` - Cards de vídeos em destaque
- `HomeFeaturedProjectCard.tsx` - Cards de projetos em destaque
- `CodeSnippetCard.tsx` - Cards de snippets de código
- `LessonCard.tsx` - Cards de videoaulas
- `ProjectTemplateCard.tsx` - Cards de templates

**Navegação e Busca:**
- `CodeBreadcrumb.tsx` - Navegação breadcrumb
- `CodeSearchBar.tsx` - Barra de busca com filtros
- `LessonProgressHeader.tsx` - Header com progresso

**Modais e Overlays:**
- `CodeExpansionModal.tsx` - Modal para expandir código

### **Fase 4: Refatorar Dados Restantes**
Mover dados hardcoded restantes:
- `frontend/data/ai.ts` - Dados da aba IA
- `frontend/data/dashboard.ts` - Dados do dashboard
- Completar separação de todos os dados

### **Fase 5: Otimizar page.tsx Principal**
O arquivo principal ficará com apenas **~100 linhas**:
```typescript
export default function DevPlatform() {
  const platformState = usePlatform()
  
  return (
    <SidebarProvider>
      <AppSidebar {...platformState} />
      <SidebarInset>
        <Header />
        <main>
          {platformState.activeTab === "home" && <Home {...platformState} />}
          {platformState.activeTab === "codes" && <Codes {...platformState} />}
          {platformState.activeTab === "lessons" && <Lessons {...platformState} />}
          {platformState.activeTab === "projects" && <Projects {...platformState} />}
          {platformState.activeTab === "ai" && <AI {...platformState} />}
          {platformState.activeTab === "dashboard" && <Dashboard {...platformState} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

## Estrutura de Diretórios Final

```
.
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx (muito mais limpo - ~100 linhas)
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Codes.tsx
│   │   ├── Lessons.tsx
│   │   ├── Projects.tsx
│   │   ├── AI.tsx
│   │   └── Dashboard.tsx
│   ├── components/
│   │   ├── ui/ (apenas componentes shadcn)
│   │   ├── AppSidebar.tsx
│   │   ├── CodeSnippetCard.tsx
│   │   ├── CodeSearchBar.tsx
│   │   ├── CodeBreadcrumb.tsx
│   │   ├── HomeQuickAccessBlock.tsx
│   │   ├── HomeFeaturedVideoCard.tsx
│   │   ├── HomeFeaturedProjectCard.tsx
│   │   ├── LessonCard.tsx
│   │   ├── LessonProgressHeader.tsx
│   │   ├── ProjectTemplateCard.tsx
│   │   ├── CodeExpansionModal.tsx
│   │   ├── AIAutomationCard.tsx
│   │   ├── CursorRuleCard.tsx
│   │   ├── MCPServerTable.tsx
│   │   ├── AITipCard.tsx
│   │   ├── DashboardSidebar.tsx
│   │   └── CodePreviewCard.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── use-platform.ts
│   ├── data/
│   │   ├── sidebar.ts
│   │   ├── home.ts
│   │   ├── codes.ts
│   │   ├── lessons.ts
│   │   ├── projects.ts
│   │   ├── ai.ts
│   │   └── dashboard.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── public/
│   │   ├── placeholder-logo.png
│   │   ├── placeholder-logo.svg
│   │   ├── placeholder-user.jpg
│   │   ├── placeholder.jpg
│   │   └── placeholder.svg
│   └── styles/
│       └── globals.css
├── backend/
│   └── (futuros arquivos de backend)
├── .gitignore
├── components.json
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
└── tsconfig.json
