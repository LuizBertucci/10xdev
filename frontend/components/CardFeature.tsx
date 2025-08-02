import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Expand, Edit, Trash2 } from "lucide-react"
import { getTechConfig, getLanguageConfig } from "./utils/techConfigs"
import SyntaxHighlighter from "./SyntaxHighlighter"
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

  // Debug: verificar quantas screens temos
  console.log(`CardFeature ${snippet.title}:`, {
    totalScreens: snippet.screens.length,
    screenNames: snippet.screens.map(s => s.name),
    activeTab,
    activeScreenName: activeScreen?.name
  })

  return (
    <TooltipProvider>
      <Card className="shadow-lg hover:shadow-xl transition-shadow h-[32rem]">
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
          <div className="space-y-2">
            {/* Abas Header - SEMPRE VISÍVEL */}
            <div className="flex gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              {snippet.screens.map((screen, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`
                    px-4 py-2 text-xs font-medium transition-all duration-300 rounded-lg relative
                    ${activeTab === index 
                      ? 'text-gray-700 bg-white shadow-md transform scale-105 font-semibold' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:shadow-sm hover:-translate-y-0.5'
                    }
                  `}
                >
                  {screen.name}
                </button>
              ))}
            </div>

            {/* Preview do Código - Aba Ativa com Syntax Highlighting */}
            <div className="rounded-xl shadow-xl p-6 h-[19rem] overflow-y-auto relative group" 
            style={{backgroundColor: '#f8f8ff', 
            fontFamily: 'Fira Code, Consolas, Monaco, monospace'}}>
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
              <div className="absolute top-2 right-4 z-20 flex space-x-1">
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
              
              <div className="codeblock-scroll relative z-10 h-full overflow-y-auto -mx-6 px-6">
                <SyntaxHighlighter
                  code={activeScreen.code}
                  language={snippet.language}
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