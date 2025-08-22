# Implementação: Página Única com Toggle de Visualização

## Objetivo
Unificar as páginas `Codes.tsx` e `CodesV2.tsx` em uma única página com alternância entre:
- **View por Cards** (layout em grid 2 colunas - original do Codes.tsx)
- **View por Linha** (layout vertical compacto - original do CodesV2.tsx, **padrão**)

## Checklist de Implementação

### 🎯 **Fase 1: Preparação e Estado**
- [ ] Criar estado `viewMode` com tipo `'cards' | 'list'` (padrão: `'list'`)
- [ ] Importar `CardFeature` além do `CardFeatureCompact` já existente
- [ ] Importar `CardFeatureModal` para funcionalidade de expansão
- [ ] Adicionar estado `openModalId` para controlar modal de expansão

### 🎯 **Fase 2: Header e Controles**
- [ ] Adicionar botões de toggle no header (lado direito, após o botão "Novo CardFeature")
- [ ] Implementar ícones apropriados:
  - `LayoutGrid` para view por cards
  - `List` para view por linha
- [ ] Adicionar estilos condicionais para botão ativo
- [ ] Implementar handlers `setViewMode('cards')` e `setViewMode('list')`

### 🎯 **Fase 3: Renderização Condicional**
- [ ] Substituir a seção de conteúdo atual por renderização condicional
- [ ] **View 'list'** (padrão): Manter layout atual com `CardFeatureCompact`
- [ ] **View 'cards'**: Implementar grid 2 colunas com `CardFeature`
- [ ] Manter handlers existentes funcionando em ambas as views

### 🎯 **Fase 4: Modal de Expansão**
- [ ] Adicionar `CardFeatureModal` (só ativo na view por cards)
- [ ] Implementar handler `onExpand` que define `openModalId`
- [ ] Conectar modal com dados do snippet correto
- [ ] Adicionar handler `onClose` que limpa `openModalId`

### 🎯 **Fase 5: Integração e Limpeza**
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