import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileCode, Loader2, Trash2, Users } from "lucide-react"
import type { Project } from "@/services"

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete?: (project: Project) => void
  isImporting?: boolean
  importProgress?: number
  importTooltip?: string
}

export function ProjectCard({
  project,
  onClick,
  onDelete,
  isImporting = false,
  importProgress = 0,
  importTooltip = ""
}: ProjectCardProps) {
  const isOwner = project.userRole === "owner"

  const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onDelete?.(project)
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="mt-2">{project.description}</CardDescription>
            )}
          </div>
          {isOwner && (
            isImporting ? (
              <div className="ml-2 flex items-center gap-2" title={importTooltip}>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-xs text-gray-600">{importProgress}%</span>
              </div>
            ) : (
              onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )
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
              <span>{new Date(project.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          {project.userRole && (
            <Badge variant={isOwner ? "default" : "secondary"}>
              {isOwner ? "Owner" : project.userRole === "admin" ? "Admin" : "Member"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
