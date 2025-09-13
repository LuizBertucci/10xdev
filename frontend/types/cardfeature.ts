// ================================================
// INTERFACES PRINCIPAIS - Sincronizadas com Backend
// ================================================

// ================================================
// ENUMS
// ================================================

/**
 * Tipos de conteúdo suportados
 */
export enum ContentType {
  CODE = 'code',
  TEXT = 'text',
  TERMINAL = 'terminal'
}

/**
 * Bloco individual de conteúdo
 */
export interface ContentBlock {
  id: string                    // UUID único do bloco
  type: ContentType            // Tipo do bloco
  content: string              // Conteúdo do bloco
  language?: string            // Linguagem (para código)
  title?: string               // Título opcional do bloco
  route?: string               // Rota/caminho do arquivo (para blocos de código)
  order: number                // Ordem do bloco na aba
}

/**
 * Representa uma aba/arquivo dentro de um CardFeature
 */
export interface CardFeatureScreen {
  name: string        // Nome da aba (ex: "Setup", "API", "Deploy")
  description: string // Descrição do que a aba contém
  blocks: ContentBlock[]  // Array de blocos de conteúdo
  route?: string      // Rota do arquivo (opcional)
}

/**
 * CardFeature completo com todas as informações
 * Sincronizado com backend API response
 */
export interface CardFeature {
  id: string
  title: string
  tech: string           // Tecnologia principal (React, Node.js, Python, etc.)
  language: string       // Linguagem de programação (typescript, javascript, python)
  description: string    // Descrição do que o código faz
  content_type: ContentType    // Tipo de conteúdo principal
  screens: CardFeatureScreen[]  // Array de abas/arquivos
  createdAt: string      // ISO string do backend
  updatedAt: string      // ISO string do backend
}

/**
 * CardFeature com campos adicionais para UI
 */
export interface CardFeatureDisplay extends CardFeature {
  formattedCreatedAt: string
  formattedUpdatedAt: string
  screenCount: number
  isSelected?: boolean
  isEditing?: boolean
}

// ================================================
// TIPOS PARA OPERAÇÕES CRUD
// ================================================

/**
 * Dados necessários para criar um novo CardFeature
 * Sincronizado com backend API
 */
export interface CreateCardFeatureData {
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType
  screens: CardFeatureScreen[]
}

/**
 * Dados para atualizar um CardFeature existente
 * Todos os campos são opcionais para updates parciais
 */
export interface UpdateCardFeatureData extends Partial<CreateCardFeatureData> {}

/**
 * Dados mínimos para criar um novo bloco
 */
export interface CreateBlockData {
  type: ContentType
  content: string
  language?: string
  title?: string
  route?: string               // Rota/caminho do arquivo (para blocos de código)
  order: number                // Ordem do bloco na aba
}

/**
 * Dados mínimos para criar uma nova aba/screen
 */
export interface CreateScreenData {
  name: string
  description: string
  blocks: CreateBlockData[]
  route?: string
}

// ================================================
// ESTADO DO SISTEMA CRUD
// ================================================

/**
 * Estado completo do sistema de CardFeatures
 * Atualizado para trabalhar com API
 */
export interface CardFeatureState {
  // Dados principais
  items: CardFeature[]
  // ✅ REMOVIDO: filteredItems (agora calculado via useMemo)
  
  // Estados de loading
  loading: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
  fetching: boolean
  
  // Estados de erro
  error: string | null
  lastError: Date | null

  selectedTech: string                // Filtro de tecnologia selecionado
  
  // ✅ REMOVIDO: Paginação movida para usePagination hook
  totalCount: number                  // Mantido apenas para compatibilidade
}

// ================================================
// TIPOS PARA COMPONENTES
// ================================================

/**
 * Props para componentes de CardFeature
 */
export interface CardFeatureProps {
  cardFeature: CardFeature
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

/**
 * Props para o modal de visualização
 */
export interface CardFeatureModalProps {
  cardFeature: CardFeature | null
  isOpen: boolean
  onClose: () => void
  activeTab: string
  onTabChange: (tabName: string) => void
}

/**
 * Props para formulários de CardFeature
 */
export interface CardFeatureFormProps {
  cardFeature?: CardFeature          // Para edição (opcional)
  onSubmit: (data: CreateCardFeatureData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

/**
 * Props para o editor de abas/screens
 */
export interface CardFeatureTabEditorProps {
  screens: CardFeatureScreen[]
  onChange: (screens: CardFeatureScreen[]) => void
  activeScreenIndex: number
  onActiveScreenChange: (index: number) => void
}

// ================================================
// ENUMS E CONSTANTES
// ================================================

/**
 * Tecnologias suportadas
 */
export enum SupportedTech {
  REACT = 'React',
  NODEJS = 'Node.js',
  PYTHON = 'Python',
  JAVASCRIPT = 'JavaScript',
  VUE = 'Vue.js',
  ANGULAR = 'Angular',
  DJANGO = 'Django',
  FASTAPI = 'FastAPI',
  EXPRESS = 'Express'
}

/**
 * Linguagens de programação suportadas
 */
export enum SupportedLanguage {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  HTML = 'html',
  CSS = 'css',
  JSON = 'json',
  YAML = 'yaml',
  SQL = 'sql'
}

/**
 * Estados possíveis para operações CRUD
 */
export enum CrudStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// ================================================
// TIPOS UTILITÁRIOS
// ================================================

/**
 * Resultado de operações CRUD
 */
export interface CrudResult<T = CardFeature> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Configuração de filtros
 */
export interface FilterConfig {
  searchTerm: string
  selectedTech: string
  sortBy: 'title' | 'createdAt' | 'updatedAt'
  sortOrder: 'asc' | 'desc'
}

/**
 * Configuração de paginação (para futuro)
 */
export interface PaginationConfig {
  page: number
  limit: number
  total: number
}

/**
 * Metadados de CardFeature (para estatísticas)
 */
export interface CardFeatureMetadata {
  totalCount: number
  techCounts: Record<string, number>
  languageCounts: Record<string, number>
  recentlyCreated: CardFeature[]
  recentlyUpdated: CardFeature[]
}

// ================================================
// TIPOS PARA HOOKS
// ================================================

/**
 * Retorno do hook useCardFeatures
 * Atualizado para trabalhar com API
 */
export interface UseCardFeaturesReturn {
  // Estado
  items: CardFeature[]
  filteredItems: CardFeature[] // ✅ MANTIDO: retornado pelo hook via useMemo
  loading: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
  fetching: boolean
  error: string | null
  searchTerm: string
  selectedTech: string
  
  // Estados dos modais
  isCreating: boolean
  isEditing: boolean
  editingItem: CardFeature | null
  
  // Paginação
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalCount: number

  // CRUD Operations (retornam promises da API)
  createCardFeature: (data: CreateCardFeatureData) => Promise<CardFeature | null>
  getCardFeature: (id: string) => Promise<CardFeature | null>
  updateCardFeature: (id: string, data: UpdateCardFeatureData) => Promise<CardFeature | null>
  deleteCardFeature: (id: string) => Promise<boolean>
  fetchCardFeatures: (params?: import('./api').QueryParams) => Promise<void>
  searchCardFeatures: (searchTerm: string) => Promise<void>
  

  setSearchTerm: (term: string) => void
  setSelectedTech: (tech: string) => void
  clearError: () => void
  
  // Controle dos modais
  startCreating: () => void
  cancelCreating: () => void
  startEditing: (item: CardFeature) => void
  cancelEditing: () => void
  
  // Paginação
  goToPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  refreshData: () => Promise<void>
}

/**
 * Opções para configurar o hook useCardFeatures
 */
export interface UseCardFeaturesOptions {
  autoLoad?: boolean              // Carregar dados automaticamente
  storageKey?: string            // Chave para localStorage
  enableRealTimeSync?: boolean   // Sincronização em tempo real
}

// ================================================
// TIPOS PARA VALIDAÇÃO (futuro)
// ================================================

/**
 * Schema de validação para CardFeature
 */
export interface CardFeatureValidationSchema {
  title: {
    required: boolean
    minLength: number
    maxLength: number
  }
  tech: {
    required: boolean
    allowedValues: string[]
  }
  language: {
    required: boolean
    allowedValues: string[]
  }
  description: {
    required: boolean
    minLength: number
    maxLength: number
  }
  screens: {
    required: boolean
    minItems: number
    maxItems: number
  }
}

/**
 * Resultado de validação
 */
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
}

// ================================================
// TIPOS PARA IMPORT/EXPORT (futuro)
// ================================================

/**
 * Formato para export de CardFeatures
 */
export interface CardFeatureExport {
  version: string
  exportedAt: Date
  items: CardFeature[]
  metadata: CardFeatureMetadata
}

/**
 * Configuração para import
 */
export interface ImportConfig {
  overwriteExisting: boolean
  validateData: boolean
  generateNewIds: boolean
}