import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Maximize2, Edit, Trash2 } from "lucide-react"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import type { CardFeature as CardFeatureType } from "@/types"

interface CardFeatureProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onExpand: (snippetId: string) => void
  onDelete: (snippetId: string) => void
}

export default function CardFeature({ snippet, onEdit, onExpand, onDelete }: CardFeatureProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-80">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{snippet.title}</CardTitle>
            <CardDescription className="text-sm h-10 leading-5 overflow-hidden">
              {snippet.description}
            </CardDescription>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(snippet)}
              className="text-gray-500 hover:text-gray-900"
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExpand(snippet.id)}
              className="text-gray-500 hover:text-gray-900"
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              Expandir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(snippet.id)}
              className="text-gray-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex justify-end space-x-2">
            <Badge 
              className={`text-xs rounded-md shadow-sm border pointer-events-none ${getTechConfig(snippet.tech).color}`}
            >
              <span className="mr-1">{getTechConfig(snippet.tech).icon}</span>
              {snippet.tech}
            </Badge>
            <Badge 
              className={`text-xs rounded-md shadow-sm border pointer-events-none ${getLanguageConfig(snippet.language).color}`}
            >
              <span className="mr-1 text-xs font-bold">{getLanguageConfig(snippet.language).icon}</span>
              {snippet.language}
            </Badge>
          </div>

          <div className="bg-gray-900 rounded-md p-4 h-44 overflow-hidden relative group">
            <pre className="text-xs text-gray-100 leading-tight">
              <code>{snippet.screens[0]?.code.slice(0, 200)}...</code>
            </pre>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity"></div>
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 group-hover:text-gray-300">
              {snippet.screens.length} arquivo{snippet.screens.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}