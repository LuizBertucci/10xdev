import { Request, Response } from 'express'
import { AdminModel } from '@/models/AdminModel'
import type {
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  UserRole,
  UserStatus
} from '@/types/admin'

export class AdminController {

  // ================================================
  // USER MANAGEMENT
  // ================================================

  /**
   * Lista todos os usuários com suas estatísticas
   * GET /api/admin/users
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const result = await AdminModel.getAllUsers()

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.count
      })
    } catch (error) {
      console.error('Erro no controller listUsers:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  /**
   * Busca um usuário específico por ID
   * GET /api/admin/users/:id
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório'
        })
        return
      }

      const result = await AdminModel.getUserDetail(id)

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })
    } catch (error) {
      console.error('Erro no controller getUserById:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  /**
   * Atualiza o role de um usuário
   * PUT /api/admin/users/:id/role
   */
  static async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params
      const { role } = req.body as UpdateUserRoleRequest

      // Validações
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório'
        })
        return
      }

      if (!role) {
        res.status(400).json({
          success: false,
          error: 'Role é obrigatório'
        })
        return
      }

      const validRoles: UserRole[] = ['admin', 'user', 'consultor']
      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          error: `Role inválido. Valores aceitos: ${validRoles.join(', ')}`
        })
        return
      }

      // Prevenir admin de remover seu próprio role admin
      if (id === req.user.id && role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Você não pode remover seu próprio role de administrador'
        })
        return
      }

      const result = await AdminModel.updateUserRole(id, role)

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Role atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller updateUserRole:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  /**
   * Atualiza o status de um usuário (ativo/inativo)
   * PUT /api/admin/users/:id/status
   */
  static async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params
      const { status } = req.body as UpdateUserStatusRequest

      // Validações
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório'
        })
        return
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status é obrigatório'
        })
        return
      }

      const validStatuses: UserStatus[] = ['active', 'inactive']
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}`
        })
        return
      }

      // Prevenir admin de desativar a si mesmo
      if (id === req.user.id && status === 'inactive') {
        res.status(403).json({
          success: false,
          error: 'Você não pode desativar sua própria conta'
        })
        return
      }

      const result = await AdminModel.updateUserStatus(id, status)

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Status atualizado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller updateUserStatus:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  /**
   * Deleta um usuário do sistema
   * DELETE /api/admin/users/:id
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório'
        })
        return
      }

      // Prevenir admin de deletar a si mesmo
      if (id === req.user.id) {
        res.status(403).json({
          success: false,
          error: 'Você não pode deletar sua própria conta'
        })
        return
      }

      const result = await AdminModel.deleteUser(id)

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Usuário deletado com sucesso'
      })
    } catch (error) {
      console.error('Erro no controller deleteUser:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // SYSTEM STATISTICS
  // ================================================

  /**
   * Retorna estatísticas gerais do sistema
   * GET /api/admin/stats
   */
  static async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const result = await AdminModel.getSystemStats()

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })
    } catch (error) {
      console.error('Erro no controller getSystemStats:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  // ================================================
  // HISTORICAL DATA
  // ================================================

  /**
   * Retorna dados históricos de criação de cards
   * GET /api/admin/history/cards?period=month&userId=123
   */
  static async getCardsHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { period = 'month', userId } = req.query

      const validPeriods = ['day', 'week', 'month', 'year', 'all']
      if (!validPeriods.includes(period as string)) {
        res.status(400).json({
          success: false,
          error: `Período inválido. Valores aceitos: ${validPeriods.join(', ')}`
        })
        return
      }

      const result = await AdminModel.getCardsHistoricalData(
        period as any,
        userId as string | undefined
      )

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        period,
        total: result.data?.length || 0
      })
    } catch (error) {
      console.error('Erro no controller getCardsHistory:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }

  /**
   * Retorna dados históricos de cadastro de usuários
   * GET /api/admin/history/users?period=month
   */
  static async getUsersHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        })
        return
      }

      const { period = 'month' } = req.query

      const validPeriods = ['day', 'week', 'month', 'year', 'all']
      if (!validPeriods.includes(period as string)) {
        res.status(400).json({
          success: false,
          error: `Período inválido. Valores aceitos: ${validPeriods.join(', ')}`
        })
        return
      }

      const result = await AdminModel.getUsersHistoricalData(period as any)

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data,
        period,
        total: result.data?.length || 0
      })
    } catch (error) {
      console.error('Erro no controller getUsersHistory:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}
