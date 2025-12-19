import { supabase, supabaseAdmin, executeQuery } from '@/database/supabase'
import { randomUUID } from 'crypto'
import type {
  CardFeatureRow,
  CardFeatureInsert,
  CardFeatureUpdate,
  CardFeatureResponse,
  CardFeatureQueryParams,
  ModelResult,
  ModelListResult,
  CreateCardFeatureRequest
} from '@/types/cardfeature'

export class CardFeatureModel {
  // ================================================
  // CONSTANTS
  // ================================================

  private static readonly SUPER_ADMINS = [
    'Augusto Amado',
    'Luiz Bertucci'
  ]

  // ================================================
  // PRIVATE HELPERS
  // ================================================

  /**
   * Verifica se o nome do usuário pertence a um super-admin
   */
  private static isSuperAdmin(userName?: string | null): boolean {
    return userName ? this.SUPER_ADMINS.includes(userName) : false
  }

  /**
   * Verifica se o usuário tem permissão para visualizar o card
   *
   * Regras de visibilidade:
   * - Públicos globais (is_private=false, created_in_project_id=null): todos podem ver
   * - Privados (is_private=true): apenas o criador ou super-admins
   * - Não listados (created_in_project_id!=null): membros do projeto ou super-admins
   *
   * @param cardId - ID do card a verificar
   * @param userId - ID do usuário (opcional para cards públicos)
   * @param userName - Nome do usuário (para verificar super-admin)
   * @returns true se tem permissão, false caso contrário
   */
  private static async checkViewPermission(
    cardId: string,
    userId?: string,
    userName?: string | null
  ): Promise<boolean> {
    // Super-admin pode ver tudo
    if (this.isSuperAdmin(userName)) {
      return true
    }

    const { data } = await executeQuery(
      supabaseAdmin
        .from('card_features')
        .select('created_by, is_private, created_in_project_id')
        .eq('id', cardId)
        .single()
    )

    if (!data) return false

    // Público global - todos podem ver
    if (!data.is_private && !data.created_in_project_id) {
      return true
    }

    // Sem autenticação e não é público
    if (!userId) return false

    // É o criador
    if (data.created_by === userId) {
      return true
    }

    // É não listado e usuário é membro do projeto
    if (data.created_in_project_id) {
      const { data: member } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .select('id')
          .eq('project_id', data.created_in_project_id)
          .eq('user_id', userId)
          .maybeSingle()
      )
      return !!member
    }

    return false
  }

  /**
   * Verifica se o usuário é dono do card OU é super-admin
   *
   * @param cardId - ID do card
   * @param userId - ID do usuário
   * @param userName - Nome do usuário (para verificar super-admin)
   * @returns true se é dono ou super-admin, false caso contrário
   */
  private static async checkOwnership(
    cardId: string,
    userId: string,
    userName?: string | null
  ): Promise<boolean> {
    // Super-admin pode editar/deletar tudo
    if (this.isSuperAdmin(userName)) {
      return true
    }

    // Verificar se é o criador
    const { data } = await executeQuery(
      supabaseAdmin
        .from('card_features')
        .select('created_by')
        .eq('id', cardId)
        .single()
    )

    return data?.created_by === userId
  }

  private static transformToResponse(row: CardFeatureRow): CardFeatureResponse {
    return {
      id: row.id,
      title: row.title,
      tech: row.tech,
      language: row.language,
      description: row.description,
      content_type: row.content_type,
      card_type: row.card_type,
      screens: row.screens,
      createdBy: row.created_by,
      isPrivate: row.is_private,
      createdInProjectId: row.created_in_project_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static buildQuery(params: CardFeatureQueryParams = {}) {
    // Usar supabaseAdmin para evitar RLS
    let query = supabaseAdmin
      .from('card_features')
      .select('*', { count: 'exact' })

    // FILTRO DE VISIBILIDADE: apenas cards públicos globais
    query = query
      .eq('is_private', false)
      .is('created_in_project_id', null)

    // Filtros
    if (params.tech && params.tech !== 'all') {
      query = query.ilike('tech', params.tech)
    }

    if (params.language && params.language !== 'all') {
      query = query.ilike('language', params.language)
    }

    // Adicionar filtro por content_type
    if (params.content_type && params.content_type !== 'all') {
      query = query.eq('content_type', params.content_type)
    }

    // Adicionar filtro por card_type
    if (params.card_type && params.card_type !== 'all') {
      query = query.eq('card_type', params.card_type)
    }

    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,tech.ilike.%${params.search}%`)
    }

    // Ordenação
    const sortBy = params.sortBy || 'created_at'
    const sortOrder = params.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Paginação
    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit
      const to = from + params.limit - 1
      query = query.range(from, to)
    }

    return query
  }

  // ================================================
  // CREATE
  // ================================================

  static async create(
    data: CreateCardFeatureRequest,
    userId?: string,
    projectId?: string
  ): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Validar dados básicos
      if (!data.title || !data.tech || !data.language) {
        return {
          success: false,
          error: 'Campos obrigatórios: title, tech, language',
          statusCode: 400
        }
      }

      if (!data.screens || !Array.isArray(data.screens) || data.screens.length === 0) {
        return {
          success: false,
          error: 'Pelo menos uma screen é obrigatória',
          statusCode: 400
        }
      }

      // Processar screens para adicionar IDs e order aos blocos
      const processedScreens = data.screens.map(screen => ({
        ...screen,
        blocks: screen.blocks.map((block, index) => ({
          ...block,
          id: randomUUID(),
          order: block.order || index
        }))
      }))

      const insertData: CardFeatureInsert = {
        id: randomUUID(),
        title: data.title,
        tech: data.tech,
        language: data.language,
        description: data.description || '',
        content_type: data.content_type || 'code',
        card_type: data.card_type || 'codigos',
        screens: processedScreens,
        created_by: userId || null,
        is_private: projectId ? false : (data.is_private ?? false),
        created_in_project_id: projectId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .insert(insertData)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      console.error('Erro ao criar CardFeature:', error)
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // READ
  // ================================================

  static async findById(
    id: string,
    userId?: string,
    userName?: string | null
  ): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Verificar permissão de visualização
      const hasPermission = await this.checkViewPermission(id, userId, userName)

      if (!hasPermission) {
        return {
          success: false,
          error: 'CardFeature não encontrado ou você não tem permissão',
          statusCode: 404
        }
      }

      const { data } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('*')
          .eq('id', id)
          .single()
      )

      if (!data) {
        return {
          success: false,
          error: 'CardFeature não encontrado',
          statusCode: 404
        }
      }

      return {
        success: true,
        data: this.transformToResponse(data),
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Erro ao buscar CardFeature:', error)
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async findAll(params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const query = this.buildQuery(params)
      const { data, count } = await executeQuery(query)

      const transformedData = data?.map((row: any) => this.transformToResponse(row)) || []

      return {
        success: true,
        data: transformedData,
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Erro ao buscar CardFeatures:', error)
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  /**
   * Busca cards visíveis para um usuário específico
   * Inclui: públicos globais + privados do usuário + não listados dos projetos do usuário
   */
  static async findAllForUser(
    userId: string,
    params: CardFeatureQueryParams = {}
  ): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      // Buscar IDs dos projetos do usuário
      const { data: memberships } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId)
      )

      const projectIds = memberships?.map(m => m.project_id).filter(id => id != null) || []

      // Construir query base
      let query = supabaseAdmin
        .from('card_features')
        .select('*', { count: 'exact' })

      // Aplicar filtro de visibilidade complexo
      if (projectIds.length > 0) {
        query = query.or(
          `and(is_private.eq.false,created_in_project_id.is.null),` +
          `created_by.eq.${userId},` +
          `created_in_project_id.in.(${projectIds.join(',')})`
        )
      } else {
        query = query.or(
          `and(is_private.eq.false,created_in_project_id.is.null),` +
          `created_by.eq.${userId}`
        )
      }

      // Aplicar filtros adicionais
      if (params.tech && params.tech !== 'all') {
        query = query.ilike('tech', params.tech)
      }
      if (params.language && params.language !== 'all') {
        query = query.ilike('language', params.language)
      }
      if (params.content_type && params.content_type !== 'all') {
        query = query.eq('content_type', params.content_type)
      }
      if (params.card_type && params.card_type !== 'all') {
        query = query.eq('card_type', params.card_type)
      }
      if (params.search) {
        query = query.or(
          `title.ilike.%${params.search}%,` +
          `description.ilike.%${params.search}%,` +
          `tech.ilike.%${params.search}%`
        )
      }

      // Ordenação
      const sortBy = params.sortBy || 'created_at'
      const sortOrder = params.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Paginação
      if (params.page && params.limit) {
        const from = (params.page - 1) * params.limit
        const to = from + params.limit - 1
        query = query.range(from, to)
      }

      const { data, count } = await executeQuery(query)

      const transformedData = data?.map((row: any) => this.transformToResponse(row)) || []

      return {
        success: true,
        data: transformedData,
        count: count || 0,
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Erro ao buscar cards do usuário:', error)
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async search(searchTerm: string, params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const searchParams = { ...params, search: searchTerm }
      return await this.findAll(searchParams)
    } catch (error) {
      console.error('Erro interno ao buscar CardFeatures:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  static async findByTech(tech: string, params: CardFeatureQueryParams = {}): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const techParams = { ...params, tech }
      return await this.findAll(techParams)
    } catch (error) {
      console.error('Erro interno ao buscar CardFeatures por tech:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  // ================================================
  // UPDATE
  // ================================================

  static async update(id: string, data: Partial<CreateCardFeatureRequest>): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Verificar se existe
      const existingCheck = await this.findById(id)
      if (!existingCheck.success) {
        return existingCheck
      }

      const updateData: CardFeatureUpdate = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabase
          .from('card_features')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // DELETE
  // ================================================

  static async delete(id: string): Promise<ModelResult<null>> {
    try {
      // Verificar se existe
      const existingCheck = await this.findById(id)
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Erro ao verificar CardFeature',
          statusCode: existingCheck.statusCode || 404
        }
      }

      await executeQuery(
        supabase
          .from('card_features')
          .delete()
          .eq('id', id)
      )

      return {
        success: true,
        data: null,
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // STATISTICS
  // ================================================

  static async getStats(): Promise<ModelResult<{
    total: number
    byTech: Record<string, number>
    byLanguage: Record<string, number>
    recentCount: number
  }>> {
    try {
      // Total count
      const { count: total } = await executeQuery(
        supabase
          .from('card_features')
          .select('*', { count: 'exact', head: true })
      )

      // Group by tech
      const { data: techData } = await executeQuery(
        supabase
          .from('card_features')
          .select('tech')
      )

      // Group by language
      const { data: languageData } = await executeQuery(
        supabase
          .from('card_features')
          .select('language')
      )

      // Recent count (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: recentCount } = await executeQuery(
        supabase
          .from('card_features')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString())
      )

      // Process counts
      const byTech = (techData as any)?.reduce((acc: any, item: any) => {
        acc[item.tech] = (acc[item.tech] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const byLanguage = (languageData as any)?.reduce((acc: any, item: any) => {
        acc[item.language] = (acc[item.language] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return {
        success: true,
        data: {
          total: total || 0,
          byTech,
          byLanguage,
          recentCount: recentCount || 0
        },
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  // ================================================
  // BULK OPERATIONS
  // ================================================

  static async bulkCreate(items: CreateCardFeatureRequest[]): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const insertData: CardFeatureInsert[] = items.map(item => ({
        id: randomUUID(),
        title: item.title,
        tech: item.tech,
        language: item.language,
        description: item.description,
        content_type: item.content_type,
        card_type: item.card_type || 'codigos',
        screens: item.screens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data } = await executeQuery(
        supabase
          .from('card_features')
          .insert(insertData)
          .select()
      )

      const transformedData = data?.map((row: any) => this.transformToResponse(row)) || []

      return {
        success: true,
        data: transformedData,
        count: transformedData.length,
        statusCode: 201
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async bulkDelete(ids: string[]): Promise<ModelResult<{ deletedCount: number }>> {
    try {
      const { count } = await executeQuery(
        supabase
          .from('card_features')
          .delete({ count: 'exact' })
          .in('id', ids)
      )

      return {
        success: true,
        data: { deletedCount: count || 0 },
        statusCode: 200
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }
}
