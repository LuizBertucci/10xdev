import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Clock, Play, BookOpen, PlayCircle, List, Video, Plus, X, Edit2, Trash2 } from "lucide-react"
import { useLessons } from "@/hooks/useLessons"
import AddYouTubeModal from "@/components/AddYouTubeModal"
import CustomThumbnailGenerator from "@/components/CustomThumbnailGenerator"

interface VideoLesson {
  id: string
  title: string
  description: string
  duration: string
  chapter: number
  completed: boolean
  track: string
}

export default function Lessons() {
  const {
    playlistSeries,
    individualTrainings,
    loading,
    loadingPlaylist,
    loadingVideo,
    error,
    addPlaylistSeries,
    addIndividualTraining,
    removePlaylistSeries,
    removeIndividualTraining,
    clearError,
    loadMockData,
    fetchPlaylistInfo,
    fetchVideoInfo
  } = useLessons()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [customThumbnails, setCustomThumbnails] = useState<Record<string, string>>({})

  const videoLessons: VideoLesson[] = [
    {
      id: "1",
      title: "Introdução ao React",
      description: "Conceitos básicos e setup do ambiente",
      duration: "30min",
      chapter: 1,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "2",
      title: "Componentes e Props",
      description: "Aprenda a criar componentes reutilizáveis",
      duration: "45min",
      chapter: 2,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "3",
      title: "Estado e Eventos",
      description: "Gerenciamento de estado e manipulação de eventos",
      duration: "60min",
      chapter: 3,
      completed: false,
      track: "React Fundamentals",
    },
  ]

  // Carregar dados mock na inicialização
  useEffect(() => {
    loadMockData()
  }, [loadMockData])

  const handleAddSeries = async (formData: any) => {
    await addPlaylistSeries(formData.youtubeUrl, {
      title: formData.title,
      description: formData.description,
      duration: formData.duration,
      difficulty: formData.difficulty
      // Remover totalVideos - deixar que o serviço do YouTube determine o valor correto
    })
    setShowAddModal(false)
  }

  const handleAddTraining = async (formData: any) => {
    await addIndividualTraining(formData.youtubeUrl, {
      title: formData.title,
      description: formData.description,
      duration: formData.duration,
      difficulty: formData.difficulty,
      tags: formData.tags
    })
    setShowAddModal(false)
  }

  // Handler para reproduzir série
  const handlePlaySeries = (series: any) => {
    const playlistUrl = `https://www.youtube.com/playlist?list=${series.youtubePlaylistId}`
    window.open(playlistUrl, '_blank')
  }

  // Handler para reproduzir vídeo individual
  const handlePlayTraining = (training: any) => {
    // Usar URL original se disponível (para preservar playlist), senão usar URL simples
    const videoUrl = training.originalUrl || `https://www.youtube.com/watch?v=${training.youtubeId}`
    window.open(videoUrl, '_blank')
  }

  // Handler para quando a imagem não carrega
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Fallback para uma imagem padrão ou placeholder
    e.currentTarget.src = '/placeholder.jpg'
  }

  // Handler para quando uma thumbnail customizada é gerada
  const handleThumbnailGenerated = (seriesId: string, thumbnailUrl: string) => {
    setCustomThumbnails(prev => ({
      ...prev,
      [seriesId]: thumbnailUrl
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Aulas</h1>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar do YouTube
          </Button>
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Progresso Geral</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="series" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="series" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Séries
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Treinamentos Individuais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="series" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {playlistSeries.map((series) => (
              <Card 
                key={series.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handlePlaySeries(series)}>
                <div className="relative">
                  {/* Usar thumbnail customizada se disponível, senão mostrar gerador */}
                  {customThumbnails[series.id] ? (
                    <img 
                      src={customThumbnails[series.id]} 
                      alt={series.title}
                      className="w-full h-48 object-cover rounded-t-lg group-hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <CustomThumbnailGenerator
                      request={{
                        title: series.title,
                        description: series.description,
                        difficulty: series.difficulty,
                        videoCount: series.totalVideos,
                        playlistId: series.youtubePlaylistId || series.id
                      }}
                      onGenerated={(thumbnailUrl) => handleThumbnailGenerated(series.id, thumbnailUrl)}
                      className="w-full h-48 object-cover rounded-t-lg group-hover:opacity-90 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-t-lg" />
                  <div className="absolute top-2 left-2">
                    <PlayCircle className="h-12 w-12 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Botões de ação transparentes */}
                  <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/40 hover:border-white/20 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implementar edição
                        console.log('Editar série:', series.id);
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-white drop-shadow-lg" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 bg-red-500/20 backdrop-blur-sm border border-red-300/20 hover:bg-red-500/40 hover:border-red-300/40 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Tem certeza que deseja deletar esta série?')) {
                          removePlaylistSeries(series.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-100 drop-shadow-lg" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors flex-1">
                      {series.title}
                    </h3>
                    <Badge 
                      variant={
                        series.difficulty === "Iniciante" ? "secondary" :
                        series.difficulty === "Intermediário" ? "default" : "destructive"
                      }
                      className="ml-2"
                    >
                      {series.difficulty}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {series.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{series.duration}</span>
                      <span className="text-gray-500">{series.completed}/{series.totalVideos} concluídos</span>
                    </div>
                    <Progress value={(series.completed / series.totalVideos) * 100} className="h-2" />
                  </div>
                  <Button 
                    className="w-full mt-4 group-hover:bg-blue-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita trigger do card
                      handlePlaySeries(series);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {series.completed > 0 ? "Continuar Série" : "Iniciar Série"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <div className="grid gap-4">
            {individualTrainings.map((training) => (
              <Card 
                key={training.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handlePlayTraining(training)}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="relative flex-shrink-0">
                      <img 
                        src={training.thumbnail} 
                        alt={training.title}
                        className="w-40 h-24 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Play className="h-8 w-8 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white px-1 py-0.5 rounded text-xs">
                        {training.duration}
                      </div>
                      {/* Botões de ação */}
                      <div className="absolute top-1 right-1 flex space-x-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implementar edição
                            console.log('Editar treinamento:', training.id);
                          }}
                        >
                          <Edit2 className="h-3 w-3 text-gray-700" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 w-6 p-0 bg-red-500/90 hover:bg-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Tem certeza que deseja deletar este treinamento?')) {
                              removeIndividualTraining(training.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-white" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                        {training.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {training.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            training.difficulty === "Iniciante" ? "secondary" :
                            training.difficulty === "Intermediário" ? "default" : "destructive"
                          }>
                            {training.difficulty}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{training.duration}</span>
                          </div>
                        </div>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="group-hover:bg-blue-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita trigger do card
                            handlePlayTraining(training);
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Assistir
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {training.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AddYouTubeModal
        isOpen={showAddModal}
        isLoading={loading}
        loadingPlaylist={loadingPlaylist}
        loadingVideo={loadingVideo}
        onClose={() => setShowAddModal(false)}
        onAddSeries={handleAddSeries}
        onAddTraining={handleAddTraining}
        onFetchPlaylistInfo={fetchPlaylistInfo}
        onFetchVideoInfo={fetchVideoInfo}
      />
    </div>
  )
}