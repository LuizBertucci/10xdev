"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, Loader2, AlertTriangle, ChevronRight } from "lucide-react"
import { projectService, templateService, type Project, type ProjectTemplate } from "@/services"
import { toast } from "sonner"
import { useProjectImportJobs } from "@/hooks/useProjectImportJobs"
import { defaultMessage } from "@/lib/importJobUtils"
import { createClient } from "@/lib/supabase"
import { TemplateCard } from "@/components/TemplateCard"
import { TemplateForm } from "@/components/TemplateForm"
import { ProjectCard } from "@/components/ProjectCard"
import { ProjectForm } from "@/components/ProjectForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

interface PlatformState {
  setActiveTab?: (tab: string) => void
}

interface ProjectsProps {
  platformState?: PlatformState
}

export default function Projects({ platformState }: ProjectsProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null)
  const [isTemplateAdmin, setIsTemplateAdmin] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const isFirstSearchEffect = useRef(true)
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])
  const fallbackTemplate = useMemo<ProjectTemplate>(() => ({
    id: 'starter-template',
    name: 'Starter Template 10xDev',
    description: 'Template base para iniciar projetos rapidamente.',
    version: '1.0',
    tags: ['Node.js', 'Next.js'],
    zipPath: 'starter-template.zip',
    zipUrl: '/templates/starter-template.zip',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }), [])

  // Delete dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteCardsWithProject, setDeleteCardsWithProject] = useState(false)

  // Hook para detectar jobs de importação em andamento
  const projectIds = projects.map(p => p.id)
  const { hasRunningImport, getImportInfo } = useProjectImportJobs(projectIds)

  useEffect(() => {
    loadProjects()
    loadTemplates()
    checkTemplateAdmin()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await projectService.getAll({
        search: searchTerm || undefined,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      if (!response) {
        setProjects([])
        return
      }

      if (response.success && response.data) {
        setProjects(response.data)
      } else {
        toast.error(response.error || 'Erro ao carregar projetos')
      }
    } catch (error: any) {
      if (error?.statusCode === 429 || error?.status === 429) {
        toast.error('Muitas requisições. Tente novamente em instantes.')
        return
      }
      toast.error(error?.message || 'Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true)
      const response = await templateService.listTemplates({ isActive: true, sortBy: 'created_at', sortOrder: 'desc' })

      if (!response) {
        setTemplates([])
        return
      }

      if (response.success && response.data) {
        setTemplates(response.data)
      } else {
        toast.error(response.error || 'Erro ao carregar templates')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar templates')
    } finally {
      setTemplatesLoading(false)
    }
  }

  const checkTemplateAdmin = async () => {
    try {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle() as { data: { role?: string } | null }

      setIsTemplateAdmin(data?.role === 'admin')
    } catch {
      setIsTemplateAdmin(false)
    }
  }

  useEffect(() => {
    if (isFirstSearchEffect.current) {
      isFirstSearchEffect.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      loadProjects()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const resetTemplateForm = () => {
    setEditingTemplate(null)
  }

  const handleDownloadTemplate = (template: ProjectTemplate) => {
    let downloadUrl = template.zipUrl || ''

    if (!downloadUrl && template.zipPath && supabase) {
      downloadUrl = supabase.storage.from('project-templates').getPublicUrl(template.zipPath).data.publicUrl
    }

    if (!downloadUrl) {
      toast.error('Link do template indisponível')
      return
    }

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${template.name || 'template'}.zip`
    link.click()
    toast.success('Download do template iniciado!')
  }

  const openCreateTemplate = () => {
    if (!isTemplateAdmin) {
      toast.error('Apenas administradores podem criar templates')
      return
    }
    setEditingTemplate(null)
    setIsTemplateDialogOpen(true)
  }

  const openEditTemplate = (template: ProjectTemplate) => {
    if (!isTemplateAdmin) {
      toast.error('Apenas administradores podem editar templates')
      return
    }
    setEditingTemplate(template)
    setIsTemplateDialogOpen(true)
  }


  const handleProjectClick = (projectId: string) => {
    if (platformState?.setActiveTab) {
      const params = new URLSearchParams()
      params.set('tab', 'projects')
      params.set('id', projectId)
      router.push(`/?${params.toString()}`)
    } else {
      router.push(`/projects/${projectId}`)
    }
  }

  const openDeleteDialog = (project: Project) => {
    const importInfo = getImportInfo(project.id)
    if (importInfo) {
      toast.error(`Importação em andamento (${importInfo.progress}%). Aguarde a conclusão para excluir este projeto.`)
      return
    }
    setProjectToDelete(project)
    setDeleteCardsWithProject(false) // Reset checkbox state
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return
    try {
      setDeleting(true)
      const response = await projectService.delete(projectToDelete.id, { deleteCards: deleteCardsWithProject })
      if (!response) {
        toast.error('Nenhuma resposta do servidor ao deletar o projeto.')
        return
      }
      if (response.success) {
        const cardsDeleted = response.data?.cardsDeleted || 0
        if (cardsDeleted > 0) {
          toast.success(`Projeto e ${cardsDeleted} card${cardsDeleted > 1 ? 's' : ''} deletados com sucesso!`)
        } else {
          toast.success('Projeto deletado com sucesso!')
        }
        setIsDeleteDialogOpen(false)
        setProjectToDelete(null)
        setDeleteCardsWithProject(false)
        loadProjects()
      } else {
        toast.error(response.error || 'Erro ao deletar projeto')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao deletar projeto')
    } finally {
      setDeleting(false)
    }
  }

  const templatesToShow = templates.length > 0 ? templates : [fallbackTemplate]

  return (
    <div className="space-y-6 w-full overflow-x-hidden px-1">
      <div className="space-y-4 w-full max-w-[900px]">
        <div className="flex items-center space-x-2 text-sm">
          <button
            type="button"
            onClick={() => router.push('/?tab=home')}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
          >
            Início
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            type="button"
            onClick={() => router.push('/?tab=projects')}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
          >
            Projetos
          </button>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
          <Button className="h-9 px-4 bg-gray-900 hover:bg-gray-800 text-white" onClick={openCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        {templatesLoading ? (
          <div className="text-center py-6">
            <p className="text-gray-500">Carregando templates...</p>
          </div>
        ) : templatesToShow.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">Nenhum template disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {templatesToShow.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDownload={handleDownloadTemplate}
                onEdit={isTemplateAdmin ? openEditTemplate : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <TemplateForm
        open={isTemplateDialogOpen}
        mode={editingTemplate ? "edit" : "create"}
        template={editingTemplate}
        isAdmin={isTemplateAdmin}
        onOpenChange={(open) => {
          setIsTemplateDialogOpen(open)
          if (!open) resetTemplateForm()
        }}
        onSaved={loadTemplates}
      />

      {/* Projetos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Projetos</h2>
          <ProjectForm
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            platformState={platformState}
            onSaved={loadProjects}
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando projetos...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum projeto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const importInfo = getImportInfo(project.id)
            return (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project.id)}
                onDelete={openDeleteDialog}
                isImporting={hasRunningImport(project.id)}
                importProgress={importInfo?.progress}
                importTooltip={defaultMessage(importInfo?.step ?? "")}
              />
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Deletar Projeto
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o projeto <strong>&quot;{projectToDelete?.name}&quot;</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {/* Checkbox para deletar cards */}
          {projectToDelete && (projectToDelete.cardsCreatedCount || 0) > 0 && (
            <div className="flex items-start gap-3 rounded-lg border-2 border-red-100 bg-red-50/50 p-4 my-2">
              <Checkbox
                id="delete-cards"
                checked={deleteCardsWithProject}
                onCheckedChange={(checked) => setDeleteCardsWithProject(checked === true)}
                disabled={deleting}
                className="mt-0.5"
              />
              <div className="space-y-1 flex-1">
                <label htmlFor="delete-cards" className="text-sm font-medium leading-none text-red-900 cursor-pointer">
                  Também excluir os {projectToDelete.cardsCreatedCount} card{(projectToDelete.cardsCreatedCount || 0) > 1 ? 's' : ''} criados neste projeto
                </label>
                <p className="text-xs text-red-700 leading-relaxed">
                  Os cards serão removidos permanentemente e não poderão ser recuperados. Cards apenas associados (não criados) ao projeto permanecerão intactos.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deletando...</> : <><Trash2 className="h-4 w-4 mr-2" />Deletar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
