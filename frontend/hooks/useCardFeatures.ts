import { useState, useCallback, useEffect, useMemo } from 'react'
import { cardFeatureService } from '@/services'
import type {
  CardFeature,
  CardFeatureState,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  UseCardFeaturesReturn,
  UseCardFeaturesOptions,
  QueryParams
} from '@/types'

// Hook principal para gerenciar CardFeatures com API
export function useCardFeatures(options: UseCardFeaturesOptions = {}): UseCardFeaturesReturn {
  const [state, setState] = useState<CardFeatureState>({
    // Dados principais
    items: [],
    filteredItems: [],
    
    // Estados de loading
    loading: false,
    creating: false,
    updating: false,
    deleting: false,
    fetching: false,
    
    // Estados de erro
    error: null,
    lastError: null,

    // Estados de UI
    selectedItem: null,
    editingItem: null,
    isCreating: false,
    isEditing: false,
    showDeleteConfirm: false,
    deleteItemId: null,

    // Controles de interface
    activeTab: '',
    searchTerm: '',
    selectedTech: 'all',
    
    // Paginação
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    totalCount: 0
  })

  // FILTROS - Filtrar itens localmente
  const filteredItems = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) {
      return []
    }
    return state.items.filter(item => {
      const matchesSearch = state.searchTerm === '' || 
        item.title.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(state.searchTerm.toLowerCase())
      
      const matchesTech = state.selectedTech === 'all' || 
        item.tech.toLowerCase() === state.selectedTech.toLowerCase()
      
      return matchesSearch && matchesTech
    })
  }, [state.items, state.searchTerm, state.selectedTech])

  // Atualizar filteredItems quando mudar
  useEffect(() => {
    setState(prev => ({ ...prev, filteredItems }))
  }, [filteredItems])

  // ================================================
  // CRUD OPERATIONS - Usando API
  // ================================================

  // CREATE - Criar novo CardFeature
  const createCardFeature = useCallback(async (data: CreateCardFeatureData): Promise<CardFeature | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }))
    
    try {
      const response = await cardFeatureService.create(data)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: [response.data!, ...(Array.isArray(prev.items) ? prev.items : [])],
          creating: false,
          isCreating: false,
          totalCount: prev.totalCount + 1
        }))
        return response.data
      } else {
        throw new Error(response.error || 'Erro ao criar CardFeature')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        creating: false
      }))
      return null
    }
  }, [])

  // READ - Buscar CardFeature por ID
  const getCardFeature = useCallback(async (id: string): Promise<CardFeature | null> => {
    // Primeiro tentar buscar localmente
    const localItem = state.items.find(item => item.id === id)
    if (localItem) {
      return localItem
    }

    // Se não encontrar localmente, buscar na API
    setState(prev => ({ ...prev, fetching: true, error: null }))
    
    try {
      const response = await cardFeatureService.getById(id)
      
      if (response.success && response.data) {
        // Adicionar ao estado local se não existir
        setState(prev => {
          const items = Array.isArray(prev.items) ? prev.items : []
          const exists = items.some(item => item.id === id)
          return {
            ...prev,
            items: exists ? items : [...items, response.data!],
            fetching: false
          }
        })
        return response.data
      } else {
        throw new Error(response.error || 'CardFeature não encontrado')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        fetching: false
      }))
      return null
    }
  }, [state.items])

  // READ ALL - Buscar todos os CardFeatures
  const fetchCardFeatures = useCallback(async (params?: QueryParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await cardFeatureService.getAll(params)
      
      if (response.success && response.data) {
        // A API retorna os itens diretamente em response.data, não em response.data.data
        const items = Array.isArray(response.data) ? response.data : response.data.data || []
        setState(prev => ({
          ...prev,
          items: items,
          loading: false,
          currentPage: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          hasNextPage: response.hasNextPage || false,
          hasPrevPage: response.hasPrevPage || false,
          totalCount: response.count || items.length
        }))
      } else {
        throw new Error(response.error || 'Erro ao carregar CardFeatures')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar CardFeatures'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        loading: false
      }))
    }
  }, [])

  // SEARCH - Buscar CardFeatures
  const searchCardFeatures = useCallback(async (searchTerm: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await cardFeatureService.search(searchTerm, {
        page: state.currentPage,
        limit: 10
      })
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: response.data!.data,
          loading: false,
          currentPage: response.data!.currentPage,
          totalPages: response.data!.totalPages,
          hasNextPage: response.data!.hasNextPage,
          hasPrevPage: response.data!.hasPrevPage,
          totalCount: response.data!.count
        }))
      } else {
        throw new Error(response.error || 'Erro na busca')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na busca'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        loading: false
      }))
    }
  }, [state.currentPage])

  // UPDATE - Atualizar CardFeature existente
  const updateCardFeature = useCallback(async (id: string, data: UpdateCardFeatureData): Promise<CardFeature | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }))
    
    try {
      const response = await cardFeatureService.update(id, data)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: (Array.isArray(prev.items) ? prev.items : []).map(item => 
            item.id === id ? response.data! : item
          ),
          updating: false,
          isEditing: false,
          editingItem: null
        }))
        return response.data
      } else {
        throw new Error(response.error || 'Erro ao atualizar CardFeature')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        updating: false
      }))
      return null
    }
  }, [])

  // DELETE - Remover CardFeature
  const deleteCardFeature = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, deleting: true, error: null }))
    
    try {
      const response = await cardFeatureService.delete(id)
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          items: (Array.isArray(prev.items) ? prev.items : []).filter(item => item.id !== id),
          deleting: false,
          showDeleteConfirm: false,
          deleteItemId: null,
          totalCount: Math.max(0, prev.totalCount - 1)
        }))
        return true
      } else {
        throw new Error(response.error || 'Erro ao remover CardFeature')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao remover CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        deleting: false
      }))
      return false
    }
  }, [])

  // ================================================
  // BULK OPERATIONS
  // ================================================

  const bulkCreate = useCallback(async (items: CreateCardFeatureData[]): Promise<CardFeature[]> => {
    setState(prev => ({ ...prev, creating: true, error: null }))
    
    try {
      const response = await cardFeatureService.bulkCreate(items)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: [...response.data!, ...(Array.isArray(prev.items) ? prev.items : [])],
          creating: false,
          totalCount: prev.totalCount + response.data!.length
        }))
        return response.data
      } else {
        throw new Error(response.error || 'Erro ao criar CardFeatures em lote')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar CardFeatures em lote'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        creating: false
      }))
      return []
    }
  }, [])

  const bulkDelete = useCallback(async (ids: string[]): Promise<number> => {
    setState(prev => ({ ...prev, deleting: true, error: null }))
    
    try {
      const response = await cardFeatureService.bulkDelete(ids)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: (Array.isArray(prev.items) ? prev.items : []).filter(item => !ids.includes(item.id)),
          deleting: false,
          totalCount: Math.max(0, prev.totalCount - response.data!.deletedCount)
        }))
        return response.data.deletedCount
      } else {
        throw new Error(response.error || 'Erro ao remover CardFeatures em lote')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao remover CardFeatures em lote'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        deleting: false
      }))
      return 0
    }
  }, [])

  // ================================================
  // PAGINAÇÃO
  // ================================================

  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > state.totalPages) return
    
    await fetchCardFeatures({
      page,
      limit: 10,
      tech: state.selectedTech !== 'all' ? state.selectedTech : undefined,
      search: state.searchTerm || undefined
    })
  }, [state.totalPages, state.selectedTech, state.searchTerm, fetchCardFeatures])

  const nextPage = useCallback(async () => {
    if (state.hasNextPage) {
      await goToPage(state.currentPage + 1)
    }
  }, [state.hasNextPage, state.currentPage, goToPage])

  const prevPage = useCallback(async () => {
    if (state.hasPrevPage) {
      await goToPage(state.currentPage - 1)
    }
  }, [state.hasPrevPage, state.currentPage, goToPage])

  const refreshData = useCallback(async () => {
    await fetchCardFeatures({
      page: state.currentPage,
      limit: 10,
      tech: state.selectedTech !== 'all' ? state.selectedTech : undefined,
      search: state.searchTerm || undefined
    })
  }, [state.currentPage, state.selectedTech, state.searchTerm, fetchCardFeatures])

  // ================================================
  // UI ACTIONS
  // ================================================

  const startCreating = useCallback(() => {
    setState(prev => ({ ...prev, isCreating: true }))
  }, [])

  const cancelCreating = useCallback(() => {
    setState(prev => ({ ...prev, isCreating: false }))
  }, [])

  const startEditing = useCallback((item: CardFeature) => {
    setState(prev => ({ 
      ...prev, 
      isEditing: true, 
      editingItem: item 
    }))
  }, [])

  const cancelEditing = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isEditing: false, 
      editingItem: null 
    }))
  }, [])

  const updateEditingItem = useCallback((updatedItem: CardFeature) => {
    setState(prev => ({
      ...prev,
      editingItem: updatedItem
    }))
  }, [])

  const selectCardFeature = useCallback((id: string) => {
    const item = state.items.find(item => item.id === id)
    setState(prev => ({ 
      ...prev, 
      selectedItem: item || null,
      activeTab: item?.screens[0]?.name || '' 
    }))
  }, [state.items])

  const setActiveTab = useCallback((tabName: string) => {
    setState(prev => ({ ...prev, activeTab: tabName }))
  }, [])

  const showDeleteConfirmation = useCallback((id: string) => {
    setState(prev => ({ 
      ...prev, 
      showDeleteConfirm: true, 
      deleteItemId: id 
    }))
  }, [])

  const cancelDelete = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showDeleteConfirm: false, 
      deleteItemId: null 
    }))
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }))
    
    // Auto-search após delay
    const timeoutId = setTimeout(() => {
      if (term.trim()) {
        searchCardFeatures(term.trim())
      } else {
        fetchCardFeatures()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchCardFeatures, fetchCardFeatures])

  const setSelectedTech = useCallback((tech: string) => {
    setState(prev => ({ ...prev, selectedTech: tech }))
    
    // Re-fetch com novo filtro
    fetchCardFeatures({
      page: 1,
      limit: 10,
      tech: tech !== 'all' ? tech : undefined,
      search: state.searchTerm || undefined
    })
  }, [state.searchTerm, fetchCardFeatures])

  const clearSelection = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      selectedItem: null, 
      activeTab: '' 
    }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Carregar dados na inicialização
  useEffect(() => {
    fetchCardFeatures()
  }, [fetchCardFeatures])

  // Retorna estado e ações para os componentes
  return {
    // Estado
    items: state.items,
    filteredItems: state.filteredItems,
    loading: state.loading,
    creating: state.creating,
    updating: state.updating,
    deleting: state.deleting,
    fetching: state.fetching,
    error: state.error,
    selectedItem: state.selectedItem,
    editingItem: state.editingItem,
    isCreating: state.isCreating,
    isEditing: state.isEditing,
    showDeleteConfirm: state.showDeleteConfirm,
    deleteItemId: state.deleteItemId,
    activeTab: state.activeTab,
    searchTerm: state.searchTerm,
    selectedTech: state.selectedTech,
    
    // Paginação
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    hasNextPage: state.hasNextPage,
    hasPrevPage: state.hasPrevPage,
    totalCount: state.totalCount,

    // CRUD Operations
    createCardFeature,
    getCardFeature,
    updateCardFeature,
    deleteCardFeature,
    fetchCardFeatures,
    searchCardFeatures,
    
    // Bulk Operations
    bulkCreate,
    bulkDelete,

    // UI Actions
    startCreating,
    cancelCreating,
    startEditing,
    cancelEditing,
    updateEditingItem,
    selectCardFeature,
    setActiveTab,
    showDeleteConfirmation,
    cancelDelete,
    setSearchTerm,
    setSelectedTech,
    clearSelection,
    clearError,
    
    // Paginação
    goToPage,
    nextPage,
    prevPage,
    refreshData
  }
}

// Hook simplificado para casos específicos
export function useCardFeature(id?: string) {
  const cardFeatures = useCardFeatures()
  
  const item = id ? cardFeatures.items.find(item => item.id === id) || null : null
  
  return {
    item,
    ...cardFeatures
  }
}