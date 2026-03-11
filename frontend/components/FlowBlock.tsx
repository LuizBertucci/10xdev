'use client'

import type { FlowItem, FlowLayer } from '@/types/cardfeature'

const LAYER_COLORS: Record<FlowLayer, string> = {
  frontend: 'bg-gray-100 border-gray-400 text-gray-900',
  api: 'bg-gray-100 border-gray-400 text-gray-900',
  backend: 'bg-gray-100 border-gray-400 text-gray-900',
  database: 'bg-gray-100 border-gray-400 text-gray-900',
  service: 'bg-gray-100 border-gray-400 text-gray-900'
}

const LAYER_ICONS: Record<FlowLayer, string> = {
  frontend: '🔵',
  api: '🟣',
  backend: '🟢',
  database: '🟠',
  service: '⚫'
}

interface FlowBlockProps {
  content: string
  className?: string
}

function parseFlowContent(content: string): FlowItem[] {
  try {
    const parsed = JSON.parse(content || '[]')
    return Array.isArray(parsed) ? parsed : (parsed?.contents && Array.isArray(parsed.contents) ? parsed.contents : [])
  } catch {
    return []
  }
}

export default function FlowBlock({ content, className }: FlowBlockProps) {
  const items = parseFlowContent(content)

  if (items.length === 0) {
    return (
      <div className={`flow-block mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm ${className}`}>
        Nenhum item no fluxo.
      </div>
    )
  }

  return (
    <div
      className={`flow-block mb-4 flex flex-col items-center gap-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-stretch ${className}`}
    >
      {items.map((item, index) => (
        <div key={index} className="flex flex-col items-center w-full max-w-md lg:max-w-none">
          <div
            className={`w-full rounded-lg border-2 p-3 shadow-sm lg:h-[140px] lg:flex lg:flex-col ${LAYER_COLORS[item.layer] || LAYER_COLORS.service}`}
          >
            <div className="font-semibold text-sm flex items-center gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-[10px] font-bold"
                title={`Passo ${index + 1}`}
              >
                {index + 1}
              </span>
              <span>{LAYER_ICONS[item.layer] || '•'}</span>
              {item.label}
            </div>
            {(item.file || item.line) && (
              <div className="text-xs mt-1 opacity-90 font-mono">
                {[item.file, item.line].filter(Boolean).join(':')}
              </div>
            )}
            {item.description && (
              <div className="text-xs mt-1 opacity-80">{item.description}</div>
            )}
          </div>
          {index < items.length - 1 && (
            <div className="flex flex-col items-center py-1 lg:hidden">
              <div className="w-0.5 h-3 bg-gray-300" />
              <span className="text-gray-400 text-xs">▼</span>
              <div className="w-0.5 h-3 bg-gray-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
