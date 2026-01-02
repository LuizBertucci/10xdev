import { supabase, supabaseAdmin, executeQuery } from '@/database/supabase'
import { randomUUID } from 'crypto'
import {
  ProjectMemberRole
} from '@/types/project'
import type {
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  ProjectResponse,
  ProjectQueryParams,
  ModelResult,
  ModelListResult,
  CreateProjectRequest,
  ProjectMemberRow,
  ProjectMemberInsert,
  ProjectMemberUpdate,
  ProjectMemberResponse,
  ProjectCardRow,
  ProjectCardInsert,
  ProjectCardResponse,
  AddProjectMemberRequest
} from '@/types/project'

export class ProjectModel {
  // ================================================
  // PRIVATE HELPERS
  // ================================================

  private static transformToResponse(row: ProjectRow): ProjectResponse {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ...(typeof (row as any).repository_url !== 'undefined' ? { repositoryUrl: (row as any).repository_url } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    }
  }

  private static transformMemberToResponse(row: ProjectMemberRow): ProjectMemberResponse {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private static transformCardToResponse(row: ProjectCardRow): ProjectCardResponse {
    const response: ProjectCardResponse = {
      id: row.id,
      projectId: row.project_id,
      cardFeatureId: row.card_feature_id,
      addedBy: row.added_by,
      createdAt: row.created_at
    }
    
    if (row.order !== undefined && row.order !== null) {
      response.order = row.order
    }
    
    return response
  }

  private static async buildQuery(params: ProjectQueryParams = {}, userId?: string) {
    // IMPORTANTE: Usar supabaseAdmin para evitar recursão infinita nas policies de RLS.
    // As policies de RLS verificam project_members para determinar acesso, o que causa
    // recursão quando usamos o cliente público. O backend já valida autenticação
    // e permissões via middleware antes de executar operações.
    let projectIds: string[] = []
    if (userId) {
      const { data: members } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .select('project_id')
          .eq('user_id', userId)
      )
      projectIds = members?.map((m: any) => m.project_id).filter((id: any): id is string => id != null) || []
      if (projectIds.length === 0) {
        return null // Retornar null se não há projetos
      }
    }

    let query = supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact' })

    // Filtrar apenas projetos onde o usuário é membro
    if (projectIds.length > 0) {
      query = query.in('id', projectIds)
    } else if (userId) {
      // Se userId fornecido mas não há projetos, retornar null
      return null
    }

    // Busca
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`)
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

  static async create(data: CreateProjectRequest, userId: string): Promise<ModelResult<ProjectResponse>> {
    try {
      const insertData: ProjectInsert = {
        id: randomUUID(),
        name: data.name,
        description: data.description || null,
        ...(data.repositoryUrl ? { repository_url: data.repositoryUrl } : {}),
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('projects')
          .insert(insertData)
          .select()
          .single()
      )

      // Add creator as OWNER member (if not already added by trigger)
      try {
        await executeQuery(
          supabaseAdmin
            .from('project_members')
            .insert({
              id: randomUUID(),
              project_id: insertData.id,
              user_id: userId,
              role: ProjectMemberRole.OWNER,
              created_at: insertData.created_at,
              updated_at: insertData.updated_at
            })
        )
      } catch (memberError: any) {
        // If member already exists (e.g., from trigger), that's okay
        if (memberError.code !== '23505') {
          // Re-throw if it's a different error
          throw memberError
        }
        // Otherwise, silently continue - member was already added
      }

      return {
        success: true,
        data: this.transformToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      console.error('Erro ao criar projeto:', error)
      const errorMessage = error?.message || error?.error?.message || 'Erro interno do servidor'
      const statusCode = error?.statusCode || error?.code === '42P17' ? 500 : 500
      
      return {
        success: false,
        error: errorMessage,
        statusCode
      }
    }
  }

  // ================================================
  // READ
  // ================================================

  static async findById(id: string, userId?: string): Promise<ModelResult<ProjectResponse>> {
    try {
      // IMPORTANTE: Usar supabaseAdmin para evitar recursão infinita nas policies de RLS.
      // A policy "Users can view projects they are members of" verifica project_members,
      // causando recursão quando usamos o cliente público. O backend já valida autenticação.
      let query = supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      // Verificar se o usuário é membro do projeto
      if (userId) {
        const { data: member } = await executeQuery(
          supabaseAdmin
            .from('project_members')
            .select('role')
            .eq('project_id', id)
            .eq('user_id', userId)
            .single()
        )

        if (!member) {
          return {
            success: false,
            error: 'Projeto não encontrado ou você não tem permissão',
            statusCode: 404
          }
        }
      }

      const { data } = await executeQuery(query)

      if (!data) {
        return {
          success: false,
          error: 'Projeto não encontrado',
          statusCode: 404
        }
      }

      // Buscar informações adicionais
      const memberCount = await this.getMemberCount(id)
      const cardCount = await this.getCardCount(id)
      const userRole = userId ? await this.getUserRole(id, userId) : undefined

      const response = this.transformToResponse(data)
      response.memberCount = memberCount
      response.cardCount = cardCount
      if (userRole) {
        response.userRole = userRole
      }

      return {
        success: true,
        data: response,
        statusCode: 200
      }
    } catch (error: any) {
      // PostgREST/Supabase: PGRST116 = single() requested but 0 (or many) rows returned
      // In our case for findById, treat as "not found" instead of surfacing the raw message.
      if (error?.code === 'PGRST116' || error?.statusCode === 404) {
        return {
          success: false,
          error: 'Projeto não encontrado',
          statusCode: 404
        }
      }
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async findAll(params: ProjectQueryParams = {}, userId?: string): Promise<ModelListResult<ProjectResponse>> {
    try {
      const query = await this.buildQuery(params, userId)
      
      if (!query) {
        return {
          success: true,
          data: [],
          count: 0,
          statusCode: 200
        }
      }

      const { data, count } = await executeQuery(query)

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
          statusCode: 200
        }
      }

      // Buscar informações adicionais para cada projeto
      const projectsWithDetails = await Promise.all(
        data.map(async (row: ProjectRow) => {
          const project = this.transformToResponse(row)
          project.memberCount = await this.getMemberCount(row.id)
          project.cardCount = await this.getCardCount(row.id)
          if (userId) {
            const role = await this.getUserRole(row.id, userId)
            if (role) {
              project.userRole = role
            }
          }
          return project
        })
      )

      return {
        success: true,
        data: projectsWithDetails,
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

  // ================================================
  // UPDATE
  // ================================================

  static async update(id: string, data: Partial<CreateProjectRequest>, userId: string): Promise<ModelResult<ProjectResponse>> {
    try {
      // Verificar permissão (owner ou admin)
      const role = await this.getUserRole(id, userId)
      if (!role || (role !== ProjectMemberRole.OWNER && role !== ProjectMemberRole.ADMIN)) {
        return {
          success: false,
          error: 'Você não tem permissão para atualizar este projeto',
          statusCode: 403
        }
      }

      const updateData: ProjectUpdate = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('projects')
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

  static async delete(id: string, userId: string): Promise<ModelResult<null>> {
    try {
      // Verificar se é owner
      const role = await this.getUserRole(id, userId)
      if (role !== ProjectMemberRole.OWNER) {
        return {
          success: false,
          error: 'Apenas o owner pode deletar o projeto',
          statusCode: 403
        }
      }

      await executeQuery(
        supabaseAdmin
          .from('projects')
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
  // MEMBERS MANAGEMENT
  // ================================================

  static async getMembers(projectId: string): Promise<ModelListResult<ProjectMemberResponse>> {
    try {
      // IMPORTANTE: Usar supabaseAdmin para evitar recursão infinita nas policies de RLS.
      // A policy "Users can view members of their projects" verifica project_members,
      // causando recursão quando usamos o cliente público. O backend já valida permissões.
      // Buscar membros do projeto
      const { data: membersData, count } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .select('*', { count: 'exact' })
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })
      )

      if (!membersData || membersData.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
          statusCode: 200
        }
      }

      // Buscar informações dos usuários separadamente usando Supabase Auth
      const membersWithUsers = await Promise.all(
        membersData.map(async (row: any) => {
          const member = this.transformMemberToResponse(row)
          
          // Buscar dados do usuário do Supabase Auth
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.user_id)
            if (authUser?.user) {
              member.user = {
                id: authUser.user.id,
                email: authUser.user.email || '',
                name: authUser.user.user_metadata?.name || 
                      authUser.user.user_metadata?.full_name || 
                      null,
                avatarUrl: authUser.user.user_metadata?.avatar_url || null
              }
            }
          } catch (authError) {
            console.error(`Erro ao buscar usuário ${row.user_id}:`, authError)
            // Continuar sem dados do usuário
            member.user = {
              id: row.user_id,
              email: '',
              name: null,
              avatarUrl: null
            }
          }

          return member
        })
      )

      return {
        success: true,
        data: membersWithUsers,
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

  static async addMember(projectId: string, memberData: AddProjectMemberRequest, userId: string): Promise<ModelResult<ProjectMemberResponse>> {
    try {
      // Verificar permissão (owner ou admin)
      const role = await this.getUserRole(projectId, userId)
      if (!role || (role !== ProjectMemberRole.OWNER && role !== ProjectMemberRole.ADMIN)) {
        return {
          success: false,
          error: 'Você não tem permissão para adicionar membros',
          statusCode: 403
        }
      }

      const insertData: ProjectMemberInsert = {
        id: randomUUID(),
        project_id: projectId,
        user_id: memberData.userId,
        role: memberData.role || ProjectMemberRole.MEMBER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .insert(insertData)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformMemberToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Usuário já é membro deste projeto',
          statusCode: 409
        }
      }
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async updateMember(projectId: string, memberUserId: string, role: ProjectMemberRole, userId: string): Promise<ModelResult<ProjectMemberResponse>> {
    try {
      // Verificar permissão (owner ou admin)
      const userRole = await this.getUserRole(projectId, userId)
      if (!userRole || (userRole !== ProjectMemberRole.OWNER && userRole !== ProjectMemberRole.ADMIN)) {
        return {
          success: false,
          error: 'Você não tem permissão para atualizar membros',
          statusCode: 403
        }
      }

      // Não permitir alterar role do owner
      const memberRole = await this.getUserRole(projectId, memberUserId)
      if (memberRole === ProjectMemberRole.OWNER) {
        return {
          success: false,
          error: 'Não é possível alterar o role do owner',
          statusCode: 400
        }
      }

      const updateData: ProjectMemberUpdate = {
        role,
        updated_at: new Date().toISOString()
      }

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .update(updateData)
          .eq('project_id', projectId)
          .eq('user_id', memberUserId)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformMemberToResponse(result),
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

  static async removeMember(projectId: string, memberUserId: string, userId: string): Promise<ModelResult<null>> {
    try {
      // Verificar permissão (owner ou admin)
      const userRole = await this.getUserRole(projectId, userId)
      if (!userRole || (userRole !== ProjectMemberRole.OWNER && userRole !== ProjectMemberRole.ADMIN)) {
        return {
          success: false,
          error: 'Você não tem permissão para remover membros',
          statusCode: 403
        }
      }

      // Não permitir remover owner
      const memberRole = await this.getUserRole(projectId, memberUserId)
      if (memberRole === ProjectMemberRole.OWNER) {
        return {
          success: false,
          error: 'Não é possível remover o owner do projeto',
          statusCode: 400
        }
      }

      await executeQuery(
        supabaseAdmin
          .from('project_members')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', memberUserId)
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
  // CARDS MANAGEMENT
  // ================================================

  static async getCards(projectId: string): Promise<ModelListResult<ProjectCardResponse>> {
    try {
      // IMPORTANTE: Usar supabaseAdmin para evitar recursão infinita nas policies de RLS.
      // A policy "Members can view project cards" verifica project_members, causando
      // recursão quando usamos o cliente público. O backend já valida permissões antes.
      const { data, count } = await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .select(`
            *,
            card_feature:card_features!project_cards_card_feature_id_fkey (
              id,
              title,
              tech,
              language,
              description
            )
          `)
          .eq('project_id', projectId)
          .order('order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
      )

      if (!data) {
        return {
          success: true,
          data: [],
          count: 0,
          statusCode: 200
        }
      }

      const cards = data.map((row: any) => {
        const card = this.transformCardToResponse(row)
        if (row.card_feature) {
          card.cardFeature = {
            id: row.card_feature.id,
            title: row.card_feature.title,
            tech: row.card_feature.tech,
            language: row.card_feature.language,
            description: row.card_feature.description
          }
        }
        return card
      })

      return {
        success: true,
        data: cards,
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

  static async addCard(projectId: string, cardFeatureId: string, userId: string): Promise<ModelResult<ProjectCardResponse>> {
    try {
      // Verificar se o usuário é membro do projeto
      const role = await this.getUserRole(projectId, userId)
      if (!role) {
        return {
          success: false,
          error: 'Você não é membro deste projeto',
          statusCode: 403
        }
      }

      // Buscar o maior order atual para definir o novo order
      const { data: existingCards } = await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .select('order')
          .eq('project_id', projectId)
          .order('order', { ascending: false, nullsFirst: false })
          .limit(1)
      )

      const maxOrder = existingCards && existingCards.length > 0 && existingCards[0].order !== null 
        ? existingCards[0].order 
        : -1
      const newOrder = maxOrder + 1

      const insertData: ProjectCardInsert = {
        id: randomUUID(),
        project_id: projectId,
        card_feature_id: cardFeatureId,
        added_by: userId,
        created_at: new Date().toISOString(),
        order: newOrder
      }

      const { data: result } = await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .insert(insertData)
          .select()
          .single()
      )

      return {
        success: true,
        data: this.transformCardToResponse(result),
        statusCode: 201
      }
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Card já está associado a este projeto',
          statusCode: 409
        }
      }
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async addCardsBulk(
    projectId: string,
    cardFeatureIds: string[],
    userId: string
  ): Promise<ModelResult<{ insertedCount: number }>> {
    try {
      if (!Array.isArray(cardFeatureIds) || cardFeatureIds.length === 0) {
        return { success: true, data: { insertedCount: 0 }, statusCode: 200 }
      }

      // Verificar se o usuário é membro do projeto
      const role = await this.getUserRole(projectId, userId)
      if (!role) {
        return {
          success: false,
          error: 'Você não é membro deste projeto',
          statusCode: 403
        }
      }

      // Buscar o maior order atual para definir o range de orders
      const { data: existingCards } = await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .select('order')
          .eq('project_id', projectId)
          .order('order', { ascending: false, nullsFirst: false })
          .limit(1)
      )

      const maxOrder =
        existingCards && existingCards.length > 0 && existingCards[0].order !== null
          ? existingCards[0].order
          : -1

      const now = new Date().toISOString()
      const insertData: ProjectCardInsert[] = cardFeatureIds.map((cardFeatureId, idx) => ({
        id: randomUUID(),
        project_id: projectId,
        card_feature_id: cardFeatureId,
        added_by: userId,
        created_at: now,
        order: maxOrder + 1 + idx
      }))

      await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .insert(insertData)
      )

      return {
        success: true,
        data: { insertedCount: insertData.length },
        statusCode: 201
      }
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Um ou mais cards já estão associados a este projeto',
          statusCode: 409
        }
      }
      return {
        success: false,
        error: error.message || 'Erro interno do servidor',
        statusCode: error.statusCode || 500
      }
    }
  }

  static async removeCard(projectId: string, cardFeatureId: string, userId: string): Promise<ModelResult<null>> {
    try {
      // Verificar se o usuário é membro do projeto
      const role = await this.getUserRole(projectId, userId)
      if (!role) {
        return {
          success: false,
          error: 'Você não é membro deste projeto',
          statusCode: 403
        }
      }

      await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .delete()
          .eq('project_id', projectId)
          .eq('card_feature_id', cardFeatureId)
      )

      // Reordenar os cards restantes para manter ordem sequencial
      const { data: remainingCards } = await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .select('id, order')
          .eq('project_id', projectId)
          .order('order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
      )

      if (remainingCards && remainingCards.length > 0) {
        const updatePromises = remainingCards.map((card: any, index: number) =>
          executeQuery(
            supabaseAdmin
              .from('project_cards')
              .update({ order: index })
              .eq('id', card.id)
          )
        )
        await Promise.all(updatePromises)
      }

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

  static async reorderCard(projectId: string, cardFeatureId: string, direction: 'up' | 'down', userId: string): Promise<ModelResult<null>> {
    try {
      // Verificar se o usuário é membro do projeto
      const role = await this.getUserRole(projectId, userId)
      if (!role) {
        return {
          success: false,
          error: 'Você não é membro deste projeto',
          statusCode: 403
        }
      }

      // Buscar todos os cards do projeto ordenados
      const { data: allCards } = await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .select('id, card_feature_id, order')
          .eq('project_id', projectId)
          .order('order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
      )

      if (!allCards || allCards.length < 2) {
        return {
          success: false,
          error: 'Não é possível reordenar com menos de 2 cards',
          statusCode: 400
        }
      }

      // Encontrar o índice do card atual
      const currentIndex = allCards.findIndex((c: any) => c.card_feature_id === cardFeatureId)
      if (currentIndex === -1) {
        return {
          success: false,
          error: 'Card não encontrado no projeto',
          statusCode: 404
        }
      }

      // Calcular novo índice
      let newIndex: number
      if (direction === 'up') {
        if (currentIndex === 0) {
          return {
            success: false,
            error: 'Card já está na primeira posição',
            statusCode: 400
          }
        }
        newIndex = currentIndex - 1
      } else {
        if (currentIndex === allCards.length - 1) {
          return {
            success: false,
            error: 'Card já está na última posição',
            statusCode: 400
          }
        }
        newIndex = currentIndex + 1
      }

      // Trocar as ordens
      const currentCard = allCards[currentIndex]
      const targetCard = allCards[newIndex]

      // Atualizar ambos os cards
      await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .update({ order: targetCard.order })
          .eq('id', currentCard.id)
      )

      await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .update({ order: currentCard.order })
          .eq('id', targetCard.id)
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
  // HELPER METHODS
  // ================================================

  private static async getMemberCount(projectId: string): Promise<number> {
    try {
      const { count } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
      )
      return count || 0
    } catch {
      return 0
    }
  }

  private static async getCardCount(projectId: string): Promise<number> {
    try {
      const { count } = await executeQuery(
        supabaseAdmin
          .from('project_cards')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
      )
      return count || 0
    } catch {
      return 0
    }
  }

  private static async getUserRole(projectId: string, userId: string): Promise<ProjectMemberRole | undefined> {
    try {
      const { data } = await executeQuery(
        supabaseAdmin
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single()
      )
      return data?.role as ProjectMemberRole | undefined
    } catch {
      return undefined
    }
  }
}

