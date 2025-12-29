'use client'

import { useState, useCallback, useEffect } from 'react'
import { savedItemService, type ItemType, type SavedItem } from '@/services/savedItemService'
import { toast } from 'sonner'

interface UseSavedItemsReturn {
  // Estado
  savedCards: Set<string>
  savedVideos: Set<string>
  loading: boolean
  
  // Métodos
  saveItem: (itemType: ItemType, itemId: string) => Promise<boolean>
  unsaveItem: (itemType: ItemType, itemId: string) => Promise<boolean>
  toggleSave: (itemType: ItemType, itemId: string) => Promise<boolean>
  isSaved: (itemType: ItemType, itemId: string) => boolean
  loadSavedItems: (itemType?: ItemType) => Promise<void>
  checkMultiple: (itemType: ItemType, itemIds: string[]) => Promise<void>
}

export function useSavedItems(): UseSavedItemsReturn {
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set())
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Verificar se item está salvo
  const isSaved = useCallback((itemType: ItemType, itemId: string): boolean => {
    if (itemType === 'card') {
      return savedCards.has(itemId)
    }
    return savedVideos.has(itemId)
  }, [savedCards, savedVideos])

  // Carregar itens salvos
  const loadSavedItems = useCallback(async (itemType?: ItemType) => {
    try {
      setLoading(true)
      const response = await savedItemService.list(itemType)
      
      if (response?.success && response.data) {
        const cards = new Set<string>()
        const videos = new Set<string>()
        
        response.data.forEach((item: SavedItem) => {
          if (item.itemType === 'card') {
            cards.add(item.itemId)
          } else {
            videos.add(item.itemId)
          }
        })
        
        if (!itemType || itemType === 'card') {
          setSavedCards(cards)
        }
        if (!itemType || itemType === 'video') {
          setSavedVideos(videos)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar itens salvos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Verificar múltiplos itens de uma vez
  const checkMultiple = useCallback(async (itemType: ItemType, itemIds: string[]) => {
    if (itemIds.length === 0) return

    try {
      const response = await savedItemService.checkMultiple(itemType, itemIds)
      
      if (response?.success && response.data) {
        const savedIds = new Set(response.data)
        
        if (itemType === 'card') {
          setSavedCards(prev => {
            const newSet = new Set(prev)
            itemIds.forEach(id => {
              if (savedIds.has(id)) {
                newSet.add(id)
              }
            })
            return newSet
          })
        } else {
          setSavedVideos(prev => {
            const newSet = new Set(prev)
            itemIds.forEach(id => {
              if (savedIds.has(id)) {
                newSet.add(id)
              }
            })
            return newSet
          })
        }
      }
    } catch (error) {
      console.error('Erro ao verificar itens salvos:', error)
    }
  }, [])

  // Salvar item
  const saveItem = useCallback(async (itemType: ItemType, itemId: string): Promise<boolean> => {
    try {
      const response = await savedItemService.save(itemType, itemId)
      
      if (response?.success) {
        if (itemType === 'card') {
          setSavedCards(prev => new Set(prev).add(itemId))
        } else {
          setSavedVideos(prev => new Set(prev).add(itemId))
        }
        toast.success('Item salvo com sucesso!')
        return true
      } else {
        toast.error(response?.error || 'Erro ao salvar item')
        return false
      }
    } catch (error: any) {
      console.error('Erro ao salvar item:', error)
      toast.error(error?.error || 'Erro ao salvar item')
      return false
    }
  }, [])

  // Remover item salvo
  const unsaveItem = useCallback(async (itemType: ItemType, itemId: string): Promise<boolean> => {
    try {
      const response = await savedItemService.unsave(itemType, itemId)
      
      if (response?.success) {
        if (itemType === 'card') {
          setSavedCards(prev => {
            const newSet = new Set(prev)
            newSet.delete(itemId)
            return newSet
          })
        } else {
          setSavedVideos(prev => {
            const newSet = new Set(prev)
            newSet.delete(itemId)
            return newSet
          })
        }
        toast.success('Item removido dos salvos!')
        return true
      } else {
        toast.error(response?.error || 'Erro ao remover item')
        return false
      }
    } catch (error: any) {
      console.error('Erro ao remover item:', error)
      toast.error(error?.error || 'Erro ao remover item')
      return false
    }
  }, [])

  // Toggle salvar/remover
  const toggleSave = useCallback(async (itemType: ItemType, itemId: string): Promise<boolean> => {
    if (isSaved(itemType, itemId)) {
      return unsaveItem(itemType, itemId)
    }
    return saveItem(itemType, itemId)
  }, [isSaved, saveItem, unsaveItem])

  // Carregar itens salvos ao montar
  useEffect(() => {
    loadSavedItems()
  }, [loadSavedItems])

  return {
    savedCards,
    savedVideos,
    loading,
    saveItem,
    unsaveItem,
    toggleSave,
    isSaved,
    loadSavedItems,
    checkMultiple
  }
}

