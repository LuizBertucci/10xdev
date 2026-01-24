import { supabase, supabaseAdmin, executeQuery } from '@/database/supabase'
import { randomUUID } from 'crypto'
import {
  ApprovalStatus,
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

    // IMPORTANTE: Usar nullish coalescing (??) ao invés de OR (||)
    // para não sobrescrever valores válidos como 'pending' ou 'rejected'
    const approvalStatus =
      row.approval_status ??
      (visibility === Visibility.PUBLIC ? ApprovalStatus.APPROVED : ApprovalStatus.NONE)

    return {
      id: row.id,
      title: row.title,
      tech: row.tech,
      language: row.language,
      description: row.description,
      tags: row.tags || [],
      content_type: row.content_type,
      card_type: row.card_type,
      screens: row.screens,
      createdBy: row.created_by,
      author: userData?.name || null,
      isPrivate: row.is_private ?? false, // LEGADO: mantido para compatibilidade
      visibility: visibility as Visibility, // NOVO: controle de visibilidade
      approvalStatus: approvalStatus,
      approvalRequestedAt: row.approval_requested_at || null,
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
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
      // Admin vê todos os cards - não aplica filtro base aqui
    } else if (userId) {
      // Usuário autenticado:
      // - Público: somente aprovados (e, opcionalmente, os próprios pendentes quando filtrados)
      // - Private/unlisted: somente do criador
      const conditions: string[] = [
        `and(visibility.eq.public,approval_status.eq.${ApprovalStatus.APPROVED})`,
        `and(visibility.eq.private,created_by.eq.${userId})`,
        `and(visibility.eq.unlisted,created_by.eq.${userId})`,
        // Permite o usuário enxergar os próprios pendentes quando ele filtrar por pending
        `and(visibility.eq.public,approval_status.eq.${ApprovalStatus.PENDING},created_by.eq.${userId})`
      ]

      // Se houver cards compartilhados, adicionar condição para eles usando .in()
      if (sharedCardIds.length > 0) {
        conditions.push(`id.in.(${sharedCardIds.join(',')})`)
      }

      query = query.or(conditions.join(','))
    } else {
      // Não autenticado: somente cards públicos APROVADOS em listagens
      query = query
        .eq('visibility', Visibility.PUBLIC)
        .eq('approval_status', ApprovalStatus.APPROVED)
    }

    // Filtro para excluir cards criados em projetos (apenas cards da aba Códigos)
    query = query.is('created_in_project_id', null)

    // Adicionar filtro por visibility se fornecido nos params
    if (params.visibility && params.visibility !== 'all') {
      query = query.eq('visibility', params.visibility)
    }

    // Adicionar filtro por approval_status se fornecido nos params
    if ((params as any).approval_status && (params as any).approval_status !== 'all') {
      query = query.eq('approval_status', (params as any).approval_status)
      // Segurança extra: não-admin não pode listar pendentes de outros usuários
      if (userRole !== 'admin' && (params as any).approval_status === ApprovalStatus.PENDING && userId) {
        query = query.eq('created_by', userId)
      }
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

  static async create(data: CreateCardFeatureRequest, userId: string, actorRole: string = 'user'): Promise<ModelResult<CardFeatureResponse>> {
    try {
      // Validar card_type
      if (data.card_type && data.card_type !== 'codigos' && data.card_type !== 'post') {
        return {
          success: false,
          error: 'card_type deve ser "codigos" ou "post"',
          statusCode: 400
        }
      }

      const isAdmin = actorRole === 'admin'
      // Processar screens para adicionar IDs e order aos blocos
      const processedScreens = data.screens.map(screen => ({
        ...screen,
        blocks: screen.blocks.map((block, index) => ({
          ...block,
          id: randomUUID(),
          order: block.order || index
        }))
      }))

      // Derivar visibility: usa o campo visibility se fornecido, senão deriva de is_private,
      // e por padrão cria como UNLISTED (para usuários comuns).
      const visibility =
        data.visibility ||
        (data.is_private ? Visibility.PRIVATE : Visibility.UNLISTED)

      const now = new Date().toISOString()

      // Regras de aprovação do diretório global
      let approval_status: ApprovalStatus = ApprovalStatus.NONE
      let approval_requested_at: string | null = null
      let approved_at: string | null = null
      let approved_by: string | null = null

      if (visibility === Visibility.PUBLIC) {
        if (isAdmin) {
          approval_status = ApprovalStatus.APPROVED
          approved_at = now
          approved_by = userId
        } else {
          approval_status = ApprovalStatus.PENDING
          approval_requested_at = now
        }
      }

      const insertData: CardFeatureInsert = {
        id: randomUUID(),
        title: data.title || '',
        ...(data.tech ? { tech: data.tech } : {}),
        ...(data.language ? { language: data.language } : {}),
        description: data.description || '',
        tags: data.tags || [],
        content_type: data.content_type || 'code',
        card_type: data.card_type || 'codigos',
        screens: processedScreens,
        created_by: userId,
        is_private: visibility === Visibility.PRIVATE, // LEGADO: mantido para compatibilidade
        visibility: visibility, // NOVO: usar visibility
        approval_status,
        approval_requested_at,
        approved_at,
        approved_by,
        created_in_project_id: data.created_in_project_id || null,
        // Campos opcionais para posts
        ...(data.category ? { category: data.category } : {}),
        ...(data.file_url ? { file_url: data.file_url } : {}),
        ...(data.youtube_url ? { youtube_url: data.youtube_url } : {}),
        ...(data.video_id ? { video_id: data.video_id } : {}),
        ...(data.thumbnail ? { thumbnail: data.thumbnail } : {}),
        created_at: now,
        updated_at: now
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
      const approvalStatus =
        data.approval_status ||
        (visibility === Visibility.PUBLIC ? ApprovalStatus.APPROVED : ApprovalStatus.NONE)

      // Verificar permissão baseado em visibility
      if (userRole === 'admin') {
        // Admin vê todos - OK
      } else if (visibility === Visibility.UNLISTED) {
        // Unlisted: qualquer pessoa com link pode ver - OK
      } else if (visibility === Visibility.PUBLIC) {
        // Public: apenas APPROVED é realmente público. Pending/Rejected só para criador.
        const isOwner = userId && data.created_by === userId
        if (approvalStatus !== ApprovalStatus.APPROVED && !isOwner) {
          return {
            success: false,
            error: 'Você não tem permissão para visualizar este card',
            statusCode: 403
          }
        }
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
      // Validar card_type se fornecido
      if (data.card_type && data.card_type !== 'codigos' && data.card_type !== 'post') {
        return {
          success: false,
          error: 'card_type deve ser "codigos" ou "post"',
          statusCode: 400
        }
      }

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

      const now = new Date().toISOString()

      // Sanitizar campos de aprovação para não-admin (somente endpoints de moderação podem mexer)
      const sanitized: any = { ...data }
      if (!isAdmin) {
        delete sanitized.approval_status
        delete sanitized.approval_requested_at
        delete sanitized.approved_at
        delete sanitized.approved_by
      }

      const updateData: CardFeatureUpdate = {
        ...sanitized,
        updated_at: now
      }

      // Regras: ao mudar para PUBLIC sempre passar por validação,
      // exceto quando a aprovação for feita via endpoint específico.
      // IMPORTANTE: Verificar SEMPRE se está mudando para PUBLIC, independente do status atual
      if ('visibility' in sanitized && sanitized.visibility !== undefined) {
        if (sanitized.visibility === Visibility.PUBLIC) {
          // Somente o endpoint de aprovação deve setar APPROVED.
          // No update comum, admin e usuário sempre caem em PENDING.
          updateData.approval_status = ApprovalStatus.PENDING
          updateData.approval_requested_at = now
          updateData.approved_at = null
          updateData.approved_by = null
        } else {
          // Se voltou para private/unlisted, não faz parte do diretório global
          updateData.approval_status = ApprovalStatus.NONE
          updateData.approval_requested_at = null
          updateData.approved_at = null
          updateData.approved_by = null
        }
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
  // MODERATION (ADMIN)
  // ================================================

  static async approve(id: string, adminId: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const now = new Date().toISOString()

      // Validar existência
      const existing = await this.findById(id, adminId, 'admin')
      if (!existing.success || !existing.data) return existing as any

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .update({
            visibility: Visibility.PUBLIC,
            approval_status: ApprovalStatus.APPROVED,
            approved_at: now,
            approved_by: adminId,
            updated_at: now
          } as any)
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

      return { success: true, data: this.transformToResponse({ ...result, users: userData }), statusCode: 200 }
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro interno do servidor', statusCode: error.statusCode || 500 }
    }
  }

  static async reject(id: string, adminId: string): Promise<ModelResult<CardFeatureResponse>> {
    try {
      const now = new Date().toISOString()

      // Validar existência
      const existing = await this.findById(id, adminId, 'admin')
      if (!existing.success || !existing.data) return existing as any

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .update({
            visibility: Visibility.UNLISTED,
            approval_status: ApprovalStatus.REJECTED,
            approval_requested_at: null,
            approved_at: null,
            approved_by: null,
            updated_at: now
          } as any)
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

      return { success: true, data: this.transformToResponse({ ...result, users: userData }), statusCode: 200 }
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro interno do servidor', statusCode: error.statusCode || 500 }
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
          .eq('approval_status', ApprovalStatus.APPROVED)
      )

      // Group by tech (apenas públicos)
      const { data: techData } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('tech')
          .eq('visibility', Visibility.PUBLIC)
          .eq('approval_status', ApprovalStatus.APPROVED)
      )

      // Group by language (apenas públicos)
      const { data: languageData } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('language')
          .eq('visibility', Visibility.PUBLIC)
          .eq('approval_status', ApprovalStatus.APPROVED)
      )

      // Recent count (last 7 days, apenas públicos)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: recentCount } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('*', { count: 'exact', head: true })
          .eq('visibility', Visibility.PUBLIC)
          .eq('approval_status', ApprovalStatus.APPROVED)
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

  static async bulkCreate(items: CreateCardFeatureRequest[], userId: string, userRole?: string): Promise<ModelListResult<CardFeatureResponse>> {
    try {
      const now = new Date().toISOString()
      const isAdmin = userRole === 'admin'

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

        // Derivar visibility: usa o campo visibility se fornecido, senão deriva de is_private,
        // e por padrão cria como UNLISTED (para usuários comuns) - mesma lógica do create
        const visibility =
          item.visibility ||
          (item.is_private ? Visibility.PRIVATE : Visibility.UNLISTED)

        // Regras de aprovação do diretório global (mesma lógica do create)
        let approvalStatus: ApprovalStatus = ApprovalStatus.NONE
        let approvalRequestedAt: string | null = null
        let approvedAt: string | null = null
        let approvedBy: string | null = null

        if (visibility === Visibility.PUBLIC) {
          if (isAdmin) {
            approvalStatus = ApprovalStatus.APPROVED
            approvedAt = now
            approvedBy = userId
          } else {
            approvalStatus = ApprovalStatus.PENDING
            approvalRequestedAt = now
          }
        }

        return {
          id: randomUUID(),
          title: item.title,
          ...(item.tech ? { tech: item.tech } : {}),
          ...(item.language ? { language: item.language } : {}),
          description: item.description,
          tags: item.tags || [],
          content_type: item.content_type,
          card_type: item.card_type || 'codigos',
          screens: processedScreens,
          created_by: userId,
          is_private: visibility === Visibility.PRIVATE, // LEGADO: mantido para compatibilidade
          visibility: visibility, // NOVO: usar visibility
          approval_status: approvalStatus,
          approval_requested_at: approvalRequestedAt,
          approved_at: approvedAt,
          approved_by: approvedBy,
          created_in_project_id: item.created_in_project_id || null,
          // Campos opcionais para posts
          ...(item.category ? { category: item.category } : {}),
          ...(item.file_url ? { file_url: item.file_url } : {}),
          ...(item.youtube_url ? { youtube_url: item.youtube_url } : {}),
          ...(item.video_id ? { video_id: item.video_id } : {}),
          ...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
          created_at: now,
          updated_at: now
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

  static async bulkDeleteByUser(ids: string[], userId: string): Promise<ModelResult<{ deletedCount: number }>> {
    try {
      // Buscar apenas os cards que pertencem ao usuário
      const { data: ownedCards } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('id')
          .in('id', ids)
          .eq('created_by', userId)
      )

      const ownedIds = ownedCards?.map((c: any) => c.id) || []

      if (ownedIds.length === 0) {
        return {
          success: true,
          data: { deletedCount: 0 },
          statusCode: 200
        }
      }

      // Deletar apenas os cards próprios
      const { count } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .delete({ count: 'exact' })
          .in('id', ownedIds)
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

  // ================================================
  // SHARING (compartilhamento de cards privados)
  // ================================================

  /**
   * Compartilha um card privado com múltiplos usuários
   * Inspirado em ProjectModel.addMember
   */
  static async shareWithUsers(
    cardId: string, 
    userIds: string[], 
    ownerId: string
  ): Promise<ModelResult<any>> {
    try {
      // 1. Verificar se o card existe e é privado
      const { data: card, error: cardError } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('id, visibility, created_by')
          .eq('id', cardId)
          .single()
      )

      if (cardError || !card) {
        return {
          success: false,
          error: 'Card não encontrado',
          statusCode: 404
        }
      }

      // 2. Verificar permissão (apenas o criador pode compartilhar)
      if (card.created_by !== ownerId) {
        return {
          success: false,
          error: 'Apenas o criador do card pode compartilhá-lo',
          statusCode: 403
        }
      }

      // 3. Verificar se é privado
      if (card.visibility !== 'private') {
        return {
          success: false,
          error: 'Apenas cards privados podem ser compartilhados',
          statusCode: 400
        }
      }

      // 4. Verificar se os usuários existem
      const { data: users, error: usersError } = await executeQuery(
        supabaseAdmin
          .from('users')
          .select('id')
          .in('id', userIds)
      )

      if (usersError || !users || users.length !== userIds.length) {
        return {
          success: false,
          error: 'Um ou mais usuários não encontrados',
          statusCode: 404
        }
      }

      // 5. Inserir compartilhamentos (ignora duplicatas)
      const shares = userIds.map(userId => ({
        id: randomUUID(),
        card_feature_id: cardId,
        shared_with_user_id: userId,
        created_at: new Date().toISOString()
      }))

      const { data: insertedShares, error: insertError } = await executeQuery(
        supabaseAdmin
          .from('card_shares')
          .upsert(shares, {
            onConflict: 'card_feature_id,shared_with_user_id',
            ignoreDuplicates: true
          })
          .select('id')
      )

      if (insertError) {
        console.error('Erro ao inserir card_shares:', insertError)
        return {
          success: false,
          error: 'Erro ao compartilhar card',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: { sharedWith: insertedShares?.length ?? 0 },
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Erro no CardFeatureModel.shareWithUsers:', error)
      return {
        success: false,
        error: 'Erro ao compartilhar card',
        statusCode: 500
      }
    }
  }

  /**
   * Remove compartilhamento de um card com um usuário
   * Inspirado em ProjectModel.removeMember
   */
  static async unshareWithUser(
    cardId: string,
    userId: string,
    ownerId: string
  ): Promise<ModelResult<null>> {
    try {
      // 1. Verificar se o card existe e pertence ao owner
      const { data: card, error: cardError } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('id, created_by')
          .eq('id', cardId)
          .single()
      )

      if (cardError || !card) {
        return {
          success: false,
          error: 'Card não encontrado',
          statusCode: 404
        }
      }

      if (card.created_by !== ownerId) {
        return {
          success: false,
          error: 'Apenas o criador do card pode remover compartilhamentos',
          statusCode: 403
        }
      }

      // 2. Remover compartilhamento
      const { error: deleteError } = await executeQuery(
        supabaseAdmin
          .from('card_shares')
          .delete()
          .eq('card_feature_id', cardId)
          .eq('shared_with_user_id', userId)
      )

      if (deleteError) {
        console.error('Erro ao deletar card_share:', deleteError)
        return {
          success: false,
          error: 'Erro ao remover compartilhamento',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: null,
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Erro no CardFeatureModel.unshareWithUser:', error)
      return {
        success: false,
        error: 'Erro ao remover compartilhamento',
        statusCode: 500
      }
    }
  }

  /**
   * Lista todos os usuários com quem o card está compartilhado
   */
  static async getSharedUsers(cardId: string, ownerId: string): Promise<ModelResult<any[]>> {
    try {
      // 1. Verificar se o card existe e pertence ao owner
      const { data: card, error: cardError } = await executeQuery(
        supabaseAdmin
          .from('card_features')
          .select('id, created_by')
          .eq('id', cardId)
          .single()
      )

      if (cardError || !card) {
        return {
          success: false,
          error: 'Card não encontrado',
          statusCode: 404
        }
      }

      if (card.created_by !== ownerId) {
        return {
          success: false,
          error: 'Apenas o criador pode ver os compartilhamentos',
          statusCode: 403
        }
      }

      // 2. Buscar usuários compartilhados (JOIN com users)
      const { data: shares, error: sharesError } = await executeQuery(
        supabaseAdmin
          .from('card_shares')
          .select(`
            id,
            created_at,
            users:shared_with_user_id (
              id,
              email,
              name,
              avatar_url
            )
          `)
          .eq('card_feature_id', cardId)
      )

      if (sharesError) {
        console.error('Erro ao buscar card_shares:', sharesError)
        return {
          success: false,
          error: 'Erro ao buscar compartilhamentos',
          statusCode: 500
        }
      }

      // 3. Transformar resposta (filtra shares sem usuário válido)
      const users: Array<{ id: string; email: string | null; name: string | null; avatarUrl: string | null }> = []
      
      if (shares) {
        for (const share of shares) {
          if (share.users && share.users.id) {
            users.push({
              id: share.users.id,
              email: share.users.email ?? null,
              name: share.users.name ?? null,
              avatarUrl: share.users.avatar_url ?? null
            })
          }
        }
      }

      return {
        success: true,
        data: users,
        statusCode: 200
      }
    } catch (error: any) {
      console.error('Erro no CardFeatureModel.getSharedUsers:', error)
      return {
        success: false,
        error: 'Erro ao buscar compartilhamentos',
        statusCode: 500
      }
    }
  }
}
