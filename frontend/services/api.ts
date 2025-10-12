/**
 * API Configuration
 * Detects environment and provides the correct API base URL
 */

const isLocalhost = typeof window !== 'undefined' &&
  window.location.hostname === 'localhost'

export const API_BASE_URL = isLocalhost
  ? 'http://localhost:3001/api'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/**
 * Helper to make authenticated API requests
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('auth_token')
    : null

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  })

  return response
}
