import React from 'react'
import SyntaxHighlighter from './SyntaxHighlighter'
import { ContentType, ContentBlock } from '@/types'

// ===== CONTAINERS ESPECÍFICOS POR TIPO =====

// Container para blocos CODE - área azul clara com borda e sombra
function CodeBlockContainer({ children, route, className }: { children: React.ReactNode, route?: string, className?: string }) {
  return (
    <div className={`code-container rounded-lg p-2 sm:p-3 md:p-4 mb-4 sm:mb-6 border border-gray-200 shadow-md hover:shadow-lg transition-shadow w-full overflow-hidden ${className}`}
         style={{ backgroundColor: '#f8f8ff', fontFamily: 'Fira Code, Consolas, Monaco, monospace' }}>
      {/* Rota específica do bloco */}
      {route && (
        <div className="mb-2 sm:mb-3">
          <div className="bg-white border border-gray-300 rounded-lg px-2 sm:px-3 py-2 shadow-sm inline-block w-full overflow-hidden">
            <span className="text-xs text-gray-600 font-mono break-all">
              {route}
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

// Container para blocos TEXT - apenas texto sem bordas
function TextBlockContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`text-container mb-4 prose prose-sm max-w-none w-full overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

// Container para blocos TERMINAL - área preta/verde
function TerminalBlockContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`terminal-container bg-gray-900 text-green-400 rounded-lg p-2 sm:p-3 md:p-4 mb-4 font-mono text-sm w-full overflow-hidden ${className}`}
         style={{
           boxSizing: 'border-box',
           minWidth: 0,
           maxWidth: '100%'
         }}>
      <div className="w-full overflow-x-auto" style={{minWidth: 0}}>
        {children}
      </div>
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
            language={block.language || 'javascript'}
          />
        </CodeBlockContainer>
      )
    
    case ContentType.TEXT:
      return (
        <TextBlockContainer className={className}>
          <div className="whitespace-pre-wrap break-words text-xs">
            {block.content}
          </div>
        </TextBlockContainer>
      )    
    case ContentType.TERMINAL:
      return (
        <TerminalBlockContainer className={className}>
          <pre className="whitespace-pre-wrap break-words overflow-wrap-anywhere" style={{wordBreak: 'break-all', overflowWrap: 'anywhere'}}>
            {block.content}
          </pre>
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
    <div className={`content-renderer pb-4 ${className}`}>
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
