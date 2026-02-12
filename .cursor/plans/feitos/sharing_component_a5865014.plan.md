---
name: Sharing Component
overview: Extrair o mecanismo de busca/seleção de usuários do CardFeatureForm para um componente reutilizável `Sharing`, e usar no CardFeatureForm e ProjectForm (multi-select em ambos).
todos: []
isProject: false
---

# Sharing Component Plan

## Contexto

- O CardFeatureForm já possui o mecanismo de busca/seleção de usuários para compartilhamento.
- Você quer transformar esse mecanismo em um componente `Sharing` e reutilizá-lo no ProjectForm.
- O componente deve suportar **multi‑select** e será usado assim no CardFeatureForm e no ProjectForm.

Arquivos-alvo:

- [`frontend/components/Sharing.tsx`](frontend/components/Sharing.tsx) (novo)
- [`frontend/components/CardFeatureForm.tsx`](frontend/components/CardFeatureForm.tsx)
- [`frontend/components/ProjectForm.tsx`](frontend/components/ProjectForm.tsx)

## Plano

1. Criar `Sharing` reutilizável

- Extrair o UI/UX de busca e seleção de usuários do CardFeatureForm.
- Props sugeridas:
- `label` (string) e `helperText` (string opcional)
- `selectedUsers: User[]`
- `onChange: (users: User[]) => void`
- `maxSelected?: number` (opcional, mas não será usado no ProjectForm)
- `placeholder?: string`, `disabled?: boolean`
- O componente mantém internamente `query`, `results`, `isSearching`, `hasSearched` e usa `userService.searchUsers`.

2. Atualizar CardFeatureForm para usar `Sharing`

- Remover o bloco de busca/seleção local e substituir por `<Sharing ...>`.
- Conectar com o estado existente `selectedUsers` e `setSelectedUsers`.
- Manter o comportamento atual (multi‑select, busca a partir de 3 caracteres).

3. Atualizar ProjectForm para usar `Sharing`

- Substituir o bloco atual de “Email do membro (opcional)” pelo componente.
- Usar multi‑select também no ProjectForm e enviar todos os emails selecionados.

## Todos

- sharing-component: criar `Sharing` e mover lógica de busca
- cardfeature-integrate: usar `Sharing` no CardFeatureForm
- projectform-integrate: usar `Sharing` no ProjectForm (multi‑select)