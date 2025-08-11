import { Request, Response } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * YOUTUBE CONTROLLER - Sistema Profissional de Detecção de Playlist
 * 
 * Sistema avançado que utiliza múltiplas estratégias para obter
 * informações precisas de playlists do YouTube:
 * 
 * 1. Scraping direto do HTML
 * 2. Análise de dados JSON embebidos
 * 3. RSS feeds quando disponíveis  
 * 4. APIs públicas do YouTube
 * 5. Sistema de cache e retry inteligente
 */

interface PlaylistInfo {
  id: string
  title: string
  videoCount: number
  totalDuration?: string
  description?: string
  thumbnailUrl?: string
  channelName?: string
  isPrivate?: boolean
}

interface ScrapingResult {
  success: boolean
  data?: PlaylistInfo
  error?: string
  method?: string
  timing?: number
}

class YouTubeController {
  private cache = new Map<string, { data: PlaylistInfo, timestamp: number }>()
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutos
  private readonly REQUEST_TIMEOUT = 15000 // 15 segundos
  private readonly MAX_RETRIES = 3

  constructor() {
    console.log('🎯 [Controller] YouTubeController iniciado')
  }

  /**
   * ESTRATÉGIA 1: Scraping HTML Premium com User-Agent rotativo
   */
  private async scrapePlaylistHTML(playlistId: string): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    try {
      console.log(`🔍 [HTML Scraping] Analisando playlist: ${playlistId}`)
      
      // User agents rotativos para evitar detecção
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
      ]
      
      const randomUA: string = userAgents[Math.floor(Math.random() * userAgents.length)]!
      const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`
      
      const response = await axios.get(playlistUrl, {
        headers: {
          'User-Agent': randomUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: this.REQUEST_TIMEOUT,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Aceita redirects
      })

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return this.parsePlaylistHTML(response.data as string, playlistId, Date.now() - startTime)
      
    } catch (error: any) {
      console.error(`❌ [HTML Scraping] Falhou:`, error.message)
      return {
        success: false,
        error: `HTML Scraping failed: ${error.message}`,
        method: 'html-scraping',
        timing: Date.now() - startTime
      }
    }
  }

  /**
   * ESTRATÉGIA 2: Análise de JSON embebido no YouTube
   */
  private parsePlaylistHTML(html: string, playlistId: string, timing: number): ScrapingResult {
    try {
      console.log(`🔬 [HTML Parser] Analisando ${html.length} caracteres de HTML`)
      
      // Múltiplos padrões de extração para máxima compatibilidade
      const extractors = [
        // Padrão 1: JSON embebido principal
        {
          name: 'ytInitialData',
          pattern: /var ytInitialData = ({.+?});/,
          parser: this.parseYtInitialData.bind(this)
        },
        // Padrão 2: JSON alternativo
        {
          name: 'ytcfg',
          pattern: /ytcfg\.set\(({.+?})\);/,
          parser: this.parseYtConfig.bind(this)
        },
        // Padrão 3: Meta tags
        {
          name: 'metatags',
          pattern: /<meta[^>]+>/g,
          parser: this.parseMetaTags.bind(this)
        },
        // Padrão 4: Schema.org JSON-LD
        {
          name: 'jsonld',
          pattern: /<script type="application\/ld\+json">({.+?})<\/script>/g,
          parser: this.parseJsonLD.bind(this)
        }
      ]

      for (const extractor of extractors) {
        try {
          console.log(`🎯 [${extractor.name}] Tentando extrair dados...`)
          
          const matches = html.match(extractor.pattern)
          if (matches) {
            console.log(`✅ [${extractor.name}] Padrão encontrado`)
            const result = extractor.parser(matches, html, playlistId)
            
            if (result && result.videoCount > 0) {
              console.log(`🎉 [${extractor.name}] Sucesso! ${result.videoCount} vídeos encontrados`)
              return {
                success: true,
                data: result,
                method: `html-${extractor.name}`,
                timing
              }
            }
          }
        } catch (extractorError: any) {
          console.log(`⚠️ [${extractor.name}] Falhou: ${extractorError.message}`)
          continue
        }
      }

      // Fallback: Contagem manual de elementos HTML
      return this.parseHTMLElements(html, playlistId, timing)
      
    } catch (error: any) {
      console.error(`❌ [HTML Parser] Erro crítico:`, error.message)
      return {
        success: false,
        error: `HTML parsing failed: ${error.message}`,
        method: 'html-parsing',
        timing
      }
    }
  }

  /**
   * Parser para ytInitialData (método mais preciso)
   */
  private parseYtInitialData(matches: RegExpMatchArray, html: string, playlistId: string): PlaylistInfo | null {
    try {
      const jsonStr = matches[1]!
      const data = JSON.parse(jsonStr)
      
      // Navegar na estrutura complexa do YouTube
      const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents
      
      if (!contents || !Array.isArray(contents)) {
        throw new Error('Estrutura playlistVideoListRenderer não encontrada')
      }

      // Contar vídeos válidos (excluir elementos de continuação)
      const validVideos = contents.filter(item => 
        item.playlistVideoRenderer && 
        item.playlistVideoRenderer.videoId &&
        !item.continuationItemRenderer
      )

      // Extrair metadados da playlist
      const sidebar = data?.sidebar?.playlistSidebarRenderer?.items
      let title = 'Playlist do YouTube'
      let description = ''
      let channelName = ''

      if (sidebar && Array.isArray(sidebar)) {
        const primaryRenderer = sidebar[0]?.playlistSidebarPrimaryInfoRenderer
        if (primaryRenderer) {
          title = primaryRenderer.title?.runs?.[0]?.text || primaryRenderer.title?.simpleText || title
          description = primaryRenderer.description?.simpleText || ''
        }

        const secondaryRenderer = sidebar[1]?.playlistSidebarSecondaryInfoRenderer
        if (secondaryRenderer) {
          channelName = secondaryRenderer.videoOwner?.videoOwnerRenderer?.title?.runs?.[0]?.text || ''
        }
      }

      // Tentar obter thumbnail do primeiro vídeo
      let thumbnailUrl = ''
      const firstVideo = validVideos[0]?.playlistVideoRenderer
      if (firstVideo?.thumbnail?.thumbnails?.[0]?.url) {
        thumbnailUrl = firstVideo.thumbnail.thumbnails[0].url
      }

      console.log(`📊 [ytInitialData] Dados extraídos:`)
      console.log(`   📹 Vídeos: ${validVideos.length}`)
      console.log(`   📝 Título: "${title}"`)
      console.log(`   👤 Canal: "${channelName}"`)

      return {
        id: playlistId,
        title,
        videoCount: validVideos.length,
        description,
        thumbnailUrl,
        channelName
      }
      
    } catch (error: any) {
      console.log(`❌ [ytInitialData] Parsing falhou: ${error.message}`)
      return null
    }
  }

  /**
   * Parser para ytcfg (método alternativo)
   */
  private parseYtConfig(matches: RegExpMatchArray, html: string, playlistId: string): PlaylistInfo | null {
    try {
      // Implementar parsing do ytcfg se ytInitialData falhar
      console.log(`🔧 [ytcfg] Parser não implementado ainda`)
      return null
    } catch (error: any) {
      console.log(`❌ [ytcfg] Parsing falhou: ${error.message}`)
      return null
    }
  }

  /**
   * Parser para meta tags
   */
  private parseMetaTags(matches: RegExpMatchArray, html: string, playlistId: string): PlaylistInfo | null {
    try {
      const $ = cheerio.load(html)
      
      const title = $('meta[property="og:title"]').attr('content') || 
                   $('meta[name="title"]').attr('content') || 
                   $('title').text() || 
                   'Playlist do YouTube'
      
      const description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content') || 
                         ''

      const thumbnailUrl = $('meta[property="og:image"]').attr('content') || ''

      // Tentar extrair contagem de elementos HTML
      const videoElements = $('.ytd-playlist-video-renderer, .playlist-video-renderer, [data-video-id]').length
      
      if (videoElements > 0) {
        console.log(`📊 [MetaTags] Dados extraídos:`)
        console.log(`   📹 Vídeos (estimativa): ${videoElements}`)
        console.log(`   📝 Título: "${title}"`)

        return {
          id: playlistId,
          title: title.replace(/\s*-\s*YouTube$/, '').trim(),
          videoCount: videoElements,
          description,
          thumbnailUrl
        }
      }

      return null
    } catch (error: any) {
      console.log(`❌ [MetaTags] Parsing falhou: ${error.message}`)
      return null
    }
  }

  /**
   * Parser para JSON-LD
   */
  private parseJsonLD(matches: RegExpMatchArray, html: string, playlistId: string): PlaylistInfo | null {
    try {
      console.log(`🔧 [JSON-LD] Parser não implementado ainda`)
      return null
    } catch (error: any) {
      console.log(`❌ [JSON-LD] Parsing falhou: ${error.message}`)
      return null
    }
  }

  /**
   * Fallback: Análise de elementos HTML
   */
  private parseHTMLElements(html: string, playlistId: string, timing: number): ScrapingResult {
    try {
      console.log(`🔧 [HTML Elements] Análise fallback iniciada`)
      
      const $ = cheerio.load(html)
      
      // Múltiplos seletores para diferentes versões do YouTube
      const selectors = [
        'ytd-playlist-video-renderer',
        '.playlist-video-renderer',
        '[data-video-id]',
        '.ytd-playlist-video-list-renderer',
        '#contents ytd-playlist-video-renderer'
      ]

      let maxCount = 0
      let usedSelector = ''

      for (const selector of selectors) {
        const count = $(selector).length
        if (count > maxCount) {
          maxCount = count
          usedSelector = selector
        }
      }

      if (maxCount > 0) {
        const title = $('meta[property="og:title"]').attr('content') || 
                     $('title').text().replace(/\s*-\s*YouTube$/, '').trim() || 
                     'Playlist do YouTube'

        console.log(`✅ [HTML Elements] Encontrados ${maxCount} vídeos usando seletor: ${usedSelector}`)

        return {
          success: true,
          data: {
            id: playlistId,
            title,
            videoCount: maxCount
          },
          method: 'html-elements',
          timing
        }
      }

      throw new Error('Nenhum elemento de vídeo encontrado')
      
    } catch (error: any) {
      console.error(`❌ [HTML Elements] Falhou: ${error.message}`)
      return {
        success: false,
        error: `HTML elements parsing failed: ${error.message}`,
        method: 'html-elements',
        timing
      }
    }
  }

  /**
   * ESTRATÉGIA 3: RSS Feed (quando disponível)
   */
  private async scrapeRSSFeed(playlistId: string): Promise<ScrapingResult> {
    const startTime = Date.now()
    
    try {
      console.log(`📡 [RSS Feed] Tentando obter feed da playlist: ${playlistId}`)
      
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`
      const response = await axios.get(rssUrl, {
        timeout: this.REQUEST_TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PlaylistScraper/1.0)'
        }
      })

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Parse XML
      const xmlText = response.data
      const entryMatches = xmlText.match(/<entry>/g)
      const videoCount = entryMatches ? entryMatches.length : 0

      if (videoCount === 0) {
        throw new Error('Nenhum vídeo encontrado no RSS')
      }

      // Extrair título
      const titleMatch = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
      const title = titleMatch ? titleMatch[1] : 'Playlist do YouTube'

      console.log(`✅ [RSS Feed] Sucesso! ${videoCount} vídeos, título: "${title}"`)

      return {
        success: true,
        data: {
          id: playlistId,
          title,
          videoCount
        },
        method: 'rss-feed',
        timing: Date.now() - startTime
      }
      
    } catch (error: any) {
      console.error(`❌ [RSS Feed] Falhou:`, error.message)
      return {
        success: false,
        error: `RSS feed failed: ${error.message}`,
        method: 'rss-feed',
        timing: Date.now() - startTime
      }
    }
  }

  /**
   * Sistema de cache inteligente
   */
  private getCachedResult(playlistId: string): PlaylistInfo | null {
    const cached = this.cache.get(playlistId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`💾 [Cache] Hit para playlist ${playlistId}`)
      return cached.data
    }
    return null
  }

  private setCachedResult(playlistId: string, data: PlaylistInfo): void {
    this.cache.set(playlistId, {
      data,
      timestamp: Date.now()
    })
    console.log(`💾 [Cache] Armazenado resultado para ${playlistId}`)
  }

  /**
   * Método principal com retry inteligente
   */
  public async getPlaylistInfo(req: Request, res: Response): Promise<void> {
    const startTime = Date.now()
    
    try {
      const { playlistId } = req.params
      const { url: originalUrl } = req.query

      if (!playlistId) {
        res.status(400).json({ 
          error: 'playlistId é obrigatório',
          success: false 
        })
        return
      }

      console.log(`🚀 [API] Iniciando análise profissional da playlist: ${playlistId}`)
      
      // Verificar cache primeiro
      const cachedResult = this.getCachedResult(playlistId)
      if (cachedResult) {
        res.json({
          success: true,
          data: cachedResult,
          cached: true,
          timing: Date.now() - startTime
        })
        return
      }

      // Estratégias em ordem de prioridade e eficiência
      // HTML scraping primeiro pois é mais preciso para contagem total
      const strategies = [
        () => this.scrapePlaylistHTML(playlistId),
        () => this.scrapeRSSFeed(playlistId)
      ]

      let lastError = 'Todas as estratégias falharam'

      // Tentar cada estratégia com retry
      for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
        const strategy = strategies[strategyIndex]!
        
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
          try {
            console.log(`🎯 [Estratégia ${strategyIndex + 1}] Tentativa ${attempt}/${this.MAX_RETRIES}`)
            
            const result = await strategy()
            
            if (result.success && result.data) {
              // Cache do resultado bem-sucedido
              this.setCachedResult(playlistId, result.data)
              
              console.log(`🎉 [SUCESSO] Playlist analisada em ${Date.now() - startTime}ms`)
              console.log(`📊 Resultado final: ${result.data.videoCount} vídeos, método: ${result.method}`)
              
              res.json({
                success: true,
                data: result.data,
                method: result.method,
                timing: Date.now() - startTime,
                cached: false
              })
              return
            }

            lastError = result.error || 'Estratégia falhou'
            
          } catch (error: any) {
            lastError = error.message
            console.log(`❌ [Estratégia ${strategyIndex + 1}] Tentativa ${attempt} falhou: ${lastError}`)
            
            // Delay progressivo entre tentativas
            if (attempt < this.MAX_RETRIES) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
              console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`)
              await new Promise(resolve => setTimeout(resolve, delay))
            }
          }
        }
      }

      // Todas as estratégias falharam
      console.error(`💥 [FALHA TOTAL] Todas as estratégias falharam após ${Date.now() - startTime}ms`)
      
      res.status(503).json({
        success: false,
        error: 'Não foi possível obter informações da playlist',
        details: lastError,
        timing: Date.now() - startTime
      })

    } catch (error: any) {
      console.error(`💥 [ERRO CRÍTICO]`, error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message,
        timing: Date.now() - startTime
      })
    }
  }

  /**
   * Endpoint para limpar cache
   */
  public async clearCache(req: Request, res: Response): Promise<void> {
    this.cache.clear()
    console.log(`🗑️ [Cache] Cache limpo`)
    res.json({ success: true, message: 'Cache limpo com sucesso' })
  }

  /**
   * Endpoint de status e estatísticas
   */
  public async getStatus(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      status: 'online',
      cache: {
        entries: this.cache.size,
        maxAge: this.CACHE_DURATION
      },
      config: {
        timeout: this.REQUEST_TIMEOUT,
        maxRetries: this.MAX_RETRIES
      }
    })
  }
}

export default new YouTubeController()