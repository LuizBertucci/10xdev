import { GithubService } from '@/services/githubService'
import { GitSyncModel } from '@/models/GitSyncModel'
import { ProjectModel } from '@/models/ProjectModel'
import { CardFeatureModel } from '@/models/CardFeatureModel'
import { Visibility } from '@/types/cardfeature'
import type {
  CardFeatureUpdate,
  CreateCardFeatureRequest
} from '@/types/cardfeature'
import type {
  GithubWebhookPushPayload,
  GithubWebhookInstallationPayload,
  GitSyncFileMappingInsert,
  GitSyncFileMappingRow
} from '@/types/project'

// ================================================
// GITSYNC SERVICE
// Orquestra sincronizacao bidirecional GitHub <-> Cards
// ================================================

export class GitSyncService {
  private static extractUniqueFilePaths(card: { screens?: Array<{ blocks?: Array<{ route?: string }> }> }): string[] {
    const unique = new Set<string>()
    for (const screen of card.screens || []) {
      for (const block of screen.blocks || []) {
        if (block.route) unique.add(block.route)
      }
    }
    return [...unique]
  }

  private static pickCanonicalCardId(mappings: GitSyncFileMappingRow[]): string | null {
    if (mappings.length === 0) return null
    const countByCard = new Map<string, number>()
    mappings.forEach((mapping) => {
      countByCard.set(mapping.card_feature_id, (countByCard.get(mapping.card_feature_id) || 0) + 1)
    })
    let bestId: string | null = null
    let bestCount = -1
    for (const [cardId, count] of countByCard.entries()) {
      if (count > bestCount) {
        bestId = cardId
        bestCount = count
      }
    }
    return bestId
  }

  private static async cleanupDuplicateCardsBySignature(
    projectId: string,
    userId: string
  ): Promise<{ removedCards: number; mergedGroups: number }> {
    const mappingsResult = await GitSyncModel.getMappingsByProject(projectId)
    if (!mappingsResult.success || !mappingsResult.data || mappingsResult.data.length === 0) {
      return { removedCards: 0, mergedGroups: 0 }
    }

    const pathsByCard = new Map<string, Set<string>>()
    for (const mapping of mappingsResult.data) {
      if (!pathsByCard.has(mapping.card_feature_id)) {
        pathsByCard.set(mapping.card_feature_id, new Set<string>())
      }
      pathsByCard.get(mapping.card_feature_id)!.add(mapping.file_path)
    }

    const cardsBySignature = new Map<string, string[]>()
    for (const [cardId, paths] of pathsByCard.entries()) {
      const signature = [...paths].sort().join('|')
      if (!signature) continue
      if (!cardsBySignature.has(signature)) cardsBySignature.set(signature, [])
      cardsBySignature.get(signature)!.push(cardId)
    }

    const cardsToDelete: string[] = []
    let mergedGroups = 0

    for (const cardIds of cardsBySignature.values()) {
      if (cardIds.length <= 1) continue
      mergedGroups++
      const [, ...duplicates] = cardIds
      cardsToDelete.push(...duplicates)
    }

    if (cardsToDelete.length === 0) {
      return { removedCards: 0, mergedGroups: 0 }
    }

    for (const duplicateCardId of cardsToDelete) {
      await GitSyncModel.deleteByCard(duplicateCardId)
      await ProjectModel.removeCard(projectId, duplicateCardId, userId)
    }

    await CardFeatureModel.bulkDelete(cardsToDelete)
    return { removedCards: cardsToDelete.length, mergedGroups }
  }

  // ================================================
  // CONNECT REPO - Conecta projeto ao GitHub e importa
  // ================================================

  /** Conecta um projeto a um repo GitHub, faz import inicial,
   *  e popula gitsync_file_mappings com mapeamento arquivo->card. */
  static async connectRepo(
    projectId: string,
    installationId: number,
    owner: string,
    repo: string,
    userId: string,
    options?: {
      defaultBranch?: string
      useAi?: boolean
      onProgress?: (step: string, progress: number, message: string) => Promise<void>
    }
  ): Promise<{ success: boolean; mappingsCreated: number; error?: string }> {
    try {
      const branch = options?.defaultBranch || 'main'
      const cardBySignature = new Map<string, string>()

      // 1. Obter installation token
      const token = await GithubService.getInstallationToken(installationId)

      // 2. Obter SHA do ultimo commit
      let latestSha: string | null = null
      try {
        latestSha = await GithubService.getLatestCommitSha(token, owner, repo, branch)
      } catch {
        console.warn('[GitSync] Nao foi possivel obter SHA do ultimo commit')
      }

      // 3. Salvar dados de sync no projeto
      await ProjectModel.updateSyncInfo(projectId, {
        github_installation_id: installationId,
        github_owner: owner,
        github_repo: repo,
        default_branch: branch,
        gitsync_active: true,
        last_sync_at: new Date().toISOString(),
        last_sync_sha: latestSha
      })

      // 4. Processar repo e criar cards (reutiliza flow existente)
      const repoUrl = `https://github.com/${owner}/${repo}`
      await GithubService.processRepoToCards(
        repoUrl,
        token,
        {
          useAi: options?.useAi ?? true,
          onProgress: async (p) => {
            if (options?.onProgress) {
              await options.onProgress(p.step, p.progress ?? 0, p.message ?? '')
            }
          },
          onCardReady: async (card) => {
            const filePaths = this.extractUniqueFilePaths(card)
            if (filePaths.length === 0) return
            const signature = [...filePaths].sort().join('|')

            let cardId = cardBySignature.get(signature) || null

            if (!cardId) {
              const existingMappings: GitSyncFileMappingRow[] = []
              for (const filePath of filePaths) {
                const mapping = await GitSyncModel.getMappingByFilePath(projectId, filePath)
                if (mapping.success && mapping.data) {
                  existingMappings.push(mapping.data)
                }
              }

              cardId = this.pickCanonicalCardId(existingMappings)
            }

            let createdNewCard = false
            if (!cardId) {
              const normalizedCard = {
                ...card,
                visibility: Visibility.UNLISTED,
                created_in_project_id: projectId
              }
              const createdRes = await CardFeatureModel.bulkCreate([normalizedCard] as CreateCardFeatureRequest[], userId)
              if (!createdRes.success || !createdRes.data?.length) {
                throw new Error(createdRes.error || 'Erro ao criar card no GitSync')
              }
              cardId = createdRes.data[0]!.id
              createdNewCard = true
              await ProjectModel.addCardsBulk(projectId, [cardId], userId)
            }

            if (!cardId) return
            cardBySignature.set(signature, cardId)

            // 5. Criar file mappings para cada arquivo do card
            const mappings: GitSyncFileMappingInsert[] = []
            for (const filePath of filePaths) {
              mappings.push({
                project_id: projectId,
                card_feature_id: cardId,
                file_path: filePath,
                branch_name: branch,
                last_commit_sha: latestSha,
                last_synced_at: new Date().toISOString()
              })
            }

            if (mappings.length > 0) {
              await GitSyncModel.upsertMappingsBulk(mappings)
            }

            if (!createdNewCard && options?.onProgress) {
              await options.onProgress('quality_corrections', 92, `Reuso de card existente (${card.title})`)
            }
          }
        }
      )

      const dedupe = await this.cleanupDuplicateCardsBySignature(projectId, userId)
      if (dedupe.removedCards > 0 && options?.onProgress) {
        await options.onProgress(
          'quality_corrections',
          94,
          `Duplicatas removidas: ${dedupe.removedCards} card(s) em ${dedupe.mergedGroups} grupo(s)`
        )
      }

      // Contar total de mappings criados
      const allMappings = await GitSyncModel.getMappingsByProject(projectId)

      return {
        success: true,
        mappingsCreated: allMappings.count || 0
      }
    } catch (error: unknown) {
      console.error('[GitSync] Erro ao conectar repo:', error)
      const err = error as { message?: string }
      return { success: false, mappingsCreated: 0, error: err.message || 'Erro desconhecido' }
    }
  }

  // ================================================
  // SYNC FROM GITHUB - Puxa mudancas do GitHub para cards
  // ================================================

  /** Sincroniza mudancas do GitHub para os cards.
   *  Compara SHA atual com ultimo sync e atualiza blocos afetados. */
  static async syncFromGithub(projectId: string): Promise<{
    success: boolean
    filesUpdated: number
    filesAdded: number
    filesRemoved: number
    error?: string
  }> {
    try {
      // 1. Buscar info de sync do projeto
      const syncInfo = await ProjectModel.getSyncInfo(projectId)
      if (!syncInfo.success || !syncInfo.data) {
        return { success: false, filesUpdated: 0, filesAdded: 0, filesRemoved: 0, error: 'Projeto não encontrado' }
      }

      const project = syncInfo.data
      if (!project.gitsync_active || !project.github_installation_id || !project.github_owner || !project.github_repo) {
        return { success: false, filesUpdated: 0, filesAdded: 0, filesRemoved: 0, error: 'GitSync não está ativo' }
      }

      const { github_installation_id, github_owner, github_repo, default_branch, last_sync_sha } = project

      // 2. Obter installation token
      const token = await GithubService.getInstallationToken(github_installation_id)

      // 3. Obter SHA atual da branch
      const branch = default_branch || 'main'
      const currentSha = await GithubService.getLatestCommitSha(token, github_owner, github_repo, branch)

      // Se nao mudou, nao ha o que sincronizar
      if (currentSha === last_sync_sha) {
        return { success: true, filesUpdated: 0, filesAdded: 0, filesRemoved: 0 }
      }

      let filesUpdated = 0
      let filesAdded = 0
      let filesRemoved = 0

      // 4. Se temos SHA anterior, comparar diffs
      if (last_sync_sha) {
        try {
          const diff = await GithubService.getCommitDiff(
            token, github_owner, github_repo, last_sync_sha, currentSha
          )

          for (const file of diff) {
            // Buscar mapping existente para este arquivo
            const mappingResult = await GitSyncModel.getMappingByFilePath(projectId, file.filename)

            if (file.status === 'modified' && mappingResult.success && mappingResult.data) {
              // Arquivo modificado: atualizar conteudo do bloco no card
              try {
                const { content } = await GithubService.getFileContent(
                  token, github_owner, github_repo, file.filename, currentSha
                )

                // Atualizar o bloco do card correspondente
                await this.updateCardBlock(mappingResult.data.card_feature_id, file.filename, content)

                // Atualizar mapping
                await GitSyncModel.updateMapping(mappingResult.data.id, {
                  last_commit_sha: currentSha,
                  last_synced_at: new Date().toISOString()
                })

                filesUpdated++
              } catch (err: unknown) {
                console.warn(`[GitSync] Erro ao atualizar arquivo ${file.filename}:`, err)
              }
            } else if (file.status === 'removed' && mappingResult.success && mappingResult.data) {
              // Arquivo removido: marcar no mapping (nao deleta o card)
              filesRemoved++
            } else if (file.status === 'added') {
              // Arquivo adicionado: por enquanto apenas logar
              // Futuramente: criar novo bloco/card automaticamente
              filesAdded++
            }
          }
        } catch (err: unknown) {
          console.warn('[GitSync] Erro ao obter diff, fazendo sync parcial:', err)
        }
      }

      // 5. Atualizar SHA e timestamp no projeto
      await ProjectModel.updateSyncInfo(projectId, {
        last_sync_sha: currentSha,
        last_sync_at: new Date().toISOString()
      })

      return { success: true, filesUpdated, filesAdded, filesRemoved }
    } catch (error: unknown) {
      console.error('[GitSync] Erro no syncFromGithub:', error)
      const err = error as { message?: string }
      return { success: false, filesUpdated: 0, filesAdded: 0, filesRemoved: 0, error: err.message || 'Erro desconhecido' }
    }
  }

  // ================================================
  // SYNC TO GITHUB - Envia mudancas do card para GitHub (PR)
  // ================================================

  /** Cria uma branch + PR com as mudancas do card.
   *  Chamado quando o usuario salva um card que tem file mappings. */
  static async syncToGithub(
    projectId: string,
    cardFeatureId: string
  ): Promise<{
    success: boolean
    prUrl?: string
    prNumber?: number
    error?: string
  }> {
    try {
      // 1. Buscar info de sync
      const syncInfo = await ProjectModel.getSyncInfo(projectId)
      if (!syncInfo.success || !syncInfo.data?.gitsync_active) {
        return { success: false, error: 'GitSync não está ativo' }
      }

      const { github_installation_id, github_owner, github_repo, default_branch } = syncInfo.data
      if (!github_installation_id || !github_owner || !github_repo) {
        return { success: false, error: 'Dados de conexão GitHub incompletos' }
      }

      // 2. Obter token e mappings do card
      const token = await GithubService.getInstallationToken(github_installation_id)
      const mappingsResult = await GitSyncModel.getMappingsByCard(cardFeatureId)
      if (!mappingsResult.success || !mappingsResult.data?.length) {
        return { success: false, error: 'Nenhum mapeamento de arquivo encontrado para este card' }
      }

      // 3. Buscar conteudo atualizado do card
      const cardResult = await CardFeatureModel.findById(cardFeatureId)
      if (!cardResult.success || !cardResult.data) {
        return { success: false, error: 'Card não encontrado' }
      }

      const card = cardResult.data
      const branch = default_branch || 'main'

      // 4. Criar branch para as mudancas
      const baseSha = await GithubService.getLatestCommitSha(token, github_owner, github_repo, branch)
      const branchName = `10xdev/card-${cardFeatureId.substring(0, 8)}-${Date.now()}`
      await GithubService.createBranch(token, github_owner, github_repo, branchName, baseSha)

      // 5. Para cada mapping, atualizar o arquivo no GitHub
      let filesChanged = 0
      for (const mapping of mappingsResult.data) {
        // Buscar conteudo atualizado do bloco correspondente
        const blockContent = this.getCardBlockContent(card, mapping.file_path)
        if (!blockContent) continue

        try {
          // Buscar SHA atual do arquivo
          const { sha: fileSha } = await GithubService.getFileContent(
            token, github_owner, github_repo, mapping.file_path, branch
          )

          // Atualizar arquivo na nova branch
          await GithubService.updateFileContent(
            token, github_owner, github_repo,
            mapping.file_path, blockContent,
            `[10xDev] Atualizar ${mapping.file_path} via card ${card.title || cardFeatureId.substring(0, 8)}`,
            fileSha, branchName
          )

          filesChanged++
        } catch (err: unknown) {
          console.warn(`[GitSync] Erro ao atualizar ${mapping.file_path} no GitHub:`, err)
        }
      }

      if (filesChanged === 0) {
        return { success: false, error: 'Nenhum arquivo foi alterado' }
      }

      // 6. Criar PR
      const pr = await GithubService.createPullRequest(
        token, github_owner, github_repo,
        {
          title: `[10xDev] ${card.title || 'Atualização de card'}`,
          head: branchName,
          base: branch,
          body: [
            `## Mudanças via 10xDev`,
            '',
            `**Card:** ${card.title || cardFeatureId}`,
            `**Arquivos alterados:** ${filesChanged}`,
            '',
            `> Essa PR foi criada automaticamente pela plataforma 10xDev.`,
            `> As alterações refletem edições feitas nos cards do projeto.`
          ].join('\n')
        }
      )

      // 7. Atualizar mappings com info da PR
      for (const mapping of mappingsResult.data) {
        await GitSyncModel.updateMapping(mapping.id, {
          last_pr_number: pr.number,
          last_pr_url: pr.html_url,
          last_pr_state: 'open',
          card_modified_at: null, // Limpar flag de modificacao
          last_synced_at: new Date().toISOString()
        })
      }

      return { success: true, prUrl: pr.html_url, prNumber: pr.number }
    } catch (error: unknown) {
      console.error('[GitSync] Erro no syncToGithub:', error)
      const err = error as { message?: string }
      return { success: false, error: err.message || 'Erro desconhecido' }
    }
  }

  // ================================================
  // WEBHOOK HANDLERS
  // ================================================

  /** Processa webhook push do GitHub.
   *  Identifica o projeto e dispara sync automatico. */
  static async handleWebhookPush(payload: GithubWebhookPushPayload): Promise<void> {
    const repoFullName = payload.repository?.full_name
    if (!repoFullName) {
      console.warn('[GitSync Webhook] Push sem repository.full_name')
      return
    }

    const parts = repoFullName.split('/')
    const owner = parts[0] || ''
    const repo = parts[1] || ''
    if (!owner || !repo) {
      console.warn('[GitSync Webhook] Push com full_name invalido:', repoFullName)
      return
    }
    const projectResult = await ProjectModel.findByGithubRepo(owner, repo)
    if (!projectResult.success || !projectResult.data) {
      console.log(`[GitSync Webhook] Nenhum projeto conectado ao repo ${repoFullName}`)
      return
    }

    const project = projectResult.data
    const branch = project.default_branch || 'main'

    // Verificar se o push e na branch monitorada
    const pushRef = payload.ref // refs/heads/main
    if (pushRef !== `refs/heads/${branch}`) {
      console.log(`[GitSync Webhook] Push na branch ${pushRef}, ignorando (monitorando ${branch})`)
      return
    }

    console.log(`[GitSync Webhook] Push detectado em ${repoFullName}/${branch}, sincronizando projeto ${project.id}`)

    // Executar sync em background
    try {
      const result = await this.syncFromGithub(project.id)
      console.log(`[GitSync Webhook] Sync concluido: ${result.filesUpdated} atualizados, ${result.filesAdded} adicionados, ${result.filesRemoved} removidos`)
    } catch (err: unknown) {
      console.error(`[GitSync Webhook] Erro no sync:`, err)
    }
  }

  /** Processa webhook de installation do GitHub App */
  static async handleWebhookInstallation(payload: GithubWebhookInstallationPayload): Promise<void> {
    const { action, installation } = payload
    console.log(`[GitSync Webhook] Installation ${action}: ${installation.id} (${installation.account.login})`)

    if (action === 'deleted' || action === 'suspend') {
      // Desativar sync em todos os projetos com esse installation_id
      // Nota: implementacao simplificada - busca nao existe ainda no model
      console.warn(`[GitSync Webhook] Installation ${action}: desativacao automatica nao implementada`)
    }
  }

  // ================================================
  // CONFLICT DETECTION & RESOLUTION
  // ================================================

  /** Detecta conflitos potenciais em um projeto.
   *  Conflito = card foi editado apos ultimo sync E GitHub tambem mudou. */
  static async detectConflicts(projectId: string): Promise<{
    hasConflicts: boolean
    conflicts: Array<{ filePath: string; cardId: string; mappingId: string }>
  }> {
    const result = await GitSyncModel.getConflicts(projectId)
    if (!result.success || !result.data?.length) {
      return { hasConflicts: false, conflicts: [] }
    }

    return {
      hasConflicts: true,
      conflicts: result.data.map(m => ({
        filePath: m.file_path,
        cardId: m.card_feature_id,
        mappingId: m.id
      }))
    }
  }

  /** Resolve um conflito, escolhendo manter o card ou o GitHub */
  static async resolveConflict(
    projectId: string,
    fileMappingId: string,
    resolution: 'keep_card' | 'keep_github'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const syncInfo = await ProjectModel.getSyncInfo(projectId)
      if (!syncInfo.success || !syncInfo.data?.gitsync_active) {
        return { success: false, error: 'GitSync não está ativo' }
      }

      if (resolution === 'keep_github') {
        // Buscar conteudo do GitHub e aplicar no card
        const { github_installation_id, github_owner, github_repo } = syncInfo.data
        if (!github_installation_id || !github_owner || !github_repo) {
          return { success: false, error: 'Dados de conexão incompletos' }
        }

        // Buscar o mapping
        const mappings = await GitSyncModel.getMappingsByProject(projectId)
        const mapping = mappings.data?.find(m => m.id === fileMappingId)
        if (!mapping) {
          return { success: false, error: 'Mapeamento não encontrado' }
        }

        const token = await GithubService.getInstallationToken(github_installation_id)
        const { content } = await GithubService.getFileContent(
          token, github_owner, github_repo, mapping.file_path
        )

        // Atualizar bloco do card com conteudo do GitHub
        await this.updateCardBlock(mapping.card_feature_id, mapping.file_path, content)
      }

      // Limpar conflito
      await GitSyncModel.updateMapping(fileMappingId, {
        card_modified_at: null,
        last_synced_at: new Date().toISOString()
      })

      return { success: true }
    } catch (error: unknown) {
      console.error('[GitSync] Erro ao resolver conflito:', error)
      const err = error as { message?: string }
      return { success: false, error: err.message || 'Erro desconhecido' }
    }
  }

  // ================================================
  // HELPERS PRIVADOS
  // ================================================

  /** Atualiza o conteudo de um bloco em um card pelo file_path */
  private static async updateCardBlock(
    cardFeatureId: string,
    filePath: string,
    newContent: string
  ): Promise<void> {
    const cardResult = await CardFeatureModel.findById(cardFeatureId)
    if (!cardResult.success || !cardResult.data) return

    const card = cardResult.data
    let updated = false

    // Percorrer screens e blocks para encontrar o bloco com route == filePath
    const updatedScreens = (card.screens || []).map(screen => ({
      ...screen,
      blocks: (screen.blocks || []).map(block => {
        if (block.route === filePath) {
          updated = true
          return { ...block, content: newContent }
        }
        return block
      })
    }))

    if (updated) {
      // userId 'system' para updates automaticos do GitSync
      await CardFeatureModel.update(cardFeatureId, { screens: updatedScreens } as unknown as Partial<CardFeatureUpdate>, 'system', 'admin')
    }
  }

  /** Extrai conteudo de um bloco do card pelo file_path */
  private static getCardBlockContent(card: { screens?: Array<{ blocks?: Array<{ route?: string; content?: string }> }> }, filePath: string): string | null {
    for (const screen of card.screens || []) {
      for (const block of screen.blocks || []) {
        if (block.route === filePath && block.content) {
          return block.content
        }
      }
    }
    return null
  }
}
