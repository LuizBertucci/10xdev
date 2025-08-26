import { Request, Response } from 'express'
import { CardFeatureModel } from '../models'
import { validateCardFeatureData, validatePartialCardFeatureData, sendErrorResponse, sendSuccessResponse, sendValidationError } from '../utils/validation'
import { buildQueryParams, buildPaginatedResponse } from '../utils/pagination'
import type {
  CreateCardFeatureRequest,
  UpdateCardFeatureRequest,
  CardFeatureQueryParams
} from '../types/cardfeature'

export class CardFeatureController {
  

  
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCardFeatureRequest = req.body
      
      const validationError = validateCardFeatureData(data)
      if (validationError) {
        sendValidationError(res, validationError)
        return
      }

      const result = await CardFeatureModel.create(data)

      if (!result.success) {
        sendErrorResponse(res, result, 'create CardFeature', result.statusCode)
        return
      }

      sendSuccessResponse(res, result.data, 'CardFeature created successfully', 201)
    } catch (error) {
      sendErrorResponse(res, error, 'controller create')
    }
  }

  
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const params = buildQueryParams(req)
      const result = await CardFeatureModel.findAll(params)

      if (!result.success) {
        sendErrorResponse(res, result, 'get all CardFeatures', result.statusCode)
        return
      }

      res.status(200).json(buildPaginatedResponse(result, params))
    } catch (error) {
      console.error('Error in controller getAll:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        sendValidationError(res, 'ID is required')
        return
      }

      const result = await CardFeatureModel.findById(id)

      if (!result.success) {
        sendErrorResponse(res, result, 'get CardFeature by ID', result.statusCode)
        return
      }

      sendSuccessResponse(res, result.data)
    } catch (error) {
      sendErrorResponse(res, error, 'controller getById')
    }
  }

  
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.q as string

      if (!searchTerm) {
        sendValidationError(res, 'Search parameter "q" is required')
        return
      }

      const params = buildQueryParams(req)
      const result = await CardFeatureModel.search(searchTerm, params)

      if (!result.success) {
        sendErrorResponse(res, result, 'search CardFeatures', result.statusCode)
        return
      }

      res.status(200).json(buildPaginatedResponse(result, params, { searchTerm }))
    } catch (error) {
      console.error('Error in controller search:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  
  static async getByTech(req: Request, res: Response): Promise<void> {
    try {
      const { tech } = req.params

      if (!tech) {
        sendValidationError(res, 'Technology is required')
        return
      }

      const params = buildQueryParams(req)
      const result = await CardFeatureModel.findByTech(tech, params)

      if (!result.success) {
        sendErrorResponse(res, result, 'get CardFeatures by tech', result.statusCode)
        return
      }

      res.status(200).json(buildPaginatedResponse(result, params, { tech }))
    } catch (error) {
      console.error('Error in controller getByTech:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data: UpdateCardFeatureRequest = req.body

      if (!id) {
        sendValidationError(res, 'ID is required')
        return
      }

      // Validate screens if provided
      const validationError = validatePartialCardFeatureData(data)
      if (validationError) {
        sendValidationError(res, validationError)
        return
      }

      const result = await CardFeatureModel.update(id, data)

      if (!result.success) {
        sendErrorResponse(res, result, 'update CardFeature', result.statusCode)
        return
      }

      sendSuccessResponse(res, result.data, 'CardFeature updated successfully')
    } catch (error) {
      sendErrorResponse(res, error, 'controller update')
    }
  }

  
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        sendValidationError(res, 'ID is required')
        return
      }

      const result = await CardFeatureModel.delete(id)

      if (!result.success) {
        sendErrorResponse(res, result, 'delete CardFeature', result.statusCode)
        return
      }

      sendSuccessResponse(res, null, 'CardFeature removed successfully')
    } catch (error) {
      sendErrorResponse(res, error, 'controller delete')
    }
  }

  
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await CardFeatureModel.getStats()

      if (!result.success) {
        sendErrorResponse(res, result, 'get CardFeature statistics', result.statusCode)
        return
      }

      sendSuccessResponse(res, result.data)
    } catch (error) {
      sendErrorResponse(res, error, 'controller getStats')
    }
  }

  
  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const items: CreateCardFeatureRequest[] = req.body

      if (!Array.isArray(items) || items.length === 0) {
        sendValidationError(res, 'Body must be an array with at least one item')
        return
      }

      // Validate each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item) {
          sendValidationError(res, `Item ${i + 1} is null or undefined`)
          return
        }
        const validationError = validateCardFeatureData(item, `Item ${i + 1}`)
        if (validationError) {
          sendValidationError(res, validationError)
          return
        }
      }

      const result = await CardFeatureModel.bulkCreate(items)

      if (!result.success) {
        sendErrorResponse(res, result, 'bulk create CardFeatures', result.statusCode)
        return
      }

      sendSuccessResponse(res, result.data, `${result.count} CardFeatures created successfully`, 201)
    } catch (error) {
      sendErrorResponse(res, error, 'controller bulkCreate')
    }
  }

  static async bulkDelete(req: Request, res: Response): Promise<void> {
    try {
      const ids: string[] = req.body.ids

      if (!Array.isArray(ids) || ids.length === 0) {
        sendValidationError(res, 'Body must contain an "ids" array with at least one item')
        return
      }

      const result = await CardFeatureModel.bulkDelete(ids)

      if (!result.success) {
        sendErrorResponse(res, result, 'bulk delete CardFeatures', result.statusCode)
        return
      }

      sendSuccessResponse(res, result.data, `${result.data?.deletedCount} CardFeatures removed successfully`)
    } catch (error) {
      sendErrorResponse(res, error, 'controller bulkDelete')
    }
  }
}