/**
 * Helper para gerenciar rotas da aplicação
 */

export type TabKey = 'home' | 'codes' | 'contents' | 'projects' | 'admin'

export const ROUTES: Record<TabKey, string> = {
  home: '/home',
  codes: '/codes',
  contents: '/contents',
  projects: '/projects',
  admin: '/admin'
}

/**
 * Gera a rota para uma seção específica
 */
export function getRoute(tab: TabKey): string {
  return ROUTES[tab]
}

/**
 * Gera a rota padrão após login (home)
 */
export function getDefaultRoute(): string {
  return ROUTES.home
}

/**
 * Gera a rota de redirect com query param
 */
export function getRedirectRoute(tab: TabKey = 'home'): string {
  return `?redirect=${encodeURIComponent(ROUTES[tab])}`
}

/**
 * Valida se uma rota/tab é válida
 */
export function isValidTab(tab: string | null): tab is TabKey {
  return tab !== null && tab in ROUTES
}

/**
 * Normaliza uma tab para uma chave válida
 * @deprecated Use validação direta de rota quando possível
 */
export function normalizeTab(tab: string | null): TabKey {
  if (isValidTab(tab)) {
    return tab
  }
  return 'home'
}
