# Plano: Card Per Line com Toggle Inline (Nova Aba de Teste)

## Objetivo
Criar uma nova aba "Códigos v2" para testar a visualização alternativa onde:
- Cada card apareça em uma única linha (ao invés do grid 2 colunas)
- O código não apareça no índice inicial
- Tenha um toggle na direita para abrir o código inline
- Mantenha todas as informações do card visíveis (título, descrição, badges)
- **MANTER** a aba original "Códigos" intacta para comparação

## Análise da Situação Atual
- **Sistema de abas**: AppSidebar.tsx com menuItems array
- **Layout atual**: Grid com 2 colunas (`grid-cols-1 lg:grid-cols-2`)
- **Componente**: `CardFeature.tsx` com altura fixa de `h-[29rem]`
- **Preview de código**: Sempre visível com syntax highlighting
- **Abas**: Sistema de tabs sempre visível
- **Ações**: Edit, Expand (modal), Delete

## Implementação Proposta

### Estrutura do CardFeatureCompact

#### Estado Collapsed (padrão):
```
[Tech Badge] [Lang Badge] | [Título + Descrição] | [Edit] [Delete] [Toggle ↓]
```

#### Estado Expanded:
```
[Tech Badge] [Lang Badge] | [Título + Descrição] | [Edit] [Delete] [Toggle ↑]
[-------------- Área de código com tabs (igual ao CardFeature atual) --------------]
```

## Passo a Passo de Implementação

#### ETAPA 1: Criar Nova Aba e Página Inicial ⭐ (PRIMEIRA)
- [ ] Modificar `frontend/components/AppSidebar.tsx` - adicionar nova aba no menuItems:
```javascript
{
  title: "Códigos v2",
  icon: Code2,
  key: "codes-v2", 
  description: "Teste: Cards em linha",
}
```
- [ ] Criar arquivo `frontend/pages/CodesV2.tsx` - página básica inicial:
```javascript
export default function CodesV2({ platformState }: CodesProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Códigos v2 - Layout em Lista</h1>
      <p className="text-gray-600">Nova visualização de cards em desenvolvimento...</p>
    </div>
  )
}
```
- [ ] Modificar `frontend/app/page.tsx` - adicionar import e renderização:
```javascript
import CodesV2 from "@/pages/CodesV2"
// ...
{platformState.activeTab === "codes-v2" && <CodesV2 platformState={platformState} />}
```
- [ ] Testar navegação entre "Códigos" e "Códigos v2"
- [ ] Verificar que nova aba aparece e renderiza conteúdo básico

**Check**: ✅ Nova aba "Códigos v2" funciona e mostra página básica

#### ETAPA 2: Criar CardFeatureCompact.tsx - Layout Horizontal Básico
- [ ] Criar arquivo `frontend/components/CardFeatureCompact.tsx`
- [ ] Definir interface `CardFeatureCompactProps` (mesma do CardFeature)
- [ ] Implementar layout horizontal com flexbox
- [ ] Adicionar seção de badges (tech + language)
- [ ] Adicionar seção de informações (título + descrição)  
- [ ] Adicionar seção de actions (edit, delete, toggle placeholder)
- [ ] Testar renderização básica sem funcionalidade

**Check**: ✅ Componente renderiza horizontalmente com informações visíveis

#### ETAPA 3: Implementar Estado e Toggle Button
- [ ] Adicionar estado `isExpanded` (useState, padrão false)
- [ ] Implementar função `toggleExpanded`
- [ ] Criar botão toggle com ícones ChevronDown/ChevronUp
- [ ] Adicionar tooltips ("Expandir código" / "Recolher código")
- [ ] Testar mudança de estado e ícones

**Check**: ✅ Toggle funciona e muda ícone corretamente

#### ETAPA 4: Adicionar Área de Código Condicional  
- [ ] Importar componentes: SyntaxHighlighter, getTechConfig, getLanguageConfig
- [ ] Adicionar estado `activeTab` para controle das tabs
- [ ] Criar área condicional que renderiza quando `isExpanded = true`
- [ ] Reutilizar lógica de tabs do CardFeature original
- [ ] Integrar SyntaxHighlighter com tema atual
- [ ] Adicionar transições CSS smooth para expand/collapse

**Check**: ✅ Código aparece/desaparece com tabs funcionais

#### ETAPA 5: Integrar CardFeatureCompact na CodesV2
- [ ] Modificar `CodesV2.tsx` para usar CardFeatureCompact
- [ ] Alterar import: `CardFeature` → `CardFeatureCompact`
- [ ] Modificar layout container: `grid grid-cols-1 lg:grid-cols-2 gap-6` → `space-y-4`
- [ ] Remover prop `onExpand` (não usa mais modal)
- [ ] Manter todas outras props: onEdit, onDelete
- [ ] Testar página com novo layout

**Check**: ✅ Página renderiza com cards em lista vertical

#### ETAPA 6: Ajustes de Responsividade
- [ ] Testar layout em diferentes tamanhos de tela
- [ ] Ajustar breakpoints se necessário (sm, md, lg, xl)
- [ ] Verificar comportamento do toggle em mobile
- [ ] Ajustar espaçamentos e paddings
- [ ] Testar área de código expandida em mobile

**Check**: ✅ Layout responsivo funciona em todos dispositivos

#### ETAPA 7: Validação Completa das Funcionalidades
- [ ] Testar busca (search) funcionando
- [ ] Testar filtros por tecnologia funcionando
- [ ] Testar criação de novo CardFeature
- [ ] Testar edição de CardFeature existente
- [ ] Testar exclusão de CardFeature
- [ ] Testar navegação entre tabs dentro dos cards
- [ ] Testar syntax highlighting em diferentes linguagens
- [ ] Validar estados de loading e erro

**Check**: ✅ Todas funcionalidades CRUD + busca/filtro operacionais

#### ETAPA 8: Polimento Final
- [ ] Ajustar transições CSS para suavidade
- [ ] Verificar consistência de cores e espaçamentos
- [ ] Otimizar performance se necessário
- [ ] Testar acessibilidade (keyboard navigation)
- [ ] Documentar diferenças vs versão original
- [ ] Criar feedback para decisão final

**Check**: ✅ UX polida e ready para avaliação comparativa

## Critérios de Sucesso Final
- ✅ Cards aparecem um por linha
- ✅ Código não visível por padrão
- ✅ Toggle funcional para expand/collapse
- ✅ Todas funcionalidades CRUD funcionando
- ✅ Search e filter mantidos
- ✅ Responsivo em diferentes tamanhos
- ✅ Performance similar ou melhor
- ✅ Aba original intacta para comparação
- ✅ Transições suaves e UX polida

## Vantagens da Abordagem
- **Teste isolado**: Não afeta funcionalidade existente
- **Comparação direta**: Usuário pode alternar entre versões
- **Risco zero**: Implementação não destrutiva  
- **Feedback fácil**: Pode testar ambas versões lado a lado