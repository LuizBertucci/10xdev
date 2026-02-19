import { Request, Response } from 'express'
import { UserModel } from '@/models/UserModel'

export class UserController {
  
  // ================================================
  // SEARCH - GET /api/users/search
  // ================================================
  
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

      if (!query || query.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search term "q" is required and must be at least 2 characters'
        })
        return
      }

      const result = await UserModel.search(query, limit)

      if (!result.success) {
        res.status(result.statusCode || 400).json({
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
      console.error('Error in UserController search:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

