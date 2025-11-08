# Implementação: Página Única com Toggle de Visualização

## Objetivo
Unificar as páginas `Codes.tsx` e `CodesV2.tsx` em uma única página `Codes.tsx` com alternância entre:
- **View por Cards** (layout em grid 2 colunas - original do Codes.tsx)
- **View por Linha** (layout vertical compacto - original do CodesV2.tsx, **padrão**)

**Estratégia**: CodesV2.tsx se tornará o novo Codes.tsx (substituição completa)

## Checklist de Implementação

### 🎯 **Fase 1: Preparação e Estado**
- [x] Criar estado `viewMode` com tipo `'cards' | 'list'` (padrão: `'list'`)
- [x] Importar `CardFeature` além do `CardFeatureCompact` já existente
- [x] Importar `CardFeatureModal` para funcionalidade de expansão
- [x] Adicionar estado `openModalId` para controlar modal de expansão

### 🎯 **Fase 2: Header e Controles**
- [x] **Layout na tela**: Adicionar grupo de 2 botões no header (lado direito, antes do botão "Novo CardFeature")
- [x] **Button Group**: Criar grupo visual com bordas conectadas, botão ativo destacado
- [x] Implementar ícones apropriados:
  - `LayoutGrid` para view por cards (grid 2x2)
  - `List` para view por linha (3 linhas horizontais)
- [x] **Estado visual**: Botão ativo com background azul, inativo com background cinza claro
- [x] Implementar handlers `setViewMode('cards')` e `setViewMode('list')`
- [x] **Tooltips**: "Visualização em Cards" e "Visualização em Lista"

### 🎯 **Fase 3: Renderização Condicional**
- [x] Substituir a seção de conteúdo atual por renderização condicional
- [x] **View 'list'** (padrão): Manter layout atual com `CardFeatureCompact`
- [x] **View 'cards'**: Implementar grid 2 colunas com `CardFeature`
- [x] Manter handlers existentes funcionando em ambas as views

### 🎯 **Fase 4: Modal de Expansão**
- [x] Adicionar `CardFeatureModal` (só ativo na view por cards)
- [x] Implementar handler `onExpand` que define `openModalId`
- [x] Conectar modal com dados do snippet correto
- [x] Adicionar handler `onClose` que limpa `openModalId`

### 🎯 **Fase 5: Integração e Limpeza**
- [x] **⚠️ ATENÇÃO: O backend é ÚNICO** - Ambas as páginas usam mesmo hook, services e API
- [x] **🔄 RENOMEAR**: `CodesV2.tsx` → `Codes.tsx` (substituir arquivo antigo)
- [x] **📝 MODIFICAR**: Interface `CodesV2Props` → `CodesProps`
- [x] **📝 MODIFICAR**: Export `CodesV2` → `Codes`
- [x] **📝 MODIFICAR**: `frontend/app/page.tsx` - Remover renderização de `codes-v2`, manter apenas `codes`
- [x] **📝 MODIFICAR**: `frontend/components/AppSidebar.tsx` - Remover item "Códigos v2" do menu
- [x] **🔍 VERIFICAR**: Todas as referências agora apontam para `"codes"` (aba única)
- [x] Verificar se todos os handlers (edit, delete, create) funcionam em ambas as views
- [x] Testar alternância entre views mantendo filtros e busca
- [x] Verificar responsividade em ambas as visualizações
- [x] Limpar imports não utilizados

### 🎯 **Fase 6: Breadcrumb e UX**
- [x] Atualizar texto do breadcrumb de "Códigos v2" para "Blocos de Códigos"
- [x] Adicionar tooltips nos botões de toggle
- [x] Verificar estados de loading/error em ambas as views
- [x] Testar empty state em ambos os layouts


## Resultado Esperado
- ✅ Uma única página `Codes.tsx` (CodesV2.tsx renomeado) que substitui a antiga
- ✅ Toggle funcional entre visualizações
- ✅ View lista como visualização padrão
- ✅ Funcionalidade completa (CRUD) em ambas as views
- ✅ Modal de expansão na view por cards
- ✅ UX consistente e intuitiva
- ✅ Navegação unificada na aba `"codes"` (sem mais `"codes-v2"`) 