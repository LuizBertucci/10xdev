import { Request, Response } from 'express'
import LessonModel, { CreateLessonData, UpdateLessonData, LessonFilters } from '../models/LessonModel'
import { AuthenticatedRequest } from '../middleware/auth'

/**
 * LESSON CONTROLLER - Sistema de Gerenciamento de Aulas
 * 
 * Funcionalidades:
 * - CRUD completo de aulas
 * - Filtros avançados (categoria, dificuldade, tags)
 * - Controle de permissões (admin/user)
 * - Paginação e busca
 */

class LessonController {
  constructor() {
    console.log('📚 [LessonController] Sistema de aulas iniciado')
  }

  /**
   * LISTAR AULAS
   * GET /api/lessons
   */
  async getLessons(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        difficulty,
        is_free,
        search,
        tags,
        limit = '20',
        offset = '0'
      } = req.query

      const filters: LessonFilters = {}
      
      if (category) filters.category = category as string
      if (difficulty) filters.difficulty = difficulty as 'beginner' | 'intermediate' | 'advanced'
      if (is_free !== undefined) filters.is_free = is_free === 'true'
      if (search) filters.search = search as string
      if (tags) filters.tags = (tags as string).split(',')
      filters.limit = parseInt(limit as string)
      filters.offset = parseInt(offset as string)

      const result = await LessonModel.findLessons(filters)

      res.json({
        success: true,
        data: {
          lessons: result.lessons,
          total: result.total,
          page: Math.floor(filters.offset! / filters.limit!) + 1,
          totalPages: Math.ceil(result.total / filters.limit!),
          hasNext: (filters.offset! + filters.limit!) < result.total,
          hasPrev: filters.offset! > 0
        }
      })

    } catch (error: any) {
      console.error('❌ [LessonController] Erro ao listar aulas:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * OBTER AULA POR ID
   * GET /api/lessons/:id
   */
  async getLessonById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID da aula é obrigatório',
          code: 'MISSING_LESSON_ID'
        })
        return
      }

      const lesson = await LessonModel.findById(id)

      if (!lesson) {
        res.status(404).json({
          success: false,
          error: 'Aula não encontrada',
          code: 'LESSON_NOT_FOUND'
        })
        return
      }

      res.json({
        success: true,
        data: { lesson }
      })

    } catch (error: any) {
      console.error('❌ [LessonController] Erro ao obter aula:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * CRIAR NOVA AULA (ADMIN ONLY)
   * POST /api/lessons
   */
  async createLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        video_url,
        thumbnail_url,
        duration,
        order_index,
        category,
        difficulty,
        tags,
        is_free,
        content
      } = req.body

      // Validação de entrada
      if (!title || !description || !video_url || !category || !difficulty) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: title, description, video_url, category, difficulty',
          code: 'MISSING_REQUIRED_FIELDS'
        })
        return
      }

      if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
        res.status(400).json({
          success: false,
          error: 'Dificuldade deve ser: beginner, intermediate ou advanced',
          code: 'INVALID_DIFFICULTY'
        })
        return
      }

      const lessonData: CreateLessonData = {
        title,
        description,
        video_url,
        thumbnail_url,
        duration: duration || 0,
        order_index: order_index || 0,
        category,
        difficulty,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        is_free: is_free === true || is_free === 'true',
        content,
        created_by: req.user!.id
      }

      const lesson = await LessonModel.createLesson(lessonData)

      if (!lesson) {
        res.status(500).json({
          success: false,
          error: 'Erro ao criar aula',
          code: 'LESSON_CREATION_FAILED'
        })
        return
      }

      console.log(`✅ [LessonController] Aula criada por ${req.user?.email}: ${lesson.title}`)

      res.status(201).json({
        success: true,
        message: 'Aula criada com sucesso',
        data: { lesson }
      })

    } catch (error: any) {
      console.error('❌ [LessonController] Erro ao criar aula:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * ATUALIZAR AULA (ADMIN ONLY)
   * PUT /api/lessons/:id
   */
  async updateLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const updateData: UpdateLessonData = req.body

      // Verificar se a aula existe
      const existingLesson = await LessonModel.findById(id!)
      if (!existingLesson) {
        res.status(404).json({
          success: false,
          error: 'Aula não encontrada',
          code: 'LESSON_NOT_FOUND'
        })
        return
      }

      // Validar difficulty se fornecida
      if (updateData.difficulty && !['beginner', 'intermediate', 'advanced'].includes(updateData.difficulty)) {
        res.status(400).json({
          success: false,
          error: 'Dificuldade deve ser: beginner, intermediate ou advanced',
          code: 'INVALID_DIFFICULTY'
        })
        return
      }

      // Converter tags para array se necessário
      if (updateData.tags && typeof updateData.tags === 'string') {
        updateData.tags = [updateData.tags]
      }

      const lesson = await LessonModel.updateLesson(id!, updateData)

      if (!lesson) {
        res.status(500).json({
          success: false,
          error: 'Erro ao atualizar aula',
          code: 'LESSON_UPDATE_FAILED'
        })
        return
      }

      console.log(`✅ [LessonController] Aula atualizada por ${req.user?.email}: ${lesson.title}`)

      res.json({
        success: true,
        message: 'Aula atualizada com sucesso',
        data: { lesson }
      })

    } catch (error: any) {
      console.error('❌ [LessonController] Erro ao atualizar aula:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * DELETAR AULA (ADMIN ONLY)
   * DELETE /api/lessons/:id
   */
  async deleteLesson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      // Verificar se a aula existe
      const existingLesson = await LessonModel.findById(id!)
      if (!existingLesson) {
        res.status(404).json({
          success: false,
          error: 'Aula não encontrada',
          code: 'LESSON_NOT_FOUND'
        })
        return
      }

      const success = await LessonModel.deleteLesson(id!)

      if (!success) {
        res.status(500).json({
          success: false,
          error: 'Erro ao deletar aula',
          code: 'LESSON_DELETE_FAILED'
        })
        return
      }

      console.log(`✅ [LessonController] Aula deletada por ${req.user?.email}: ${existingLesson.title}`)

      res.json({
        success: true,
        message: 'Aula deletada com sucesso'
      })

    } catch (error: any) {
      console.error('❌ [LessonController] Erro ao deletar aula:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * OBTER CATEGORIAS
   * GET /api/lessons/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await LessonModel.getCategories()

      res.json({
        success: true,
        data: { categories }
      })

    } catch (error: any) {
      console.error('❌ [LessonController] Erro ao obter categorias:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }

  /**
   * ESTATÍSTICAS DAS AULAS (ADMIN ONLY)
   * GET /api/lessons/stats
   */
  async getLessonStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        allLessons,
        freeLessons,
        premiumLessons
      ] = await Promise.all([
        LessonModel.findLessons({}),
        LessonModel.findLessons({ is_free: true }),
        LessonModel.findLessons({ is_free: false })
      ])

      // Estatísticas por dificuldade
      const difficultyStats = {
        beginner: 0,
        intermediate: 0,
        advanced: 0
      }

      // Estatísticas por categoria
      const categoryStats: Record<string, number> = {}

      allLessons.lessons.forEach(lesson => {
        difficultyStats[lesson.difficulty]++
        categoryStats[lesson.category] = (categoryStats[lesson.category] || 0) + 1
      })

      const totalDuration = allLessons.lessons.reduce((total, lesson) => total + lesson.duration, 0)

      res.json({
        success: true,
        data: {
          total: allLessons.total,
          free: freeLessons.total,
          premium: premiumLessons.total,
          totalDuration, // em segundos
          totalDurationFormatted: `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}min`,
          difficultyStats,
          categoryStats,
          categories: Object.keys(categoryStats)
        }
      })

    } catch (error: any) {
      console.error('❌ [LessonController] Erro ao obter estatísticas:', error.message)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_SERVER_ERROR'
      })
    }
  }
}

export default new LessonController()