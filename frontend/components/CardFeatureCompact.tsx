import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import ContentRenderer from "./ContentRenderer"
import type { CardFeature as CardFeatureType } from "@/types"

interface CardFeatureCompactProps {
  snippet: CardFeatureType
  onEdit: (snippet: CardFeatureType) => void
  onDelete: (snippetId: string) => void
}

export default function CardFeatureCompact({ snippet, onEdit, onDelete }: CardFeatureCompactProps) {
  // Estado para controlar se o código está expandido
  const [isExpanded, setIsExpanded] = useState(false)
  // Estado para controlar a aba ativa (similar ao CardFeature)
  const [activeTab, setActiveTab] = useState(0)

  // Função para alternar o estado de expansão
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Screen ativa baseada na tab selecionada
  const activeScreen = snippet.screens[activeTab] || snippet.screens[0]

  return (
    <TooltipProvider>
      <Card className="shadow-sm hover:shadow-md transition-shadow w-full h-[32rem]">
        <CardContent className="p-2 sm:p-3 md:p-4 w-full overflow-hidden">
          {/* Layout Responsivo */}
          <div className="space-y-2 sm:space-y-3 w-full">

            {/* Header: Título + Toggle - Card clicável */}
            <div
              className="flex items-start justify-between gap-3 cursor-pointer"
              onClick={toggleExpanded}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{snippet.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{snippet.description}</p>
              </div>

              {/* Toggle Indicator */}
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Área de Código Condicional */}
            {isExpanded && (
            <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300 w-full overflow-hidden">

              {/* Actions Row - Edit e Delete */}
              <div className="flex items-center justify-start gap-2 pt-2 border-t border-gray-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(snippet)
                      }}
                      className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 p-2"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
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
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(snippet.id)
                      }}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 p-2"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Excluir CardFeature</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Sistema de Tabs - IGUAL AO CardFeature.tsx */}
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

              {/* Área do Conteúdo - COM SCROLL VERTICAL */}
              <div className="rounded-lg border border-gray-200 transition-shadow duration-200 px-2 sm:px-3 pt-3 pb-2 h-[19rem] overflow-y-auto relative group bg-gray-50 w-full"
              >
                <style>{`
                  .codeblock-scroll::-webkit-scrollbar {
                    width: 6px;
                  }
                  .codeblock-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                  }
                  .codeblock-scroll::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 3px;
                  }
                  .codeblock-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.5);
                  }

                  /* Mobile-first responsive rules */
                  .codeblock-scroll {
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  }

                  .codeblock-scroll pre,
                  .codeblock-scroll code {
                    max-width: 100%;
                    white-space: pre-wrap;
                    word-break: break-word;
                  }

                  .codeblock-scroll .terminal-container {
                    max-width: 100%;
                  }

                  .codeblock-scroll .terminal-container pre {
                    max-width: 100%;
                    white-space: pre;
                  }

                  /* Ensure table responsiveness */
                  .codeblock-scroll table {
                    max-width: 100%;
                    overflow-x: auto;
                    display: block;
                  }

                  /* Terminal container specific rules */
                  .codeblock-scroll .terminal-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                  }

                  .codeblock-scroll .terminal-container pre {
                    width: 100% !important;
                    max-width: 100% !important;
                    white-space: pre-wrap !important;
                    word-break: break-all !important;
                    overflow-wrap: anywhere !important;
                  }
                `}</style>


                <div className="codeblock-scroll relative z-10 h-full overflow-y-auto -mx-2 sm:-mx-3 px-2 sm:px-3 pt-0 w-full">
                  <ContentRenderer
                    blocks={activeScreen.blocks || []}
                    className="h-full w-full overflow-hidden break-words"
                  />
                </div>
              </div>
            </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
