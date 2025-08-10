import { useEffect, useRef, useState } from 'react'
import type { ThumbnailGenerationRequest } from '@/services/thumbnailAI'

interface CustomThumbnailGeneratorProps {
  request: ThumbnailGenerationRequest
  onGenerated: (thumbnailUrl: string) => void
  className?: string
}

export default function CustomThumbnailGenerator({ 
  request, 
  onGenerated, 
  className = "w-full h-48 object-cover rounded-t-lg"
}: CustomThumbnailGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    generateThumbnail()
  }, [request])

  // Função para detectar e desenhar ícones específicos de tecnologia
  const drawTechIcon = (ctx: CanvasRenderingContext2D, tech: string, x: number, y: number, size: number) => {
    const centerX = x
    const centerY = y
    
    ctx.save()
    
    switch (tech.toLowerCase()) {
      case 'javascript':
      case 'js':
        // Logo do JavaScript (JS em fundo amarelo)
        ctx.fillStyle = '#F7DF1E'
        ctx.fillRect(centerX - size/2, centerY - size/2, size, size)
        ctx.fillStyle = '#000000'
        ctx.font = `bold ${size * 0.6}px "Arial Black", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('JS', centerX, centerY)
        break
        
      case 'python':
        // Logo do Python (símbolo serpente estilizado)
        ctx.fillStyle = '#3776AB'
        ctx.beginPath()
        ctx.arc(centerX, centerY, size/2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFD43B'
        ctx.beginPath()
        ctx.arc(centerX - size/6, centerY - size/6, size/4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#3776AB'
        ctx.font = `bold ${size * 0.3}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('PY', centerX, centerY + size/4)
        break
        
      case 'react':
        // Logo do React (átomo estilizado)
        ctx.strokeStyle = '#61DAFB'
        ctx.lineWidth = 3
        // Núcleo
        ctx.fillStyle = '#61DAFB'
        ctx.beginPath()
        ctx.arc(centerX, centerY, size/8, 0, Math.PI * 2)
        ctx.fill()
        // Órbitas
        for (let i = 0; i < 3; i++) {
          ctx.save()
          ctx.translate(centerX, centerY)
          ctx.rotate((i * Math.PI * 2) / 3)
          ctx.beginPath()
          ctx.ellipse(0, 0, size/2, size/6, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
        break
        
      case 'node':
      case 'nodejs':
        // Logo do Node.js
        ctx.fillStyle = '#339933'
        ctx.beginPath()
        ctx.arc(centerX, centerY, size/2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${size * 0.25}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('NODE', centerX, centerY)
        break
        
      case 'css':
        // Logo do CSS
        ctx.fillStyle = '#1572B6'
        const cssSize = size/2
        ctx.beginPath()
        ctx.moveTo(centerX - cssSize, centerY - cssSize)
        ctx.lineTo(centerX + cssSize, centerY - cssSize)
        ctx.lineTo(centerX + cssSize*0.8, centerY + cssSize)
        ctx.lineTo(centerX - cssSize*0.8, centerY + cssSize)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${size * 0.3}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('CSS', centerX, centerY)
        break
        
      case 'html':
        // Logo do HTML
        ctx.fillStyle = '#E34F26'
        const htmlSize = size/2
        ctx.beginPath()
        ctx.moveTo(centerX - htmlSize, centerY - htmlSize)
        ctx.lineTo(centerX + htmlSize, centerY - htmlSize)
        ctx.lineTo(centerX + htmlSize*0.8, centerY + htmlSize)
        ctx.lineTo(centerX - htmlSize*0.8, centerY + htmlSize)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${size * 0.25}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('HTML', centerX, centerY)
        break
        
      case 'typescript':
      case 'ts':
        // Logo do TypeScript
        ctx.fillStyle = '#3178C6'
        ctx.fillRect(centerX - size/2, centerY - size/2, size, size)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${size * 0.6}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('TS', centerX, centerY)
        break
        
      case 'vue':
        // Logo do Vue.js
        ctx.fillStyle = '#4FC08D'
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - size/2)
        ctx.lineTo(centerX + size/2, centerY + size/2)
        ctx.lineTo(centerX - size/2, centerY + size/2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#35495E'
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - size/4)
        ctx.lineTo(centerX + size/4, centerY + size/4)
        ctx.lineTo(centerX - size/4, centerY + size/4)
        ctx.closePath()
        ctx.fill()
        break
        
      case 'api':
      case 'rest':
        // Ícone de API
        ctx.strokeStyle = '#FF6B6B'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(centerX, centerY, size/3, 0, Math.PI * 2)
        ctx.stroke()
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6
          const x1 = centerX + Math.cos(angle) * size/3
          const y1 = centerY + Math.sin(angle) * size/3
          const x2 = centerX + Math.cos(angle) * size/2
          const y2 = centerY + Math.sin(angle) * size/2
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
        break
        
      default:
        // Ícone genérico de código
        ctx.fillStyle = '#6B73FF'
        ctx.beginPath()
        ctx.arc(centerX, centerY, size/2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${size * 0.4}px "Courier New", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('</>', centerX, centerY)
        break
    }
    
    ctx.restore()
  }

  // Função para detectar tecnologias no título
  const detectTechnology = (title: string): string => {
    const titleLower = title.toLowerCase()
    
    const techPatterns = [
      { pattern: /\b(javascript|js)\b/i, tech: 'javascript' },
      { pattern: /\b(python|py)\b/i, tech: 'python' },
      { pattern: /\b(react)\b/i, tech: 'react' },
      { pattern: /\b(node\.?js|node)\b/i, tech: 'node' },
      { pattern: /\b(typescript|ts)\b/i, tech: 'typescript' },
      { pattern: /\b(css)\b/i, tech: 'css' },
      { pattern: /\b(html)\b/i, tech: 'html' },
      { pattern: /\b(vue)\b/i, tech: 'vue' },
      { pattern: /\b(api|rest)\b/i, tech: 'api' },
      { pattern: /\b(angular)\b/i, tech: 'angular' },
      { pattern: /\b(express)\b/i, tech: 'node' },
      { pattern: /\b(next\.?js)\b/i, tech: 'react' },
    ]
    
    for (const { pattern, tech } of techPatterns) {
      if (pattern.test(title)) {
        return tech
      }
    }
    
    return 'code' // default
  }

  const generateThumbnail = async () => {
    if (!canvasRef.current) return
    
    setIsGenerating(true)
    
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Configurar dimensões de alta qualidade
      const scale = 2 // Aumentar resolução para melhor qualidade
      canvas.width = 400 * scale
      canvas.height = 225 * scale
      
      // Escalar contexto para renderização em alta resolução
      ctx.scale(scale, scale)
      const width = 400
      const height = 225

      // Limpar canvas
      ctx.clearRect(0, 0, width, height)

      // Detectar tecnologia do título
      const detectedTech = detectTechnology(request.title)

      // Paleta de cores futurista e vibrante
      const colorSchemes = {
        'Iniciante': { 
          primary: '#00ff88', // verde neon
          secondary: '#00cc6a', // verde escuro
          accent: '#66ffaa', // verde claro
          neon: '#00ff88',
          glow: '#00ff8840',
          dark: '#001a0f'
        },
        'Intermediário': { 
          primary: '#0088ff', // azul cyber
          secondary: '#0066cc', // azul escuro
          accent: '#66aaff', // azul claro
          neon: '#00aaff',
          glow: '#0088ff40',
          dark: '#000f1a'
        },
        'Avançado': { 
          primary: '#ff0066', // magenta cyber
          secondary: '#cc0044', // magenta escuro
          accent: '#ff6699', // magenta claro
          neon: '#ff0088',
          glow: '#ff006640',
          dark: '#1a000a'
        }
      }

      const colors = colorSchemes[request.difficulty]

      // Fundo cyberpunk com múltiplos gradientes
      const bgGradient = ctx.createRadialGradient(
        width * 0.3, height * 0.3, 0,
        width * 0.7, height * 0.7, width
      )
      bgGradient.addColorStop(0, colors.dark)
      bgGradient.addColorStop(0.4, '#000000')
      bgGradient.addColorStop(0.8, '#0a0a0a')
      bgGradient.addColorStop(1, '#1a1a1a')
      
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // Grid futurista com linhas brilhantes
      ctx.strokeStyle = colors.glow
      ctx.lineWidth = 1
      const gridSize = 25
      
      // Linhas verticais
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.globalAlpha = 0.3
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      
      // Linhas horizontais
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.globalAlpha = 0.2
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      
      ctx.globalAlpha = 1

      // Elementos geométricos futuristas
      const shapes = [
        { x: width * 0.1, y: height * 0.2, size: 15, opacity: 0.3 },
        { x: width * 0.85, y: height * 0.15, size: 8, opacity: 0.4 },
        { x: width * 0.9, y: height * 0.8, size: 12, opacity: 0.25 },
        { x: width * 0.15, y: height * 0.85, size: 6, opacity: 0.35 }
      ]

      shapes.forEach(shape => {
        ctx.save()
        ctx.globalAlpha = shape.opacity
        ctx.fillStyle = colors.accent
        ctx.translate(shape.x, shape.y)
        ctx.rotate(Math.PI / 4)
        ctx.fillRect(-shape.size/2, -shape.size/2, shape.size, shape.size)
        ctx.restore()
      })

      // Seção do ícone com hexágono futurista
      const iconCenterX = width * 0.25
      const iconCenterY = height / 2

      // Hexágono de fundo para o ícone
      const hexRadius = 60
      ctx.save()
      
      // Glow externo do hexágono
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 25
      ctx.strokeStyle = colors.primary
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const x = iconCenterX + hexRadius * Math.cos(angle)
        const y = iconCenterY + hexRadius * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
      
      // Hexágono interno com gradiente
      const hexGradient = ctx.createRadialGradient(
        iconCenterX, iconCenterY, 0,
        iconCenterX, iconCenterY, hexRadius
      )
      hexGradient.addColorStop(0, `${colors.primary}30`)
      hexGradient.addColorStop(0.7, `${colors.primary}10`)
      hexGradient.addColorStop(1, 'transparent')
      ctx.fillStyle = hexGradient
      ctx.fill()
      
      ctx.restore()

      // Círculos orbitais ao redor do ícone
      const orbitRadius = 80
      const orbitCount = 3
      for (let i = 0; i < orbitCount; i++) {
        const angle = (i / orbitCount) * Math.PI * 2 + (Date.now() * 0.0005)
        const orbitX = iconCenterX + orbitRadius * Math.cos(angle)
        const orbitY = iconCenterY + orbitRadius * Math.sin(angle)
        
        ctx.save()
        ctx.globalAlpha = 0.6
        ctx.fillStyle = colors.accent
        ctx.beginPath()
        ctx.arc(orbitX, orbitY, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Ícone da tecnologia com múltiplos efeitos glow
      ctx.save()
      ctx.shadowColor = colors.neon
      ctx.shadowBlur = 30
      drawTechIcon(ctx, detectedTech, iconCenterX, iconCenterY, 50)
      ctx.restore()
      
      // Ícone principal nítido
      drawTechIcon(ctx, detectedTech, iconCenterX, iconCenterY, 50)

      // Seção do texto com panel futurista
      const textSectionX = width * 0.5
      const textMaxWidth = width - textSectionX - 30

      // Panel de fundo para o texto
      const panelX = textSectionX - 10
      const panelY = 30
      const panelWidth = width - panelX - 15
      const panelHeight = height - 60

      // Fundo do panel com gradiente
      const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY + panelHeight)
      panelGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)')
      panelGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)')
      
      ctx.fillStyle = panelGradient
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight)
      
      // Borda do panel com efeito neon
      ctx.save()
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 8
      ctx.strokeStyle = colors.primary
      ctx.lineWidth = 1
      ctx.strokeRect(panelX, panelY, panelWidth, panelHeight)
      ctx.restore()

      // Preparar título com fonte futurista
      const words = request.title.split(' ')
      let processedLines: string[] = []
      let currentLine = ''
      
      ctx.font = 'bold 26px "Orbitron", "Segoe UI", sans-serif'
      
      // Algoritmo de quebra de linha otimizado
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = ctx.measureText(testLine).width
        
        if (testWidth > textMaxWidth - 20 && currentLine) {
          processedLines.push(currentLine.trim())
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      
      if (currentLine) {
        processedLines.push(currentLine.trim())
      }

      // Limitar a 2 linhas
      if (processedLines.length > 2) {
        processedLines = processedLines.slice(0, 2)
        const lastLine = processedLines[1]
        if (lastLine.length > 15) {
          processedLines[1] = lastLine.substring(0, 12) + '...'
        }
      }

      // Título com efeito neon
      const titleStartY = 65
      const lineHeight = 34
      
      processedLines.forEach((line, index) => {
        const y = titleStartY + (index * lineHeight)
        
        // Glow do título
        ctx.save()
        ctx.shadowColor = colors.neon
        ctx.shadowBlur = 15
        ctx.fillStyle = colors.neon
        ctx.fillText(line, textSectionX, y)
        ctx.restore()
        
        // Texto principal branco
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(line, textSectionX, y)
      })

      // Badge de dificuldade com alinhamento FIXO
      const fixedBadgeY = height - 80 // Posição fixa independente do título
      const badgeHeight = 30
      const badgePadding = 20
      
      // Medir largura do texto do badge
      ctx.font = 'bold 14px "Orbitron", sans-serif'
      const badgeText = request.difficulty.toUpperCase()
      const badgeTextWidth = ctx.measureText(badgeText).width
      const badgeWidth = badgeTextWidth + (badgePadding * 2)

      // Fundo do badge com forma futurista
      const badgeX = textSectionX
      
      // Hexágono do badge
      ctx.save()
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 10
      
      // Fundo escuro do badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(badgeX, fixedBadgeY, badgeWidth, badgeHeight)
      
      // Bordas neon do badge
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = 2
      ctx.strokeRect(badgeX, fixedBadgeY, badgeWidth, badgeHeight)
      
      // Cantos chanfrados
      const chamferSize = 6
      ctx.fillStyle = colors.accent
      // Canto superior esquerdo
      ctx.beginPath()
      ctx.moveTo(badgeX, fixedBadgeY + chamferSize)
      ctx.lineTo(badgeX + chamferSize, fixedBadgeY)
      ctx.lineTo(badgeX, fixedBadgeY)
      ctx.fill()
      
      // Canto inferior direito  
      ctx.beginPath()
      ctx.moveTo(badgeX + badgeWidth - chamferSize, fixedBadgeY + badgeHeight)
      ctx.lineTo(badgeX + badgeWidth, fixedBadgeY + badgeHeight - chamferSize)
      ctx.lineTo(badgeX + badgeWidth, fixedBadgeY + badgeHeight)
      ctx.fill()
      
      // Texto do badge
      ctx.fillStyle = colors.accent
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(badgeText, badgeX + badgeWidth/2, fixedBadgeY + badgeHeight/2)
      ctx.restore()
      
      // Reset text alignment
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'

      // Logo futurista
      ctx.save()
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 6
      ctx.fillStyle = colors.primary
      ctx.font = 'bold 16px "Orbitron", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('10x', width - 45, 25)
      
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText('DEV', width - 15, 25)
      ctx.restore()

      // Linhas de energia conectando elementos
      ctx.save()
      ctx.strokeStyle = colors.glow
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      
      // Linha do ícone para o texto
      ctx.beginPath()
      ctx.moveTo(iconCenterX + 70, iconCenterY)
      ctx.lineTo(textSectionX - 20, titleStartY + 10)
      ctx.stroke()
      
      // Linha decorativa vertical
      ctx.setLineDash([])
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(textSectionX - 15, panelY)
      ctx.lineTo(textSectionX - 15, panelY + panelHeight)
      ctx.stroke()
      ctx.restore()

      // Converter para data URL com qualidade máxima
      const dataUrl = canvas.toDataURL('image/png', 1.0)
      setThumbnailUrl(dataUrl)
      onGenerated(dataUrl)
      
    } catch (error) {
      console.error('Erro ao gerar thumbnail:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="relative">
      <canvas 
        ref={canvasRef}
        className="hidden"
        width={400}
        height={225}
      />
      
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl}
          alt={`Thumbnail gerada para ${request.title}`}
          className={className}
        />
      ) : (
        <div className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}>
          {isGenerating ? (
            <div className="text-gray-500 text-sm">
              🎨 Gerando thumbnail...
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              Carregando...
            </div>
          )}
        </div>
      )}
    </div>
  )
}