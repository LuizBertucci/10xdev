"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { ChevronRight, Key, Code2, Video, Bookmark, Loader2, Eye, EyeOff } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { useSavedItems } from "@/hooks/useSavedItems"
import { userService } from "@/services/userService"
import { savedItemService, type SavedItem } from "@/services/savedItemService"
import { toast } from "sonner"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import TrainingVideoCard from "@/components/TrainingVideoCard"
import type { CardFeature } from "@/types"
import type { PlatformState } from "@/types/platform"

interface UserProfileProps {
  platformState?: PlatformState
}

export default function UserProfile({ platformState }: UserProfileProps) {
  const { user } = useAuth()
  const { savedCards: savedCardsSet, savedVideos: savedVideosSet } = useSavedItems()
  const [isPending, startTransition] = useTransition()
  
  // Estado para alterar senha
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Estado para meus cards (com paginação)
  const [myCards, setMyCards] = useState<CardFeature[]>([])
  const [loadingMyCards, setLoadingMyCards] = useState(true)
  const [myCardsLoaded, setMyCardsLoaded] = useState(false)
  const [myCardsPage, setMyCardsPage] = useState(1)
  const [myCardsTotalPages, setMyCardsTotalPages] = useState(1)
  
  // Estado para itens salvos
  const [savedVideos, setSavedVideos] = useState<SavedItem[]>([])
  const [savedCards, setSavedCards] = useState<SavedItem[]>([])
  const [loadingSavedVideos, setLoadingSavedVideos] = useState(true)
  const [loadingSavedCards, setLoadingSavedCards] = useState(true)
  const [savedVideosLoaded, setSavedVideosLoaded] = useState(false)
  const [savedCardsLoaded, setSavedCardsLoaded] = useState(false)

  // Carregar meus cards (paginado de 10 em 10)
  const loadMyCards = useCallback(async (page: number = 1, showLoading = true) => {
    if (showLoading) setLoadingMyCards(true)
    try {
      const response = await userService.getMyCards(page, 10)
      if (response?.success && response.data) {
        startTransition(() => {
          setMyCards(response.data)
          setMyCardsPage(page)
          setMyCardsTotalPages(response.totalPages || 1)
          setMyCardsLoaded(true)
        })
      }
    } catch (error) {
      console.error('Erro ao carregar meus cards:', error)
    } finally {
      setLoadingMyCards(false)
    }
  }, [])

  // Carregar vídeos salvos (lazy - só quando clicar na tab)
  const loadSavedVideos = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingSavedVideos(true)
    try {
      const response = await savedItemService.list('video')
      if (response?.success) {
        startTransition(() => {
          setSavedVideos(response.data || [])
          setSavedVideosLoaded(true)
        })
      }
    } catch (error) {
      console.error('Erro ao carregar vídeos salvos:', error)
      setSavedVideos([])
      setSavedVideosLoaded(true)
    } finally {
      setLoadingSavedVideos(false)
    }
  }, [])

  // Carregar cards salvos (lazy - só quando clicar na tab)
  const loadSavedCards = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingSavedCards(true)
    try {
      const response = await savedItemService.list('card')
      if (response?.success) {
        startTransition(() => {
          setSavedCards(response.data || [])
          setSavedCardsLoaded(true)
        })
      }
    } catch (error) {
      console.error('Erro ao carregar cards salvos:', error)
      setSavedCards([])
      setSavedCardsLoaded(true)
    } finally {
      setLoadingSavedCards(false)
    }
  }, [])

  // Carregar apenas "Meus Cards" ao montar (lazy load para o resto)
  useEffect(() => {
    loadMyCards(1)
  }, [loadMyCards])

  // Handler para alterar senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }
    
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres")
      return
    }
    
    setChangingPassword(true)
    try {
      const response = await userService.changePassword({
        currentPassword,
        newPassword
      })
      
      if (response?.success) {
        toast.success("Senha alterada com sucesso!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(response?.error || "Erro ao alterar senha")
      }
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error)
      toast.error(error?.error || "Erro ao alterar senha")
    } finally {
      setChangingPassword(false)
    }
  }

  // Recarregar listas quando itens salvos mudam (via useSavedItems)
  useEffect(() => {
    if (savedVideosLoaded) {
      // Recarrega a lista se houver mudança no Set de vídeos salvos
      loadSavedVideos(false)
    }
  }, [savedVideosSet.size, loadSavedVideos, savedVideosLoaded])

  useEffect(() => {
    if (savedCardsLoaded) {
      // Recarrega a lista se houver mudança no Set de cards salvos
      loadSavedCards(false)
    }
  }, [savedCardsSet.size, loadSavedCards, savedCardsLoaded])


  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm">
        <button
          onClick={() => platformState?.setActiveTab?.("home")}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium">Meu Perfil</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Usuário'}</h1>
          <p className="text-gray-600">{user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="password"
        className="w-full"
        onValueChange={(value) => {
          // Lazy load das tabs de itens salvos
          if (value === 'saved-videos' && !savedVideosLoaded) {
            loadSavedVideos(true)
          }
          if (value === 'saved-cards' && !savedCardsLoaded) {
            loadSavedCards(true)
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="password" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Alterar Senha</span>
            <span className="sm:hidden">Senha</span>
          </TabsTrigger>
          <TabsTrigger value="my-cards" className="gap-2">
            <Code2 className="h-4 w-4" />
            <span className="hidden sm:inline">Meus Cards</span>
            <span className="sm:hidden">Cards</span>
          </TabsTrigger>
          <TabsTrigger value="saved-videos" className="gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Vídeos Salvos</span>
            <span className="sm:hidden">Vídeos</span>
          </TabsTrigger>
          <TabsTrigger value="saved-cards" className="gap-2">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Cards Salvos</span>
            <span className="sm:hidden">Salvos</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Alterar Senha */}
        <TabsContent value="password" className="mt-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Atualize sua senha de acesso à plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      disabled={changingPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={changingPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={changingPassword}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Meus Cards */}
        <TabsContent value="my-cards" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Cards criados por você ({myCards.length})
              </h2>
            </div>

            {loadingMyCards ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : myCards.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum card criado ainda
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Vá para a aba Códigos e crie seu primeiro card!
                  </p>
                  <Button onClick={() => platformState?.setActiveTab?.("codes")}>
                    Ir para Códigos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4 max-w-[900px]">
                  {myCards.map((card) => (
                    <CardFeatureCompact
                      key={card.id}
                      snippet={card}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
                {myCardsTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      onClick={() => loadMyCards(myCardsPage - 1)}
                      disabled={myCardsPage === 1 || loadingMyCards}
                      variant="outline"
                      size="sm"
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-gray-600 px-3">
                      Página {myCardsPage} de {myCardsTotalPages}
                    </span>
                    <Button
                      onClick={() => loadMyCards(myCardsPage + 1)}
                      disabled={myCardsPage === myCardsTotalPages || loadingMyCards}
                      variant="outline"
                      size="sm"
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab: Vídeos Salvos */}
        <TabsContent value="saved-videos" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Vídeos salvos ({savedVideos.length})
              </h2>
            </div>

            {loadingSavedVideos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : savedVideos.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum vídeo salvo
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Salve vídeos clicando no ícone de bookmark!
                  </p>
                  <Button onClick={() => platformState?.setActiveTab?.("videos")}>
                    Explorar Vídeos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedVideos.map((savedItem) => (
                  savedItem.item && (
                    <div key={savedItem.id} className="relative group">
                      <TrainingVideoCard
                        video={{
                          id: savedItem.item.id,
                          title: savedItem.item.title,
                          description: savedItem.item.description || '',
                          youtubeUrl: savedItem.item.youtubeUrl,
                          videoId: savedItem.item.videoId,
                          thumbnail: savedItem.item.thumbnail,
                          category: savedItem.item.category,
                          tags: [],
                          createdAt: savedItem.item.createdAt,
                          updatedAt: savedItem.item.createdAt
                        }}
                        onView={(id) => {
                          platformState?.setActiveTab?.("videos")
                        }}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Cards Salvos */}
        <TabsContent value="saved-cards" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Cards salvos ({savedCards.length})
              </h2>
            </div>

            {loadingSavedCards ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : savedCards.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum card salvo
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Salve cards clicando no ícone de bookmark!
                  </p>
                  <Button onClick={() => platformState?.setActiveTab?.("codes")}>
                    Explorar Códigos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-w-[900px]">
                {savedCards.map((savedItem) => (
                  savedItem.item && (
                    <CardFeatureCompact
                      key={savedItem.id}
                      snippet={{
                        id: savedItem.item.id,
                        title: savedItem.item.title,
                        tech: savedItem.item.tech,
                        language: savedItem.item.language,
                        description: savedItem.item.description,
                        content_type: savedItem.item.content_type,
                        card_type: savedItem.item.card_type,
                        screens: savedItem.item.screens,
                        createdBy: savedItem.item.createdBy,
                        isPrivate: savedItem.item.isPrivate,
                        createdAt: savedItem.item.createdAt,
                        updatedAt: savedItem.item.createdAt
                      }}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

