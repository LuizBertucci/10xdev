import { useState, useCallback } from 'react'

/**
 * Interface para configuração da paginação
 */
export interface PaginationConfig {
  initialPage?: number
  itemsPerPage?: number
}

/**
 * Interface para os parâmetros de fetch
 */
export interface FetchParams {
  page: number
  limit: number
  [key: string]: any
}

/**
 * Interface de retorno do hook usePagination
 */
export interface UsePaginationReturn {
  // Estado da paginação
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalCount: number
  itemsPerPage: number
  
  // Ações de navegação
  goToPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  refreshData: () => Promise<void>
  
  // Utilitários
  updatePaginationInfo: (info: {
    totalCount: number
    currentPage?: number
    totalPages?: number
    hasNextPage?: boolean
    hasPrevPage?: boolean
  }) => void
  reset: () => void
}

/**
 * Hook reutilizável para gerenciar paginação
 * 
 * @param fetchFunction - Função para buscar dados paginados
 * @param config - Configuração inicial da paginação
 * @returns Objeto com estado e ações de paginação
 */
export function usePagination(
  fetchFunction: (params: FetchParams) => Promise<void>,
  config: PaginationConfig = {}
): UsePaginationReturn {
  const {
    initialPage = 1,
    itemsPerPage = 10
  } = config

  const [paginationState, setPaginationState] = useState({
    currentPage: initialPage,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    totalCount: 0
  })

  // Navegar para uma página específica
  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > paginationState.totalPages) return
    
    await fetchFunction({
      page,
      limit: itemsPerPage
    })
  }, [fetchFunction, itemsPerPage, paginationState.totalPages])

  // Próxima página
  const nextPage = useCallback(async () => {
    if (paginationState.hasNextPage) {
      await goToPage(paginationState.currentPage + 1)
    }
  }, [paginationState.hasNextPage, paginationState.currentPage, goToPage])

  // Página anterior
  const prevPage = useCallback(async () => {
    if (paginationState.hasPrevPage) {
      await goToPage(paginationState.currentPage - 1)
    }
  }, [paginationState.hasPrevPage, paginationState.currentPage, goToPage])

  // Atualizar dados da página atual
  const refreshData = useCallback(async () => {
    await fetchFunction({
      page: paginationState.currentPage,
      limit: itemsPerPage
    })
  }, [fetchFunction, paginationState.currentPage, itemsPerPage])

  // Atualizar informações de paginação (chamado após fetch)
  const updatePaginationInfo = useCallback((info: {
    totalCount: number
    currentPage?: number
    totalPages?: number
    hasNextPage?: boolean
    hasPrevPage?: boolean
  }) => {
    setPaginationState(prev => ({
      ...prev,
      totalCount: info.totalCount,
      currentPage: info.currentPage ?? prev.currentPage,
      totalPages: info.totalPages ?? Math.ceil(info.totalCount / itemsPerPage),
      hasNextPage: info.hasNextPage ?? (info.currentPage ?? prev.currentPage) < (info.totalPages ?? Math.ceil(info.totalCount / itemsPerPage)),
      hasPrevPage: info.hasPrevPage ?? (info.currentPage ?? prev.currentPage) > 1
    }))
  }, [itemsPerPage])

  // Reset para estado inicial
  const reset = useCallback(() => {
    setPaginationState({
      currentPage: initialPage,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
      totalCount: 0
    })
  }, [initialPage])

  return {
    // Estado
    currentPage: paginationState.currentPage,
    totalPages: paginationState.totalPages,
    hasNextPage: paginationState.hasNextPage,
    hasPrevPage: paginationState.hasPrevPage,
    totalCount: paginationState.totalCount,
    itemsPerPage,
    
    // Ações
    goToPage,
    nextPage,
    prevPage,
    refreshData,
    updatePaginationInfo,
    reset
  }
}