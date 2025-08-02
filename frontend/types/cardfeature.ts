// ================================================
// INTERFACES PRINCIPAIS - Sincronizadas com Backend
// ================================================

/**
 * Representa uma aba/arquivo dentro de um CardFeature
 */
export interface CardFeatureScreen {
  name: string        // Nome da aba (ex: "Model", "Controller", "Routes")
  description: string // Descrição do que o arquivo faz
  code: string       // Código do arquivo
  route?: string     // Caminho do arquivo (ex: "backend/src/models/User.ts")
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
  screens: CardFeatureScreen[]
}

/**
 * Dados para atualizar um CardFeature existente
 * Todos os campos são opcionais para updates parciais
 */
export interface UpdateCardFeatureData extends Partial<CreateCardFeatureData> {}

/**
 * Dados mínimos para criar uma nova aba/screen
 */
export interface CreateScreenData {
  name: string
  description: string
  code: string
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
  filteredItems: CardFeature[]
  
  // Estados de loading
  loading: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
  fetching: boolean
  
  // Estados de erro
  error: string | null
  lastError: Date | null

  // Estados de UI
  selectedItem: CardFeature | null    // Item sendo visualizado no modal
  editingItem: CardFeature | null     // Item sendo editado
  isCreating: boolean                 // Modo criação ativo
  isEditing: boolean                  // Modo edição ativo
  showDeleteConfirm: boolean          // Modal de confirmação de delete
  deleteItemId: string | null         // ID do item a ser deletado

  // Controles de interface
  activeTab: string                   // Aba ativa no modal
  searchTerm: string                  // Termo de busca
  selectedTech: string                // Filtro de tecnologia selecionado
  
  // Paginação
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalCount: number
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
  filteredItems: CardFeature[]
  loading: boolean
  creating: boolean
  updating: boolean
  deleting: boolean
  fetching: boolean
  error: string | null
  selectedItem: CardFeature | null
  editingItem: CardFeature | null
  isCreating: boolean
  isEditing: boolean
  showDeleteConfirm: boolean
  deleteItemId: string | null
  activeTab: string
  searchTerm: string
  selectedTech: string
  
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
  
  // Bulk Operations
  bulkCreate: (items: CreateCardFeatureData[]) => Promise<CardFeature[]>
  bulkDelete: (ids: string[]) => Promise<number>

  // UI Actions
  startCreating: () => void
  cancelCreating: () => void
  startEditing: (item: CardFeature) => void
  cancelEditing: () => void
  selectCardFeature: (id: string) => void
  setActiveTab: (tabName: string) => void
  showDeleteConfirmation: (id: string) => void
  cancelDelete: () => void
  setSearchTerm: (term: string) => void
  setSelectedTech: (tech: string) => void
  clearSelection: () => void
  clearError: () => void
  
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