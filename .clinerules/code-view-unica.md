# Implementação: Página Única com Toggle de Visualização

## Objetivo
Unificar as páginas `Codes.tsx` e `CodesV2.tsx` em uma única página com alternância entre:
- **View por Cards** (layout em grid 2 colunas - original do Codes.tsx)
- **View por Linha** (layout vertical compacto - original do CodesV2.tsx, **padrão**)

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
- [ ] Adicionar `CardFeatureModal` (só ativo na view por cards)
- [ ] Implementar handler `onExpand` que define `openModalId`
- [ ] Conectar modal com dados do snippet correto
- [ ] Adicionar handler `onClose` que limpa `openModalId`

### 🎯 **Fase 5: Integração e Limpeza**
- [ ] **⚠️ ATENÇÃO: Implementar sistema CRUD único** - Unificar os handlers para que funcionem consistentemente em ambas as views
- [ ] Verificar se todos os handlers (edit, delete, create) funcionam em ambas as views
- [ ] Testar alternância entre views mantendo filtros e busca
- [ ] Verificar responsividade em ambas as visualizações
- [ ] Limpar imports não utilizados

### 🎯 **Fase 6: Breadcrumb e UX**
- [ ] Atualizar texto do breadcrumb de "Códigos v2" para "Biblioteca de Códigos"
- [ ] Adicionar tooltips nos botões de toggle
- [ ] Verificar estados de loading/error em ambas as views
- [ ] Testar empty state em ambos os layouts

## Estrutura do Código

### Estado Adicional Necessário
```typescript
const [viewMode, setViewMode] = useState<'cards' | 'list'>('list')
const [openModalId, setOpenModalId] = useState<string | null>(null)
```

## Resultado Esperado
- ✅ Uma única página que substitui ambas `Codes.tsx` e `CodesV2.tsx`
- ✅ Toggle funcional entre visualizações
- ✅ CodesV2 (lista) como visualização padrão
- ✅ Funcionalidade completa (CRUD) em ambas as views
- ✅ Modal de expansão na view por cards
- ✅ UX consistente e intuitiva 