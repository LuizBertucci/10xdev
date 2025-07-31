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
          code: ''
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
            code: ''
          }
        ]
      })
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
        screens: [{ name: 'Main', description: 'Arquivo principal', code: '' }]
      })
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
                        rows={10}
                        className="font-mono text-sm min-h-[240px]"
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
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.title || !formData.description}
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