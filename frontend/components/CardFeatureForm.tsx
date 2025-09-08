import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Loader2, Plus, Save, ChevronUp, ChevronDown } from "lucide-react"
import type { CardFeature, CreateScreenData, CreateBlockData } from "@/types"
import { ContentType } from "@/types"

const DEFAULT_FORM_DATA: CardFeatureFormData = {
  title: '',
  tech: 'React',
  language: 'typescript',
  description: '',
  content_type: ContentType.CODE,
  screens: [
    {
      name: 'Main',
      description: 'Conteúdo principal',
      blocks: [
        {
          type: ContentType.CODE,
          content: '',
          language: 'typescript'
        }
      ]
    }
  ]
}

type ScreenData = CreateScreenData

interface CardFeatureFormData {
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType
  screens: CreateScreenData[]
}

interface CardFeatureFormProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  initialData?: CardFeature
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: CardFeatureFormData) => Promise<void>
}

export default function CardFeatureForm({ 
  isOpen, 
  mode, 
  initialData, 
  isLoading, 
  onClose, 
  onSubmit 
}: CardFeatureFormProps) {
  const [formData, setFormData] = useState<CardFeatureFormData>(() => {
    if (mode === 'edit' && initialData) {
      return {
        title: initialData.title,
        tech: initialData.tech,
        language: initialData.language,
        description: initialData.description,
        content_type: initialData.content_type,
        screens: initialData.screens
      }
    }
    return { ...DEFAULT_FORM_DATA }
  })
  
  // Estado para controlar aba ativa (-1 = descrição, 0+ = arquivos)
  const [activeTab, setActiveTab] = useState<number>(-1)

  // Atualizar formulário quando initialData mudar
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        title: initialData.title,
        tech: initialData.tech,
        language: initialData.language,
        description: initialData.description,
        content_type: initialData.content_type,
        screens: initialData.screens
      })
    } else if (mode === 'create') {
      setFormData({ ...DEFAULT_FORM_DATA })
    }
  }, [mode, initialData])


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

  // Funções para gerenciar blocos
  const addBlock = (screenIndex: number, type: ContentType = ContentType.CODE) => {
    const newBlock: CreateBlockData = {
      type,
      content: '',
      language: type === ContentType.CODE ? 'typescript' : undefined
    }

    setFormData(prev => ({
      ...prev,
      screens: prev.screens.map((screen, i) => 
        i === screenIndex 
          ? { ...screen, blocks: [...screen.blocks, newBlock] }
          : screen
      )
    }))
  }

  const removeBlock = (screenIndex: number, blockIndex: number) => {
    setFormData(prev => ({
      ...prev,
      screens: prev.screens.map((screen, i) => 
        i === screenIndex 
          ? { ...screen, blocks: screen.blocks.filter((_, j) => j !== blockIndex) }
          : screen
      )
    }))
  }

  const handleBlockChange = (screenIndex: number, blockIndex: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      screens: prev.screens.map((screen, i) => 
        i === screenIndex 
          ? {
              ...screen,
              blocks: screen.blocks.map((block, j) => 
                j === blockIndex ? { ...block, [field]: value } : block
              )
            }
          : screen
      )
    }))
  }

  const moveBlockUp = (screenIndex: number, blockIndex: number) => {
    if (blockIndex > 0) {
      setFormData(prev => ({
        ...prev,
        screens: prev.screens.map((screen, i) => 
          i === screenIndex 
            ? {
                ...screen,
                blocks: screen.blocks.map((block, j) => {
                  if (j === blockIndex) return screen.blocks[blockIndex - 1]
                  if (j === blockIndex - 1) return screen.blocks[blockIndex]
                  return block
                })
              }
            : screen
        )
      }))
    }
  }

  const moveBlockDown = (screenIndex: number, blockIndex: number) => {
    setFormData(prev => ({
      ...prev,
      screens: prev.screens.map((screen, i) => 
        i === screenIndex 
          ? {
              ...screen,
              blocks: screen.blocks.map((block, j) => {
                if (j === blockIndex) return screen.blocks[blockIndex + 1]
                if (j === blockIndex + 1) return screen.blocks[blockIndex]
                return block
              })
            }
          : screen
      )
    }))
  }

  const addScreen = () => {
    const newScreenIndex = formData.screens.length
    setFormData(prev => ({
      ...prev,
      screens: [...prev.screens, { 
        name: '', 
        description: '', 
        blocks: [{
          type: ContentType.CODE,
          content: '',
          language: 'typescript'
        }]
      }]
    }))
    // Ativar a nova aba criada
    setActiveTab(newScreenIndex)
  }

  const removeScreen = (index: number) => {
    if (formData.screens.length > 1) {
      setFormData(prev => ({
        ...prev,
        screens: prev.screens.filter((_, i) => i !== index)
      }))
      // Ajustar aba ativa se necessário
      if (activeTab >= index && activeTab > 0) {
        setActiveTab(activeTab - 1)
      } else if (activeTab === index) {
        setActiveTab(-1) // Volta para descrição
      }
    }
  }

  const handleSubmit = async () => {
    await onSubmit(formData)
    if (mode === 'create') {
      setFormData({ ...DEFAULT_FORM_DATA })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-semibold">
            {mode === 'create' ? 'Novo CardFeature' : 'Editar CardFeature'}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
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
            </div>

            {/* Screens/Files with Description Tab */}
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

              <Tabs value={activeTab.toString()} onValueChange={(value) => setActiveTab(parseInt(value))}>
                {/* Lista de abas */}
                <TabsList className="grid w-full h-auto p-1" style={{ gridTemplateColumns: `1fr repeat(${formData.screens.length}, 1fr)` }}>
                  {/* Aba Descrição fixa */}
                  <TabsTrigger 
                    value="-1" 
                    className="flex-1"
                  >
                    📝 Descrição
                  </TabsTrigger>
                  
                  {/* Abas dos arquivos */}
                  {formData.screens.map((screen, index) => (
                    <TabsTrigger 
                      key={index}
                      value={index.toString()} 
                      className="flex items-center justify-between gap-2 relative"
                    >
                      <span>{screen.name || `Arquivo ${index + 1}`}</span>
                      {formData.screens.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            removeScreen(index)
                          }}
                          className="h-4 w-4 p-0 text-gray-500 hover:text-red-600 cursor-pointer rounded flex items-center justify-center transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Conteúdo da aba Descrição */}
                <TabsContent value="-1" className="mt-4">
                  <div className="border rounded-lg p-4 h-80">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição do CardFeature
                      </label>
                      <Textarea
                        placeholder="Descreva o que este CardFeature faz, quando usar, exemplos de uso... (opcional)"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={12}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Conteúdo das abas dos arquivos */}
                {formData.screens.map((screen, index) => (
                  <TabsContent key={index} value={index.toString()} className="mt-4">
                    <div className="border rounded-lg p-4 h-80 overflow-y-auto">
                      {/* Campos do arquivo */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
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
                            Descrição do Arquivo
                          </label>
                          <Input
                            placeholder="Ex: Classe User com métodos..."
                            value={screen.description}
                            onChange={(e) => handleScreenChange(index, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {/* Blocos de Conteúdo */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Conteúdo
                          </label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.CODE)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              💻 Código
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.TEXT)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              📄 Texto
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.TERMINAL)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              ⚡ Terminal
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {screen.blocks.map((block, blockIndex) => (
                            <div key={blockIndex} className="border rounded p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {block.type === ContentType.CODE ? '💻 Código' : 
                                     block.type === ContentType.TEXT ? '📄 Texto' : '⚡ Terminal'}
                                  </span>
                                  {block.type === ContentType.CODE && (
                                    <Select
                                      value={block.language || 'typescript'}
                                      onValueChange={(value) => handleBlockChange(index, blockIndex, 'language', value)}
                                    >
                                      <SelectTrigger className="w-32 h-7">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="typescript">TS</SelectItem>
                                        <SelectItem value="javascript">JS</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="html">HTML</SelectItem>
                                        <SelectItem value="css">CSS</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                
                                {/* Controles de ordem e remoção */}
                                <div className="flex items-center gap-1">
                                  {screen.blocks.length > 1 && (
                                    <>
                                      {/* Botão mover para cima */}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveBlockUp(index, blockIndex)}
                                        disabled={blockIndex === 0}
                                        className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                                        title="Mover para cima"
                                      >
                                        <ChevronUp className="h-3 w-3" />
                                      </Button>
                                      
                                      {/* Botão mover para baixo */}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveBlockDown(index, blockIndex)}
                                        disabled={blockIndex === screen.blocks.length - 1}
                                        className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                                        title="Mover para baixo"
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                      
                                      {/* Botão remover */}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeBlock(index, blockIndex)}
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-800 ml-1"
                                        title="Remover bloco"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Conteúdo */}
                              <Textarea
                                placeholder={
                                  block.type === ContentType.CODE ? 'Cole seu código aqui...' :
                                  block.type === ContentType.TEXT ? 'Escreva texto/markdown aqui...' :
                                  '$ comando terminal...'
                                }
                                value={block.content}
                                onChange={(e) => handleBlockChange(index, blockIndex, 'content', e.target.value)}
                                rows={6}
                                className={block.type === ContentType.CODE || block.type === ContentType.TERMINAL ? 'font-mono text-sm' : 'text-sm'}
                              />
                            </div>
                          ))}
                          
                          {screen.blocks.length === 0 && (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded">
                              Nenhum bloco adicionado. Use os botões acima para adicionar conteúdo.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.title}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'create' ? 'Criando...' : 'Salvando...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Criar CardFeature' : 'Salvar Alterações'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}