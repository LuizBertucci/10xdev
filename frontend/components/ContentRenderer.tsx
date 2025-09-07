import React from 'react'
import SyntaxHighlighter from './SyntaxHighlighter'
import { ContentType, ContentBlock } from '@/types'

interface ContentRendererProps {
  blocks: ContentBlock[]
  className?: string
}

interface SingleBlockRendererProps {
  block: ContentBlock
  className?: string
}

// Renderizador para um bloco individual
function SingleBlockRenderer({ block, className }: SingleBlockRendererProps) {
  switch (block.type) {
    case ContentType.CODE:
      return (
        <div className="code-block mb-4">
          {block.title && (
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <span className="mr-2">💻</span>
              {block.title}
            </div>
          )}
          <SyntaxHighlighter
            code={block.content}
            language={block.language}
            className={className}
          />
        </div>
      )
    
    case ContentType.TEXT:
      return (
        <div className="text-block mb-4">
          {block.title && (
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <span className="mr-2">📄</span>
              {block.title}
            </div>
          )}
          <div className={`text-content ${className}`}>
            <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
              {block.content}
            </pre>
          </div>
        </div>
      )
    
    case ContentType.TERMINAL:
      return (
        <div className="terminal-block mb-4">
          {block.title && (
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <span className="mr-2">⚡</span>
              {block.title}
            </div>
          )}
          <div className={`terminal-content bg-gray-900 text-green-400 p-4 rounded font-mono text-sm ${className}`}>
            <pre className="whitespace-pre-wrap">{block.content}</pre>
          </div>
        </div>
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
      {sortedBlocks.map((block) => (
        <SingleBlockRenderer
          key={block.id}
          block={block}
          className="block-item"
        />
      ))}
    </div>
  )
}

// Renderizador para um único bloco (export adicional para casos específicos)
export { SingleBlockRenderer }