import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Loader2, Plus, Save, Youtube, List, Video, Check } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FormData {
  title: string
  description: string
  duration?: string
  difficulty?: "Iniciante" | "Intermediário" | "Avançado"
  tags?: string[]
  youtubeUrl: string
}

interface AddYouTubeModalProps {
  isOpen: boolean
  isLoading: boolean
  loadingPlaylist: boolean
  loadingVideo: boolean
  onClose: () => void
  onAddSeries: (data: FormData) => Promise<void>
  onAddTraining: (data: FormData) => Promise<void>
  onFetchPlaylistInfo: (url: string) => Promise<any>
  onFetchVideoInfo: (url: string) => Promise<any>
}

export default function AddYouTubeModal({ 
  isOpen, 
  isLoading,
  loadingPlaylist,
  loadingVideo,
  onClose, 
  onAddSeries,
  onAddTraining,
  onFetchPlaylistInfo,
  onFetchVideoInfo
}: AddYouTubeModalProps) {
  const [activeTab, setActiveTab] = useState<"series" | "training">("training")
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    duration: '',
    difficulty: 'Iniciante',
    tags: [],
    youtubeUrl: ''
  })
  const [tagInput, setTagInput] = useState('')
  const [playlistInfo, setPlaylistInfo] = useState<any>(null)
  const [videoInfo, setVideoInfo] = useState<any>(null)
  const [autoFilled, setAutoFilled] = useState(false)

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Se alterou a URL, limpar informações preenchidas automaticamente
    if (field === 'youtubeUrl') {
      setAutoFilled(false)
      if (activeTab === 'series') {
        setPlaylistInfo(null)
      } else {
        setVideoInfo(null)
      }
    }
  }

  // Buscar informações automaticamente quando a URL muda
  useEffect(() => {
    if (formData.youtubeUrl && isValidUrl(formData.youtubeUrl) && !autoFilled) {
      if (activeTab === 'series') {
        // Buscar informações da playlist
        const fetchInfo = async () => {
          const info = await onFetchPlaylistInfo(formData.youtubeUrl)
          if (info) {
            setPlaylistInfo(info)
            // Auto-preencher campos se estiverem vazios
            setFormData(prev => ({
              ...prev,
              title: prev.title || info.title,
              description: prev.description || info.description,
              duration: info.totalDuration // Sempre usar a duração calculada
            }))
            setAutoFilled(true)
          }
        }
        fetchInfo()
      } else {
        // Buscar informações do vídeo individual
        const fetchInfo = async () => {
          const info = await onFetchVideoInfo(formData.youtubeUrl)
          if (info) {
            setVideoInfo(info)
            // Auto-preencher campos se estiverem vazios
            setFormData(prev => ({
              ...prev,
              title: prev.title || info.title,
              duration: info.formattedDuration || info.duration // Usar duração formatada
            }))
            setAutoFilled(true)
          }
        }
        fetchInfo()
      }
    }
  }, [formData.youtubeUrl, activeTab, autoFilled, onFetchPlaylistInfo, onFetchVideoInfo])

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleInputChange('tags', [...(formData.tags || []), tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || [])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration: '',
      difficulty: 'Iniciante',
      tags: [],
      youtubeUrl: ''
    })
    setTagInput('')
    setPlaylistInfo(null)
    setVideoInfo(null)
    setAutoFilled(false)
  }

  const handleSubmit = async () => {
    if (activeTab === 'series') {
      await onAddSeries(formData)
    } else {
      await onAddTraining(formData)
    }
    
    if (!isLoading) {
      resetForm()
      onClose()
    }
  }

  const isValidUrl = (url: string) => {
    if (activeTab === 'series') {
      return url.includes('playlist') || url.includes('list=')
    } else {
      return url.includes('youtube.com/watch') || url.includes('youtu.be/') || /^[a-zA-Z0-9_-]{11}$/.test(url)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Adicionar Conteúdo do YouTube
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
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "series" | "training")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="training" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Vídeo Individual
              </TabsTrigger>
              <TabsTrigger value="series" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Série/Playlist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="training" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL do Vídeo do YouTube *
                  </label>
                  <Input
                    placeholder="https://youtube.com/watch?v=... ou apenas o ID do vídeo"
                    value={formData.youtubeUrl}
                    onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                    className={!isValidUrl(formData.youtubeUrl) && formData.youtubeUrl ? 'border-red-300' : ''}
                  />
                  {!isValidUrl(formData.youtubeUrl) && formData.youtubeUrl && (
                    <p className="text-red-500 text-xs mt-1">
                      URL inválida. Use uma URL completa do YouTube ou apenas o ID do vídeo (11 caracteres)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <Input
                    placeholder="Ex: Como criar componentes React"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <Textarea
                    placeholder="Descreva o conteúdo do vídeo..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duração
                      {loadingVideo && (
                        <span className="text-blue-600 text-xs ml-2">
                          <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                          Calculando...
                        </span>
                      )}
                    </label>
                    <Input
                      placeholder={loadingVideo ? "Calculando duração automática..." : "Ex: 45min, 1h 30min"}
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      disabled={loadingVideo}
                      className={videoInfo ? 'bg-green-50 border-green-300' : ''}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dificuldade
                    </label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => handleInputChange('difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Iniciante">Iniciante</SelectItem>
                        <SelectItem value="Intermediário">Intermediário</SelectItem>
                        <SelectItem value="Avançado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {videoInfo && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <div className="flex items-center text-green-700">
                      <Check className="h-4 w-4 mr-1" />
                      Informações obtidas automaticamente:
                    </div>
                    <ul className="text-green-600 text-xs mt-1 ml-5">
                      <li>• Duração: {videoInfo.formattedDuration}</li>
                      <li>• Título: {videoInfo.title}</li>
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Adicionar tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="series" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL da Playlist do YouTube *
                  </label>
                  <Input
                    placeholder="https://youtube.com/playlist?list=..."
                    value={formData.youtubeUrl}
                    onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                    className={!isValidUrl(formData.youtubeUrl) && formData.youtubeUrl ? 'border-red-300' : ''}
                  />
                  {!isValidUrl(formData.youtubeUrl) && formData.youtubeUrl && (
                    <p className="text-red-500 text-xs mt-1">
                      URL inválida. Use uma URL completa de playlist do YouTube
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título da Série *
                  </label>
                  <Input
                    placeholder="Ex: Curso Completo de React"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <Textarea
                    placeholder="Descreva o conteúdo da série..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duração Total
                      {loadingPlaylist && (
                        <span className="text-blue-600 text-xs ml-2">
                          <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                          Calculando...
                        </span>
                      )}
                    </label>
                    <Input
                      placeholder={loadingPlaylist ? "Calculando duração automática..." : "Ex: 10h 30min"}
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      disabled={loadingPlaylist}
                      className={playlistInfo ? 'bg-green-50 border-green-300' : ''}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dificuldade
                    </label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => handleInputChange('difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Iniciante">Iniciante</SelectItem>
                        <SelectItem value="Intermediário">Intermediário</SelectItem>
                        <SelectItem value="Avançado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {playlistInfo && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <div className="flex items-center text-green-700">
                      <Check className="h-4 w-4 mr-1" />
                      Informações obtidas automaticamente:
                    </div>
                    <ul className="text-green-600 text-xs mt-1 ml-5">
                      <li>• {playlistInfo.videoCount} vídeos encontrados</li>
                      <li>• Duração total: {playlistInfo.totalDuration}</li>
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
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
            disabled={isLoading || !formData.title || !formData.description || !formData.youtubeUrl || !isValidUrl(formData.youtubeUrl)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Adicionar {activeTab === 'series' ? 'Série' : 'Vídeo'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}