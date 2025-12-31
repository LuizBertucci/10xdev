import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'

/**
 * Hook para gerenciar o estado da aba ativa de um card via URL.
 * Permite persistir a aba selecionada ao atualizar a página.
 *
 * Formato da URL: ?tabs=cardId1:tabIndex,cardId2:tabIndex
 * Exemplo: ?tabs=abc123:2,def456:1
 */
export function useCardTabState(cardId: string) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Ler aba ativa da URL
  const activeTab = useMemo(() => {
    const tabsParam = searchParams?.get('tabs') || ''
    const tabs = tabsParam.split(',').filter(Boolean)
    const match = tabs.find(t => t.startsWith(`${cardId}:`))
    return match ? parseInt(match.split(':')[1]) || 0 : 0
  }, [searchParams, cardId])

  const setActiveTab = useCallback((tabIndex: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    const tabsParam = params.get('tabs') || ''
    const tabs = tabsParam.split(',').filter(Boolean)

    // Atualizar ou adicionar entrada para este card
    const newTabs = tabs.filter(t => !t.startsWith(`${cardId}:`))
    if (tabIndex > 0) {
      newTabs.push(`${cardId}:${tabIndex}`)
    }

    if (newTabs.length > 0) {
      params.set('tabs', newTabs.join(','))
    } else {
      params.delete('tabs')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname, cardId])

  return { activeTab, setActiveTab }
}
