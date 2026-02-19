# Migração de platformState para Next.js Routes

## Situação Atual ✅
- Sistema funcional com `platformState` centralizando estados (filtros, navegação)
- Filtros sincronizados entre Home → Codes e vice-versa
- URLs usando query parameters: `/?tab=codes`

## Novo Objetivo 🎯
- Migrar de `platformState` para roteamento nativo do Next.js
- URLs limpas: `/codes`, `/dashboard`, etc.
- Filtros gerenciados por URL search params: `/codes?tech=node.js`

## Plano de Migração

### ✅ Fase 1: Análise Concluída
- [x] Sistema atual funcional com platformState
- [x] Filtros sincronizados corretamente
- [x] Identificação de dependências

### 🔄 Fase 2: Reestruturação de Rotas

#### 1. Criar Estrutura de Páginas
- [ ] `app/codes/page.tsx` - Página de códigos 
- [ ] `app/dashboard/page.tsx` - Dashboard
- [ ] `app/lessons/page.tsx` - Aulas
- [ ] `app/projects/page.tsx` - Projetos
- [ ] `app/ai/page.tsx` - IA
- [ ] Manter `app/page.tsx` como Home

#### 2. Migrar Filtros para URL Search Params
- [ ] `/codes?tech=node.js&search=api` para filtros
- [ ] `/dashboard?period=month&metric=views` para dashboard
- [ ] Usar `useSearchParams()` e `useRouter()` do Next.js
- [ ] Remover filtros do `usePlatform`

#### 3. Atualizar Navegação
- [ ] Home.tsx: `router.push('/codes?tech=node.js')` nos quick access
- [ ] AppSidebar: navegação direta com `Link` ou `router.push()`
- [ ] Breadcrumbs: usar rota atual em vez de estado

#### 4. Refatorar Hooks
- [ ] **useCardFeatures**: receber filtros via props em vez de platformState
- [ ] **Remover usePlatform**: não será mais necessário
- [ ] Cada página gerencia seus próprios filtros via URL

#### 5. Componentes Afetados
- [ ] **Codes.tsx**: migrar para `app/codes/page.tsx`
- [ ] **Dashboard.tsx**: migrar para `app/dashboard/page.tsx`  
- [ ] **Home.tsx**: atualizar links para rotas diretas
- [ ] **AppSidebar**: usar navegação Next.js

### 🔄 Fase 3: Implementação

#### Ordem de Execução:
1. [ ] Criar páginas individuais copiando componentes existentes
2. [ ] Implementar filtros via URL search params em `/codes`
3. [ ] Atualizar navegação na Home e Sidebar
4. [ ] Testar todas as rotas e filtros
5. [ ] Remover platformState e usePlatform
6. [ ] Cleanup de código não utilizado

### 🎯 Resultado Final
- **URLs limpas**: `/codes`, `/dashboard` 
- **Filtros em URL**: `/codes?tech=react&search=hooks`
- **Navegação nativa**: botão voltar/avançar funcional
- **SEO friendly**: cada página tem URL própria
- **Sem estado global**: cada página independente
- **Performance**: lazy loading por rota

### 📋 Validações
- [ ] Navegação sidebar → funcionando
- [ ] Links da Home → aplicando filtros corretos  
- [ ] URLs diretas → carregando páginas
- [ ] Filtros persistem → ao recarregar página
- [ ] Breadcrumbs → refletindo rota atual
- [ ] Botões voltar/avançar → funcionando

## Benefícios da Migração
- 🚀 URLs compartilháveis com filtros
- 🔍 Melhor SEO (cada rota indexável)
- 🎯 Navegação nativa do navegador  
- 🧹 Código mais limpo (sem estado global)
- ⚡ Performance (code splitting automático)