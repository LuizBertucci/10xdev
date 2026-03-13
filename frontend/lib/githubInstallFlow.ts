const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/10xdev-gitsync/installations/new'
const OAUTH_STATE_NONCE_KEY = 'oauth_state_nonce'
const GITHUB_SYNC_INSTALLATION_ID_KEY = 'github_sync_installation_id'

type GithubInstallStateData = {
  origin?: string
  projectId?: string
  nonce?: string
}

const parseStateData = (state: string | null): GithubInstallStateData | null => {
  if (!state) return null

  try {
    const decoded = JSON.parse(atob(state)) as Record<string, unknown>

    return {
      origin: typeof decoded.origin === 'string' ? decoded.origin : undefined,
      projectId: typeof decoded.projectId === 'string' ? decoded.projectId : undefined,
      nonce: typeof decoded.nonce === 'string' ? decoded.nonce : undefined
    }
  } catch {
    return null
  }
}

export const getStoredGithubInstallationId = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    return sessionStorage.getItem(GITHUB_SYNC_INSTALLATION_ID_KEY)
  } catch {
    return null
  }
}

export const persistGithubInstallationId = (installationId: string): void => {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(GITHUB_SYNC_INSTALLATION_ID_KEY, installationId)
  } catch {
    // ignore storage errors
  }
}

export const beginGithubAppInstallation = (projectId?: string | null): string => {
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = Array.from(nonceBytes, byte => byte.toString(16).padStart(2, '0')).join('')

  try {
    sessionStorage.setItem(OAUTH_STATE_NONCE_KEY, nonce)
  } catch {
    throw new Error('Não foi possível iniciar o fluxo do GitHub. Tente novamente.')
  }

  const stateData = JSON.stringify({
    origin: window.location.origin,
    projectId: projectId || '',
    nonce
  })
  const state = btoa(stateData)

  return `${GITHUB_APP_INSTALL_URL}?state=${encodeURIComponent(state)}`
}

export const consumeGithubAppInstallation = ({
  installationId,
  state,
  expectedProjectId
}: {
  installationId: string | null
  state: string | null
  expectedProjectId?: string | null
}): { success: true; projectId: string | null } | { success: false; error: string } => {
  let storedNonce: string | null = null

  try {
    storedNonce = sessionStorage.getItem(OAUTH_STATE_NONCE_KEY)
  } catch {
    return { success: false, error: 'Erro ao verificar segurança do GitHub. Tente novamente.' }
  }

  if (!storedNonce) {
    return { success: false, error: 'Sessão do GitHub expirada. Tente novamente.' }
  }

  const parsedState = parseStateData(state)

  try {
    sessionStorage.removeItem(OAUTH_STATE_NONCE_KEY)
  } catch {
    // ignore storage errors
  }

  if (!parsedState?.nonce || parsedState.nonce !== storedNonce) {
    return { success: false, error: 'Falha na verificação de segurança do GitHub. Tente novamente.' }
  }

  if (expectedProjectId && parsedState.projectId && parsedState.projectId !== expectedProjectId) {
    return { success: false, error: 'O retorno do GitHub não corresponde a este projeto.' }
  }

  if (!installationId) {
    return { success: false, error: 'Installation ID não recebido do GitHub.' }
  }

  persistGithubInstallationId(installationId)

  return {
    success: true,
    projectId: parsedState.projectId || null
  }
}
