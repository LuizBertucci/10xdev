import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Pencil } from "lucide-react"
import type { ProjectTemplate } from "@/services"

interface TemplateCardProps {
  template: ProjectTemplate
  onDownload: (template: ProjectTemplate) => void
  onEdit?: (template: ProjectTemplate) => void
}

export function TemplateCard({ template, onDownload, onEdit }: TemplateCardProps) {
  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base font-semibold text-gray-900">
                {template.name}
              </CardTitle>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(template)}
                  className="h-8 w-8 text-gray-500 hover:text-gray-800"
                  title="Editar template"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
            {template.description && (
              <CardDescription className="text-sm text-gray-600">
                {template.description}
              </CardDescription>
            )}
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs text-gray-700">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => onDownload(template)}
            className="w-full whitespace-nowrap bg-black text-white hover:bg-black/90 sm:w-auto sm:min-w-[170px]"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
