// ================================================
// SAVED ITEMS - Types
// ================================================

export type ItemType = 'video' | 'card'

export interface SavedItemRow {
  id: string
  user_id: string
  item_type: ItemType
  item_id: string
  created_at: string
}

export interface SavedItemInsert {
  user_id: string
  item_type: ItemType
  item_id: string
}

export interface SavedItemResponse {
  id: string
  itemType: ItemType
  itemId: string
  createdAt: string
  item?: any // dados expandidos do video/card
}

export interface SavedItemQueryParams {
  type?: ItemType
  page?: number
  limit?: number
}

export interface ModelResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface ModelListResult<T> {
  success: boolean
  data?: T[]
  count?: number
  error?: string
  statusCode?: number
}

