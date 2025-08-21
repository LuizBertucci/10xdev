import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import type { CardFeature as CardFeatureType } from "@/types"

interface CardFeatureCompactProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onDelete: (snippetId: string) => void
}

export default function CardFeatureCompact({ snippet, onEdit, onDelete }: CardFeatureCompactProps) {
  // Estado para controlar se o código está expandido
  const [isExpanded, setIsExpanded] = useState(false)

  // Função para alternar o estado de expansão
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <TooltipProvider>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Layout Horizontal */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Seção de Badges + Informações */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              
              {/* Badges */}
              <div className="flex gap-2 flex-shrink-0">
                <Badge 
                  className={`text-xs rounded-md shadow-sm border ${getTechConfig(snippet.tech).color}`}
                >
                  <span className="mr-1">{getTechConfig(snippet.tech).icon}</span>
                  {snippet.tech}
                </Badge>
                <Badge 
                  className={`text-xs rounded-md shadow-sm border ${getLanguageConfig(snippet.language).color}`}
                >
                  <span className="mr-1 text-xs font-bold">{getLanguageConfig(snippet.language).icon}</span>
                  {snippet.language}
                </Badge>
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{snippet.title}</h3>
                <p className="text-sm text-gray-600 truncate">{snippet.description}</p>
              </div>
            </div>

            {/* Seção de Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              
              {/* Edit Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(snippet)}
                    className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Editar CardFeature</p>
                </TooltipContent>
              </Tooltip>

              {/* Delete Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(snippet.id)}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Excluir CardFeature</p>
                </TooltipContent>
              </Tooltip>

              {/* Toggle Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleExpanded}
                    className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 p-2"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isExpanded ? "Recolher código" : "Expandir código"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Debug: mostrar estado atual */}
          {isExpanded && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                🚧 <strong>Estado expandido!</strong> Aqui aparecerá o código com tabs (próxima etapa)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                isExpanded = {isExpanded.toString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}