import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Expand, Edit, Trash2, Lock } from "lucide-react"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import ContentRenderer from "./ContentRenderer"
import { useAuth } from "@/hooks/useAuth"
import type { CardFeature as CardFeatureType } from "@/types"

interface CardFeatureProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onExpand: (snippetId: string) => void
  onDelete: (snippetId: string) => void
}

export default function CardFeature({ snippet, onEdit, onExpand, onDelete }: CardFeatureProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const activeScreen = snippet.screens[activeTab] || snippet.screens[0]
  
  // Verificar se o usuário é o criador do card
  const isOwner = user?.id === snippet.createdBy
  const canEdit = isOwner

  return (
    <TooltipProvider>
      <Card className="shadow-lg hover:shadow-xl transition-shadow h-[32rem]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{snippet.title}</CardTitle>
                {snippet.isPrivate && (
                  <Badge
                    variant="secondary"
                    className="text-xs rounded-md shadow-sm border border-orange-300 bg-orange-50 text-orange-700"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Privado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm h-10 leading-5 overflow-hidden">
                {snippet.description}
              </CardDescription>
              {snippet.createdBy && (
                <p className="text-xs text-gray-500 mt-1">
                  Por: {snippet.author || 'Usuário'}
                </p>
              )}
            </div>
            <div className="flex space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(snippet)}
                    disabled={!canEdit}
                    className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{canEdit ? 'Editar CardFeature' : 'Apenas o criador pode editar'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(snippet.id)}
                    disabled={!canEdit}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{canEdit ? 'Excluir CardFeature' : 'Apenas o criador pode excluir'}</p>
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
          <div className="space-y-2">
            {/* Abas Header - SEMPRE VISÍVEL com scroll horizontal */}
            <div className="p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg overflow-hidden">
              <div className="tabs-scroll flex gap-2 overflow-x-auto pb-1">
                <style>{`
                  .tabs-scroll::-webkit-scrollbar {
                    height: 6px;
                  }
                  .tabs-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                  }
                  .tabs-scroll::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 3px;
                  }
                  .tabs-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.5);
                  }
                `}</style>
                {snippet.screens.map((screen, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTab(index)}
                    className={`
                      px-4 py-2 text-xs font-medium transition-all duration-300 rounded-lg relative whitespace-nowrap flex-shrink-0
                      ${activeTab === index 
                        ? 'text-gray-700 bg-white shadow-md transform scale-105 font-semibold' 
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:shadow-sm hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {screen.name || `Aba ${index + 1}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview do Conteúdo - Aba Ativa com Containers Específicos */}
            <div className="rounded-xl shadow-xl px-6 pt-6 pb-4 h-[19rem] overflow-y-auto relative group bg-white border border-gray-200">
              <style>{`
                .codeblock-scroll::-webkit-scrollbar {
                  width: 8px;
                }
                .codeblock-scroll::-webkit-scrollbar-track {
                  background: rgba(0, 0, 0, 0.1);
                  border-radius: 4px;
                }
                .codeblock-scroll::-webkit-scrollbar-thumb {
                  background: rgba(0, 0, 0, 0.3);
                  border-radius: 4px;
                }
                .codeblock-scroll::-webkit-scrollbar-thumb:hover {
                  background: rgba(0, 0, 0, 0.5);
                }
              `}</style>
              
              {/* Botões no canto superior direito */}
              <div className="absolute top-2 right-4 z-20">
                <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(snippet)}
                      className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2 opacity-80 hover:opacity-100"
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
                      className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 p-2 opacity-80 hover:opacity-100"
                    >
                      <Expand className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tela cheia</p>
                  </TooltipContent>
                </Tooltip>
                </div>
              </div>
              
              <div className="codeblock-scroll relative z-10 h-full overflow-y-auto -mx-6 px-6 pt-2">
                <ContentRenderer
                  blocks={activeScreen.blocks || []}
                  className="h-full"
                />
              </div>
              {/* <div className="absolute inset-0 opacity-60 group-hover:opacity-30 transition-opacity" style={{background: 'linear-gradient(to top, #374151 0%, transparent 50%, transparent 100%)'}}></div> */}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}