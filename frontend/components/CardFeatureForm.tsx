import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { X, Loader2, Plus, Save } from "lucide-react"
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

  const addScreen = () => {
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo Principal *
                </label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => handleInputChange('content_type', value as ContentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ContentType.CODE}>💻 Código</SelectItem>
                    <SelectItem value={ContentType.TEXT}>📄 Texto</SelectItem>
                    <SelectItem value={ContentType.TERMINAL}>⚡ Terminal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <Textarea
                placeholder="Descreva o que este código faz... (opcional)"
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
                    
                    {/* Blocos de Conteúdo */}
                    <div className="mt-4">
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
                              {screen.blocks.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBlock(index, blockIndex)}
                                  className="text-red-600 hover:text-red-800 h-7 w-7 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            
                            {/* Título opcional */}
                            <div className="mb-2">
                              <Input
                                placeholder="Título do bloco (opcional)"
                                value={block.title || ''}
                                onChange={(e) => handleBlockChange(index, blockIndex, 'title', e.target.value)}
                                className="text-xs"
                              />
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
                ))}
              </div>
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