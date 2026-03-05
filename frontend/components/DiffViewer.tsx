"use client"

import type { CommitFile } from "@/services"

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type SideType = 'removed' | 'added' | 'context' | 'empty'

interface SplitLine {
  left:  { content: string; type: SideType }
  right: { content: string; type: SideType }
}

type DiffRow = { kind: 'line' } & SplitLine

// ────────────────────────────────────────────────────────────
// Parser
// ────────────────────────────────────────────────────────────

function parseSplitDiff(patch: string): DiffRow[] {
  const lines = patch.split('\n')
  const rows: DiffRow[] = []
  const removed: string[] = []
  const added: string[] = []

  const flush = () => {
    const len = Math.max(removed.length, added.length)
    for (let i = 0; i < len; i++) {
      rows.push({
        kind: 'line',
        left:  removed[i] !== undefined ? { content: removed[i]!, type: 'removed' } : { content: '', type: 'empty' },
        right: added[i]   !== undefined ? { content: added[i]!,   type: 'added'   } : { content: '', type: 'empty' },
      })
    }
    removed.length = 0
    added.length = 0
  }

  for (const line of lines) {
    if (line.startsWith('@@')) {
      flush()
    } else if (line.startsWith('-')) {
      removed.push(line.slice(1))
    } else if (line.startsWith('+')) {
      added.push(line.slice(1))
    } else {
      flush()
      const content = line.startsWith(' ') ? line.slice(1) : line
      rows.push({
        kind: 'line',
        left:  { content, type: 'context' },
        right: { content, type: 'context' },
      })
    }
  }
  flush()

  return rows
}

// ────────────────────────────────────────────────────────────
// Cell styles
// ────────────────────────────────────────────────────────────

const SIDE_CLS: Record<SideType, string> = {
  removed: 'bg-red-50   text-red-800',
  added:   'bg-green-50 text-green-800',
  context: 'text-muted-foreground',
  empty:   'bg-muted/30',
}

const SIDE_PREFIX: Record<SideType, string> = {
  removed: '-',
  added:   '+',
  context: ' ',
  empty:   ' ',
}

const STATUS_CLS: Record<string, string> = {
  added:    'bg-green-100  text-green-800  border-green-200',
  removed:  'bg-red-100    text-red-800    border-red-200',
  modified: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  renamed:  'bg-blue-100   text-blue-800   border-blue-200',
}

const STATUS_LABEL: Record<string, string> = {
  added: 'adicionado', removed: 'removido', modified: 'modificado', renamed: 'renomeado',
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

interface DiffViewerProps {
  files: CommitFile[]
}

export default function DiffViewer({ files }: DiffViewerProps) {
  return (
    <div className="space-y-3">
      {files.map((file, fi) => {
        const rows = file.patch ? parseSplitDiff(file.patch) : null

        return (
          <div key={fi} className="rounded-md border overflow-hidden">
            {/* File header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b text-xs">
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium border ${STATUS_CLS[file.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {STATUS_LABEL[file.status] ?? file.status}
              </span>
              <code className="text-muted-foreground truncate flex-1">{file.filename}</code>
              <span className="flex-shrink-0 tabular-nums text-muted-foreground">
                <span className="text-green-600">+{file.additions}</span>{' '}
                <span className="text-red-600">-{file.deletions}</span>
              </span>
            </div>

            {/* Split diff body */}
            {rows ? (
              <div className="overflow-auto h-96 min-h-48 max-h-[75vh] resize-y font-mono text-xs">
                {rows.map((row, i) => {
                  return (
                    <div key={i} className="grid grid-cols-2 divide-x border-b border-b-muted/30 last:border-b-0">
                      <div className={`px-2 py-0.5 whitespace-pre-wrap break-all ${SIDE_CLS[row.left.type]}`}>
                        <span className="select-none opacity-50 mr-1">{SIDE_PREFIX[row.left.type]}</span>
                        {row.left.content}
                      </div>
                      <div className={`px-2 py-0.5 whitespace-pre-wrap break-all ${SIDE_CLS[row.right.type]}`}>
                        <span className="select-none opacity-50 mr-1">{SIDE_PREFIX[row.right.type]}</span>
                        {row.right.content}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-3 py-2">
                {file.status === 'removed' ? 'Arquivo removido' : 'Sem diff disponível'}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
