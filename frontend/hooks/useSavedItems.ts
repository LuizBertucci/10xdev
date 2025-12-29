/**
 * Itens Salvos (Vídeos/Cards) - estado compartilhado no cliente
 *
 * IMPORTANTE:
 * Este deve ser um provider compartilhado. Se cada componente de card/vídeo
 * chamar um hook simples com estado local, eles ficarão dessincronizados e
 * você terá conflitos 409 (tentando salvar algo que já está salvo) + UX/performance ruim.
 */
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { savedItemService, type ItemType, type SavedItem } from '@/services/savedItemService'
import { useAuth } from '@/hooks/useAuth'
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

const SavedItemsContext = createContext<UseSavedItemsReturn | undefined>(undefined)

export function SavedItemsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
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

  // Carregar itens salvos (só se autenticado)
  const loadSavedItems = useCallback(async (itemType?: ItemType) => {
    // Não fazer chamada se não estiver autenticado
    if (!isAuthenticated) return
    
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
  }, [isAuthenticated])

  // Verificar múltiplos itens de uma vez
  const checkMultiple = useCallback(async (itemType: ItemType, itemIds: string[]) => {
    if (!isAuthenticated || itemIds.length === 0) return

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
  }, [isAuthenticated])

  // Salvar item
  const saveItem = useCallback(async (itemType: ItemType, itemId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado para salvar itens')
      return false
    }
    
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
      // 409 = já existe (idempotência). Tratar como sucesso e sincronizar estado local
      if (error?.statusCode === 409) {
        if (itemType === 'card') {
          setSavedCards(prev => new Set(prev).add(itemId))
        } else {
          setSavedVideos(prev => new Set(prev).add(itemId))
        }
        return true
      }
      console.error('Erro ao salvar item:', error)
      toast.error(error?.error || 'Erro ao salvar item')
      return false
    }
  }, [isAuthenticated])

  // Remover item salvo
  const unsaveItem = useCallback(async (itemType: ItemType, itemId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado')
      return false
    }
    
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
  }, [isAuthenticated])

  // Toggle salvar/remover
  const toggleSave = useCallback(async (itemType: ItemType, itemId: string): Promise<boolean> => {
    if (isSaved(itemType, itemId)) {
      return unsaveItem(itemType, itemId)
    }
    return saveItem(itemType, itemId)
  }, [isSaved, saveItem, unsaveItem])

  // Carregar itens salvos quando autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadSavedItems()
    }
    if (!isAuthenticated && !authLoading) {
      // Limpar cache local ao fazer logout
      setSavedCards(new Set())
      setSavedVideos(new Set())
    }
  }, [isAuthenticated, authLoading, loadSavedItems])

  const value = useMemo<UseSavedItemsReturn>(() => ({
    savedCards,
    savedVideos,
    loading,
    saveItem,
    unsaveItem,
    toggleSave,
    isSaved,
    loadSavedItems,
    checkMultiple
  }), [
    savedCards,
    savedVideos,
    loading,
    saveItem,
    unsaveItem,
    toggleSave,
    isSaved,
    loadSavedItems,
    checkMultiple
  ])

  return <SavedItemsContext.Provider value={value}>{children}</SavedItemsContext.Provider>
}

export function useSavedItems(): UseSavedItemsReturn {
  const ctx = useContext(SavedItemsContext)
  if (!ctx) {
    throw new Error('useSavedItems deve ser usado dentro de um SavedItemsProvider')
  }
  return ctx
}

