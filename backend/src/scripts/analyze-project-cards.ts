#!/usr/bin/env ts-node

/**
 * Script para analisar qualidade dos cards de um projeto
 * Identifica duplicações e sugestões de agrupamento
 */

import dotenv from 'dotenv'
import path from 'path'

// Carregar variáveis de ambiente do backend
const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

import { ProjectModel } from '@/models/ProjectModel'
import { CardQualitySupervisor, type QualityIssue } from '@/services/cardQualitySupervisor'
import { ContentType, CardType } from '@/types/cardfeature'
import type { CreateCardFeatureRequest, CardFeatureRow } from '@/types/cardfeature'

const PROJECT_ID = process.argv[2] || '6a7a8fe9-0558-406d-bdeb-d00decc95df6'

async function analyzeProjectCards() {
  console.log(`\n🔍 Analisando cards do projeto: ${PROJECT_ID}\n`)

  try {
    // Buscar todos os cards do projeto
    const result = await ProjectModel.getCardsAll(PROJECT_ID)

    if (!result.success) {
      console.error('❌ Erro ao buscar cards:', result.error)
      process.exit(1)
    }

    const projectCards = result.data || []
    const cardFeatures: CardFeatureRow[] = projectCards
      .map((pc) => pc.cardFeature)
      .filter((cf): cf is CardFeatureRow => cf !== null && cf !== undefined)

    console.log(`📊 Total de cards encontrados: ${cardFeatures.length}\n`)

    if (cardFeatures.length === 0) {
      console.log('⚠️  Nenhum card encontrado neste projeto.')
      return
    }

    // Converter para formato CreateCardFeatureRequest para análise
    const cardsForAnalysis: CreateCardFeatureRequest[] = cardFeatures.map((cf) => {
      const result: CreateCardFeatureRequest = {
        title: cf.title,
        description: cf.description || '',
        screens: cf.screens || [],
        tags: cf.tags || [],
        content_type: cf.content_type || ContentType.TEXT,
        card_type: cf.card_type || CardType.CODIGOS
      }

      if (cf.tech) result.tech = cf.tech
      if (cf.language) result.language = cf.language

      return result
    })

    // Analisar qualidade usando o supervisor
    const report = CardQualitySupervisor.analyzeQuality(cardsForAnalysis)

    // Exibir relatório detalhado
    console.log('='.repeat(80))
    console.log('📋 RELATÓRIO DE ANÁLISE DE QUALIDADE')
    console.log('='.repeat(80))
    console.log(`\nTotal de cards: ${report.totalCards}`)
    console.log(`Problemas encontrados: ${report.issuesFound}\n`)

    // Agrupar issues por tipo
    const issuesByType = new Map<string, QualityIssue[]>()
    report.issues.forEach(issue => {
      if (!issuesByType.has(issue.type)) {
        issuesByType.set(issue.type, [])
      }
      issuesByType.get(issue.type)!.push(issue)
    })

    // Exibir issues por tipo
    if (issuesByType.size > 0) {
      console.log('🔴 PROBLEMAS DETECTADOS:\n')
      
      issuesByType.forEach((issues, type) => {
        console.log(`\n📌 ${type} (${issues.length} ocorrências):`)
        issues.forEach(issue => {
          const card = cardsForAnalysis[issue.cardIndex]
          if (!card) return
          console.log(`   • Card #${issue.cardIndex + 1}: "${card.title}"`)
          console.log(`     Severidade: ${issue.severity.toUpperCase()}`)
          console.log(`     Mensagem: ${issue.message}`)
          if (issue.suggestion) {
            console.log(`     Sugestão: ${issue.suggestion}`)
          }
          if (issue.relatedCardIndex !== undefined) {
            const relatedCard = cardsForAnalysis[issue.relatedCardIndex]
            if (relatedCard) {
              console.log(`     Relacionado com: Card #${issue.relatedCardIndex + 1} "${relatedCard.title}"`)
            }
          }
          console.log()
        })
      })
    }

    // Cards para mesclar
    if (report.cardsToMerge.length > 0) {
      console.log('\n🔄 CARDS QUE PODEM SER MESCLADOS:\n')
      report.cardsToMerge.forEach(({ sourceIndex, targetIndex, reason }) => {
        const source = cardsForAnalysis[sourceIndex]
        const target = cardsForAnalysis[targetIndex]
        if (!source || !target) return
        console.log(`   • Card #${sourceIndex + 1} "${source.title}" → mesclar em Card #${targetIndex + 1} "${target.title}"`)
        console.log(`     Motivo: ${reason}\n`)
      })
    }

    // Cards para remover (duplicados completos)
    if (report.cardsToRemove.length > 0) {
      console.log('\n🗑️  CARDS DUPLICADOS PARA REMOVER:\n')
      report.cardsToRemove.forEach(index => {
        const card = cardsForAnalysis[index]
        if (!card) return
        console.log(`   • Card #${index + 1}: "${card.title}" (${card.tech}/${card.language})`)
      })
      console.log()
    }

    // Cards para melhorar
    if (report.cardsToImprove.length > 0) {
      console.log('\n✨ CARDS QUE PRECISAM DE MELHORIAS:\n')
      report.cardsToImprove.forEach(({ index, suggestions }) => {
        const card = cardsForAnalysis[index]
        if (!card) return
        console.log(`   • Card #${index + 1}: "${card.title}"`)
        suggestions.forEach(suggestion => {
          console.log(`     - ${suggestion}`)
        })
        console.log()
      })
    }

    // Análise de agrupamento por tech/language
    console.log('\n📊 ANÁLISE DE AGRUPAMENTO POR TECH/LANGUAGE:\n')
    const techLanguageGroups = new Map<string, number[]>()
    cardsForAnalysis.forEach((card, index) => {
      const key = `${card.tech || 'unknown'}/${card.language || 'unknown'}`
      if (!techLanguageGroups.has(key)) {
        techLanguageGroups.set(key, [])
      }
      techLanguageGroups.get(key)!.push(index)
    })

    techLanguageGroups.forEach((indices, key) => {
      if (indices.length > 1) {
        console.log(`   • ${key}: ${indices.length} cards`)
        indices.forEach(index => {
          const card = cardsForAnalysis[index]
          if (!card) return
          console.log(`     - Card #${index + 1}: "${card.title}" (${card.screens?.length || 0} telas)`)
        })
        console.log(`     💡 Sugestão: Considerar agrupar em um único card com ${indices.length} abas\n`)
      }
    })

    // Resumo final
    console.log('\n' + '='.repeat(80))
    console.log('📈 RESUMO FINAL')
    console.log('='.repeat(80))
    console.log(`\n✅ Cards em bom estado: ${report.totalCards - report.issuesFound}`)
    console.log(`⚠️  Cards com problemas: ${report.issuesFound}`)
    console.log(`🔄 Oportunidades de merge: ${report.cardsToMerge.length}`)
    console.log(`🗑️  Cards duplicados: ${report.cardsToRemove.length}`)
    console.log(`✨ Cards para melhorar: ${report.cardsToImprove.length}`)
    
    const groupingOpportunities = Array.from(techLanguageGroups.values())
      .filter(indices => indices.length > 1).length
    console.log(`📦 Oportunidades de agrupamento: ${groupingOpportunities}`)
    console.log()

  } catch (error: unknown) {
    console.error('❌ Erro ao analisar cards:', error instanceof Error ? error.message : String(error))
    console.error(error instanceof Error ? error.stack : undefined)
    process.exit(1)
  }
}

// Executar análise
analyzeProjectCards()
  .then(() => {
    console.log('\n✅ Análise concluída!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
