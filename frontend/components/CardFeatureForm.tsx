import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Loader2, Plus, Save, ChevronUp, ChevronDown, GripVertical, Globe, Lock, Link2, Settings, Code2 } from "lucide-react"
import type { CardFeature, CreateScreenData, CreateBlockData } from "@/types"
import { ContentType, CardType, Visibility } from "@/types"
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
  visibility: Visibility.PUBLIC,
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
  visibility: Visibility
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
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <TabsTrigger
      ref={setNodeRef}
      style={style}
      value={index.toString()}
      className={`
        group flex items-center gap-2 px-3 py-1 h-7 min-w-[100px] max-w-[160px]
        relative flex-shrink-0 transition-all duration-200
        border rounded-md font-medium text-[11px]
        ${isActive 
          ? 'bg-white border-gray-200 text-blue-600 shadow-sm z-10' 
          : 'bg-gray-100/40 border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-0.5 rounded hover:bg-black/5 shrink-0"
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-3 w-3 text-gray-400" />
        </div>
        <span className="truncate flex-1 text-left">
          {screen.name || `Arquivo ${index + 1}`}
        </span>
      </div>
      
      {canRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 rounded flex items-center justify-center transition-all ml-1"
          style={{ opacity: isActive ? 1 : undefined }} // Sempre mostrar se ativo
        >
          <X className="h-2.5 w-2.5" />
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
        visibility: initialData.visibility ?? Visibility.PUBLIC,
        screens: initialData.screens
      }
    }
    return { ...DEFAULT_FORM_DATA }
  })
  
  // Estado para controlar aba ativa (0+ = arquivos)
  const [activeTab, setActiveTab] = useState<number>(0)

  // Estado para visualização mobile (config ou codigo)
  const [mobileViewTab, setMobileViewTab] = useState<'config' | 'code'>('config')

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
        visibility: initialData.visibility ?? Visibility.PUBLIC,
        screens: initialData.screens
      })
    } else if (mode === 'create') {
      setFormData({ ...DEFAULT_FORM_DATA })
    }
  }, [mode, initialData])


  const handleInputChange = (field: string, value: string | boolean) => {
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
    // Pegar emails do campo de compartilhamento (se existir)
    const shareEmailsInput = document.querySelector('[data-share-emails]') as HTMLInputElement
    const shareEmails = shareEmailsInput?.value?.trim()

    // Submeter o formulário principal
    await onSubmit(formData)

    // Se for card privado e tiver emails para compartilhar, chamar API
    if (formData.visibility === Visibility.PRIVATE && shareEmails && shareEmailsInput) {
      try {
        // Precisamos do ID do card recém-criado (será passado pelo onSubmit)
        // Por ora, vamos apenas limpar o campo
        shareEmailsInput.value = ''
        // TODO: Chamar API de compartilhamento quando tiver o card ID
      } catch (error) {
        console.error('Erro ao compartilhar:', error)
      }
    }

    if (mode === 'create') {
      setFormData({ ...DEFAULT_FORM_DATA })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] h-[85vh] sm:h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b shrink-0">
          <h3 className="text-base sm:text-xl font-semibold">
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
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Seletor de Abas Mobile - Design Segmentado Moderno */}
          <div className="md:hidden px-4 py-3 border-b shrink-0 bg-white">
            <div className="flex p-1 bg-gray-100/80 rounded-xl border border-gray-200/50">
              <button
                type="button"
                onClick={() => setMobileViewTab('config')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200
                  ${mobileViewTab === 'config' 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <Settings className={`h-3.5 w-3.5 ${mobileViewTab === 'config' ? 'text-blue-600' : 'text-gray-400'}`} />
                Configurações
              </button>
              <button
                type="button"
                onClick={() => setMobileViewTab('code')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200
                  ${mobileViewTab === 'code' 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <Code2 className={`h-3.5 w-3.5 ${mobileViewTab === 'code' ? 'text-blue-600' : 'text-gray-400'}`} />
                Código
              </button>
            </div>
          </div>

          {/* LEFT COLUMN: Configuration & Metadata */}
          <div className={`w-full md:basis-[20%] md:grow-0 md:shrink-0 min-w-[200px] border-b md:border-b-0 md:border-r bg-gray-50/50 p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 sm:gap-7 md:max-h-none ${
            mobileViewTab === 'config' ? 'flex-1' : 'hidden md:flex'
          }`}>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Identificação
                </label>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Título do Card *
                  </label>
                  <Input
                    placeholder="Ex: Sistema de Autenticação"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="bg-white border-gray-200 focus:border-blue-300 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Categorização
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tipo do Card
                    </label>
                    <Select
                      value={formData.card_type}
                      onValueChange={(value) => handleInputChange('card_type', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-xs h-9 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="dicas">Dicas</SelectItem>
                        <SelectItem value="codigos">Códigos</SelectItem>
                        <SelectItem value="workflows">Workflows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tecnologia Principal
                    </label>
                    <Select
                      value={formData.tech}
                      onValueChange={(value) => handleInputChange('tech', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-xs h-9 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Linguagem Padrão
                    </label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => handleInputChange('language', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-xs h-9 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  Acesso
                </label>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Visibilidade
                  </label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) => handleInputChange('visibility', value as Visibility)}
                  >
                    <SelectTrigger className="bg-white border-gray-200 text-xs h-9 shadow-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {formData.visibility === Visibility.PUBLIC && (
                          <Globe className="h-3.5 w-3.5 shrink-0 text-green-600" />
                        )}
                        {formData.visibility === Visibility.UNLISTED && (
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        )}
                        {formData.visibility === Visibility.PRIVATE && (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                        )}
                        <span className="truncate">
                          {formData.visibility === Visibility.PUBLIC && "Público"}
                          {formData.visibility === Visibility.UNLISTED && "Não Listado"}
                          {formData.visibility === Visibility.PRIVATE && "Privado"}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value={Visibility.PUBLIC}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-green-600" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs">Público</div>
                            <div className="text-[10px] text-muted-foreground">Aparece nas listagens</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value={Visibility.UNLISTED}>
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs">Não Listado</div>
                            <div className="text-[10px] text-muted-foreground">Só quem tem o link pode ver</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value={Visibility.PRIVATE}>
                        <div className="flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs">Privado</div>
                            <div className="text-[10px] text-muted-foreground">Só você pode ver</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo de Compartilhamento - Apenas para cards privados */}
                {formData.visibility === Visibility.PRIVATE && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Compartilhar com (e-mails)
                    </label>
                    <Input
                      type="text"
                      placeholder="joao@email.com, maria@..."
                      className="bg-white border-gray-200 text-xs h-9 shadow-sm"
                      data-share-emails="true"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                Sobre
              </label>
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Descrição do Conteúdo
                </label>
                <Textarea
                  placeholder="Descreva o que este CardFeature faz..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="flex-1 min-h-[100px] bg-white border-gray-200 focus:border-blue-300 text-xs resize-none shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Files Editor */}
          <div className={`flex-1 flex flex-col overflow-hidden bg-white min-w-0 ${
            mobileViewTab === 'code' ? 'flex-1 flex' : 'hidden md:flex'
          }`}>
             <div className="px-4 py-3 border-b bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Save className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-none">Arquivos</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Gerencie as abas</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addScreen}
                  className="h-7 px-2.5 text-[10px] bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-blue-600 transition-all shadow-sm shrink-0"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo Arquivo
                </Button>
             </div>

             <Tabs value={activeTab.toString()} onValueChange={(value) => setActiveTab(parseInt(value))} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50/50 border-b overflow-hidden">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <TabsList className="form-tabs-scroll flex w-full h-8 p-0 gap-1 overflow-x-auto overflow-y-hidden justify-start bg-transparent border-none items-center">
                      <style>{`
                        .form-tabs-scroll::-webkit-scrollbar {
                          height: 2px;
                        }
                        .form-tabs-scroll::-webkit-scrollbar-track {
                          background: transparent;
                        }
                        .form-tabs-scroll::-webkit-scrollbar-thumb {
                          background: rgba(0, 0, 0, 0.05);
                          border-radius: 10px;
                        }
                        .form-tabs-scroll:hover::-webkit-scrollbar-thumb {
                          background: rgba(0, 0, 0, 0.1);
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
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                      {/* Campos do arquivo */}
                      <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
                            Nome do Arquivo
                          </label>
                          <Input
                            placeholder="Ex: Model, Controller..."
                            value={screen.name}
                            onChange={(e) => handleScreenChange(index, 'name', e.target.value)}
                            className="h-8 text-xs bg-white border-gray-200 focus:border-blue-200"
                          />
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                            Adicionar Bloco
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.CODE)}
                              className="h-8 px-2.5 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 rounded-md transition-all"
                            >
                              <Plus className="h-3 w-3 mr-1.5" />
                              Código
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.TEXT)}
                              className="h-8 px-2.5 text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border border-purple-100 rounded-md transition-all"
                            >
                              <Plus className="h-3 w-3 mr-1.5" />
                              Texto
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addBlock(index, ContentType.TERMINAL)}
                              className="h-8 px-2.5 text-[11px] bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border border-amber-100 rounded-md transition-all"
                            >
                              <Plus className="h-3 w-3 mr-1.5" />
                              Terminal
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Blocos de Conteúdo */}
                      <div className="space-y-4">
                          {screen.blocks.map((block, blockIndex) => (
                            <div key={blockIndex} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
                              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 border-b">
                                <div className="flex items-center gap-3">
                                  <div className={`
                                    flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                                    ${block.type === ContentType.CODE ? 'bg-blue-100 text-blue-700' : 
                                      block.type === ContentType.TEXT ? 'bg-purple-100 text-purple-700' : 
                                      'bg-amber-100 text-amber-700'}
                                  `}>
                                    {block.type === ContentType.CODE ? 'Código' : 
                                     block.type === ContentType.TEXT ? 'Texto' : 'Terminal'}
                                  </div>
                                  
                                  {block.type === ContentType.CODE && (
                                    <Select
                                      value={block.language || 'typescript'}
                                      onValueChange={(value) => handleBlockChange(index, blockIndex, 'language', value)}
                                    >
                                      <SelectTrigger className="w-32 h-7 text-xs bg-white border-gray-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="text-xs">
                                        <SelectItem value="typescript">TypeScript</SelectItem>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="html">HTML</SelectItem>
                                        <SelectItem value="css">CSS</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {screen.blocks.length > 1 && (
                                    <div className="flex items-center mr-2 pr-2 border-r border-gray-200">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveBlockUp(index, blockIndex)}
                                        disabled={blockIndex === 0}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                                      >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      </Button>
                                      
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => moveBlockDown(index, blockIndex)}
                                        disabled={blockIndex === screen.blocks.length - 1}
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                                      >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBlock(index, blockIndex)}
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="p-4">
                                {block.type === ContentType.CODE && (
                                  <div className="mb-3">
                                    <Input
                                      placeholder="Caminho do arquivo (ex: src/components/Button.tsx)"
                                      value={block.route || ''}
                                      onChange={(e) => handleBlockChange(index, blockIndex, 'route', e.target.value)}
                                      className="text-xs font-mono bg-gray-50/50 border-gray-100 focus:bg-white"
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
                                  className={`bg-white border-gray-100 focus:border-blue-200 min-h-[120px] resize-none ${block.type === ContentType.CODE || block.type === ContentType.TERMINAL ? 'font-mono text-[13px] leading-relaxed' : 'text-sm'}`}
                                />
                              </div>
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
        <div className="flex items-center justify-end space-x-2 sm:space-x-3 p-3 sm:p-4 border-t bg-gray-50 shrink-0">
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
