import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Filter, ChevronRight, Maximize2, Code2, X, Loader2, Plus, Save, Edit } from "lucide-react"
import { useCardFeatures } from "@/hooks/useCardFeatures"
import type { CardFeature } from "@/types"

interface PlatformState {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTech: string
  setSelectedTech: (tech: string) => void
  filteredSnippets: (snippets: CardFeature[]) => CardFeature[]
}

interface CodesProps {
  platformState: PlatformState
}

const getTechConfig = (tech: string) => {
  switch (tech.toLowerCase()) {
    case 'react':
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: '⚛️'
      }
    case 'node.js':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: '🟢'
      }
    case 'python':
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: '🐍'
      }
    case 'javascript':
      return {
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: '🟨'
      }
    default:
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: '💻'
      }
  }
}

const getLanguageConfig = (language: string) => {
  switch (language.toLowerCase()) {
    case 'typescript':
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: 'TS'
      }
    case 'javascript':
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: 'JS'
      }
    case 'python':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: 'PY'
      }
    default:
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: language.substring(0, 2).toUpperCase()
      }
  }
}

export default function Codes({ platformState }: CodesProps) {
  const [currentScreens, setCurrentScreens] = useState<Record<string, number>>({})
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  
  // Usar o hook de CardFeatures com API
  const cardFeatures = useCardFeatures()

  // State para formulário de criação
  const [formData, setFormData] = useState({
    title: '',
    tech: 'React',
    language: 'typescript',
    description: '',
    screens: [
      {
        name: 'Main',
        description: 'Arquivo principal',
        code: ''
      }
    ]
  })

  // Usar dados da API
  const codeSnippets = cardFeatures.filteredItems

  // Funções do formulário
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleScreenChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      screens: prev.screens.map((screen, i) => 
        i === index ? { ...screen, [field]: value } : screen
      )
    }))
  }

  const addScreen = () => {
    setFormData(prev => ({
      ...prev,
      screens: [...prev.screens, { name: '', description: '', code: '' }]
    }))
  }

  const removeScreen = (index: number) => {
    if (formData.screens.length > 1) {
      setFormData(prev => ({
        ...prev,
        screens: prev.screens.filter((_, i) => i !== index)
      }))
    }
  }

  const handleSubmit = async () => {
    try {
      await cardFeatures.createCardFeature(formData)
      // Reset form
      setFormData({
        title: '',
        tech: 'React',
        language: 'typescript',
        description: '',
        screens: [{ name: 'Main', description: 'Arquivo principal', code: '' }]
      })
    } catch (error) {
      console.error('Erro ao criar CardFeature:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 text-sm mb-2">
            <button
              onClick={() => platformState.setActiveTab("home")}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Início
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => {
                cardFeatures.setSelectedTech("all")
                cardFeatures.setSearchTerm("")
              }}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Biblioteca de Códigos
            </button>
            {cardFeatures.selectedTech !== "all" && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 font-medium capitalize">{cardFeatures.selectedTech}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar snippets..."
              value={cardFeatures.searchTerm}
              onChange={(e) => cardFeatures.setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              disabled={cardFeatures.loading}
            />
          </div>
          <Select 
            value={cardFeatures.selectedTech} 
            onValueChange={cardFeatures.setSelectedTech}
            disabled={cardFeatures.loading}
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="node.js">Node.js</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={cardFeatures.startCreating}
            disabled={cardFeatures.loading || cardFeatures.creating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {cardFeatures.creating ? 'Criando...' : 'Novo CardFeature'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {cardFeatures.loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando snippets...</span>
        </div>
      )}

      {/* Error State */}
      {cardFeatures.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600">
              <X className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar snippets</h3>
              <p className="text-sm text-red-700 mt-1">{cardFeatures.error}</p>
              <button
                onClick={() => cardFeatures.refreshData()}
                className="text-sm text-red-600 hover:text-red-800 underline mt-2"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length === 0 && (
        <div className="text-center py-12">
          <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum snippet encontrado</h3>
          <p className="text-gray-600">
            {cardFeatures.searchTerm || cardFeatures.selectedTech !== 'all'
              ? 'Tente ajustar seus filtros de busca'
              : 'Ainda não há snippets de código disponíveis'
            }
          </p>
        </div>
      )}

      {/* Content Grid */}
      {!cardFeatures.loading && !cardFeatures.error && codeSnippets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {codeSnippets.map((snippet) => {
          const currentScreen = currentScreens[snippet.id] || 0
          const screen = snippet.screens[currentScreen]

          return (
            <Card key={snippet.id} className="hover:shadow-lg transition-shadow h-80">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{snippet.title}</CardTitle>
                    <CardDescription className="text-sm h-10 leading-5 overflow-hidden">{snippet.description}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cardFeatures.startEditing(snippet)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenModalId(snippet.id)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <Maximize2 className="h-4 w-4 mr-1" />
                      Expandir
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
        })}
        </div>
      )}

      {/* Code Expansion Modal */}
      {openModalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-xl font-semibold">
                  {codeSnippets.find(s => s.id === openModalId)?.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {codeSnippets.find(s => s.id === openModalId)?.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenModalId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const snippet = codeSnippets.find(s => s.id === openModalId);
                if (!snippet) return null;
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {snippet.screens.map((screen, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="mb-3">
                          <h4 className="font-medium text-gray-900">{screen.name}</h4>
                          <p className="text-sm text-gray-600">{screen.description}</p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4 overflow-auto flex-1">
                          <pre className="text-sm text-gray-100 leading-relaxed">
                            <code>{screen.code}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Create CardFeature Modal */}
      {cardFeatures.isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold">Novo CardFeature</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={cardFeatures.cancelCreating}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título *
                    </label>
                    <Input
                      placeholder="Ex: Sistema de Autenticação JWT"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tecnologia *
                    </label>
                    <Select
                      value={formData.tech}
                      onValueChange={(value) => handleInputChange('tech', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="React">React</SelectItem>
                        <SelectItem value="Node.js">Node.js</SelectItem>
                        <SelectItem value="Python">Python</SelectItem>
                        <SelectItem value="JavaScript">JavaScript</SelectItem>
                        <SelectItem value="Vue.js">Vue.js</SelectItem>
                        <SelectItem value="Angular">Angular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Linguagem *
                    </label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => handleInputChange('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <Textarea
                    placeholder="Descreva o que este código faz..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Screens/Files */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Arquivos/Abas *
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addScreen}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Arquivo
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {formData.screens.map((screen, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Arquivo {index + 1}</h4>
                          {formData.screens.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeScreen(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Nome do Arquivo
                            </label>
                            <Input
                              placeholder="Ex: Model, Controller, Routes"
                              value={screen.name}
                              onChange={(e) => handleScreenChange(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Descrição
                            </label>
                            <Input
                              placeholder="Ex: Classe User com métodos..."
                              value={screen.description}
                              onChange={(e) => handleScreenChange(index, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Código
                          </label>
                          <Textarea
                            placeholder="Cole seu código aqui..."
                            value={screen.code}
                            onChange={(e) => handleScreenChange(index, 'code', e.target.value)}
                            rows={8}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={cardFeatures.cancelCreating}
                disabled={cardFeatures.creating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={cardFeatures.creating || !formData.title || !formData.description}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {cardFeatures.creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Criar CardFeature
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit CardFeature Modal */}
      {cardFeatures.isEditing && cardFeatures.editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold">Editar CardFeature</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={cardFeatures.cancelEditing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título *
                    </label>
                    <Input
                      placeholder="Ex: Sistema de Autenticação JWT"
                      value={cardFeatures.editingItem.title}
                      onChange={(e) => cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tecnologia *
                    </label>
                    <Select
                      value={cardFeatures.editingItem.tech}
                      onValueChange={(value) => cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, tech: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="React">React</SelectItem>
                        <SelectItem value="Node.js">Node.js</SelectItem>
                        <SelectItem value="Python">Python</SelectItem>
                        <SelectItem value="JavaScript">JavaScript</SelectItem>
                        <SelectItem value="Vue.js">Vue.js</SelectItem>
                        <SelectItem value="Angular">Angular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Linguagem *
                    </label>
                    <Select
                      value={cardFeatures.editingItem.language}
                      onValueChange={(value) => cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <Textarea
                    placeholder="Descreva o que este código faz..."
                    value={cardFeatures.editingItem.description}
                    onChange={(e) => cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Screens/Files */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Arquivos/Abas *
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newScreens = [...cardFeatures.editingItem.screens, { name: '', description: '', code: '' }]
                        cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, screens: newScreens })
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Arquivo
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {cardFeatures.editingItem.screens.map((screen, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Arquivo {index + 1}</h4>
                          {cardFeatures.editingItem.screens.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newScreens = cardFeatures.editingItem.screens.filter((_, i) => i !== index)
                                cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, screens: newScreens })
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nome do arquivo *
                            </label>
                            <Input
                              placeholder="Ex: component.tsx, utils.js"
                              value={screen.name}
                              onChange={(e) => {
                                const newScreens = [...cardFeatures.editingItem.screens]
                                newScreens[index] = { ...screen, name: e.target.value }
                                cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, screens: newScreens })
                              }}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Descrição *
                            </label>
                            <Input
                              placeholder="Ex: Componente principal"
                              value={screen.description}
                              onChange={(e) => {
                                const newScreens = [...cardFeatures.editingItem.screens]
                                newScreens[index] = { ...screen, description: e.target.value }
                                cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, screens: newScreens })
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Código *
                          </label>
                          <Textarea
                            placeholder="Cole seu código aqui..."
                            value={screen.code}
                            onChange={(e) => {
                              const newScreens = [...cardFeatures.editingItem.screens]
                              newScreens[index] = { ...screen, code: e.target.value }
                              cardFeatures.updateEditingItem({ ...cardFeatures.editingItem, screens: newScreens })
                            }}
                            rows={10}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-4 border-t">
              <Button
                variant="outline"
                onClick={cardFeatures.cancelEditing}
                disabled={cardFeatures.updating}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => cardFeatures.updateCardFeature(cardFeatures.editingItem.id, {
                  title: cardFeatures.editingItem.title,
                  tech: cardFeatures.editingItem.tech,
                  language: cardFeatures.editingItem.language,
                  description: cardFeatures.editingItem.description,
                  screens: cardFeatures.editingItem.screens
                })}
                disabled={cardFeatures.updating || !cardFeatures.editingItem.title || !cardFeatures.editingItem.description}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {cardFeatures.updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}