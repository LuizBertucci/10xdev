import { supabaseAdminTyped, isDevMode } from '../database/supabase'

export interface Lesson {
  id: string
  title: string
  description: string
  video_url: string
  thumbnail_url?: string | null
  duration: number // em segundos
  order_index: number
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  is_free: boolean
  content?: string | null // conteúdo adicional em markdown
  created_at: string
  updated_at: string
  created_by: string // user_id do admin que criou
}

export interface CreateLessonData {
  title: string
  description: string
  video_url: string
  thumbnail_url?: string
  duration: number
  order_index: number
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  is_free: boolean
  content?: string
  created_by: string
}

export interface UpdateLessonData {
  title?: string
  description?: string
  video_url?: string
  thumbnail_url?: string
  duration?: number
  order_index?: number
  category?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  is_free?: boolean
  content?: string
}

export interface LessonFilters {
  category?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  is_free?: boolean
  tags?: string[]
  search?: string
  limit?: number
  offset?: number
}

class LessonModel {
  constructor() {
    if (isDevMode) {
      console.log('📚 [LessonModel] Executando em modo desenvolvimento - usando dados mock')
    }
  }

  /**
   * CRIAR NOVA AULA
   */
  async createLesson(lessonData: CreateLessonData): Promise<Lesson | null> {
    try {
      const lessonToCreate = {
        ...lessonData,
        thumbnail_url: lessonData.thumbnail_url || null,
        content: lessonData.content || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (isDevMode) {
        // Simular criação em desenvolvimento
        const mockLesson: Lesson = {
          id: Date.now().toString(),
          ...lessonToCreate,
          tags: lessonData.tags || []
        }
        console.log(`📚 [LessonModel] Aula criada (DEV): ${mockLesson.title}`)
        return mockLesson
      }

      const { data, error } = await supabaseAdminTyped
        .from('lessons')
        .insert(lessonToCreate)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar aula:', error)
        return null
      }

      console.log(`✅ [LessonModel] Aula criada: ${data.title}`)
      return {
        ...data,
        thumbnail_url: data.thumbnail_url || null,
        content: data.content || null
      } as Lesson

    } catch (error: any) {
      console.error('Erro ao criar aula:', error.message)
      throw error
    }
  }

  /**
   * BUSCAR AULA POR ID
   */
  async findById(id: string): Promise<Lesson | null> {
    try {
      if (isDevMode) {
        // Mock em desenvolvimento
        return this.getMockLessons().find(lesson => lesson.id === id) || null
      }

      const { data, error } = await supabaseAdminTyped
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      return {
        ...data,
        thumbnail_url: data.thumbnail_url || null,
        content: data.content || null
      } as Lesson

    } catch (error: any) {
      console.error('Erro ao buscar aula por ID:', error.message)
      return null
    }
  }

  /**
   * BUSCAR AULAS COM FILTROS
   */
  async findLessons(filters: LessonFilters = {}): Promise<{ lessons: Lesson[], total: number }> {
    try {
      if (isDevMode) {
        // Mock em desenvolvimento
        let mockLessons = this.getMockLessons()

        // Aplicar filtros
        if (filters.category) {
          mockLessons = mockLessons.filter(lesson => 
            lesson.category.toLowerCase().includes(filters.category!.toLowerCase())
          )
        }

        if (filters.difficulty) {
          mockLessons = mockLessons.filter(lesson => lesson.difficulty === filters.difficulty)
        }

        if (filters.is_free !== undefined) {
          mockLessons = mockLessons.filter(lesson => lesson.is_free === filters.is_free)
        }

        if (filters.search) {
          const search = filters.search.toLowerCase()
          mockLessons = mockLessons.filter(lesson => 
            lesson.title.toLowerCase().includes(search) ||
            lesson.description.toLowerCase().includes(search) ||
            lesson.tags.some(tag => tag.toLowerCase().includes(search))
          )
        }

        // Ordenar por order_index
        mockLessons.sort((a, b) => a.order_index - b.order_index)

        // Aplicar paginação
        const offset = filters.offset || 0
        const limit = filters.limit || mockLessons.length
        const paginatedLessons = mockLessons.slice(offset, offset + limit)

        return {
          lessons: paginatedLessons,
          total: mockLessons.length
        }
      }

      let query = supabaseAdminTyped
        .from('lessons')
        .select('*', { count: 'exact' })

      // Aplicar filtros
      if (filters.category) {
        query = query.ilike('category', `%${filters.category}%`)
      }

      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty)
      }

      if (filters.is_free !== undefined) {
        query = query.eq('is_free', filters.is_free)
      }

      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }

      // Ordenação e paginação
      query = query.order('order_index', { ascending: true })

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Erro ao buscar aulas:', error)
        return { lessons: [], total: 0 }
      }

      const lessons = (data || []).map(lesson => ({
        ...lesson,
        thumbnail_url: lesson.thumbnail_url || null,
        content: lesson.content || null
      })) as Lesson[]

      return {
        lessons,
        total: count || 0
      }

    } catch (error: any) {
      console.error('Erro ao buscar aulas:', error.message)
      return { lessons: [], total: 0 }
    }
  }

  /**
   * ATUALIZAR AULA
   */
  async updateLesson(id: string, updateData: UpdateLessonData): Promise<Lesson | null> {
    try {
      if (isDevMode) {
        console.log(`📚 [LessonModel] Aula atualizada (DEV): ${id}`)
        const mockLesson = this.getMockLessons().find(lesson => lesson.id === id)
        if (!mockLesson) return null

        return {
          ...mockLesson,
          ...updateData,
          updated_at: new Date().toISOString()
        }
      }

      const { data, error } = await supabaseAdminTyped
        .from('lessons')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        console.error('Erro ao atualizar aula:', error)
        return null
      }

      console.log(`✅ [LessonModel] Aula atualizada: ${data.title}`)
      return {
        ...data,
        thumbnail_url: data.thumbnail_url || null,
        content: data.content || null
      } as Lesson

    } catch (error: any) {
      console.error('Erro ao atualizar aula:', error.message)
      throw error
    }
  }

  /**
   * DELETAR AULA
   */
  async deleteLesson(id: string): Promise<boolean> {
    try {
      if (isDevMode) {
        console.log(`📚 [LessonModel] Aula deletada (DEV): ${id}`)
        return true
      }

      const { error } = await supabaseAdminTyped
        .from('lessons')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao deletar aula:', error)
        return false
      }

      console.log(`✅ [LessonModel] Aula deletada: ${id}`)
      return true

    } catch (error: any) {
      console.error('Erro ao deletar aula:', error.message)
      return false
    }
  }

  /**
   * OBTER CATEGORIAS DISPONÍVEIS
   */
  async getCategories(): Promise<string[]> {
    try {
      if (isDevMode) {
        return ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'CSS', 'HTML']
      }

      const { data, error } = await supabaseAdminTyped
        .from('lessons')
        .select('category')

      if (error) {
        console.error('Erro ao buscar categorias:', error)
        return []
      }

      const categories = [...new Set(data.map(item => item.category))]
      return categories

    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error.message)
      return []
    }
  }

  /**
   * DADOS MOCK PARA DESENVOLVIMENTO
   */
  private getMockLessons(): Lesson[] {
    return [
      {
        id: '1',
        title: 'Introdução ao React',
        description: 'Aprenda os conceitos básicos do React, incluindo componentes, props e state.',
        video_url: 'https://youtube.com/watch?v=exemplo1',
        thumbnail_url: 'https://img.youtube.com/vi/exemplo1/maxresdefault.jpg',
        duration: 1800, // 30 minutos
        order_index: 1,
        category: 'React',
        difficulty: 'beginner',
        tags: ['react', 'javascript', 'frontend', 'iniciante'],
        is_free: true,
        content: '# Introdução ao React\n\nNesta aula você aprenderá...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: '1'
      },
      {
        id: '2',
        title: 'React Hooks Avançados',
        description: 'Domine os hooks customizados e avançados do React para criar aplicações mais eficientes.',
        video_url: 'https://youtube.com/watch?v=exemplo2',
        thumbnail_url: 'https://img.youtube.com/vi/exemplo2/maxresdefault.jpg',
        duration: 2400, // 40 minutos
        order_index: 2,
        category: 'React',
        difficulty: 'advanced',
        tags: ['react', 'hooks', 'avançado', 'performance'],
        is_free: false,
        content: '# React Hooks Avançados\n\nAprofunde seus conhecimentos...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: '1'
      },
      {
        id: '3',
        title: 'TypeScript na Prática',
        description: 'Aprenda TypeScript aplicado a projetos reais com exemplos práticos.',
        video_url: 'https://youtube.com/watch?v=exemplo3',
        thumbnail_url: 'https://img.youtube.com/vi/exemplo3/maxresdefault.jpg',
        duration: 3000, // 50 minutos
        order_index: 3,
        category: 'TypeScript',
        difficulty: 'intermediate',
        tags: ['typescript', 'javascript', 'tipos', 'desenvolvimento'],
        is_free: true,
        content: '# TypeScript na Prática\n\nVamos ver como aplicar...',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: '1'
      }
    ]
  }
}

export default new LessonModel()