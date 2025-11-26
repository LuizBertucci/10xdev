"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, FileCode, Calendar, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { projectService, type Project, ProjectMemberRole } from "@/services"
import { cardFeatureService, type CardFeature } from "@/services"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CardFeatureCompact from "@/components/CardFeatureCompact"
import { usePlatform } from "@/hooks/use-platform"

interface PlatformState {
  setActiveTab?: (tab: string) => void
}

interface ProjectDetailProps {
  platformState?: PlatformState
}

export default function ProjectDetail({ platformState }: ProjectDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('id') || null

  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [cardFeatures, setCardFeatures] = useState<CardFeature[]>([])
  const [availableCards, setAvailableCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingCards, setLoadingCards] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [selectedCardId, setSelectedCardId] = useState("")

  useEffect(() => {
    if (projectId) {
      loadProject()
      loadMembers()
      loadCards()
    }
  }, [projectId])

  const loadProject = async () => {
    if (!projectId) return
    
    try {
      setLoading(true)
      const response = await projectService.getById(projectId)
      if (response?.success && response?.data) {
        setProject(response.data)
      } else {
        toast.error(response?.error || 'Erro ao carregar projeto')
        handleBack()
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar projeto')
      handleBack()
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!projectId) return
    
    try {
      setLoadingMembers(true)
      const response = await projectService.getMembers(projectId)
      if (response?.success && response?.data) {
        setMembers(response.data)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar membros')
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadCards = async () => {
    if (!projectId) return
    
    try {
      setLoadingCards(true)
      const response = await projectService.getCards(projectId)
      if (response?.success && response?.data) {
        setCards(response.data)
        
        // Buscar dados completos dos card features
        const cardFeaturePromises = response.data.map(async (projectCard: any) => {
          try {
            const cardResponse = await cardFeatureService.getById(projectCard.cardFeatureId)
            if (cardResponse?.success && cardResponse?.data) {
              return cardResponse.data
            }
            return null
          } catch (error) {
            console.error(`Erro ao buscar card feature ${projectCard.cardFeatureId}:`, error)
            return null
          }
        })
        
        const features = await Promise.all(cardFeaturePromises)
        setCardFeatures(features.filter((f): f is CardFeature => f !== null))
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar cards')
    } finally {
      setLoadingCards(false)
    }
  }

  const loadAvailableCards = async () => {
    try {
      const response = await cardFeatureService.getAll({ limit: 100 })
      if (response?.success && response?.data) {
        const projectCardIds = new Set(cards.map((c: any) => c.cardFeatureId))
        const filtered = response.data.filter((card: any) => !projectCardIds.has(card.id))
        setAvailableCards(filtered)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar cards disponíveis')
    }
  }

  const handleAddCard = async () => {
    if (!selectedCardId || !projectId) {
      toast.error('Selecione um card')
      return
    }

    try {
      const response = await projectService.addCard(projectId, selectedCardId)
      if (response?.success) {
        toast.success('Card adicionado ao projeto!')
        setIsAddCardDialogOpen(false)
        setSelectedCardId("")
        loadCards()
        loadAvailableCards()
      } else {
        toast.error(response?.error || 'Erro ao adicionar card')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar card')
    }
  }

  const handleRemoveCard = async (cardFeatureId: string) => {
    if (!confirm('Tem certeza que deseja remover este card do projeto?')) {
      return
    }

    try {
      const response = await projectService.removeCard(projectId!, cardFeatureId)
      if (response?.success) {
        toast.success('Card removido do projeto!')
        loadCards()
        loadAvailableCards()
      } else {
        toast.error(response?.error || 'Erro ao remover card')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover card')
    }
  }

  const handleReorderCard = async (cardFeatureId: string, direction: 'up' | 'down') => {
    if (!projectId) return
    
    try {
      const response = await projectService.reorderCard(projectId, cardFeatureId, direction)
      if (response?.success) {
        toast.success('Card reordenado com sucesso!')
        loadCards()
      } else {
        toast.error(response?.error || 'Erro ao reordenar card')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reordenar card')
    }
  }

  const handleDeleteProject = async () => {
    if (!projectId) return
    
    if (!confirm('Tem certeza que deseja deletar este projeto? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await projectService.delete(projectId)
      if (response?.success) {
        toast.success('Projeto deletado com sucesso!')
        handleBack()
      } else {
        toast.error(response?.error || 'Erro ao deletar projeto')
      }
    } catch (error: any) {
      console.error('Erro ao deletar projeto:', error)
      let errorMessage = 'Erro ao deletar projeto'
      if (error?.error) {
        errorMessage = error.error
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    }
  }

  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'projects')
    params.delete('id') // Remove o id para voltar à lista
    router.push(`/?${params.toString()}`)
  }

  useEffect(() => {
    if (isAddCardDialogOpen) {
      loadAvailableCards()
    }
  }, [isAddCardDialogOpen])

  if (loading || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Carregando projeto...</p>
      </div>
    )
  }

  const filteredCards = cardFeatures
    .map((cardFeature: CardFeature) => {
      const projectCard = cards.find((c: any) => c.cardFeatureId === cardFeature.id)
      return { cardFeature, projectCard, order: projectCard?.order ?? 999 }
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .filter(({ cardFeature }) => 
      !searchTerm || 
      (cardFeature.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (cardFeature.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

  const canManageMembers = project.userRole === 'owner' || project.userRole === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack}>
            ← Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {project.userRole && (
            <Badge variant={project.userRole === 'owner' ? 'default' : 'secondary'}>
              {project.userRole === 'owner' ? 'Owner' : 
               project.userRole === 'admin' ? 'Admin' : 'Member'}
            </Badge>
          )}
          {project.userRole === 'owner' && (
            <Button variant="destructive" size="sm" onClick={handleDeleteProject}>
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar Projeto
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards</CardTitle>
            <FileCode className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Criado em</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {new Date(project.createdAt).toLocaleDateString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
        </TabsList>

        {/* Tab Cards */}
        <TabsContent value="cards">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cards do Projeto</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Buscar cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Button size="sm" onClick={() => setIsAddCardDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Card
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCards ? (
                <p className="text-gray-500 text-center py-8">Carregando...</p>
              ) : filteredCards.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum card adicionado</p>
              ) : (
                <div className="space-y-4">
                  {filteredCards.map(({ cardFeature, projectCard }, index) => {
                    const isFirst = index === 0
                    const isLast = index === filteredCards.length - 1
                    
                    return (
                      <div key={cardFeature.id} className="relative group flex items-start gap-2">
                        {/* Botões de reordenação */}
                        <div className="flex flex-col gap-1 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReorderCard(cardFeature.id, 'up')
                            }}
                            disabled={isFirst}
                            className="h-8 w-8 p-0"
                            title="Mover para cima"
                          >
                            <ChevronUp className={`h-4 w-4 ${isFirst ? 'text-gray-300' : 'text-gray-600'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReorderCard(cardFeature.id, 'down')
                            }}
                            disabled={isLast}
                            className="h-8 w-8 p-0"
                            title="Mover para baixo"
                          >
                            <ChevronDown className={`h-4 w-4 ${isLast ? 'text-gray-300' : 'text-gray-600'}`} />
                          </Button>
                        </div>
                        
                        {/* Card */}
                        <div className="flex-1 relative">
                          <CardFeatureCompact
                            snippet={cardFeature}
                            onEdit={() => {}} // Não permitir editar aqui
                            onDelete={() => {}} // Não permitir deletar aqui
                          />
                          <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (projectCard) {
                                  handleRemoveCard(projectCard.cardFeatureId)
                                }
                              }}
                              className="shadow-lg"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Membros */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Membros do Projeto</CardTitle>
                {canManageMembers && (
                  <Button size="sm" onClick={() => setIsAddMemberDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <p className="text-gray-500 text-center py-8">Carregando...</p>
              ) : members.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum membro adicionado</p>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {member.user?.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt={member.user.name || member.user.email}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{member.user?.name || member.user?.email}</p>
                          {member.user?.name && (
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role === 'owner' ? 'Owner' : 
                         member.role === 'admin' ? 'Admin' : 'Member'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Adicionar Card */}
      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Card ao Projeto</DialogTitle>
            <DialogDescription>
              Selecione um card do diretório para adicionar ao projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="card">Card</Label>
              <select
                id="card"
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione um card</option>
                {availableCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.title} - {card.tech}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCard}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Membro */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro ao Projeto</DialogTitle>
            <DialogDescription>
              Adicione um membro ao projeto pelo e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // TODO: Implementar adição de membro
              toast.info('Funcionalidade de adicionar membro será implementada em breve')
              setIsAddMemberDialogOpen(false)
            }}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

