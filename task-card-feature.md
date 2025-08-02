# Task: Adicionar Campo de Rota no CardFeature

## Objetivo
Adicionar um campo de rota no componente CardFeature.tsx para exibir o caminho do arquivo no topo da área de código, como "backend\src\models\CardFeatureModel.ts".

## Análise da Estrutura Atual

### CardFeatureScreen Interface (atual)
```typescript
// frontend/types/cardfeature.ts (linhas 8-12)
export interface CardFeatureScreen {
  name: string        // Nome da aba (ex: "Model", "Controller", "Routes")
  description: string // Descrição do que o arquivo faz
  code: string       // Código do arquivo
}
```

### Local de Exibição no Componente
**Arquivo**: `frontend/components/CardFeature.tsx`
- **Container**: `div` com classes `rounded-xl shadow-xl p-6 h-[19rem]` (linha 100)
- **Posição**: Entre os botões de ação (linhas 121-153) e o `SyntaxHighlighter` (linha 156-160)
- **Área disponível**: Espaço no topo da área de código

## Decisões de Design

### ✅ Decisões Tomadas
1. **Rota por Screen/Tab individual** - Cada aba pode ter sua própria rota
2. **Campo opcional** - Manter compatibilidade com dados existentes
3. **Apenas display inicialmente** - Não incluir formulários na primeira implementação
4. **Posição**: Topo da área de código, abaixo dos botões Edit/Expand

### Design Visual Proposto
- **Localização**: Entre botões de ação e SyntaxHighlighter
- **Estilo**: Texto pequeno, cor gray-500/600, família de fonte monospace
- **Layout**: Alinhado à esquerda, com ícone opcional (📁 ou 📄)
- **Responsividade**: Texto truncado se necessário, com tooltip
- **Visibilidade**: Exibir apenas quando `route` estiver presente

## Plano de Implementação

### Fase 1: Atualizar Tipos TypeScript ⏳
**Arquivo**: `frontend/types/cardfeature.ts`
- [ ] Adicionar campo `route?: string` na interface `CardFeatureScreen`
- [ ] Manter todas as interfaces relacionadas compatíveis
- [ ] Documentar o novo campo

### Fase 2: Implementar Display no Componente ⏳
**Arquivo**: `frontend/components/CardFeature.tsx`
- [ ] Adicionar elemento para exibir a rota
- [ ] Posicionar entre botões de ação e código
- [ ] Aplicar estilos consistentes com o design atual
- [ ] Implementar lógica condicional (só exibir se route existir)
- [ ] Adicionar tratamento para rotas longas (truncate + tooltip)

### Fase 3: Testes e Refinamentos ⏳
- [ ] Testar com dados mockados incluindo campo `route`
- [ ] Verificar responsividade em diferentes tamanhos de tela
- [ ] Ajustar estilos se necessário
- [ ] Documentar mudanças realizadas

## Detalhes Técnicos

### Estrutura do Campo Route
```typescript
export interface CardFeatureScreen {
  name: string
  description: string
  code: string
  route?: string  // Novo campo opcional
}
```

### Implementação no Componente
```typescript
// Exemplo de uso no CardFeature.tsx
const activeScreen = snippet.screens[activeTab] || snippet.screens[0]

// No JSX, adicionar antes do SyntaxHighlighter:
{activeScreen.route && (
  <div className="mb-2 text-xs text-gray-500 font-mono">
    📁 {activeScreen.route}
  </div>
)}
```

### Estilos Sugeridos
- `text-xs` - Tamanho pequeno
- `text-gray-500` - Cor discreta
- `font-mono` - Fonte monospace (consistente com código)
- `mb-2` - Margem inferior para separar do código
- `truncate` - Truncar texto longo se necessário

## Impactos e Compatibilidade

### ✅ Sem Impacto
- **Backend**: Não requer alterações (campo opcional)
- **Dados existentes**: Continuam funcionando normalmente
- **API**: Não afetada na implementação inicial

### 🔄 Futuras Extensões
- Formulários de criação/edição para incluir campo route
- Validação de formato de path
- Funcionalidade de copiar rota para clipboard
- Integração com backend para persistir rotas

## Arquivos Afetados
1. ✏️ `frontend/types/cardfeature.ts` - Adicionar campo route
2. ✏️ `frontend/components/CardFeature.tsx` - Display da rota
3. 📋 `task-card-feature.md` - Documentação (este arquivo)

## Timeline Estimado
- **Fase 1**: 15 minutos - Atualizar tipos
- **Fase 2**: 30 minutos - Implementar display
- **Fase 3**: 15 minutos - Testes e ajustes
- **Total**: ~1 hora

## Exemplo de Rota
```
backend\src\models\CardFeatureModel.ts
frontend\components\CardFeature.tsx
api\routes\users.js
```