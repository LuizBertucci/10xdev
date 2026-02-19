import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cardTabs'

/**
 * Hook para gerenciar o estado da aba ativa de um card.
 * Persiste no localStorage para manter a aba ao atualizar a página.
 * Não usa URL para evitar re-renders que tiram foco do search.
 */
export function useCardTabState(cardId: string) {
  const [activeTab, setActiveTabState] = useState(0)

  // Carregar aba do localStorage na montagem
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const tabs = JSON.parse(stored) as Record<string, number>
        if (tabs[cardId] !== undefined) {
          setActiveTabState(tabs[cardId])
        }
      }
    } catch {
      // Ignora erros de parsing
    }
  }, [cardId])

  const setActiveTab = useCallback((tabIndex: number) => {
    setActiveTabState(tabIndex)

    // Salvar no localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const tabs = stored ? JSON.parse(stored) : {}

      if (tabIndex === 0) {
        delete tabs[cardId]
      } else {
        tabs[cardId] = tabIndex
      }

      // Limitar a 50 cards para não crescer indefinidamente
      const keys = Object.keys(tabs)
      if (keys.length > 50) {
        delete tabs[keys[0]]
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
    } catch {
      // Ignora erros de storage
    }
  }, [cardId])

  return { activeTab, setActiveTab }
}
