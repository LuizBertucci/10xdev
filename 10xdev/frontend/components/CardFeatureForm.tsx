import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { X, Loader2, Plus, Save } from "lucide-react"
import type { CardFeature, SupportedTech, SupportedLanguage } from "@/types"

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
      tech: SupportedTech.REACT,
      language: SupportedLanguage.TYPESCRIPT,
      description: '',
      screens: [
        { name: 'Main', description: '', code: '' }
      ]
    }
  })

  // Update form when initialData changes (fix for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        title: initialData.title,
        tech: initialData.tech,
        language: initialData.language,
        description: initialData.description,
        screens: initialData.screens
      })
    } else if (mode === 'create') {
      // Reset for creation
      const defaultScreen: ScreenData = { name: 'Main', description: '', code: '' }
      setFormData({
        title: '',
        tech: SupportedTech.REACT,
        language: SupportedLanguage.TYPESCRIPT,
        description: '',
        screens: [defaultScreen]
      })
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

  const addScreen = () => {
    const newScreen: ScreenData = { name: '', description: '', code: '' }
    setFormData(prev => ({
      ...prev,
      screens: [...prev.screens, newScreen]
    }))
  }

  const removeScreen = (index: number) => {
    const MIN_SCREENS_COUNT = 1
    if (formData.screens.length > MIN_SCREENS_COUNT) {
      setFormData(prev => ({
        ...prev,
        screens: prev.screens.filter((_, i) => i !== index)
      }))
    }
  }

  const handleSubmit = async () => {
    // Minimal validation for UX - backend will do complete validation
    if (!formData.title?.trim() || !formData.description?.trim() || !formData.screens?.some(s => s.name?.trim())) {
      alert('Fill at least title, description and file name')
      return
    }
    
    try {
      await onSubmit(formData)
      
      if (mode === 'create') {
        const defaultScreen: ScreenData = { name: 'Main', description: '', code: '' }
        setFormData({
          title: '',
          tech: SupportedTech.REACT,
          language: SupportedLanguage.TYPESCRIPT,
          description: '',
          screens: [defaultScreen]
        })
      }
    } catch (error) {
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-semibold">
            {mode === 'create' ? 'New CardFeature' : 'Edit CardFeature'}
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
                  Title *
                </label>
                <Input
                  placeholder="Ex: Sistema de Autenticação JWT"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technology *
                </label>
                <Select
                  value={formData.tech}
                  onValueChange={(value) => handleInputChange('tech', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SupportedTech.REACT}>{SupportedTech.REACT}</SelectItem>
                    <SelectItem value={SupportedTech.NODEJS}>{SupportedTech.NODEJS}</SelectItem>
                    <SelectItem value={SupportedTech.PYTHON}>{SupportedTech.PYTHON}</SelectItem>
                    <SelectItem value={SupportedTech.JAVASCRIPT}>{SupportedTech.JAVASCRIPT}</SelectItem>
                    <SelectItem value={SupportedTech.VUE}>{SupportedTech.VUE}</SelectItem>
                    <SelectItem value={SupportedTech.ANGULAR}>{SupportedTech.ANGULAR}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language *
                </label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleInputChange('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SupportedLanguage.TYPESCRIPT}>TypeScript</SelectItem>
                    <SelectItem value={SupportedLanguage.JAVASCRIPT}>JavaScript</SelectItem>
                    <SelectItem value={SupportedLanguage.PYTHON}>Python</SelectItem>
                    <SelectItem value={SupportedLanguage.HTML}>HTML</SelectItem>
                    <SelectItem value={SupportedLanguage.CSS}>CSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Files/Tabs *
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Only file name is required. Description and code can be filled later.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addScreen}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add File
                </Button>
              </div>

              <div className="space-y-4">
                {formData.screens.map((screen, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">File {index + 1}</h4>
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
                          File Name *
                        </label>
                        <Input
                          placeholder="Ex: Model, Controller, Routes"
                          value={screen.name}
                          onChange={(e) => handleScreenChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Description (optional)
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
                        Code (optional)
                      </label>
                      <Textarea
                        placeholder="Cole seu código aqui ou deixe vazio para preencher depois..."
                        value={screen.code}
                        onChange={(e) => handleScreenChange(index, 'code', e.target.value)}
                        rows={mode === 'edit' ? 10 : 8}
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
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Create CardFeature' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}