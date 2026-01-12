// ================================================
// DATABASE TYPES - Supabase/PostgreSQL
// ================================================

// Adicionar enum para tipos de conteúdo (blocos)
export enum ContentType {
  CODE = 'code',
  TEXT = 'text',
  TERMINAL = 'terminal'
}

// Enum para tipo de card
export enum CardType {
  DICAS = 'dicas',
  CODIGOS = 'codigos',
  WORKFLOWS = 'workflows'
}

// Enum para visibilidade do card
export enum Visibility {
  PUBLIC = 'public',      // Aparece em listagens, qualquer um pode ver
  PRIVATE = 'private',    // Só o criador (e compartilhados) pode ver
  UNLISTED = 'unlisted'   // Não aparece em listagens, mas qualquer um com link pode ver
}

// Enum para status de aprovação do diretório global
export enum ApprovalStatus {
  NONE = 'none',         // Não foi enviado para aprovação do diretório global
  PENDING = 'pending',   // Aguardando aprovação (fila "Validando")
  APPROVED = 'approved', // Aprovado (aparece em "Aprovados")
  REJECTED = 'rejected'  // Rejeitado (não aparece no diretório global)
}

// NOVA estrutura - Bloco individual de conteúdo
export interface ContentBlock {
  id: string                    // UUID único
  type: ContentType            // Tipo do bloco
  content: string              // Conteúdo
  language?: string            // Linguagem (para código)
  title?: string               // Título opcional
  route?: string               // Caminho do arquivo (para importações)
  order: number                // Ordem do bloco
}

// ATUALIZAR CardFeatureScreen - agora com blocos múltiplos
export interface CardFeatureScreen {
  name: string                 // Nome da aba
  description: string          // Descrição da aba
  blocks: ContentBlock[]       // Array de blocos ao invés de content único
  route?: string              // Rota opcional
}

export interface CardFeatureRow {
  id: string
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType    // Tipo de conteúdo dos blocos
  card_type: CardType          // Tipo do card (dicas/codigos/workflows)
  screens: CardFeatureScreen[]
  created_by: string | null    // ID do usuário que criou o card (pode ser null quando autor é anônimo)
  is_private: boolean          // LEGADO: mantido para compatibilidade
  visibility: Visibility       // NOVO: controle de visibilidade (public/private/unlisted)
  approval_status?: ApprovalStatus | string | null
  approval_requested_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  created_in_project_id?: string | null  // ID do projeto onde foi criado (null = criado na aba Códigos)
  created_at: string
  updated_at: string
}

export interface CardFeatureInsert {
  id?: string
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType
  card_type: CardType
  screens: CardFeatureScreen[]
  created_by?: string          // ID do usuário (backend preenche automaticamente)
  is_private?: boolean         // LEGADO: mantido para compatibilidade
  visibility?: Visibility      // NOVO: controle de visibilidade (padrão: public)
  approval_status?: ApprovalStatus | string
  approval_requested_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  created_in_project_id?: string | null  // ID do projeto onde foi criado (opcional)
  created_at?: string
  updated_at?: string
}

export interface CardFeatureUpdate {
  id?: string
  title?: string
  tech?: string
  language?: string
  description?: string
  content_type?: ContentType
  card_type?: CardType
  screens?: CardFeatureScreen[]
  is_private?: boolean         // LEGADO: mantido para compatibilidade
  visibility?: Visibility      // NOVO: permite alterar visibilidade
  approval_status?: ApprovalStatus | string
  approval_requested_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  updated_at?: string
}

// ================================================
// API REQUEST/RESPONSE TYPES
// ================================================

export interface CreateCardFeatureRequest {
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType
  card_type: CardType
  screens: CardFeatureScreen[]
  is_private?: boolean         // LEGADO: mantido para compatibilidade
  visibility?: Visibility      // NOVO: controle de visibilidade (padrão: public)
  approval_status?: ApprovalStatus | string
  approval_requested_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  created_in_project_id?: string  // ID do projeto onde foi criado (opcional)
}

export interface UpdateCardFeatureRequest extends Partial<CreateCardFeatureRequest> {}

export interface CardFeatureResponse {
  id: string
  title: string
  tech: string
  language: string
  description: string
  content_type: ContentType
  card_type: CardType
  screens: CardFeatureScreen[]
  createdBy: string | null     // ID do usuário que criou (camelCase para API). Pode ser null quando autor é anônimo
  author?: string | null       // Nome do usuário criador (vem do JOIN com users)
  isPrivate: boolean           // LEGADO: mantido para compatibilidade
  visibility: Visibility       // NOVO: controle de visibilidade (public/private/unlisted)
  approvalStatus?: ApprovalStatus | string
  approvalRequestedAt?: string | null
  approvedAt?: string | null
  approvedBy?: string | null
  createdInProjectId?: string | null  // ID do projeto onde foi criado (camelCase para API)
  createdAt: string
  updatedAt: string
}

export interface CardFeatureListResponse {
  data: CardFeatureResponse[]
  count: number
  totalPages?: number
  currentPage?: number
}

export interface SearchCardFeaturesResponse extends CardFeatureListResponse {
  searchTerm: string
  relevance?: Record<string, number>
}

// ================================================
// QUERY PARAMETERS
// ================================================

export interface CardFeatureQueryParams {
  page?: number
  limit?: number
  tech?: string
  language?: string
  content_type?: string
  card_type?: string
  search?: string
  visibility?: string
  approval_status?: string
  sortBy?: 'title' | 'tech' | 'language' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface CardFeatureFilters {
  tech?: string
  language?: string
  searchTerm?: string
  dateRange?: {
    start: string
    end: string
  }
}

// ================================================
// MODEL OPERATION RESULTS
// ================================================

export interface ModelResult<T = CardFeatureResponse> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T = CardFeatureResponse> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}

// ================================================
// VALIDATION SCHEMAS
// ================================================

export interface CardFeatureValidationRules {
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
    itemRules: {
      name: { required: boolean; maxLength: number }
      description: { required: boolean; maxLength: number }
      code: { required: boolean; maxLength: number }
    }
  }
}

// ================================================
// ENUMS
// ================================================

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

export enum SortOrder {
  ASC = 'aesc',
  DESC = 'desc'
}

export enum SortBy {
  TITLE = 'title',
  TECH = 'tech',
  LANGUAGE = 'language',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at'
}