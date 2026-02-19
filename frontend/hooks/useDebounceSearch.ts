import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Configuração do hook de busca com debounce
 */
export interface UseDebounceSearchConfig {
  delay?: number
  initialSearchTerm?: string
}

/**
 * Retorno do hook useDebounceSearch
 */
export interface UseDebounceSearchReturn {
  searchTerm: string
  debouncedSearchTerm: string
  setSearchTerm: (term: string) => void
  isSearching: boolean
  clearSearch: () => void
}

/**
 * Hook reutilizável para busca com debounce
 * 
 * @param onSearch - Função executada após o debounce
 * @param config - Configuração do debounce
 * @returns Objeto com estado e ações de busca
 */
export function useDebounceSearch(
  onSearch: (term: string) => void | Promise<void>,
  config: UseDebounceSearchConfig = {}
): UseDebounceSearchReturn {
  const {
    delay = 500,
    initialSearchTerm = ''
  } = config

  const [searchTerm, setSearchTermState] = useState(initialSearchTerm)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm)
  const [isSearching, setIsSearching] = useState(false)
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Função para definir o termo de busca com debounce
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term)
    setIsSearching(true)
    
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Criar novo timeout
    timeoutRef.current = setTimeout(async () => {
      setDebouncedSearchTerm(term)
      setIsSearching(false)
      
      try {
        await onSearch(term)
      } catch (error) {
        console.error('Erro na busca:', error)
        setIsSearching(false)
      }
      
      timeoutRef.current = null
    }, delay)
  }, [onSearch, delay])

  // Função para limpar a busca
  const clearSearch = useCallback(() => {
    setSearchTermState('')
    setDebouncedSearchTerm('')
    setIsSearching(false)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    onSearch('')
  }, [onSearch])

  // Cleanup do timeout quando o componente desmonta
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    isSearching,
    clearSearch
  }
}