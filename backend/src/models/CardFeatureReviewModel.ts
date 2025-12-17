import { supabaseAdmin, executeQuery } from '@/database/supabase'
import type {
  CardFeatureReviewRow,
  CardFeatureReviewInsert,
  CardFeatureReviewResponse,
  ReviewStats,
  ModelResult,
  ModelListResult,
  ModelReviewResult
} from '@/types/cardfeature'

export class CardFeatureReviewModel {
  // ================================================
  // PRIVATE HELPERS
  // ================================================

  private static transformToResponse(row: any, userData?: any): CardFeatureReviewResponse {
    return {
      id: row.id,
      cardFeatureId: row.card_feature_id,
      userId: row.user_id,
      rating: row.rating,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userName: userData?.name || null
    }
  }

  // ================================================
  // CREATE / UPDATE (UPSERT)
  // ================================================

  static async createOrUpdate(
    cardFeatureId: string,
    userId: string,
    rating: number
  ): Promise<ModelReviewResult<CardFeatureReviewResponse>> {
    try {
      // Validar rating
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return {
          success: false,
          error: 'Rating deve ser um número inteiro entre 1 e 5',
          statusCode: 400
        }
      }

      // Verificar se já existe review do usuário para este card
      const existingReview = await this.getUserReview(cardFeatureId, userId)
      
      if (existingReview.success && existingReview.data) {
        // Atualizar review existente
        const { data: updated } = await executeQuery(
          supabaseAdmin
            .from('card_feature_reviews')
            .update({
              rating,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingReview.data.id)
            .select()
            .single()
        )

        // Buscar dados do usuário
        let userData = null
        if (updated.user_id) {
          const { data: user } = await executeQuery(
            supabaseAdmin
              .from('users')
              .select('id, name, email')
              .eq('id', updated.user_id)
              .single()
          )
          userData = user
        }

        return {
          success: true,
          data: this.transformToResponse(updated, userData),
          statusCode: 200
        }
      } else {
        // Criar novo review
        const insertData: CardFeatureReviewInsert = {
          card_feature_id: cardFeatureId,
          user_id: userId,
          rating
        }

        const { data: created } = await executeQuery(
          supabaseAdmin
            .from('card_feature_reviews')
            .insert(insertData)
            .select()
            .single()
        )

        // Buscar dados do usuário
        let userData = null
        if (created.user_id) {
          const { data: user } = await executeQuery(
            supabaseAdmin
              .from('users')
              .select('id, name, email')
              .eq('id', created.user_id)
              .single()
          )
          userData = user
        }

        return {
          success: true,
          data: this.transformToResponse(created, userData),
          statusCode: 201
        }
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

  static async delete(cardFeatureId: string, userId: string): Promise<ModelResult<null>> {
    try {
      await executeQuery(
        supabaseAdmin
          .from('card_feature_reviews')
          .delete()
          .eq('card_feature_id', cardFeatureId)
          .eq('user_id', userId)
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
  // READ
  // ================================================

  static async getByCardFeature(cardFeatureId: string): Promise<ModelListResult<CardFeatureReviewResponse>> {
    try {
      const { data: reviews, error } = await executeQuery(
        supabaseAdmin
          .from('card_feature_reviews')
          .select('*')
          .eq('card_feature_id', cardFeatureId)
          .order('created_at', { ascending: false })
      )

      if (error) {
        throw error
      }

      // Buscar dados dos usuários
      const userIds = [...new Set((reviews || []).map((r: any) => r.user_id))]
      const userMap = new Map()

      if (userIds.length > 0) {
        const { data: users } = await executeQuery(
          supabaseAdmin
            .from('users')
            .select('id, name, email')
            .in('id', userIds)
        )

        if (users) {
          users.forEach((user: any) => {
            userMap.set(user.id, user)
          })
        }
      }

      const transformedReviews = (reviews || []).map((review: any) => {
        const userData = userMap.get(review.user_id) || null
        return this.transformToResponse(review, userData)
      })

      return {
        success: true,
        data: transformedReviews,
        count: transformedReviews.length,
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

  static async getUserReview(
    cardFeatureId: string,
    userId: string
  ): Promise<ModelReviewResult<CardFeatureReviewResponse>> {
    try {
      const { data: review, error } = await executeQuery(
        supabaseAdmin
          .from('card_feature_reviews')
          .select('*')
          .eq('card_feature_id', cardFeatureId)
          .eq('user_id', userId)
          .single()
      )

      if (error) {
        // Se não encontrou, retornar sucesso com data null
        if (error.code === 'PGRST116') {
          return {
            success: true,
            data: undefined,
            statusCode: 200
          }
        }
        throw error
      }

      // Buscar dados do usuário
      let userData = null
      if (review?.user_id) {
        const { data: user } = await executeQuery(
          supabaseAdmin
            .from('users')
            .select('id, name, email')
            .eq('id', review.user_id)
            .single()
        )
        userData = user
      }

      return {
        success: true,
        data: this.transformToResponse(review, userData),
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

  static async getStats(
    cardFeatureId: string,
    userId?: string
  ): Promise<ModelResult<ReviewStats>> {
    try {
      // Buscar todos os reviews do card
      const { data: reviews, error } = await executeQuery(
        supabaseAdmin
          .from('card_feature_reviews')
          .select('rating')
          .eq('card_feature_id', cardFeatureId)
      )

      if (error) {
        throw error
      }

      const reviewsList = reviews || []
      const totalReviews = reviewsList.length

      // Calcular média
      let averageRating = 0
      if (totalReviews > 0) {
        const sum = reviewsList.reduce((acc: number, review: any) => acc + review.rating, 0)
        averageRating = sum / totalReviews
      }

      // Calcular distribuição de ratings
      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: reviewsList.filter((r: any) => r.rating === rating).length
      }))

      // Buscar review do usuário atual se fornecido
      let userReview: CardFeatureReviewResponse | undefined = undefined
      if (userId) {
        const userReviewResult = await this.getUserReview(cardFeatureId, userId)
        if (userReviewResult.success && userReviewResult.data) {
          userReview = userReviewResult.data
        }
      }

      return {
        success: true,
        data: {
          averageRating: Math.round(averageRating * 10) / 10, // Arredondar para 1 casa decimal
          totalReviews,
          ratingDistribution,
          userReview
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
}
