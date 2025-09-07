import { useState, useCallback, useEffect, useMemo } from 'react'
import { cardFeatureService } from '@/services'
import { usePagination } from './usePagination'
import { useDebounceSearch } from './useDebounceSearch'
import type { CardFeature, CardFeatureState, CreateCardFeatureData, UpdateCardFeatureData, UseCardFeaturesReturn, UseCardFeaturesOptions, QueryParams, FetchParams } from '@/types'

// Hook principal para gerenciar CardFeatures com API
export function useCardFeatures(options: UseCardFeaturesOptions = {}, externalFilters?: {
  searchTerm?: string
  selectedTech?: string
  setSearchTerm?: (term: string) => void
  setSelectedTech?: (tech: string) => void
}): UseCardFeaturesReturn {

  const [state, setState] = useState<CardFeatureState>({
    // Dados principais
    items: [],
    
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
    selectedTech: 'all',
    
    totalCount: 0
  })


  // ✅ NOVO: Função de fetch com paginação para o usePagination hook
  const fetchCardFeaturesWithPagination = useCallback(async (params: FetchParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const queryParams: QueryParams = {
        ...params,
        tech: state.selectedTech !== 'all' ? state.selectedTech : undefined,
        search: undefined // será definido depois
      }
      
      const response = await cardFeatureService.getAll(queryParams)
      
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : []
        setState(prev => ({
          ...prev,
          items: items,
          loading: false,
          totalCount: response.count || items.length
        }))
        
        // O usePagination atualizará automaticamente suas informações
        return response
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
      throw error
    }
  }, [state.selectedTech]) // removido search.debouncedSearchTerm por ordem de declaração

  // Wrapper para usePagination (precisa retornar void)
  const paginationFetchFn = useCallback(async (params: FetchParams) => {
    await fetchCardFeaturesWithPagination(params)
  }, [fetchCardFeaturesWithPagination])

  const pagination = usePagination(paginationFetchFn, {
    itemsPerPage: 10,
    initialPage: 1
  })

  // ✅ NOVO: Hook de busca com debounce - usa fetchCardFeaturesWithPagination
  const search = useDebounceSearch(
    useCallback(async (term: string) => {
      await fetchCardFeaturesWithPagination({
        page: 1,
        limit: 10,
        search: term.trim() || undefined,
        tech: state.selectedTech !== 'all' ? state.selectedTech : undefined
      })
    }, [fetchCardFeaturesWithPagination, state.selectedTech]),
    { delay: 500 }
  )

  // FILTROS - Filtrar itens localmente (usando filtros externos se fornecidos)
  // ✅ OTIMIZADO: Estabilizar dependências de filtros externos
  const externalSearchTerm = externalFilters?.searchTerm
  const externalSelectedTech = externalFilters?.selectedTech
  
  const filteredItems = useMemo(() => {
    if (!state.items || !Array.isArray(state.items)) {
      return []
    }
    
    // Usar filtros externos se fornecidos, senão usar filtros internos
    const searchTerm = externalSearchTerm ?? search.debouncedSearchTerm
    const selectedTech = externalSelectedTech ?? state.selectedTech
    
    return state.items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesTech = selectedTech === 'all' || 
        item.tech.toLowerCase() === selectedTech.toLowerCase()
      
      return matchesSearch && matchesTech
    })
  }, [state.items, search.debouncedSearchTerm, state.selectedTech, externalSearchTerm, externalSelectedTech])

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

  // READ ALL - Buscar todos os CardFeatures (simplificado)
  const fetchCardFeatures = useCallback(async (params?: QueryParams) => {
    // ✅ SIMPLIFICADO: Usar função de paginação para manter compatibilidade
    await fetchCardFeaturesWithPagination({
      page: params?.page || 1,
      limit: params?.limit || 10,
      ...params
    })
  }, [fetchCardFeaturesWithPagination])

  // SEARCH - Usar fetchCardFeaturesWithPagination
  const searchCardFeatures = useCallback(async (searchTerm: string) => {
    await fetchCardFeaturesWithPagination({
      page: 1,
      limit: 10,
      search: searchTerm.trim() || undefined,
      tech: state.selectedTech !== 'all' ? state.selectedTech : undefined
    })
  }, [fetchCardFeaturesWithPagination, state.selectedTech])

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

  // ✅ REMOVIDO: Paginação movida para usePagination hook

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

  // Wrapper para manter compatibilidade
  const setSearchTerm = useCallback((term: string) => {
    search.setSearchTerm(term)
    
    // Atualizar filtro externo se fornecido
    if (externalFilters?.setSearchTerm) {
      externalFilters.setSearchTerm(term)
    }
  }, [search, externalFilters])

  const setSelectedTech = useCallback((tech: string) => {
    setState(prev => ({ ...prev, selectedTech: tech }))
    
    // Atualizar filtro externo se fornecido
    if (externalFilters?.setSelectedTech) {
      externalFilters.setSelectedTech(tech)
    }
    
    // Re-fetch com novo filtro
    fetchCardFeatures({
      page: 1,
      limit: 10,
      tech: tech !== 'all' ? tech : undefined,
      search: search.debouncedSearchTerm || undefined
    })
  }, [search.debouncedSearchTerm, externalFilters, fetchCardFeatures])

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

  // Sincronizar filtros externos com estado interno
  useEffect(() => {
    if (externalFilters?.searchTerm !== undefined && externalFilters.searchTerm !== search.searchTerm) {
      search.setSearchTerm(externalFilters.searchTerm || '')
    }
    if (externalFilters?.selectedTech !== undefined && externalFilters.selectedTech !== state.selectedTech) {
      setState(prev => ({ ...prev, selectedTech: externalFilters.selectedTech || 'all' }))
    }
  }, [externalFilters?.searchTerm, externalFilters?.selectedTech, search, state.selectedTech])

  // Carregar dados na inicialização
  // ✅ CORRIGIDO: Dependency array explícito para evitar re-execuções
  useEffect(() => {
    fetchCardFeatures()
  }, [fetchCardFeatures])


  // Retorna estado e ações para os componentes
  return {
    // Estado
    items: state.items,
    filteredItems, // ✅ OTIMIZADO: Usar filteredItems do useMemo diretamente
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
    searchTerm: search.searchTerm,
    selectedTech: state.selectedTech,
    
    // Paginação - usando usePagination hook
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
    totalCount: pagination.totalCount,

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
    
    // Paginação - usando usePagination hook
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    refreshData: pagination.refreshData
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