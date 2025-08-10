// ================================================
// THUMBNAIL AI SERVICE - Geração de Thumbnails Personalizadas
// ================================================

interface ThumbnailGenerationRequest {
  title: string
  description?: string
  originalThumbnail?: string
  difficulty: "Iniciante" | "Intermediário" | "Avançado"
  videoCount: number
  playlistId: string
}

interface GeneratedThumbnail {
  url: string
  prompt: string
  style: string
}

class ThumbnailAI {
  private readonly SITE_BRAND_COLORS = {
    primary: '#2563eb', // blue-600
    secondary: '#1e40af', // blue-700
    accent: '#3b82f6', // blue-500
    success: '#059669', // emerald-600
    warning: '#d97706', // amber-600
    danger: '#dc2626', // red-600
  }

  private readonly DESIGN_STYLES = [
    'modern-gradient',
    'tech-minimalist',
    'developer-dark',
    'clean-professional',
    'vibrant-coding'
  ]

  /**
   * Gera uma thumbnail personalizada usando IA (simulação)
   * Em produção, isso se conectaria a uma API como DALL-E, Midjourney, etc.
   */
  async generateCustomThumbnail(request: ThumbnailGenerationRequest): Promise<GeneratedThumbnail> {
    // Simular delay da API de IA
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Construir prompt baseado nos dados da playlist
    const prompt = this.buildPrompt(request)
    
    // Determinar estilo baseado na dificuldade e conteúdo
    const style = this.selectStyle(request)
    
    // Em produção, aqui faria a chamada para a API de IA
    // Por enquanto, retornaremos uma URL simulada
    const thumbnailUrl = await this.generateMockThumbnail(request, style)
    
    return {
      url: thumbnailUrl,
      prompt,
      style
    }
  }

  /**
   * Constrói o prompt para a IA baseado nos dados da playlist
   */
  private buildPrompt(request: ThumbnailGenerationRequest): string {
    const { title, difficulty, videoCount } = request
    
    // Analisar o título para identificar tecnologias
    const technologies = this.extractTechnologies(title)
    const techIcons = technologies.length > 0 ? technologies.join(', ') : 'programming'
    
    // Definir cor baseada na dificuldade
    const difficultyColor = {
      'Iniciante': 'green and blue',
      'Intermediário': 'blue and purple', 
      'Avançado': 'red and orange'
    }[difficulty]

    const prompt = `Create a modern, professional thumbnail for a programming course called "${title}". 
    Style: Clean, minimalist design with ${difficultyColor} gradient background. 
    Include: ${techIcons} technology icons, course title text, "${videoCount} videos" badge.
    Design: Match 10xDev brand identity - modern, tech-focused, professional.
    Layout: Left side for icons/graphics, right side for text.
    Colors: Primary blue (#2563eb), gradients, high contrast text.
    No faces, focus on technology and learning concepts.`

    return prompt
  }

  /**
   * Extrai tecnologias do título para personalizar o design
   */
  private extractTechnologies(title: string): string[] {
    const techKeywords = {
      'react': ['React', 'react'],
      'javascript': ['JavaScript', 'JS', 'javascript'],
      'typescript': ['TypeScript', 'TS', 'typescript'],
      'node': ['Node.js', 'Node', 'nodejs'],
      'python': ['Python', 'python'],
      'css': ['CSS', 'css'],
      'html': ['HTML', 'html'],
      'vue': ['Vue.js', 'Vue', 'vue'],
      'angular': ['Angular', 'angular'],
      'next': ['Next.js', 'Next', 'nextjs'],
      'express': ['Express', 'express'],
      'mongodb': ['MongoDB', 'mongo'],
      'api': ['API', 'REST', 'api'],
      'deploy': ['Deploy', 'deployment', 'vercel', 'netlify']
    }

    const foundTechs: string[] = []
    
    Object.entries(techKeywords).forEach(([tech, keywords]) => {
      const titleLower = title.toLowerCase()
      if (keywords.some(keyword => titleLower.includes(keyword.toLowerCase()))) {
        foundTechs.push(tech)
      }
    })

    return foundTechs
  }

  /**
   * Seleciona estilo baseado na dificuldade e conteúdo
   */
  private selectStyle(request: ThumbnailGenerationRequest): string {
    const { difficulty, title } = request
    
    // Estilo baseado na dificuldade
    if (difficulty === 'Iniciante') {
      return 'clean-professional'
    } else if (difficulty === 'Avançado') {
      return 'developer-dark'
    }
    
    // Estilo baseado no conteúdo
    if (title.toLowerCase().includes('react') || title.toLowerCase().includes('modern')) {
      return 'modern-gradient'
    }
    
    if (title.toLowerCase().includes('api') || title.toLowerCase().includes('backend')) {
      return 'tech-minimalist'
    }
    
    return 'vibrant-coding'
  }

  /**
   * Gera uma thumbnail mock (simulação da IA)
   * Em produção, isso retornaria a URL da imagem gerada pela IA
   */
  private async generateMockThumbnail(request: ThumbnailGenerationRequest, style: string): Promise<string> {
    const { title, difficulty, videoCount, playlistId } = request
    
    // Para desenvolvimento, vamos usar uma API de placeholder que gera imagens
    // Isso simula o resultado da IA com parâmetros baseados no conteúdo
    
    // Codificar informações no hash para gerar thumbnails consistentes
    const hash = this.generateConsistentHash(playlistId + title)
    
    // Cores baseadas na dificuldade
    const colorSchemes = {
      'Iniciante': '4ade80,22c55e', // green gradient
      'Intermediário': '3b82f6,2563eb', // blue gradient  
      'Avançado': 'f59e0b,ea580c' // orange gradient
    }
    
    const colors = colorSchemes[difficulty]
    
    // Usar uma API de geração de placeholder com gradiente personalizado
    // Isso simula uma thumbnail gerada por IA
    const width = 400
    const height = 225
    
    // Criar URL com parâmetros personalizados
    const thumbnailUrl = `https://via.placeholder.com/${width}x${height}/${colors.split(',')[0].replace('#', '')}/${colors.split(',')[1].replace('#', '')}/FFFFFF?text=${encodeURIComponent(this.shortenTitle(title))}+%7C+${videoCount}+videos`
    
    return thumbnailUrl
  }

  /**
   * Encurta o título para caber na thumbnail
   */
  private shortenTitle(title: string): string {
    if (title.length <= 20) return title
    
    const words = title.split(' ')
    let shortened = ''
    
    for (const word of words) {
      if ((shortened + word).length <= 20) {
        shortened += (shortened ? ' ' : '') + word
      } else {
        break
      }
    }
    
    return shortened + (shortened.length < title.length ? '...' : '')
  }

  /**
   * Gera hash consistente para o mesmo input
   */
  private generateConsistentHash(input: string): number {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Converte para 32 bits
    }
    return Math.abs(hash)
  }

  /**
   * Versão mais avançada usando Canvas API (para uso futuro)
   * Gera thumbnail customizada localmente
   */
  async generateCanvasThumbnail(request: ThumbnailGenerationRequest): Promise<string> {
    // Esta função poderia usar HTML5 Canvas para gerar thumbnails localmente
    // Por enquanto, retorna a versão mock
    return this.generateMockThumbnail(request, this.selectStyle(request))
  }
}

export const thumbnailAI = new ThumbnailAI()
export type { ThumbnailGenerationRequest, GeneratedThumbnail }