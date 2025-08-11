import { useState, useCallback, useEffect, useReducer } from 'react'
import { useDebounce } from 'use-debounce'
import { cardFeatureService } from '@/services'
import type {
  CardFeature,
  CreateCardFeatureData,
  UpdateCardFeatureData,
  QueryParams,
  CardFeatureFilters,
  UseCardFeaturesOptions,
  CodeScreen as CardFeatureScreen
} from '@/lib/types'

// ================================================
// TIPOS OTIMIZADOS - Removendo redundâncias
// ================================================

interface CardFeatureState {
  items: CardFeature[]
  loading: boolean
  error: string | null
  
  // UI State
  selectedItem: CardFeature | null
  editingItem: CardFeature | null
  
  // Pagination
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// CardFeatureFilters now imported from @/lib/types

type CardFeatureAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_ITEMS'; items: CardFeature[]; pagination?: any }
  | { type: 'ADD_ITEM'; item: CardFeature }
  | { type: 'UPDATE_ITEM'; id: string; item: CardFeature }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SET_SELECTED'; item: CardFeature | null }
  | { type: 'SET_EDITING'; item: CardFeature | null }

// ================================================
// REDUCER OTIMIZADO - Gerenciamento de estado eficiente
// ================================================

const initialState: CardFeatureState = {
  items: [],
  loading: false,
  error: null,
  selectedItem: null,
  editingItem: null,
  currentPage: 1,
  totalPages: 0,
  totalCount: 0,
  hasNextPage: false,
  hasPrevPage: false
}

function cardFeatureReducer(state: CardFeatureState, action: CardFeatureAction): CardFeatureState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading, error: action.loading ? null : state.error }
    
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }
    
    case 'SET_ITEMS':
      return {
        ...state,
        items: action.items,
        loading: false,
        error: null,
        ...action.pagination
      }
    
    case 'ADD_ITEM':
      return {
        ...state,
        items: [action.item, ...state.items],
        totalCount: state.totalCount + 1
      }
    
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item => 
          item.id === action.id ? action.item : item
        )
      }
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.id),
        totalCount: Math.max(0, state.totalCount - 1)
      }
    
    case 'SET_SELECTED':
      return { ...state, selectedItem: action.item }
    
    case 'SET_EDITING':
      return { ...state, editingItem: action.item }
    
    default:
      return state
  }
}

// ================================================
// HOOK OTIMIZADO - 90% menos código
// ================================================

// UseCardFeaturesOptions now imported from @/lib/types

export function useCardFeatures(options: UseCardFeaturesOptions = {}) {
  const { initialFilters = { searchTerm: '', selectedTech: 'all' }, autoFetch = true } = options
  
  const [state, dispatch] = useReducer(cardFeatureReducer, initialState)
  const [filters, setFilters] = useState<CardFeatureFilters>(initialFilters)
  
  // Debounced search - Evita requests desnecessários
  const [debouncedSearchTerm] = useDebounce(filters.searchTerm, 300)
  
  // ================================================
  // API CALLS - Métodos otimizados
  // ================================================
  
  const fetchCardFeatures = useCallback(async (params?: QueryParams) => {
    dispatch({ type: 'SET_LOADING', loading: true })
    
    try {
      const response = await cardFeatureService.getAll({
        search: debouncedSearchTerm || undefined,
        tech: filters.selectedTech !== 'all' ? filters.selectedTech : undefined,
        ...params
      })
      
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : []
        dispatch({ 
          type: 'SET_ITEMS', 
          items,
          pagination: {
            currentPage: response.currentPage || 1,
            totalPages: response.totalPages || 1,
            totalCount: response.count || items.length,
            hasNextPage: response.hasNextPage || false,
            hasPrevPage: response.hasPrevPage || false
          }
        })
      } else {
        dispatch({ type: 'SET_ERROR', error: response.error || 'Erro ao carregar CardFeatures' })
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: error instanceof Error ? error.message : 'Erro na requisição'
      })
    }
  }, [debouncedSearchTerm, filters.selectedTech])
  
  const createCardFeature = useCallback(async (data: CreateCardFeatureData): Promise<CardFeature | null> => {
    dispatch({ type: 'SET_LOADING', loading: true })
    
    try {
      const response = await cardFeatureService.create(data)
      
      if (response.success && response.data) {
        dispatch({ type: 'ADD_ITEM', item: response.data })
        return response.data
      } else {
        throw new Error(response.error || 'Erro ao criar CardFeature')
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: error instanceof Error ? error.message : 'Erro ao criar'
      })
      return null
    }
  }, [])
  
  const updateCardFeature = useCallback(async (id: string, data: UpdateCardFeatureData): Promise<CardFeature | null> => {
    dispatch({ type: 'SET_LOADING', loading: true })
    
    try {
      const response = await cardFeatureService.update(id, data)
      
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_ITEM', id, item: response.data })
        dispatch({ type: 'SET_EDITING', item: null })
        return response.data
      } else {
        throw new Error(response.error || 'Erro ao atualizar CardFeature')
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: error instanceof Error ? error.message : 'Erro ao atualizar'
      })
      return null
    }
  }, [])
  
  const deleteCardFeature = useCallback(async (id: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', loading: true })
    
    try {
      const response = await cardFeatureService.delete(id)
      
      if (response.success) {
        dispatch({ type: 'REMOVE_ITEM', id })
        return true
      } else {
        throw new Error(response.error || 'Erro ao deletar CardFeature')
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: error instanceof Error ? error.message : 'Erro ao deletar'
      })
      return false
    }
  }, [])
  
  // ================================================
  // UI HELPERS - Métodos de interface
  // ================================================
  
  const selectItem = useCallback((item: CardFeature | null) => {
    dispatch({ type: 'SET_SELECTED', item })
  }, [])
  
  const startEditing = useCallback((item: CardFeature) => {
    dispatch({ type: 'SET_EDITING', item })
  }, [])
  
  const cancelEditing = useCallback(() => {
    dispatch({ type: 'SET_EDITING', item: null })
  }, [])
  
  const updateFilters = useCallback((newFilters: Partial<CardFeatureFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])
  
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null })
  }, [])
  
  // ================================================
  // EFFECTS - Auto-fetch otimizado
  // ================================================
  
  // Fetch inicial
  useEffect(() => {
    if (autoFetch) {
      fetchCardFeatures()
    }
  }, [autoFetch, fetchCardFeatures])
  
  // Re-fetch quando filtros mudam (com debounce)
  useEffect(() => {
    if (debouncedSearchTerm !== initialFilters.searchTerm || filters.selectedTech !== initialFilters.selectedTech) {
      fetchCardFeatures({ page: 1 }) // Reset para primeira página
    }
  }, [debouncedSearchTerm, filters.selectedTech, fetchCardFeatures, initialFilters])
  
  // ================================================
  // RETURN - Interface limpa e concisa
  // ================================================
  
  return {
    // Estado
    ...state,
    filters,
    
    // CRUD Operations
    fetchCardFeatures,
    createCardFeature,
    updateCardFeature,
    deleteCardFeature,
    
    // UI Operations
    selectItem,
    startEditing,
    cancelEditing,
    updateFilters,
    clearError,
    
    // Computed Values
    isEmpty: state.items.length === 0 && !state.loading,
    hasData: state.items.length > 0,
    isFirstPage: state.currentPage === 1,
    isLastPage: state.currentPage === state.totalPages
  }
}

// ================================================
// HOOK PARA ITEM ÚNICO - Otimizado para páginas de detalhes
// ================================================

export function useCardFeature(id: string) {
  const [item, setItem] = useState<CardFeature | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchItem = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await cardFeatureService.getById(id)
      
      if (response.success && response.data) {
        setItem(response.data)
      } else {
        throw new Error(response.error || 'Item não encontrado')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar item')
    } finally {
      setLoading(false)
    }
  }, [id])
  
  useEffect(() => {
    if (id) {
      fetchItem()
    }
  }, [fetchItem, id])
  
  return {
    item,
    loading,
    error,
    refetch: fetchItem
  }
}

export default useCardFeatures