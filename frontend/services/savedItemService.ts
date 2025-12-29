import { apiClient, ApiResponse } from './apiClient'

// ================================================
// TYPES
// ================================================

export type ItemType = 'video' | 'card'

export interface SavedItem {
  id: string
  itemType: ItemType
  itemId: string
  createdAt: string
  item?: any
}

// ================================================
// SERVICE
// ================================================

class SavedItemService {
  private readonly endpoint = '/saved-items'

  // ================================================
  // SAVE ITEM
  // ================================================

  async save(itemType: ItemType, itemId: string): Promise<ApiResponse<SavedItem> | undefined> {
    return apiClient.post<SavedItem>(this.endpoint, { itemType, itemId })
  }

  // ================================================
  // UNSAVE ITEM
  // ================================================

  async unsave(itemType: ItemType, itemId: string): Promise<ApiResponse<null> | undefined> {
    return apiClient.delete<null>(`${this.endpoint}/${itemType}/${itemId}`)
  }

  // ================================================
  // LIST SAVED ITEMS
  // ================================================

  async list(itemType?: ItemType): Promise<ApiResponse<SavedItem[]> | undefined> {
    const params = itemType ? { type: itemType } : undefined
    return apiClient.get<SavedItem[]>(this.endpoint, params)
  }

  // ================================================
  // CHECK IF SAVED
  // ================================================

  async check(itemType: ItemType, itemId: string): Promise<ApiResponse<{ isSaved: boolean }> | undefined> {
    return apiClient.get<{ isSaved: boolean }>(`${this.endpoint}/check/${itemType}/${itemId}`)
  }

  // ================================================
  // CHECK MULTIPLE
  // ================================================

  async checkMultiple(itemType: ItemType, itemIds: string[]): Promise<ApiResponse<string[]> | undefined> {
    return apiClient.post<string[]>(`${this.endpoint}/check-multiple`, { itemType, itemIds })
  }
}

// Singleton instance
export const savedItemService = new SavedItemService()

