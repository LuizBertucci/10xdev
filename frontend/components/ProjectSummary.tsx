import { useEffect, useMemo, useState } from "react"
import { List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { projectService } from "@/services"
import { cardFeatureService } from "@/services"
import type { CardFeature } from "@/services"

interface ProjectSummaryProps {
  projectId: string | null
  cardFeatures: CardFeature[]
}

export function ProjectSummary({ projectId, cardFeatures }: ProjectSummaryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [summaryCardFeatures, setSummaryCardFeatures] = useState<CardFeature[]>([])
  const [loading, setLoading] = useState(false)

  const loadSummaryCards = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const response = await projectService.getCards(projectId)
      if (!response?.success || !response.data) {
        setSummaryCardFeatures([])
        return
      }

      const ordered = [...response.data].sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
      const existingMap = new Map(cardFeatures.map((f) => [f.id, f]))
      const missingIds = ordered
        .map((card: any) => card.cardFeatureId)
        .filter((id: string) => !existingMap.has(id))

      let fetchedMap = new Map<string, CardFeature>()
      if (missingIds.length > 0) {
        const fetched = await Promise.all(
          missingIds.map(async (id: string) => {
            try {
              const cardResponse = await cardFeatureService.getById(id)
              return cardResponse?.success ? cardResponse.data : null
            } catch {
              return null
            }
          })
        )
        fetchedMap = new Map(
          fetched.filter(Boolean).map((card) => [(card as CardFeature).id, card as CardFeature])
        )
      }

      const merged = ordered
        .map((card: any) => existingMap.get(card.cardFeatureId) || fetchedMap.get(card.cardFeatureId))
        .filter(Boolean) as CardFeature[]

      setSummaryCardFeatures(merged)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSummaryCards()
    }
  }, [isOpen])

  const summaryGroups = useMemo(() => {
    const map = new Map<string, CardFeature[]>()
    const cards = isOpen ? summaryCardFeatures : cardFeatures
    cards.forEach((card) => {
      const tags = card.tags && card.tags.length > 0 ? card.tags : ["Sem categoria"]
      tags.forEach((rawTag) => {
        const tag = rawTag?.trim() || "Sem categoria"
        if (!map.has(tag)) {
          map.set(tag, [])
        }
        map.get(tag)?.push(card)
      })
    })
    return map
  }, [cardFeatures, isOpen, summaryCardFeatures])

  const summaryCategories = useMemo(() => {
    return Array.from(summaryGroups.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [summaryGroups])

  useEffect(() => {
    if (!summaryCategories.length) {
      setSelectedCategory("Sem categoria")
      return
    }
    if (!summaryCategories.includes(selectedCategory)) {
      setSelectedCategory(summaryCategories[0])
    }
  }, [summaryCategories, selectedCategory])

  return (
    <>
      <div className="flex items-center justify-end mb-3">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} disabled={!projectId}>
          <List className="h-4 w-4 mr-2" />
          Sumário
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sumário do Projeto</DialogTitle>
            <DialogDescription>
              Veja os cards organizados por categoria.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 min-h-[320px]">
            <div className="border rounded-lg p-3 space-y-2 max-h-[420px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500">Carregando categorias...</p>
              ) : summaryCategories.length === 0 ? (
                <p className="text-sm text-gray-500">Sem categorias</p>
              ) : (
                summaryCategories.map((category) => {
                  const count = summaryGroups.get(category)?.length ?? 0
                  const isActive = category === selectedCategory
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-colors ${
                        isActive ? "bg-blue-50 text-blue-700 border border-blue-200" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="truncate">{category}</span>
                      <span className="text-xs text-gray-500">{count}</span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="border rounded-lg p-3 max-h-[420px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500">Carregando cards...</p>
              ) : (() => {
                const cards = summaryGroups.get(selectedCategory) || []
                if (cards.length === 0) {
                  return <p className="text-sm text-gray-500">Nenhum card nesta categoria.</p>
                }
                return (
                  <ul className="space-y-2">
                    {cards.map((card) => (
                      <li key={card.id} className="text-sm text-gray-800 truncate">
                        {card.title}
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
