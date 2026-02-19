# Análise: Edição de card dentro do Projeto (fix_edit_card_in_project)

## Resumo

O ProjectDetail.tsx **já possui** o fluxo de edição implementado. A descrição do PRD ("onEdit vazio linha ~1403") está desatualizada.

## ProjectDetail.tsx – fluxo atual

| Elemento | Localização | Implementação |
|----------|-------------|----------------|
| `onEdit` do CardFeatureCompact | L.1439 | `onEdit={handleEditCard}` – **não está vazio** |
| `handleEditCard` | L.820-823 | `setEditingCard(card)`, `setIsEditingCard(true)` |
| `handleEditCardClose` | L.825-828 | Reseta estado |
| `handleEditCardSubmit` | L.830-850 | `cardFeatureService.update()`, `setCardFeatures()` |
| CardFeatureForm | L.2065-2074 | Modal de edição com `initialData`, `onClose`, `onSubmit` |

## Codes.tsx – fluxo de edição

- Usa `useCardFeatures`
- `onEdit`: `(s) => { if (!canEdit) return; cardFeatures.startEditing(s) }`
- `handleEditSubmit` chama a API via hook
- CardFeatureForm: `cardFeatures.editingItem`, `cardFeatures.cancelEditing`, `handleEditSubmit`

## Contents.tsx – fluxo de edição

- Usa `useCardFeatures`
- `onEdit`: `(snippet) => cardFeatures.startEditing(snippet)`
- `onUpdate`: `cardFeatures.updateCardFeature`
- Fluxo similar ao Codes

## CardFeatureCompact – comportamento

- Botão Editar no `DropdownMenu` (⋮), L.386-394
- Chamada `onEdit(snippet)` ao clicar em "Editar"
- `disabled={!canEdit}`, onde `canEdit = user?.role === 'admin' || (!!user?.id && snippet.createdBy === user.id)`
- Ou seja: apenas admin ou dono do card pode editar

## Diferenças ProjectDetail vs Codes/Contents

| Aspecto | ProjectDetail | Codes/Contents |
|--------|---------------|----------------|
| Estado de edição | Local (`editingCard`, `isEditingCard`) | Hook `useCardFeatures` |
| Atualização de lista | `setCardFeatures(prev => prev.map(...))` | Via hook |
| `onUpdate` no Compact | **Não passado** | Passado para visibility/summary |

## Pontos de atenção para implementação

1. **canEdit**: Em ProjectDetail, membros do projeto que não são donos do card não conseguem editar (Edit desabilitado).
2. **onUpdate**: ProjectDetail não passa `onUpdate` ao CardFeatureCompact; mudanças de visibilidade e geração de resumo podem não funcionar no contexto do projeto.
3. **Validação**: O fluxo atual parece correto; o problema relatado pode ser de permissões (`canEdit`) ou de UI (formulário não abrindo ou lista não atualizando).
4. **Próximo passo**: Na microtarefa `fix_edit_implement`, validar se o fluxo atual está correto e, se necessário, garantir que membros do projeto com permissão possam editar.
