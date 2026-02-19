---
name: ProjectForm Single Flow
overview: Unificar o ProjectForm em uma experiência sem tabs, trazendo GitHub/importação para a coluna esquerda do formulário manual, mantendo a coluna direita apenas com email do membro.
todos: []
isProject: false
---

# ProjectForm Single Flow Plan

## Contexto

- Hoje o `ProjectForm` separa o fluxo em tabs (`manual` e `github`).
- Você quer um único fluxo visual, e que os blocos de GitHub/importação fiquem na **coluna esquerda** do layout manual.

Arquivos-alvo:

- [`frontend/components/ProjectForm.tsx`](frontend/components/ProjectForm.tsx)

## Plano

1. Remover a estrutura de tabs

- Retirar `Tabs/TabsList/TabsTrigger/TabsContent` e renderizar um único conteúdo.
- Remover o estado `createDialogTab` e qualquer lógica condicional de botão/validação baseada em tab.

2. Reorganizar o layout em duas colunas

- Coluna esquerda (ordem definida por você):
1) Informações do projeto (nome + descrição)
2) GitHub (URL + token + status)
3) Configurações de importação (IA + campos relacionados)
- Coluna direita: manter apenas o bloco de email do membro.

3. Ajustar footer/ações para o fluxo único

- Manter botões de “Cancelar” e “Criar/Importar” com regras atuais.
- Se necessário, combinar a ação principal para decidir entre criar/importar com base no preenchimento de GitHub (sem alterar regras existentes).

## Todos

- remove-tabs: remover tabs e estado de seleção
- move-github-left: mover seções GitHub/importação para a coluna esquerda
- update-footer: ajustar ações do footer para fluxo único