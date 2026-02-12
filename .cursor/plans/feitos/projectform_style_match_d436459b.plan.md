---
name: ProjectForm Style Match
overview: Ajustar o visual do `ProjectForm` para ficar mais próximo do layout/seções do `CardFeatureForm`, mantendo a lógica existente e mudando apenas o estilo/estrutura visual.
todos: []
isProject: false
---

# ProjectForm Style Match Plan

## Contexto

- `ProjectForm` foi extraído recentemente e mantém o layout original do modal de projetos.
- O objetivo é aproximar **o layout e organização por seções** do `CardFeatureForm`, sem mudar lógica nem comportamento.

Arquivos-alvo:

- [`frontend/components/ProjectForm.tsx`](frontend/components/ProjectForm.tsx)
- Referência visual: [`frontend/components/CardFeatureForm.tsx`](frontend/components/CardFeatureForm.tsx)

## Plano

1. Mapear padrões visuais do `CardFeatureForm` que impactam layout/seções

- Estrutura de colunas/áreas principais, agrupamento em cards/boxes, títulos de seção e espaçamentos.
- Identificar classes utilitárias relevantes (ex: `space-y-*`, `rounded-lg`, `border`, `bg-*`).

2. Reestruturar o layout do `ProjectForm` para seguir o mesmo padrão de seções

- Introduzir agrupamentos visuais semelhantes (cards com borda/fundo, cabeçalhos de seção).
- Harmonizar espaçamentos e hierarquia visual (títulos, subtítulos, blocos de campos).
- Manter todos os inputs e tabs existentes, apenas reposicionando/ajustando wrappers.

3. Revisar consistência visual

- Garantir que a hierarquia e os blocos do modal fiquem alinhados ao estilo de `CardFeatureForm`.
- Confirmar que as mudanças são somente visuais (sem alterar handlers ou regras).

## Todos

- map-style-sections: levantar padrões de layout do CardFeatureForm
- refactor-projectform-layout: aplicar layout/seções no ProjectForm
- visual-check: checar consistência visual sem alterar lógica