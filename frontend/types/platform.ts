import type { CardFeature } from '@/types'
import type { TabKey } from '@/utils/routes'

/**
 * Interface que define o estado e funções da plataforma
 * Usado para tipagem forte em componentes que recebem platformState
 */
export interface PlatformState {
  /** Tab ativa atual */
  activeTab: TabKey
  /** Função para mudar a tab ativa (atualiza URL também) */
  setActiveTab: (tab: string) => void
  /** Termo de busca atual */
  searchTerm: string
  /** Função para atualizar o termo de busca */
  setSearchTerm: (term: string) => void
  /** Tecnologia selecionada para filtro */
  selectedTech: string
  /** Função para atualizar a tecnologia selecionada */
  setSelectedTech: (tech: string) => void
  /** Set de IDs de itens favoritos */
  favorites: Set<string>
  /** Função para alternar favorito de um item */
  toggleFavorite: (id: string) => void
  /** Função para filtrar snippets baseado em busca e tech */
  filteredSnippets: (snippets: CardFeature[]) => CardFeature[]
}
