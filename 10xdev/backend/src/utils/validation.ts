// ================================================
// VALIDATION UTILITIES - Shared validation functions
// ================================================

import { Request, Response } from 'express'
import type { CreateCardFeatureRequest, CardFeatureScreen } from '../types/cardfeature'

/**
 * Validates CardFeature screens array
 * @param screens - Array of screens to validate
 * @param context - Optional context for error messages (e.g., "Item 1")
 * @returns Error message if invalid, null if valid
 */
export function validateScreens(screens: CardFeatureScreen[], context: string = ''): string | null {
  const prefix = context ? `${context}: ` : ''
  
  if (!Array.isArray(screens) || screens.length === 0) {
    return `${prefix}Screens field must be an array with at least one item`
  }

  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i]
    if (!screen?.name?.trim()) {
      return `${prefix}Screen ${i + 1} must have a valid "name" field`
    }
  }

  return null
}

/**
 * Validates complete CardFeature data
 * @param data - CardFeature data to validate
 * @param context - Optional context for error messages (e.g., "Item 1")
 * @returns Error message if invalid, null if valid
 */
export function validateCardFeatureData(data: CreateCardFeatureRequest, context: string = ''): string | null {
  const prefix = context ? `${context}: ` : ''
  
  // Check required fields
  if (!data?.title?.trim() || !data?.tech?.trim() || !data?.language?.trim() || !data?.description?.trim()) {
    return `${prefix}Required fields: title, tech, language, description, screens`
  }

  // Validate screens
  if (!data.screens) {
    return `${prefix}Screens field is required`
  }

  return validateScreens(data.screens, context)
}

// ================================================
// ERROR HANDLING UTILITIES
// ================================================

/**
 * Standard error response handler
 */
export function sendErrorResponse(res: Response, error: any, operation: string, statusCode?: number): void {
  const status = statusCode || (error?.statusCode) || 500
  const message = error?.error || error?.message || 'Internal server error'
  
  console.error(`Error in ${operation}:`, error)
  
  res.status(status).json({
    success: false,
    error: message
  })
}

/**
 * Standard success response handler  
 */
export function sendSuccessResponse(res: Response, data: any, message?: string, statusCode: number = 200): void {
  const response: any = {
    success: true,
    data
  }
  
  if (message) {
    response.message = message
  }
  
  res.status(statusCode).json(response)
}

/**
 * Standard validation error response
 */
export function sendValidationError(res: Response, error: string): void {
  res.status(400).json({
    success: false,
    error
  })
}

/**
 * Validates partial CardFeature data (for updates)
 * @param data - Partial CardFeature data to validate
 * @param context - Optional context for error messages
 * @returns Error message if invalid, null if valid
 */
export function validatePartialCardFeatureData(data: Partial<CreateCardFeatureRequest>, context: string = ''): string | null {
  // Only validate screens if provided
  if (data.screens) {
    return validateScreens(data.screens, context)
  }
  
  return null
}