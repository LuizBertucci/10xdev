import { useEffect, useMemo, useState } from "react"
import { List, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cardFeatureService, projectService } from "@/services"
import type { CardFeature } from "@/types"
import { toast } from "sonner"
import { buildCategoryGroups, getAllCategories, orderCategories } from "@/utils/projectCategories"
import { ProjectCategories } from "@/components/ProjectCategories"

interface ProjectSummaryProps {
  projectId: string | null
  cardFeatures: CardFeature[]
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  selectedCategory?: string
  onCategorySelect?: (category: string) => void
}

export function ProjectSummary({ projectId, cardFeatures, isOpen, onOpenChange, showTrigger = true, selectedCategory: selectedCategoryProp, onCategorySelect }: ProjectSummaryProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false)
  const resolvedOpen = isOpen ?? isOpenInternal
  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open)
    } else {
      setIsOpenInternal(open)
    }
  }
  const ALL_CATEGORIES_VALUE = "__all__"
  const ALL_CATEGORIES_LABEL = "Todas"
  const [selectedCategoryInternal, setSelectedCategoryInternal] = useState(ALL_CATEGORIES_VALUE)
  const selectedCategory = selectedCategoryProp ?? selectedCategoryInternal
  const setSelectedCategory = (category: string) => {
    if (onCategorySelect) {
      onCategorySelect(category)
    } else {
      setSelectedCategoryInternal(category)
    }
  }
  const [summaryCardFeatures, setSummaryCardFeatures] = useState<CardFeature[]>([])
  const [loading, setLoading] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [tagsDraft, setTagsDraft] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [savingTags, setSavingTags] = useState(false)
  const [orderedCategories, setOrderedCategories] = useState<string[]>([])
  const [savingOrder, setSavingOrder] = useState(false)

  const loadSummaryCards = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const [cardsResponse, projectResponse] = await Promise.all([
        projectService.getCards(projectId),
        projectService.getById(projectId)
      ])

      if (!cardsResponse?.success || !cardsResponse.data) {
        setSummaryCardFeatures([])
        return
      }

      const ordered = [...cardsResponse.data]
        .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
        .map((card: any) => card.cardFeature)
        .filter(Boolean) as CardFeature[]

      setSummaryCardFeatures(ordered)

      // Carregar ordem de categorias do projeto
      if (projectResponse?.success && projectResponse.data?.categoryOrder) {
        setOrderedCategories(projectResponse.data.categoryOrder)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (resolvedOpen) {
      loadSummaryCards()
    }
  }, [resolvedOpen])

  const startEditTags = (card: CardFeature) => {
    setEditingCardId(card.id)
    setTagsDraft((card.tags || []).filter(Boolean))
    setTagInput("")
  }

  const cancelEditTags = () => {
    setEditingCardId(null)
    setTagsDraft([])
    setTagInput("")
  }

  const addTagsFromInput = (value: string) => {
    const parts = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)

    if (parts.length === 0) return

    setTagsDraft((prev) => {
      const existing = new Set(prev.map((tag) => tag.toLowerCase()))
      const next = [...prev]
      parts.forEach((tag) => {
        const key = tag.toLowerCase()
        if (!existing.has(key)) {
          existing.add(key)
          next.push(tag)
        }
      })
      return next
    })
    setTagInput("")
  }

  const removeTag = (tagToRemove: string) => {
    setTagsDraft((prev) => prev.filter((tag) => tag !== tagToRemove))
  }

  const saveTags = async (cardId: string) => {
    try {
      setSavingTags(true)
      const response = await cardFeatureService.update(cardId, { tags: tagsDraft })
      if (!response?.success || !response.data) {
        toast.error(response?.error || "Erro ao atualizar tags")
        return
      }

      setSummaryCardFeatures((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, tags: response.data?.tags || tagsDraft } : card))
      )
      setEditingCardId(null)
      toast.success("Tags atualizadas")
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar tags")
    } finally {
      setSavingTags(false)
    }
  }

  const summaryGroups = useMemo(() => {
    const cards = resolvedOpen ? summaryCardFeatures : cardFeatures
    return buildCategoryGroups(cards)
  }, [cardFeatures, resolvedOpen, summaryCardFeatures])

  const allSummaryCards = useMemo(() => {
    return resolvedOpen ? summaryCardFeatures : cardFeatures
  }, [cardFeatures, resolvedOpen, summaryCardFeatures])

  const allCategories = useMemo(() => {
    return getAllCategories(summaryGroups)
  }, [summaryGroups])

  const summaryCategories = useMemo(() => {
    return orderCategories(allCategories, orderedCategories)
  }, [allCategories, orderedCategories])

  const allProjectTags = useMemo(() => {
    const tags = new Map<string, string>()
    summaryCardFeatures.forEach((card) => {
      const tags_array = card.tags || []
      tags_array.forEach((tag) => {
        const value = tag?.trim()
        if (!value) return
        const key = value.toLowerCase()
        if (!tags.has(key)) {
          tags.set(key, value)
        }
      })
    })
    return Array.from(tags.values()).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [summaryCardFeatures])

  useEffect(() => {
    if (!summaryCategories.length) {
      setSelectedCategory(ALL_CATEGORIES_VALUE)
      return
    }
    if (selectedCategory === ALL_CATEGORIES_VALUE) {
      return
    }
    if (!summaryCategories.includes(selectedCategory)) {
      setSelectedCategory(summaryCategories[0])
    }
  }, [summaryCategories, selectedCategory])

  const summaryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    summaryCategories.forEach((category) => {
      counts.set(category, summaryGroups.get(category)?.length ?? 0)
    })
    return counts
  }, [summaryCategories, summaryGroups])

  const handleOrderChange = async (newOrder: string[]) => {
    const previousOrder = orderedCategories
    setOrderedCategories(newOrder)

    if (projectId) {
      try {
        setSavingOrder(true)
        const response = await projectService.update(projectId, { categoryOrder: newOrder })
        if (!response?.success) {
          toast.error(response?.error || "Erro ao salvar ordem das categorias")
          setOrderedCategories(previousOrder)
        } else {
          toast.success("Ordem das categorias salva")
        }
      } catch (error: any) {
        toast.error(error?.message || "Erro ao salvar ordem das categorias")
        setOrderedCategories(previousOrder)
      } finally {
        setSavingOrder(false)
      }
    }
  }

  return (
    <>
      {showTrigger && (
        <div className="flex items-center justify-end mb-3">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)} disabled={!projectId}>
            <List className="h-4 w-4 mr-2" />
            Sumário
          </Button>
        </div>
      )}

      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl h-[520px] max-h-[520px]">
          <DialogHeader>
            <DialogTitle>Sumário do Projeto</DialogTitle>
            <DialogDescription>
              Veja os cards organizados por categoria.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-[320px]">
            <div className="space-y-2">
              <ProjectCategories
                categories={summaryCategories}
                counts={summaryCounts}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                allLabel={ALL_CATEGORIES_LABEL}
                allValue={ALL_CATEGORIES_VALUE}
                allCount={allSummaryCards.length}
                loading={loading}
                loadingText="Carregando categorias..."
                emptyText="Sem categorias"
                sortable
                onOrderChange={handleOrderChange}
                className="h-[420px] overflow-y-auto"
              />
              {savingOrder && (
                <p className="text-xs text-gray-500 mt-2">Salvando ordem...</p>
              )}
            </div>

            <div className="border rounded-lg p-3 max-h-[420px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500">Carregando cards...</p>
              ) : (() => {
                const cards = selectedCategory === ALL_CATEGORIES_VALUE
                  ? allSummaryCards
                  : summaryGroups.get(selectedCategory) || []
                if (cards.length === 0) {
                  return <p className="text-sm text-gray-500">Nenhum card nesta categoria.</p>
                }
                return (
                  <ul className="space-y-3">
                    {cards.map((card) => {
                      const isEditing = editingCardId === card.id
                      return (
                        <li key={card.id} className="rounded-md border border-gray-100 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
                              <span className="font-medium truncate">{card.title}</span>
                              <span className="inline-block h-1 w-1 rounded-full bg-gray-400" />
                              <span className="text-gray-600">
                                {card.tags && card.tags.length > 0 ? card.tags.join(", ") : "Sem tags"}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditTags(card)}
                              className="h-7 w-7 text-gray-500 hover:text-gray-700"
                              disabled={savingTags && isEditing}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-wrap gap-1.5">
                                {tagsDraft.length === 0 ? (
                                  <span className="text-xs text-gray-400">Sem tags</span>
                                ) : (
                                  tagsDraft.map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700"
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  value={tagInput}
                                  onChange={(event) => setTagInput(event.target.value)}
                                  placeholder="Adicionar tag..."
                                  className="h-8 w-full sm:w-[220px]"
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === ",") {
                                      event.preventDefault()
                                      addTagsFromInput(tagInput)
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addTagsFromInput(tagInput)}
                                  disabled={!tagInput.trim()}
                                  className="h-8"
                                >
                                  Adicionar
                                </Button>
                              </div>

                              {allProjectTags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-gray-500">Sugestões:</span>
                                  {allProjectTags
                                    .filter((tag) => !tagsDraft.some((draft) => draft.toLowerCase() === tag.toLowerCase()))
                                    .map((tag) => (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => addTagsFromInput(tag)}
                                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50"
                                      >
                                        + {tag}
                                      </button>
                                    ))}
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => saveTags(card.id)}
                                  disabled={savingTags}
                                  className="h-8"
                                >
                                  {savingTags ? "Salvando..." : "Salvar"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditTags}
                                  disabled={savingTags}
                                  className="h-8"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
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
