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
  // PRIVATE HELPERS
  // ================================================

  private static transformToResponse(row: any): CardFeatureResponse {
    // Extrair dados do usuário
    const userData = row.users || null

    // Converter shared_with_user_ids de JSONB para array de strings
    let sharedWithUserIds: string[] = []
    if (row.shared_with_user_ids) {
      if (Array.isArray(row.shared_with_user_ids)) {
        sharedWithUserIds = row.shared_with_user_ids
      } else if (typeof row.shared_with_user_ids === 'string') {
        try {
          sharedWithUserIds = JSON.parse(row.shared_with_user_ids)
        } catch {
          sharedWithUserIds = []
        }
      }
    }

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
      author: userData?.name || null,
      isPrivate: row.is_private ?? false,
      createdInProjectId: row.created_in_project_id || null,
      sharedWithUserIds: sharedWithUserIds.length > 0 ? sharedWithUserIds : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static async buildQuery(params: CardFeatureQueryParams = {}, userId?: string) {
    // IMPORTANTE: Usar supabaseAdmin seguindo padrão do projeto (ProjectModel)
    let query = supabaseAdmin
      .from('card_features')
      .select('*', { count: 'exact' })

    // Filtro de visibilidade: públicos OU privados do próprio usuário OU compartilhados comigo
    if (userId) {
      // Usar JSONB para incluir cards compartilhados
      // (is_private=false) OR (is_private=true AND created_by=userId) OR (shared_with_user_ids contém userId)
      query = query.or(
        `is_private.eq.false,` +
        `and(is_private.eq.true,created_by.eq.${userId}),` +
        `shared_with_user_ids.cs.["${userId}"]`
      )
    } else {
      // Não autenticado: apenas cards públicos
      query = query.eq('is_private', false)
    }

    // Filtro para excluir cards criados em projetos (apenas cards da aba Códigos)
    query = query.is('created_in_project_id', null)

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
      // Buscar IDs de usuários cujo nome corresponde ao termo de busca
      const { data: matchingUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('name', `%${params.search}%`)
      
      const matchingUserIds = matchingUsers?.map((u: any) => u.id) || []
      
      // Se encontrou usuários, incluir na busca por created_by
      if (matchingUserIds.length > 0) {
        // Usar .in() diretamente na query para created_by
        // Primeiro aplicar o OR para title/description/tech
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,tech.ilike.%${params.search}%`)
        // Depois adicionar o filtro por created_by usando .in() (isso cria um AND com o OR anterior)
        // Para fazer um OR completo, precisamos usar uma abordagem diferente
        // Vamos fazer duas queries e combinar os resultados, ou usar uma subquery
        // Por enquanto, vamos usar uma abordagem mais simples: aplicar o .in() que vai funcionar como AND
        // Mas isso não é ideal. Vamos usar uma abordagem melhor:
        const orConditions = [
          `title.ilike.%${params.search}%`,
          `description.ilike.%${params.search}%`,
          `tech.ilike.%${params.search}%`
        ]
        // Adicionar condições para cada user ID
        matchingUserIds.forEach((userId: string) => {
          orConditions.push(`created_by.eq.${userId}`)
        })
        query = query.or(orConditions.join(','))
      } else {
        // Se não encontrou usuários, buscar apenas em title, description e tech
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,tech.ilike.%${params.search}%`)
      }
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

  static async create(data: CreateCardFeatureRequest, userId: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
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
        title: data.title || '',
        tech: data.tech || 'React',
        language: data.language || 'typescript',
        description: data.description || '',
        content_type: data.content_type || 'code',
        card_type: data.card_type || 'codigos',
        screens: processedScreens,
        created_by: userId,
        is_private: data.is_private ?? false,
        created_in_project_id: data.created_in_project_id || null,
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

      // Buscar dados do usuário criador
      let userData = null
      if (result.created_by) {
        const { data: user } = await executeQuery(
          supabaseAdmin
            .from('users')
            .select('id, name, email')
            .eq('id', result.created_by)
            .single()
        )
        userData = user
      }

      return {
        success: true,
        data: this.transformToResponse({ ...result, users: userData }),
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

  // ================================================
  // READ
  // ================================================

  static async findById(id: string, userId?: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      let query = supabaseAdmin
        .from('card_features')
        .select('*')
        .eq('id', id)

      // Aplicar filtro de visibilidade
      if (userId) {
        // Cards públicos OU cards privados do próprio usuário
        query = query.or(`is_private.eq.false,and(is_private.eq.true,created_by.eq.${userId})`)
      } else {
        // Não autenticado: apenas cards públicos
        query = query.eq('is_private', false)
      }

      const { data } = await executeQuery(query.single())

      // Verificar se card existe e se usuário tem acesso
      if (!data) {
        return {
          success: false,
          error: 'Card não encontrado ou você não tem permissão para visualizá-lo',
          statusCode: 404
        }
      }

      // Verificação adicional: se privado, deve ser do usuário
      if (data.is_private && data.created_by !== userId) {
        return {
          success: false,
          error: 'Você não tem permissão para visualizar este card',
          statusCode: 403
        }
      }

      // Buscar dados do usuário criador
      let userData = null
      if (data.created_by) {
        const { data: user } = await executeQuery(
          supabaseAdmin
            .from('users')
            .select('id, name, email')
            .eq('id', data.created_by)
            .single()
        )
        userData = user
      }

      return {
        success: true,
        data: this.transformToResponse({ ...data, users: userData }),
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

  static async findAll(params: CardFeatureQueryParams = {}, userId?: string): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const query = await this.buildQuery(params, userId)
      const { data, count } = await executeQuery(query)

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
          statusCode: 200
        }
      }

      // Buscar IDs únicos de criadores
      const creatorIds = [...new Set(data.map((card: any) => card.created_by).filter(Boolean))]

      // Buscar dados dos usuários
      const { data: users } = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id, name, email')
          .in('id', creatorIds)
      )

      // Criar mapa de usuários por ID
      const usersMap = new Map(users?.map((u: any) => [u.id, u]) || [])

      // Transformar cards adicionando dados do autor
      const transformedData = data?.map((row: any) => {
        const userData = row.created_by ? usersMap.get(row.created_by) : null
        return this.transformToResponse({ ...row, users: userData })
      }) || []

      return {
        success: true,
        data: transformedData,
        count: count || 0,
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

  static async search(searchTerm: string, params: CardFeatureQueryParams = {}, userId?: string): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const searchParams = { ...params, search: searchTerm }
      return await this.findAll(searchParams, userId)
    } catch (error) {
      console.error('Erro interno ao buscar CardFeatures:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  static async findByTech(tech: string, params: CardFeatureQueryParams = {}, userId?: string): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const techParams = { ...params, tech }
      return await this.findAll(techParams, userId)
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

  static async update(id: string, data: Partial<CreateCardFeatureRequest>, userId: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Verificar se existe e se usuário é o criador
      const existingCheck = await this.findById(id, userId)
      if (!existingCheck.success) {
        return existingCheck
      }

      // Verificar ownership
      if (existingCheck.data?.createdBy !== userId) {
        return {
          success: false,
          error: 'Você não tem permissão para atualizar este card',
          statusCode: 403
        }
      }

      const updateData: CardFeatureUpdate = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()
      )

      // Buscar dados do usuário criador
      let userData = null
      if (result.created_by) {
        const { data: user } = await executeQuery(
          supabaseAdmin
            .from('users')
            .select('id, name, email')
            .eq('id', result.created_by)
            .single()
        )
        userData = user
      }

      return {
        success: true,
        data: this.transformToResponse({ ...result, users: userData }),
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

  static async delete(id: string, userId: string): Promise<ModelResult<null>> {
    try {
      // Verificar se existe e se usuário é o criador
      const existingCheck = await this.findById(id, userId)
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Erro ao verificar CardFeature',
          statusCode: existingCheck.statusCode || 404
        }
      }

      // Verificar ownership
      if (existingCheck.data?.createdBy !== userId) {
        return {
          success: false,
          error: 'Você não tem permissão para deletar este card',
          statusCode: 403
        }
      }

      await executeQuery(
        supabaseAdmin
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
      // Total count (apenas públicos para stats)
      const { count: total } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('*', { count: 'exact', head: true })
          .eq('is_private', false)
      )

      // Group by tech (apenas públicos)
      const { data: techData } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('tech')
          .eq('is_private', false)
      )

      // Group by language (apenas públicos)
      const { data: languageData } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('language')
          .eq('is_private', false)
      )

      // Recent count (last 7 days, apenas públicos)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: recentCount } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('*', { count: 'exact', head: true })
          .eq('is_private', false)
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

  static async bulkCreate(items: CreateCardFeatureRequest[], userId: string): Promise<ModelListResult<CardFeatureResponse>> {
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
        created_by: userId,
        is_private: item.is_private ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data } = await executeQuery(
        supabaseAdmin
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
        supabaseAdmin
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
