import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileCode, Loader2, MoreVertical, Trash2, Users, Link2, Check } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import type { Project } from "@/services"

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete?: (project: Project) => void
  onLeave?: (project: Project) => void
  isImporting?: boolean
  importProgress?: number
  importTooltip?: string
}

export function ProjectCard({
  project,
  onClick,
  onDelete,
  onLeave,
  isImporting = false,
  importProgress = 0,
  importTooltip = ""
}: ProjectCardProps) {
  const isOwner = project.userRole === "owner"
  const canLeave = project.userRole && project.userRole !== "owner"
  const initials = project.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const [projectLinkCopied, setProjectLinkCopied] = useState(false)

  // URL compartilhável do projeto
  const shareableProjectUrl = (() => {
    if (typeof window === 'undefined') return ''
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://10xdev.com.br'
    return `${baseUrl}/projects/${project.id}`
  })()

  // Função para copiar URL do projeto
  const handleCopyProjectUrl = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(shareableProjectUrl)
      setProjectLinkCopied(true)
      toast.success("Link do projeto copiado!")
      setTimeout(() => setProjectLinkCopied(false), 2000)
    } catch {
      toast.error("Erro ao copiar link do projeto")
    }
  }

  const handleDeleteClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    onDelete?.(project)
  }

  return (
    <Card
      className="group cursor-pointer border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-semibold">
              {initials || "PJ"}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base text-gray-900">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-2 text-xs text-gray-500 line-clamp-2">
                {project.description}
              </CardDescription>
            )}
            </div>
          </div>
          <div className="ml-2 flex items-center gap-2">
            {isOwner && isImporting && (
              <div className="flex items-center gap-2" title={importTooltip}>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-xs text-gray-600">{importProgress}%</span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => event.stopPropagation()}
                  className="h-7 w-7 p-0"
                >
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleCopyProjectUrl}
                  className="text-gray-700 focus:text-blue-600"
                >
                  {projectLinkCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      <span className="text-green-600">Link copiado!</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Compartilhar
                    </>
                  )}
                </DropdownMenuItem>

                {isOwner && onDelete ? (
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDeleteClick(event)
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </DropdownMenuItem>
                ) : canLeave && onLeave ? (
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation()
                      onLeave(project)
                    }}
                    className="text-gray-700"
                  >
                    Sair do projeto
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="text-gray-400">
                    Sem ações disponíveis
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {project.userRole && (
          <div>
            <Badge
              variant="secondary"
              className={
                isOwner
                  ? "bg-blue-50 text-blue-700 border border-blue-200 rounded-md"
                  : project.userRole === "admin"
                    ? "bg-purple-50 text-purple-700 border border-purple-200 rounded-md"
                    : "bg-gray-100 text-gray-600 border border-gray-200 rounded-md"
              }
            >
              {isOwner ? "Owner" : project.userRole === "admin" ? "Admin" : "Member"}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 border border-gray-200">
              <Users className="h-3.5 w-3.5" />
              <span>{project.memberCount || 0}</span>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 border border-gray-200">
              <FileCode className="h-3.5 w-3.5" />
              <span>{project.cardCount || 0}</span>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 border border-gray-200">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(project.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation()
            onClick()
          }}
          className="h-8 w-full text-xs bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-200"
        >
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  )
}
