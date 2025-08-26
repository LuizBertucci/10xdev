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

// Main hook to manage CardFeatures with API
export function useCardFeatures(options: UseCardFeaturesOptions = {}): UseCardFeaturesReturn {
  const [state, setState] = useState<CardFeatureState>({
    // Main data
    items: [],
    filteredItems: [],
    
    // Loading states
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isFetching: false,
    
    // Error states
    error: null,
    lastError: null,

    // UI states
    selectedItem: null,
    editingItem: null,
    isCreating: false,
    isEditing: false,
    showDeleteConfirm: false,
    deleteItemId: null,

    // Interface controls
    activeTab: '',
    searchTerm: '',
    selectedTech: 'all',
    
    // Pagination
    currentPage: 1,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    totalCount: 0
  })

  // FILTERS - Filter items locally
  const filteredItems = useMemo(() => {
    return state.items.filter(item => {
      const matchesSearch = state.searchTerm === '' || 
        item.title.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(state.searchTerm.toLowerCase())
      
      const matchesTech = state.selectedTech === 'all' || 
        item.tech.toLowerCase() === state.selectedTech.toLowerCase()
      
      return matchesSearch && matchesTech
    })
  }, [state.items, state.searchTerm, state.selectedTech])

  // Update filteredItems when changed
  useEffect(() => {
    setState(prev => ({ ...prev, filteredItems }))
  }, [filteredItems])

  // ================================================
  // CRUD OPERATIONS - Usando API
  // ================================================

  // CREATE - Create new CardFeature
  const createCardFeature = useCallback(async (data: CreateCardFeatureData): Promise<CardFeature | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }))
    
    try {
      const response = await cardFeatureService.create(data)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: [response.data!, ...prev.items],
          isCreating: false,
          totalCount: prev.totalCount + 1
        }))
        return response.data
      } else {
        throw new Error(response.error || 'Error creating CardFeature')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isCreating: false
      }))
      return null
    }
  }, [])

  // READ - Get CardFeature by ID
  const getCardFeature = useCallback(async (id: string): Promise<CardFeature | null> => {
    // First try to find locally
    const localItem = state.items.find(item => item.id === id)
    if (localItem) {
      return localItem
    }

    // If not found locally, fetch from API
    setState(prev => ({ ...prev, isFetching: true, error: null }))
    
    try {
      const response = await cardFeatureService.getById(id)
      
      if (response.success && response.data) {
        // Add to local state if doesn't exist
        setState(prev => {
          const exists = prev.items.some(item => item.id === id)
          return {
            ...prev,
            items: exists ? prev.items : [...prev.items, response.data!],
            isFetching: false
          }
        })
        return response.data
      } else {
        throw new Error(response.error || 'CardFeature not found')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isFetching: false
      }))
      return null
    }
  }, [state.items])

  // READ ALL - Get all CardFeatures
  const fetchCardFeatures = useCallback(async (params?: QueryParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await cardFeatureService.getAll(params)
      
      if (response.success && response.data) {
        const items = response.data.data || response.data
        setState(prev => ({
          ...prev,
          items: items,
          isLoading: false,
          currentPage: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          hasNextPage: response.hasNextPage || false,
          hasPrevPage: response.hasPrevPage || false,
          totalCount: response.count || items.length
        }))
      } else {
        throw new Error(response.error || 'Error loading CardFeatures')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading CardFeatures'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isLoading: false
      }))
    }
  }, [])

  // SEARCH - Search CardFeatures
  const searchCardFeatures = useCallback(async (searchTerm: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const DEFAULT_LIMIT = 10
      const response = await cardFeatureService.search(searchTerm, {
        page: state.currentPage,
        limit: DEFAULT_LIMIT
      })
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: response.data!.data,
          isLoading: false,
          currentPage: response.data!.currentPage,
          totalPages: response.data!.totalPages,
          hasNextPage: response.data!.hasNextPage,
          hasPrevPage: response.data!.hasPrevPage,
          totalCount: response.data!.count
        }))
      } else {
        throw new Error(response.error || 'Search error')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search error'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isLoading: false
      }))
    }
  }, [state.currentPage])

  // UPDATE - Update existing CardFeature
  const updateCardFeature = useCallback(async (id: string, data: UpdateCardFeatureData): Promise<CardFeature | null> => {
    setState(prev => ({ ...prev, isUpdating: true, error: null }))
    
    try {
      const response = await cardFeatureService.update(id, data)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === id ? response.data! : item
          ),
          isUpdating: false,
          isEditing: false,
          editingItem: null
        }))
        return response.data
      } else {
        throw new Error(response.error || 'Error updating CardFeature')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isUpdating: false
      }))
      return null
    }
  }, [])

  // DELETE - Remove CardFeature
  const deleteCardFeature = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isDeleting: true, error: null }))
    
    try {
      const response = await cardFeatureService.delete(id)
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== id),
          isDeleting: false,
          showDeleteConfirm: false,
          deleteItemId: null,
          totalCount: Math.max(0, prev.totalCount - 1)
        }))
        return true
      } else {
        throw new Error(response.error || 'Error removing CardFeature')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error removing CardFeature'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isDeleting: false
      }))
      return false
    }
  }, [])

  // ================================================
  // BULK OPERATIONS
  // ================================================

  const bulkCreate = useCallback(async (items: CreateCardFeatureData[]): Promise<CardFeature[]> => {
    setState(prev => ({ ...prev, isCreating: true, error: null }))
    
    try {
      const response = await cardFeatureService.bulkCreate(items)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: [...response.data!, ...prev.items],
          isCreating: false,
          totalCount: prev.totalCount + response.data!.length
        }))
        return response.data
      } else {
        throw new Error(response.error || 'Error bulk creating CardFeatures')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error bulk creating CardFeatures'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isCreating: false
      }))
      return []
    }
  }, [])

  const bulkDelete = useCallback(async (ids: string[]): Promise<number> => {
    setState(prev => ({ ...prev, isDeleting: true, error: null }))
    
    try {
      const response = await cardFeatureService.bulkDelete(ids)
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: prev.items.filter(item => !ids.includes(item.id)),
          isDeleting: false,
          totalCount: Math.max(0, prev.totalCount - response.data!.deletedCount)
        }))
        return response.data.deletedCount
      } else {
        throw new Error(response.error || 'Error bulk removing CardFeatures')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error bulk removing CardFeatures'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        isDeleting: false
      }))
      return 0
    }
  }, [])

  // ================================================
  // PAGINAÇÃO
  // ================================================

  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > state.totalPages) return
    
    const DEFAULT_LIMIT = 10
    await fetchCardFeatures({
      page,
      limit: DEFAULT_LIMIT,
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
    const DEFAULT_LIMIT = 10
    await fetchCardFeatures({
      page: state.currentPage,
      limit: DEFAULT_LIMIT,
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
    
    // Auto-search after delay
    const SEARCH_DELAY_MS = 500
    const timeoutId = setTimeout(() => {
      if (term.trim()) {
        searchCardFeatures(term.trim())
      } else {
        fetchCardFeatures()
      }
    }, SEARCH_DELAY_MS)

    return () => clearTimeout(timeoutId)
  }, [searchCardFeatures, fetchCardFeatures])

  const setSelectedTech = useCallback((tech: string) => {
    setState(prev => ({ ...prev, selectedTech: tech }))
    
    // Re-fetch with new filter
    const DEFAULT_LIMIT = 10
    fetchCardFeatures({
      page: 1,
      limit: DEFAULT_LIMIT,
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

  // Load data on initialization
  useEffect(() => {
    fetchCardFeatures()
  }, [fetchCardFeatures])


  // Return state and actions for components
  return {
    // State
    items: state.items,
    filteredItems: state.filteredItems,
    isLoading: state.isLoading,
    isCreating: state.isCreating,
    isUpdating: state.isUpdating,
    isDeleting: state.isDeleting,
    isFetching: state.isFetching,
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
    
    // Pagination
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
    selectCardFeature,
    setActiveTab,
    showDeleteConfirmation,
    cancelDelete,
    setSearchTerm,
    setSelectedTech,
    clearSelection,
    clearError,
    
    // Pagination
    goToPage,
    nextPage,
    prevPage,
    refreshData,
    
  }
}

// Simplified hook for specific cases
export function useCardFeature(id?: string) {
  const cardFeatures = useCardFeatures()
  
  const item = id ? cardFeatures.items.find(item => item.id === id) || null : null
  
  return {
    item,
    ...cardFeatures
  }
}