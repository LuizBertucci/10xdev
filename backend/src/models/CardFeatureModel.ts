import { supabase, supabaseAdmin, executeQuery } from '@/database/supabase'
import { randomUUID } from 'crypto'
import {
  Visibility
} from '@/types/cardfeature'
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

    // Derivar visibility a partir de is_private se não existir (compatibilidade)
    const visibility = row.visibility || (row.is_private ? Visibility.PRIVATE : Visibility.PUBLIC)

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
      isPrivate: row.is_private ?? false, // LEGADO: mantido para compatibilidade
      visibility: visibility as Visibility, // NOVO: controle de visibilidade
      createdInProjectId: row.created_in_project_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static buildQuery(params: CardFeatureQueryParams = {}, userId?: string, userRole?: string, head: boolean = false, matchedUserIds: string[] = [], sharedCardIds: string[] = []) {
    // IMPORTANTE: Usar supabaseAdmin seguindo padrão do projeto (ProjectModel)
    let query = supabaseAdmin
      .from('card_features')
      .select('*', { count: 'exact', head })

    // Filtro de visibilidade para LISTAGENS:
    // - Admin vê TODOS os cards (public + private + unlisted de todos)
    // - Usuário autenticado vê: public + seus private + seus unlisted + compartilhados
    // - Não autenticado vê: apenas public
    //
    // IMPORTANTE: unlisted de OUTROS usuários NÃO aparece em listagens!
    // O acesso a unlisted de outros é apenas via link direto (findById)
    if (userRole === 'admin') {
      // Admin vê todos os cards - não aplica filtro de visibilidade
    } else if (userId) {
      // Construir condições OR para visibilidade
      const conditions: string[] = [
        'visibility.eq.public',
        `and(visibility.eq.private,created_by.eq.${userId})`,
        `and(visibility.eq.unlisted,created_by.eq.${userId})`
      ]
      
      // Se houver cards compartilhados, adicionar condição para eles usando .in()
      if (sharedCardIds.length > 0) {
        // Usar uma única condição .in() com todos os IDs separados por vírgula
        conditions.push(`id.in.(${sharedCardIds.join(',')})`)
      }
      
      query = query.or(conditions.join(','))
    } else {
      // Não autenticado: apenas cards públicos em listagens
      query = query.eq('visibility', Visibility.PUBLIC)
    }

    // Filtro para excluir cards criados em projetos (apenas cards da aba Códigos)
    query = query.is('created_in_project_id', null)

    // Adicionar filtro por visibility se fornecido nos params
    if (params.visibility && params.visibility !== 'all') {
      query = query.eq('visibility', params.visibility)
    }

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
      // Busca pelo título ou pelos IDs de autores encontrados
      if (matchedUserIds.length > 0) {
        query = query.or(`title.ilike.%${params.search}%,created_by.in.(${matchedUserIds.join(',')})`)
      } else {
        query = query.ilike('title', `%${params.search}%`)
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

      // Derivar visibility: usa o campo visibility se fornecido, senão deriva de is_private
      const visibility = data.visibility || (data.is_private ? Visibility.PRIVATE : Visibility.PUBLIC)

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
        is_private: visibility === Visibility.PRIVATE, // LEGADO: mantido para compatibilidade
        visibility: visibility, // NOVO: usar visibility
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

  static async findById(id: string, userId?: string, userRole?: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Para acesso DIRETO via link (findById):
      // - Admin vê todos
      // - Unlisted: qualquer pessoa com o link pode ver
      // - Public: qualquer pessoa pode ver
      // - Private: apenas criador ou compartilhados

      // Primeiro, buscar o card SEM filtro de visibilidade
      const query = supabaseAdmin
        .from('card_features')
        .select('*')
        .eq('id', id)

      const { data } = await executeQuery(query.single())

      // Verificar se card existe
      if (!data) {
        return {
          success: false,
          error: 'Card não encontrado',
          statusCode: 404
        }
      }

      // Derivar visibility a partir de is_private se não existir (compatibilidade)
      const visibility = data.visibility || (data.is_private ? Visibility.PRIVATE : Visibility.PUBLIC)

      // Verificar permissão baseado em visibility
      if (userRole === 'admin') {
        // Admin vê todos - OK
      } else if (visibility === Visibility.PUBLIC || visibility === Visibility.UNLISTED) {
        // Public e Unlisted: qualquer um com link pode ver - OK
      } else if (visibility === Visibility.PRIVATE) {
        // Private: apenas criador ou compartilhados
        if (data.created_by !== userId) {
          // TODO: Verificar se está nos compartilhados
          // Por agora, apenas verifica se é o criador
          return {
            success: false,
            error: 'Você não tem permissão para visualizar este card',
            statusCode: 403
          }
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

  static async findAll(params: CardFeatureQueryParams = {}, userId?: string, userRole?: string): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      // 1. Se houver busca, primeiro encontrar IDs de usuários que batem com o nome
      let matchedUserIds: string[] = []
      if (params.search) {
        const { data: users } = await executeQuery(
          supabaseAdmin
            .from('users')
            .select('id')
            .ilike('name', `%${params.search}%`)
        )
        matchedUserIds = users?.map((u: any) => u.id) || []
      }

      // 2. Buscar IDs dos cards compartilhados com o usuário (se autenticado e não admin)
      let sharedCardIds: string[] = []
      if (userId && userRole !== 'admin') {
        try {
          const { data: shares } = await executeQuery(
            supabaseAdmin
              .from('card_shares')
              .select('card_feature_id')
              .eq('shared_with_user_id', userId)
          )
          sharedCardIds = shares?.map((s: any) => s.card_feature_id).filter(Boolean) || []
        } catch (error) {
          console.error('Erro ao buscar cards compartilhados:', error)
          // Continuar sem os cards compartilhados em caso de erro
        }
      }

      // 3. Query principal para os dados (com range/ordenação)
      const query = this.buildQuery(params, userId, userRole, false, matchedUserIds, sharedCardIds)
      const { data, error: dataError } = await executeQuery(query)

      // 4. Query para o COUNT (sem range, para pegar o total filtrado)
      const countParams = { ...params }
      delete countParams.page
      delete countParams.limit
      
      const countQuery = this.buildQuery(countParams, userId, userRole, true, matchedUserIds, sharedCardIds)
      const { count, error: countError } = await executeQuery(countQuery)

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          count: count || 0,
          statusCode: 200
        }
      }

      // 4. Buscar IDs únicos de criadores para enriquecer os dados
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

  static async search(searchTerm: string, params: CardFeatureQueryParams = {}, userId?: string, userRole?: string): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const searchParams = { ...params, search: searchTerm }
      return await this.findAll(searchParams, userId, userRole)
    } catch (error) {
      console.error('Erro interno ao buscar CardFeatures:', error)
      return {
        success: false,
        error: 'Erro interno do servidor',
        statusCode: 500
      }
    }
  }

  static async findByTech(tech: string, params: CardFeatureQueryParams = {}, userId?: string, userRole?: string): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const techParams = { ...params, tech }
      return await this.findAll(techParams, userId, userRole)
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

  static async update(
    id: string,
    data: Partial<CreateCardFeatureRequest>,
    userId: string,
    actorRole: string = 'user'
  ): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const isAdmin = actorRole === 'admin'

      // Verificar se existe e se usuário tem acesso (admin pode ver qualquer card)
      const existingCheck = await this.findById(id, userId, actorRole)
      if (!existingCheck.success) {
        return existingCheck
      }

      // Verificar ownership (admin pode editar qualquer card)
      if (!isAdmin && existingCheck.data?.createdBy !== userId) {
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

  static async delete(id: string, userId: string, actorRole: string = 'user'): Promise<ModelResult<null>> {
    try {
      const isAdmin = actorRole === 'admin'

      // Verificar se existe e se usuário tem acesso (admin pode ver qualquer card)
      const existingCheck = await this.findById(id, userId, actorRole)
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Erro ao verificar CardFeature',
          statusCode: existingCheck.statusCode || 404
        }
      }

      // Verificar ownership (admin pode deletar qualquer card)
      if (!isAdmin && existingCheck.data?.createdBy !== userId) {
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
          .eq('visibility', Visibility.PUBLIC)
      )

      // Group by tech (apenas públicos)
      const { data: techData } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('tech')
          .eq('visibility', Visibility.PUBLIC)
      )

      // Group by language (apenas públicos)
      const { data: languageData } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('language')
          .eq('visibility', Visibility.PUBLIC)
      )

      // Recent count (last 7 days, apenas públicos)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: recentCount } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('*', { count: 'exact', head: true })
          .eq('visibility', Visibility.PUBLIC)
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
      const insertData: CardFeatureInsert[] = items.map(item => {
        // Processar screens para adicionar IDs e order aos blocos (mesma regra do create)
        const processedScreens = (item.screens || []).map(screen => ({
          ...screen,
          blocks: (screen.blocks || []).map((block: any, index: number) => ({
            ...block,
            id: randomUUID(),
            order: block.order || index
          }))
        }))

        // Derivar visibility: usa o campo visibility se fornecido, senão deriva de is_private
        const visibility = item.visibility || (item.is_private ? Visibility.PRIVATE : Visibility.PUBLIC)
        return {
          id: randomUUID(),
          title: item.title,
          tech: item.tech,
          language: item.language,
          description: item.description,
          content_type: item.content_type,
          card_type: item.card_type || 'codigos',
          screens: processedScreens,
          created_by: userId,
          is_private: visibility === Visibility.PRIVATE, // LEGADO: mantido para compatibilidade
          visibility: visibility, // NOVO: usar visibility
          created_in_project_id: item.created_in_project_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })

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
