import React from 'react'
import SyntaxHighlighter from './SyntaxHighlighter'
import { ContentType, ContentBlock } from '@/types'

// ===== CONTAINERS ESPECÍFICOS POR TIPO =====

// Container para blocos CODE - área azul clara
function CodeBlockContainer({ children, route, className }: { children: React.ReactNode, route?: string, className?: string }) {
  return (
    <div className={`code-container rounded-lg p-4 mb-4 ${className}`} 
         style={{ backgroundColor: '#f8f8ff', fontFamily: 'Fira Code, Consolas, Monaco, monospace' }}>
      {/* Rota específica do bloco */}
      {route && (
        <div className="mb-3">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm inline-block">
            <span className="text-xs text-gray-600 font-mono">
              {route}
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

// Container para blocos TEXT - área branca com prose
function TextBlockContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`text-container bg-white border border-gray-200 rounded-lg p-4 mb-4 prose prose-sm max-w-none ${className}`}>
      {children}
    </div>
  )
}

// Container para blocos TERMINAL - área preta/verde
function TerminalBlockContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`terminal-container bg-gray-900 text-green-400 rounded-lg p-4 mb-4 font-mono text-sm ${className}`}>
      {children}
    </div>
  )
}

interface ContentRendererProps {
  blocks: ContentBlock[]
  className?: string
}

interface SingleBlockRendererProps {
  block: ContentBlock
  className?: string
}

// Renderizador para um bloco individual - SEM TÍTULOS/ÍCONES
function SingleBlockRenderer({ block, className }: SingleBlockRendererProps) {
  switch (block.type) {
    case ContentType.CODE:
      return (
        <CodeBlockContainer route={block.route} className={className}>
          <SyntaxHighlighter
            code={block.content}
            language={block.language}
          />
        </CodeBlockContainer>
      )
    
    case ContentType.TEXT:
      return (
        <TextBlockContainer className={className}>
          <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-sm">
            {block.content}
          </pre>
        </TextBlockContainer>
      )
    
    case ContentType.TERMINAL:
      return (
        <TerminalBlockContainer className={className}>
          <pre className="whitespace-pre-wrap">{block.content}</pre>
        </TerminalBlockContainer>
      )
    
    default:
      return (
        <div className="unknown-block mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <div className="text-red-800 font-medium">Tipo de bloco não suportado: {block.type}</div>
        </div>
      )
  }
}

// Renderizador principal para múltiplos blocos
export default function ContentRenderer({ blocks, className }: ContentRendererProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="empty-content p-8 text-center text-gray-500">
        <div className="text-4xl mb-2">📝</div>
        <div>Nenhum conteúdo adicionado</div>
      </div>
    )
  }

  // Ordenar blocos por order
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)

  return (
    <div className={`content-renderer ${className}`}>
      {sortedBlocks.map((block, index) => (
        <SingleBlockRenderer
          key={block.id || `block-${index}-${block.type}`}
          block={block}
          className="block-item"
        />
      ))}
    </div>
  )
}

// Renderizador para um único bloco (export adicional para casos específicos)
export { SingleBlockRenderer }