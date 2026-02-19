import { useState, useCallback, useEffect, useRef } from 'react'
import { cardFeatureService } from '@/services'
import { usePagination } from './usePagination'
import { useDebounceSearch } from './useDebounceSearch'
import { ApprovalStatus, Visibility } from '@/types'
import type { CardFeature, CardFeatureState, CreateCardFeatureData, UpdateCardFeatureData, UseCardFeaturesReturn, UseCardFeaturesOptions, QueryParams, FetchParams } from '@/types'

// Hook principal para gerenciar CardFeatures com API
export function useCardFeatures(options: UseCardFeaturesOptions = {}, externalFilters?: {
  searchTerm?: string
  selectedTech?: string
  selectedVisibility?: string
  selectedApprovalStatus?: string
  selectedOwnership?: string
  selectedCardType?: string
  setSearchTerm?: (term: string) => void
  setSelectedTech?: (tech: string) => void
}): UseCardFeaturesReturn {

  const initialPage = Number.isFinite(options.initialPage) && (options.initialPage as number) > 0
    ? (options.initialPage as number)
    : 1
  const itemsPerPage = Number.isFinite(options.itemsPerPage) && (options.itemsPerPage as number) > 0
    ? (options.itemsPerPage as number)
    : 10

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

    selectedTech: 'all',
    totalCount: 0
  })

  // Estados dos modais
  const [modalState, setModalState] = useState({
    isCreating: false,
    isEditing: false,
    editingItem: null as CardFeature | null
  })

  // Ref para armazenar a função de atualização de paginação
  const paginationUpdateRef = useRef<((info: {
    totalCount: number
    currentPage?: number
    totalPages?: number
    hasNextPage?: boolean
    hasPrevPage?: boolean
  }) => void) | null>(null)

  // ✅ NOVO: Função de fetch com paginação para o usePagination hook
  const fetchCardFeaturesWithPagination = useCallback(async (params: FetchParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const queryParams: QueryParams = {
        ...params,
        tech: state.selectedTech !== 'all' ? state.selectedTech : undefined,
        visibility: externalFilters?.selectedVisibility !== 'all' ? externalFilters?.selectedVisibility : undefined,
        approval_status: externalFilters?.selectedApprovalStatus !== 'all' ? externalFilters?.selectedApprovalStatus : undefined,
        ownership: externalFilters?.selectedOwnership,
        card_type: externalFilters?.selectedCardType !== 'all' ? externalFilters?.selectedCardType : undefined
      }
      
      const response = await cardFeatureService.getAll(queryParams)
      
      if (response && response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : []
        setState(prev => ({
          ...prev,
          items: items,
          loading: false
        }))
        
        // Atualizar informações de paginação com dados da resposta
        if (response.count !== undefined && paginationUpdateRef.current) {
          paginationUpdateRef.current({
            totalCount: response.count,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            hasNextPage: response.hasNextPage,
            hasPrevPage: response.hasPrevPage
          })
        }
        
        return response
      } else {
        throw new Error(response?.error || 'Erro ao carregar CardFeatures')
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
  }, [state.selectedTech, externalFilters?.selectedVisibility, externalFilters?.selectedApprovalStatus, externalFilters?.selectedOwnership, externalFilters?.selectedCardType])

  // Wrapper para usePagination (precisa retornar void)
  const paginationFetchFn = useCallback(async (params: FetchParams) => {
    await fetchCardFeaturesWithPagination(params)
  }, [fetchCardFeaturesWithPagination])

  const pagination = usePagination(paginationFetchFn, {
    itemsPerPage,
    initialPage
  })

  // ✅ NOVO: Observar mudanças na visibilidade ou tipo externos
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    const hasVisibilityFilter = externalFilters?.selectedVisibility !== undefined && externalFilters.selectedVisibility !== 'all'
    const hasApprovalFilter = externalFilters?.selectedApprovalStatus !== undefined && externalFilters.selectedApprovalStatus !== 'all'
    const hasOwnershipFilter = externalFilters?.selectedOwnership !== undefined && externalFilters.selectedOwnership !== 'all'
    const hasCardTypeFilter = externalFilters?.selectedCardType !== undefined && externalFilters.selectedCardType !== 'all'

    if (hasVisibilityFilter || hasApprovalFilter || hasOwnershipFilter || hasCardTypeFilter) {
      pagination.goToPage(1)
    }
  }, [externalFilters?.selectedVisibility, externalFilters?.selectedApprovalStatus, externalFilters?.selectedOwnership, externalFilters?.selectedCardType, pagination.goToPage])

  // Atualizar a ref quando pagination for criado
  useEffect(() => {
    paginationUpdateRef.current = pagination.updatePaginationInfo
  }, [pagination.updatePaginationInfo])

  // ✅ NOVO: Hook de busca com debounce - usa fetchCardFeaturesWithPagination
  const search = useDebounceSearch(
    useCallback(async (term: string) => {
      await fetchCardFeaturesWithPagination({
        page: 1,
        limit: itemsPerPage,
        search: term.trim() || undefined,
        tech: state.selectedTech !== 'all' ? state.selectedTech : undefined,
        visibility: externalFilters?.selectedVisibility !== 'all' ? externalFilters?.selectedVisibility : undefined,
        approval_status: externalFilters?.selectedApprovalStatus !== 'all' ? externalFilters?.selectedApprovalStatus : undefined,
        ownership: externalFilters?.selectedOwnership !== 'all' ? externalFilters?.selectedOwnership : undefined,
        card_type: externalFilters?.selectedCardType !== 'all' ? externalFilters?.selectedCardType : undefined
      })
    }, [fetchCardFeaturesWithPagination, itemsPerPage, state.selectedTech, externalFilters?.selectedVisibility, externalFilters?.selectedApprovalStatus, externalFilters?.selectedOwnership, externalFilters?.selectedCardType]),
    { delay: 500 }
  )

  // A API já retorna os dados filtrados
  const filteredItems = state.items

  // ================================================
  // CRUD OPERATIONS - Usando API
  // ================================================

  // CREATE - Criar novo CardFeature
  const createCardFeature = useCallback(async (data: CreateCardFeatureData): Promise<CardFeature | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }))
    
    try {
      console.log('Criando CardFeature:', data)
      const response = await cardFeatureService.create(data)
      console.log('Resposta da API:', response)
      
      if (response && response.success && response.data) {
        setState(prev => ({
          ...prev,
          items: [response.data!, ...(Array.isArray(prev.items) ? prev.items : [])],
          creating: false
        }))
        setModalState(prev => ({ ...prev, isCreating: false }))
        return response.data
      } else {
        throw new Error(response?.error || 'Erro ao criar CardFeature')
      }
    } catch (error) {
      console.error('Erro ao criar CardFeature:', error)
      let errorMessage = 'Erro ao criar CardFeature'
      
      if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = (error as { error?: string }).error || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
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
    setState(prev => ({ ...prev, fetching: true, error: null }))
    
    try {
      const response = await cardFeatureService.getById(id)
      
      if (response && response.success && response.data) {
        setState(prev => ({ ...prev, fetching: false }))
        return response.data
      } else {
        throw new Error(response?.error || 'CardFeature não encontrado')
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
  }, [])

  // UPDATE - Atualizar CardFeature existente
  const updateCardFeature = useCallback(async (id: string, data: UpdateCardFeatureData): Promise<CardFeature | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }))
    
    try {
      console.log('Atualizando CardFeature:', id)
      console.log('Dados sendo enviados:', JSON.stringify(data, null, 2))
      console.log('Screens:', data.screens)
      if (data.screens && data.screens.length > 0) {
        data.screens.forEach((screen, index) => {
          console.log(`Screen ${index}:`, screen)
          console.log(`Screen ${index} has name:`, !!screen.name)
          console.log(`Screen ${index} has description:`, !!screen.description)
          console.log(`Screen ${index} has blocks:`, !!screen.blocks, Array.isArray(screen.blocks))
        })
      }
      const response = await cardFeatureService.update(id, data)
      console.log('Resposta da API (update):', response)
      
      if (response && response.success && response.data) {
        const getEffectiveVisibility = (item: CardFeature) =>
          item.visibility || (item.isPrivate ? Visibility.UNLISTED : Visibility.PUBLIC)
        const getEffectiveApproval = (item: CardFeature) =>
          item.approvalStatus || ApprovalStatus.NONE
        const matchesFilters = (item: CardFeature) => {
          const visibilityFilter = externalFilters?.selectedVisibility
          const approvalFilter = externalFilters?.selectedApprovalStatus

          if (visibilityFilter && visibilityFilter !== 'all') {
            if (getEffectiveVisibility(item) !== visibilityFilter) return false
          }
          if (approvalFilter && approvalFilter !== 'all') {
            if (getEffectiveApproval(item) !== approvalFilter) return false
          }
          return true
        }

        const shouldKeep = matchesFilters(response.data)

        console.log('CardFeature atualizado com sucesso! Fechando modal...')
        setState(prev => ({
          ...prev,
          items: (() => {
            const items = Array.isArray(prev.items) ? prev.items : []
            const updated = items.map(item => (item.id === id ? response.data! : item))
            return shouldKeep ? updated : updated.filter(item => item.id !== id)
          })(),
          updating: false
        }))
        setModalState(prev => ({ ...prev, isEditing: false, editingItem: null }))
        console.log('Modal fechado, retornando dados:', response.data)
        return response.data
      } else {
        throw new Error(response?.error || 'Erro ao atualizar CardFeature')
      }
    } catch (error) {
      console.error('Erro ao atualizar CardFeature:', error)
      let errorMessage = 'Erro ao atualizar CardFeature'
      
      if (error && typeof error === 'object' && 'error' in error) {
        errorMessage = (error as { error?: string }).error || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        lastError: new Date(),
        updating: false
      }))
      return null
    }
  }, [externalFilters?.selectedApprovalStatus, externalFilters?.selectedVisibility])

  // DELETE - Remover CardFeature
  const deleteCardFeature = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, deleting: true, error: null }))
    
    try {
      const response = await cardFeatureService.delete(id)
      
      if (response && response.success) {
        setState(prev => ({
          ...prev,
          items: (Array.isArray(prev.items) ? prev.items : []).filter(item => item.id !== id),
          deleting: false
        }))
        return true
      } else {
        throw new Error(response?.error || 'Erro ao remover CardFeature')
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

  // Filtros - Funções otimizadas para controlar busca e tecnologia
  const setSearchTerm = useCallback((term: string) => {
    search.setSearchTerm(term)
    externalFilters?.setSearchTerm?.(term)
  }, [search.setSearchTerm, externalFilters?.setSearchTerm])

  const setSelectedTech = useCallback((tech: string) => {
    setState(prev => ({ ...prev, selectedTech: tech }))
    externalFilters?.setSelectedTech?.(tech)
  }, [externalFilters?.setSelectedTech])


  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // ================================================
  // MODAL CONTROL FUNCTIONS - Controle dos modais
  // ================================================

  const startCreating = useCallback(() => {
    setModalState(prev => ({ ...prev, isCreating: true, isEditing: false, editingItem: null }))
  }, [])

  const cancelCreating = useCallback(() => {
    setModalState(prev => ({ ...prev, isCreating: false }))
  }, [])

  const startEditing = useCallback((item: CardFeature) => {
    setModalState(prev => ({ ...prev, isEditing: true, isCreating: false, editingItem: item }))
  }, [])

  const cancelEditing = useCallback(() => {
    setModalState(prev => ({ ...prev, isEditing: false, editingItem: null }))
  }, [])

  // Carregar dados na inicialização
  useEffect(() => {
    if (options.autoLoad === false) return
    fetchCardFeaturesWithPagination({ page: initialPage, limit: itemsPerPage })
  }, [fetchCardFeaturesWithPagination, initialPage, itemsPerPage, options.autoLoad])


  // Retorna estado e ações para os componentes
  return {
    // Estado
    items: state.items,
    filteredItems, // ✅ SIMPLIFICADO: Items já vêm filtrados da API
    loading: state.loading,
    creating: state.creating,
    updating: state.updating,
    deleting: state.deleting,
    fetching: state.fetching,
    error: state.error,
    searchTerm: search.searchTerm,
    selectedTech: state.selectedTech,
    
    // Estados dos modais
    isCreating: modalState.isCreating,
    isEditing: modalState.isEditing,
    editingItem: modalState.editingItem,
    
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
    fetchCardFeatures: useCallback(async (params?: QueryParams) => {
      await fetchCardFeaturesWithPagination({
        page: params?.page || 1,
        limit: params?.limit || itemsPerPage,
        search: params?.search,
        tech: params?.tech,
        visibility: params?.visibility || externalFilters?.selectedVisibility,
        approval_status: params?.approval_status || externalFilters?.selectedApprovalStatus,
        ownership: params?.ownership || externalFilters?.selectedOwnership,
        card_type: params?.card_type || externalFilters?.selectedCardType
      })
    }, [fetchCardFeaturesWithPagination, itemsPerPage, externalFilters?.selectedVisibility, externalFilters?.selectedApprovalStatus, externalFilters?.selectedOwnership, externalFilters?.selectedCardType]),
    searchCardFeatures: useCallback(async (searchTerm: string) => {
      await fetchCardFeaturesWithPagination({
        page: 1,
        limit: itemsPerPage,
        search: searchTerm.trim() || undefined,
        visibility: externalFilters?.selectedVisibility,
        approval_status: externalFilters?.selectedApprovalStatus,
        ownership: externalFilters?.selectedOwnership,
        card_type: externalFilters?.selectedCardType
      })
    }, [fetchCardFeaturesWithPagination, itemsPerPage, externalFilters?.selectedVisibility, externalFilters?.selectedApprovalStatus, externalFilters?.selectedOwnership, externalFilters?.selectedCardType]),

    setSearchTerm,
    setSelectedTech,
    clearError,
    
    // Controle dos modais
    startCreating,
    cancelCreating,
    startEditing,
    cancelEditing,
    
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