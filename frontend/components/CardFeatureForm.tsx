import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { X, Loader2, Plus, Save } from "lucide-react"
import type { CardFeature } from "@/types"

interface ScreenData {
  name: string
  description: string
  code: string
  route?: string
}

interface FormData {
  title: string
  tech: string
  language: string
  description: string
  screens: ScreenData[]
}

interface CardFeatureFormProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  initialData?: CardFeature
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
}

export default function CardFeatureForm({ 
  isOpen, 
  mode, 
  initialData, 
  isLoading, 
  onClose, 
  onSubmit 
}: CardFeatureFormProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState<FormData>(() => {
    if (mode === 'edit' && initialData) {
      return {
        title: initialData.title,
        tech: initialData.tech,
        language: initialData.language,
        description: initialData.description,
        screens: initialData.screens
      }
    }
    return {
      title: '',
      tech: 'React',
      language: 'typescript',
      description: '',
      screens: [
        {
          name: 'Main',
          description: 'Arquivo principal',
          code: '',
          route: ''
        }
      ]
    }
  })

  // Atualizar formulário quando initialData mudar (fix para modo edição)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      console.log('=== DADOS DO BACKEND ===')
      console.log('initialData.screens:', initialData.screens)
      console.log('Primeiro código vem com HTML?', initialData.screens[0]?.code.includes('<span'))
      console.log('Primeiro código:', initialData.screens[0]?.code)
      
      setFormData({
        title: initialData.title,
        tech: initialData.tech,
        language: initialData.language,
        description: initialData.description,
        screens: initialData.screens
      })
      setActiveTab(0) // Reset para primeira aba
    } else if (mode === 'create') {
      // Reset para criação
      setFormData({
        title: '',
        tech: 'React',
        language: 'typescript',
        description: '',
        screens: [
          {
            name: 'Main',
            description: 'Arquivo principal',
            code: '',
            route: ''
          }
        ]
      })
      setActiveTab(0) // Reset para primeira aba
    }
  }, [mode, initialData])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleScreenChange = (index: number, field: string, value: string) => {
    // Debug: verificar se HTML está sendo inserido via input
    if (field === 'code' && value.includes('<span')) {
      console.error('PROBLEMA DETECTADO - HTML sendo inserido via handleScreenChange:', {
        index,
        field,
        value,
        hasHtml: value.includes('<span')
      })
    }
    
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
      screens: [...prev.screens, { name: '', description: '', code: '', route: '' }]
    }))
    // Auto-selecionar nova aba
    setActiveTab(formData.screens.length)
  }

  const removeScreen = (index: number) => {
    if (formData.screens.length > 1) {
      setFormData(prev => ({
        ...prev,
        screens: prev.screens.filter((_, i) => i !== index)
      }))
      // Ajustar activeTab ao remover aba
      if (activeTab >= formData.screens.length - 1) {
        setActiveTab(Math.max(0, formData.screens.length - 2))
      } else if (activeTab > index) {
        setActiveTab(activeTab - 1)
      }
    }
  }

  const handleSubmit = async () => {
    console.log('CardFeatureForm handleSubmit - dados sendo enviados:', {
      mode,
      formData,
      // Debug: verificar se o código tem HTML antes de enviar
      firstScreenCode: formData.screens[0]?.code,
      hasHtmlTags: formData.screens[0]?.code.includes('<span')
    })
    
    await onSubmit(formData)
    if (mode === 'create') {
      setFormData({
        title: '',
        tech: 'React',
        language: 'typescript',
        description: '',
        screens: [{ name: 'Main', description: 'Arquivo principal', code: '', route: '' }]
      })
      setActiveTab(0) // Reset para primeira aba
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <Input
                  placeholder="Ex: Sistema de Autenticação JWT"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              
              <div className="md:col-span-3">
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

              <div className="md:col-span-3">
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
                Descrição
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Arquivos/Abas *
                </label>
                
                {/* Header das Abas */}
                <div className="flex gap-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg mb-4">
                  {formData.screens.map((screen, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveTab(index)}
                      className={`
                        px-4 py-2 text-xs font-medium transition-all duration-300 rounded-lg relative
                        ${activeTab === index 
                          ? 'text-gray-700 bg-white shadow-md transform scale-105 font-semibold' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:shadow-sm hover:-translate-y-0.5'
                        }
                      `}
                    >
                      {screen.name || `Arquivo ${index + 1}`}
                    </button>
                  ))}
                  
                  {/* Botão Adicionar Aba */}
                  <button
                    type="button"
                    onClick={addScreen}
                    className="px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-all duration-300 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400"
                  >
                    <Plus className="h-3 w-3 mr-1 inline" />
                    Adicionar
                  </button>
                </div>

                {/* Conteúdo da Aba Ativa */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Arquivo {activeTab + 1}</h4>
                    {formData.screens.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScreen(activeTab)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                        Remover Aba
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
                        value={formData.screens[activeTab]?.name || ''}
                        onChange={(e) => handleScreenChange(activeTab, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Rota do Arquivo
                      </label>
                      <Input
                        placeholder="Ex: backend/src/models/User.ts"
                        value={formData.screens[activeTab]?.route || ''}
                        onChange={(e) => handleScreenChange(activeTab, 'route', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Código
                    </label>
                    <Textarea
                      placeholder="Cole seu código aqui..."
                      value={formData.screens[activeTab]?.code || ''}
                      onChange={(e) => handleScreenChange(activeTab, 'code', e.target.value)}
                      rows={10}
                      className="font-mono text-sm min-h-[240px]"
                    />
                  </div>
                </div>
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