import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Loader2, Plus, Save, ChevronUp, ChevronDown, GripVertical } from "lucide-react"
import type { CardFeature, CreateScreenData, CreateBlockData } from "@/types"
import { ContentType, CardType } from "@/types"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DEFAULT_FORM_DATA: CardFeatureFormData = {
  title: '',
  tech: 'React',
  language: 'typescript',
  description: '',
  content_type: ContentType.CODE,
  card_type: CardType.CODIGOS,
  screens: [
    {
      name: 'Main',
      description: 'Conteúdo principal',
      blocks: [
        {
          type: ContentType.CODE,
          content: '',
          language: 'typescript',
          order: 0
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
  card_type: CardType
  screens: CreateScreenData[]
}

// Componente para aba arrastável
interface SortableTabProps {
  screen: CreateScreenData
  index: number
  isActive: boolean
  onRemove: () => void
  onSelect: () => void
  canRemove: boolean
}

function SortableTab({ screen, index, isActive, onRemove, onSelect, canRemove }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `screen-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TabsTrigger
      ref={setNodeRef}
      style={style}
      value={index.toString()}
      className="flex items-center justify-between gap-2 relative flex-shrink-0"
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-gray-100"
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-3 w-3 text-gray-400" />
        </div>
        <span>{screen.name || `Arquivo ${index + 1}`}</span>
      </div>
      {canRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="h-4 w-4 p-0 text-gray-500 hover:text-red-600 cursor-pointer rounded flex items-center justify-center transition-colors"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </TabsTrigger>
  )
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
        card_type: initialData.card_type,
        screens: initialData.screens
      }
    }
    return { ...DEFAULT_FORM_DATA }
  })
  
  // Estado para controlar aba ativa (0+ = arquivos)
  const [activeTab, setActiveTab] = useState<number>(0)

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Atualizar formulário quando initialData mudar
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        title: initialData.title,
        tech: initialData.tech,
        language: initialData.language,
        description: initialData.description,
        content_type: initialData.content_type,
        card_type: initialData.card_type,
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
      language: type === ContentType.CODE ? 'typescript' : undefined,
      order: formData.screens[screenIndex]?.blocks?.length || 0
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
                  if (j === blockIndex) return { ...screen.blocks[blockIndex - 1], order: blockIndex }
                  if (j === blockIndex - 1) return { ...screen.blocks[blockIndex], order: blockIndex - 1 }
                  return block
                })
              }
            : screen
        )
      }))
    }
  }

  const moveBlockDown = (screenIndex: number, blockIndex: number) => {
    const screen = formData.screens[screenIndex]
    if (blockIndex < screen.blocks.length - 1) {
      setFormData(prev => ({
        ...prev,
        screens: prev.screens.map((screen, i) => 
          i === screenIndex 
            ? {
                ...screen,
                blocks: screen.blocks.map((block, j) => {
                  if (j === blockIndex) return { ...screen.blocks[blockIndex + 1], order: blockIndex }
                  if (j === blockIndex + 1) return { ...screen.blocks[blockIndex], order: blockIndex + 1 }
                  return block
                })
              }
            : screen
        )
      }))
    }
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
          language: 'typescript',
          order: 0
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
        setActiveTab(0)
      }
    }
  }

  // Função para reordenar abas via drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('screen-', ''))
      const newIndex = parseInt(over.id.toString().replace('screen-', ''))

      setFormData(prev => ({
        ...prev,
        screens: arrayMove(prev.screens, oldIndex, newIndex)
      }))

      // Ajustar aba ativa se necessário
      if (activeTab === oldIndex) {
        setActiveTab(newIndex)
      } else if (activeTab === newIndex) {
        setActiveTab(oldIndex)
      } else if (activeTab > oldIndex && activeTab <= newIndex) {
        setActiveTab(activeTab - 1)
      } else if (activeTab < oldIndex && activeTab >= newIndex) {
        setActiveTab(activeTab + 1)
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
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
        
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* LEFT COLUMN: Configuration & Metadata */}
          <div className="w-full lg:w-[350px] border-r bg-gray-50 p-6 overflow-y-auto flex-shrink-0 flex flex-col gap-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <Input
                  placeholder="Ex: Sistema de Autenticação"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo do Card *
                </label>
                <Select
                  value={formData.card_type}
                  onValueChange={(value) => handleInputChange('card_type', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dicas">Dicas</SelectItem>
                    <SelectItem value="codigos">Códigos</SelectItem>
                    <SelectItem value="workflows">Workflows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tecnologia *
                </label>
                <Select
                  value={formData.tech}
                  onValueChange={(value) => handleInputChange('tech', value)}
                >
                  <SelectTrigger className="bg-white">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Linguagem *
                </label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleInputChange('language', value)}
                >
                  <SelectTrigger className="bg-white">
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

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <Textarea
                placeholder="Descreva o que este CardFeature faz..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="flex-1 min-h-[150px] bg-white resize-none"
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Files Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
             <div className="p-4 border-b bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Arquivos do Projeto</h4>
                  <p className="text-xs text-gray-500">Gerencie os arquivos e trechos de código</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addScreen}
                  className="self-start sm:self-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Arquivo
                </Button>
             </div>

             <Tabs value={activeTab.toString()} onValueChange={(value) => setActiveTab(parseInt(value))} className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b px-4 bg-gray-50">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <TabsList className="form-tabs-scroll flex w-full h-auto p-1 overflow-x-auto justify-start bg-transparent">
                      <style>{`
                        .form-tabs-scroll::-webkit-scrollbar {
                          height: 6px;
                        }
                        .form-tabs-scroll::-webkit-scrollbar-track {
                          background: rgba(0, 0, 0, 0.1);
                          border-radius: 3px;
                        }
                        .form-tabs-scroll::-webkit-scrollbar-thumb {
                          background: rgba(0, 0, 0, 0.3);
                          border-radius: 3px;
                        }
                      `}</style>
                      
                      <SortableContext
                        items={formData.screens.map((_, index) => `screen-${index}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {formData.screens.map((screen, index) => (
                          <SortableTab
                            key={index}
                            screen={screen}
                            index={index}
                            isActive={activeTab === index}
                            onRemove={() => removeScreen(index)}
                            onSelect={() => setActiveTab(index)}
                            canRemove={formData.screens.length > 1}
                          />
                        ))}
                      </SortableContext>
                    </TabsList>
                  </DndContext>
                </div>

                {formData.screens.map((screen, index) => (
                  <TabsContent key={index} value={index.toString()} className="flex-1 overflow-hidden m-0 p-0 data-[state=active]:flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* Campos do arquivo */}
                      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start">
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Nome do Arquivo
                          </label>
                          <Input
                            placeholder="Ex: Model, Controller, Routes"
                            value={screen.name}
                            onChange={(e) => handleScreenChange(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Adicionar Conteúdo
                          </label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.CODE)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Código
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.TEXT)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Texto
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.TERMINAL)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Terminal
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Blocos de Conteúdo */}
                      <div className="space-y-4">
                          {screen.blocks.map((block, blockIndex) => (
                            <div key={blockIndex} className="border rounded-lg p-4 bg-gray-50 transition-all hover:shadow-md">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white px-2 py-1 rounded border">
                                    {block.type === ContentType.CODE ? '💻 Código' : 
                                     block.type === ContentType.TEXT ? '📄 Texto' : '⚡ Terminal'}
                                  </span>
                                  {block.type === ContentType.CODE && (
                                    <Select
                                      value={block.language || 'typescript'}
                                      onValueChange={(value) => handleBlockChange(index, blockIndex, 'language', value)}
                                    >
                                      <SelectTrigger className="w-36 h-8 bg-white">
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
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1 bg-white rounded-md border p-1">
                                  {screen.blocks.length > 1 && (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveBlockUp(index, blockIndex)}
                                        disabled={blockIndex === 0}
                                        className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                                      >
                                        <ChevronUp className="h-3 w-3" />
                                      </Button>
                                      
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveBlockDown(index, blockIndex)}
                                        disabled={blockIndex === screen.blocks.length - 1}
                                        className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                      <div className="w-px h-4 bg-gray-200 mx-1" />
                                    </>
                                  )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeBlock(index, blockIndex)}
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                </div>
                              </div>
                              
                              {block.type === ContentType.CODE && (
                                <div className="mb-3">
                                  <Input
                                    placeholder="Caminho do arquivo (ex: src/components/Button.tsx)"
                                    value={block.route || ''}
                                    onChange={(e) => handleBlockChange(index, blockIndex, 'route', e.target.value)}
                                    className="text-xs font-mono bg-white"
                                  />
                                </div>
                              )}
                              
                              <Textarea
                                placeholder={
                                  block.type === ContentType.CODE ? 'Cole seu código aqui...' :
                                  block.type === ContentType.TEXT ? 'Escreva texto/markdown aqui...' :
                                  '$ comando terminal...'
                                }
                                value={block.content}
                                onChange={(e) => handleBlockChange(index, blockIndex, 'content', e.target.value)}
                                rows={8}
                                className={`bg-white ${block.type === ContentType.CODE || block.type === ContentType.TERMINAL ? 'font-mono text-sm' : 'text-sm'}`}
                              />
                            </div>
                          ))}
                          
                          {screen.blocks.length === 0 && (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50/50">
                              <p>Nenhum bloco de conteúdo adicionado.</p>
                              <p className="text-sm mt-1">Use os botões acima para adicionar código, texto ou terminal.</p>
                            </div>
                          )}
                      </div>
                    </div>
                  </TabsContent>
                ))}
             </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t bg-gray-50 shrink-0">
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
