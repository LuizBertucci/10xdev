/**
 * Helper para gerenciar rotas e tabs da aplicação
 */

export type TabKey = 'home' | 'codes' | 'lessons' | 'trainings' | 'projects' | 'ai' | 'dashboard'

export const TABS: Record<TabKey, { key: TabKey; title: string; route: string }> = {
  home: {
    key: 'home',
    title: 'Início',
    route: '/'
  },
  codes: {
    key: 'codes',
    title: 'Códigos',
    route: '/?tab=codes'
  },
  lessons: {
    key: 'lessons',
    title: 'Aulas',
    route: '/?tab=lessons'
  },
  trainings: {
    key: 'trainings',
    title: 'Treinamentos',
    route: '/?tab=trainings'
  },
  projects: {
    key: 'projects',
    title: 'Projetos',
    route: '/?tab=projects'
  },
  ai: {
    key: 'ai',
    title: 'IA',
    route: '/?tab=ai'
  },
  dashboard: {
    key: 'dashboard',
    title: 'Dashboard',
    route: '/?tab=dashboard'
  }
}

/**
 * Gera a rota para uma tab específica
 */
export function getTabRoute(tab: TabKey): string {
  return TABS[tab].route
}

/**
 * Gera a rota de redirect com query param
 */
export function getRedirectRoute(tab: TabKey = 'dashboard'): string {
  return `?redirect=${encodeURIComponent(TABS[tab].route)}`
}

/**
 * Pega a tab default (dashboard após login/registro)
 */
export function getDefaultRoute(): string {
  return TABS.dashboard.route
}

/**
 * Valida se uma tab é válida
 */
export function isValidTab(tab: string | null): tab is TabKey {
  return tab !== null && tab in TABS
}

/**
 * Normaliza uma tab para uma chave válida
 */
export function normalizeTab(tab: string | null): TabKey {
  if (isValidTab(tab)) {
    return tab
  }
  return 'home'
}

