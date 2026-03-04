"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Plus, ChevronRight, Video, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import CardTutorial from "@/components/CardTutorial"
import TutorialForm from "@/components/TutorialForm"
import { contentService } from "@/services"
import type { Content } from "@/types/content"
import { useAuth } from "@/hooks/useAuth"

// Memoized AddTutorialButton component - prevents re-renders when parent changes
interface AddTutorialButtonProps {
  onClick: () => void
  disabled: boolean
  isAdmin: boolean
}

const AddTutorialButton = React.memo(function AddTutorialButton({ onClick, disabled, isAdmin }: AddTutorialButtonProps) {
  if (!isAdmin) return null

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="bg-rose-500 hover:bg-rose-600 text-white whitespace-nowrap px-2 sm:px-4"
      size="sm"
    >
      <Plus className="h-4 w-4 mr-1" />
      <span className="sm:hidden">Criar</span>
      <span className="hidden sm:inline">Adicionar tutorial</span>
    </Button>
  )
}, (prevProps, nextProps) => {
  if (prevProps.disabled !== nextProps.disabled) return false
  if (prevProps.isAdmin !== nextProps.isAdmin) return false
  if (prevProps.onClick !== nextProps.onClick) return false
  return true
})

export default function Contents() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  // Get tab from URL (defaults to 'tutorials')
  const contentsTab = searchParams?.get('tab') || 'tutorials'

  // Redirect para /contents?tab=tutorials quando acessar sem parâmetro
  useEffect(() => {
    const currentTab = searchParams?.get('tab')
    if (!currentTab) {
      router.replace('/contents?tab=tutorials')
    }
  }, [searchParams, router])

  // ================================================
  // TUTORIALS STATE (Contents with content_type='video')
  // ================================================
  const [tutorials, setTutorials] = useState<Content[]>([])
  const [tutorialsLoading, setTutorialsLoading] = useState(false)
  const [tutorialsError, setTutorialsError] = useState<string | null>(null)
  const [tutorialsSearch, setTutorialsSearch] = useState("")
  const [createTutorialOpen, setCreateTutorialOpen] = useState(false)

  // Fetch tutorials when tab is active
  useEffect(() => {
    if (contentsTab !== 'tutorials') return

    const fetchTutorials = async () => {
      setTutorialsLoading(true)
      setTutorialsError(null)
      try {
        const res = await contentService.getTutorials({ limit: 100 })
        if (res?.success && res.data) {
          setTutorials(res.data)
        } else {
          setTutorialsError(res?.error || "Erro ao carregar tutoriais")
        }
      } catch {
        setTutorialsError("Erro ao carregar tutoriais")
      } finally {
        setTutorialsLoading(false)
      }
    }

    fetchTutorials()
  }, [contentsTab])

  // Filter tutorials by search
  const filteredTutorials = useMemo(() => {
    if (!tutorialsSearch.trim()) return tutorials
    const term = tutorialsSearch.toLowerCase()
    return tutorials.filter(t => 
      t.title.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term) ||
      t.category?.toLowerCase().includes(term) ||
      t.tags?.some(tag => tag.toLowerCase().includes(term))
    )
  }, [tutorials, tutorialsSearch])

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', value)
    params.delete('page')
    params.delete('id')
    router.push(`/contents?${params.toString()}`)
  }, [router, searchParams])

  // Handle tutorial click
  const handleTutorialClick = useCallback((tutorial: Content) => {
    router.push(`/contents/${tutorial.id}?tab=tutorials`)
  }, [router])

  // Memoized callback for add tutorial button
  const handleAddTutorialClick = useCallback(() => {
    setCreateTutorialOpen(true)
  }, [setCreateTutorialOpen])

  return (
    <div className="space-y-6 w-full overflow-x-hidden px-1">
      {/* Header */}
      <div className="space-y-4 w-full max-w-[900px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors"
          >
            Início
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            Conteúdos
          </span>
        </div>

        {/* Tabs */}
        <Tabs value={contentsTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto p-1 bg-gray-100 rounded-xl gap-2">
            <TabsTrigger 
              value="tutorials" 
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200"
            >
              <Video className="h-5 w-5" />
              Tutoriais
            </TabsTrigger>
          </TabsList>

          {/* Tutorials Tab Content */}
          <TabsContent value="tutorials" className="mt-6">
            {/* Search + Add Button */}
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tutoriais..."
                  value={tutorialsSearch}
                  onChange={(e) => setTutorialsSearch(e.target.value)}
                  className="pl-10 pr-10 w-full h-10"
                />
              </div>
              <AddTutorialButton
                onClick={handleAddTutorialClick}
                disabled={tutorialsLoading}
                isAdmin={isAdmin}
              />
            </div>

            {/* Loading */}
            {tutorialsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}

            {/* Error */}
            {!tutorialsLoading && tutorialsError && (
              <div className="text-red-600">{tutorialsError}</div>
            )}

            {/* Empty State */}
            {!tutorialsLoading && !tutorialsError && tutorials.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum tutorial disponível
                </h3>
                <p className="text-gray-600">
                  Os tutoriais aparecerão aqui quando forem adicionados.
                </p>
              </div>
            )}

            {/* Empty Search */}
            {!tutorialsLoading && !tutorialsError && tutorials.length > 0 && filteredTutorials.length === 0 && (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum tutorial encontrado
                </h3>
                <p className="text-gray-600">
                  Tente ajustar sua busca
                </p>
              </div>
            )}

            {/* Tutorials Grid */}
            {!tutorialsLoading && !tutorialsError && filteredTutorials.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTutorials.map((tutorial) => (
                  <CardTutorial
                    key={tutorial.id}
                    tutorial={tutorial}
                    onClick={handleTutorialClick}
                  />
                ))}
              </div>
            )}

            {/* Tutorial Count */}
            {!tutorialsLoading && !tutorialsError && filteredTutorials.length > 0 && (
              <div className="mt-6 text-center text-sm text-gray-600">
                {filteredTutorials.length} {filteredTutorials.length === 1 ? 'tutorial' : 'tutoriais'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Tutorial Form */}
      <TutorialForm
        isOpen={createTutorialOpen}
        onClose={() => setCreateTutorialOpen(false)}
        mode="create"
        onSuccess={(newTutorial) => {
          setTutorials(prev => [newTutorial, ...prev])
        }}
      />
    </div>
  )
}
