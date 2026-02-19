---
name: ProjectCard Refactor
overview: Extrair o card de projeto da página de Projetos para um componente reutilizável `ProjectCard`, mantendo o mesmo layout e comportamento (click, status de importação, delete).
todos:
  - id: create-project-card
    content: Adicionar ProjectCard com layout atual
    status: completed
  - id: wire-project-card
    content: Usar ProjectCard no Projects.tsx
    status: completed
  - id: verify-import-delete
    content: Conferir import status e delete
    status: completed
isProject: false
---

# ProjectCard Refactor Plan

## Contexto

- O card de projeto está renderizado inline em [`frontend/pages/Projects.tsx`](frontend/pages/Projects.tsx) dentro do `projects.map`.
- A extração deve manter o mesmo comportamento: clique para abrir projeto, exibir progresso de importação, e botão de deletar para owner.
```620:683:frontend/pages/Projects.tsx
{projects.map((project) => (
  <Card
    key={project.id}
    className="cursor-pointer hover:shadow-lg transition-shadow"
    onClick={() => handleProjectClick(project.id)}
  >
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <CardTitle>{project.name}</CardTitle>
          {project.description && (
            <CardDescription className="mt-2">{project.description}</CardDescription>
          )}
        </div>
        {project.userRole === 'owner' && (
          hasRunningImport(project.id) ? (
            <div className="ml-2 flex items-center gap-2" title={defaultMessage(getImportInfo(project.id)?.step ?? '')}>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-xs text-gray-600">{getImportInfo(project.id)?.progress}%</span>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={(e) => openDeleteDialog(project, e)} className="ml-2">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )
        )}
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{project.memberCount || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileCode className="h-4 w-4" />
            <span>{project.cardCount || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        {project.userRole && (
          <Badge variant={project.userRole === 'owner' ? 'default' : 'secondary'}>
            {project.userRole === 'owner' ? 'Owner' : 
             project.userRole === 'admin' ? 'Admin' : 'Member'}
          </Badge>
        )}
      </div>
    </CardContent>
  </Card>
))}
```


## Plano

1. Criar o componente `ProjectCard` em [`frontend/components/ProjectCard.tsx`](frontend/components/ProjectCard.tsx)

   - Props previstas: `project`, `onClick`, `onDelete`, `showImportStatus`, `importInfo` (ou funções `hasRunningImport/getImportInfo`).
   - Manter o layout atual do card e ícones.
   - Garantir que o clique no botão de delete não dispare o `onClick` do card (parar propagação dentro do componente).

2. Atualizar [`frontend/pages/Projects.tsx`](frontend/pages/Projects.tsx)

   - Substituir o JSX inline pelo novo `ProjectCard`.
   - Ajustar imports: remover `Card*` e ícones usados apenas no card, adicionar `ProjectCard`.

3. Revisar integração com estados de importação

   - Validar que o comportamento do progresso (spinner + `%`) e do tooltip (`defaultMessage`) permanece igual.
   - Confirmar que a lógica de permissão para delete (owner) permanece intacta.

## Todos

- create-project-card: adicionar `ProjectCard` com layout atual
- wire-project-card: usar `ProjectCard` no `Projects.tsx`
- verify-import-delete: conferir import status e delete