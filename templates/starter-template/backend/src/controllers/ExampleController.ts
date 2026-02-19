import { Request, Response } from 'express'
import { ExampleModel } from '@/models/ExampleModel'
import type { CreateExampleRequest, UpdateExampleRequest, ExampleQueryParams } from '@/types'

export class ExampleController {
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const params: ExampleQueryParams = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
        search: req.query.search as string | undefined,
        sortBy: (req.query.sortBy as 'created_at' | 'title') || 'created_at',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      }

      const result = await ExampleModel.getAll(params, req.user?.id)

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: result.count || 0
        }
      })
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Error fetching examples'
      })
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await ExampleModel.getById(id, req.user?.id)

      res.json({
        success: true,
        data: result.data
      })
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Example not found'
      })
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' })
        return
      }

      const data: CreateExampleRequest = req.body

      if (!data.title) {
        res.status(400).json({ success: false, error: 'Title is required' })
        return
      }

      const result = await ExampleModel.create(data, req.user.id)

      res.status(201).json({
        success: true,
        data: result.data
      })
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Error creating example'
      })
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' })
        return
      }

      const { id } = req.params
      const data: UpdateExampleRequest = req.body

      const result = await ExampleModel.update(id, data, req.user.id)

      res.json({
        success: true,
        data: result.data
      })
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Error updating example'
      })
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' })
        return
      }

      const { id } = req.params
      await ExampleModel.delete(id, req.user.id)

      res.json({
        success: true,
        message: 'Example deleted'
      })
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Error deleting example'
      })
    }
  }
}
