import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  const [activeTab, setActiveTab] = useState(0)
  const activeScreen = snippet.screens[activeTab] || snippet.screens[0]

  return (
    <TooltipProvider>
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExpand(snippet.id)}
                    className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 p-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expandir visualização</p>
                </TooltipContent>
              </Tooltip>

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
            </div>
          </div>
        </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Badges de tecnologia */}
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

          {/* Sistema de Abas + Preview */}
          <div className="space-y-0">
            {/* Abas Header - SEMPRE VISÍVEL */}
            <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-md">
              {snippet.screens.map((screen, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`
                    px-3 py-2 text-xs font-medium transition-all duration-200 relative
                    ${activeTab === index 
                      ? 'text-blue-600 bg-white border-b-2 border-blue-600 -mb-px z-10' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }
                    ${index === 0 ? 'rounded-tl-md' : ''}
                    ${index === snippet.screens.length - 1 ? 'rounded-tr-md' : ''}
                  `}
                >
                  {screen.name}
                </button>
              ))}
            </div>

            {/* Preview do Código - Aba Ativa */}
            <div className="bg-gray-900 rounded-b-md p-4 h-40 overflow-hidden relative group">
              <pre className="text-xs text-gray-100 leading-tight">
                <code>{activeScreen.code.slice(0, 200)}...</code>
              </pre>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity"></div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 group-hover:text-gray-300">
                {snippet.screens.length} arquivo{snippet.screens.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}