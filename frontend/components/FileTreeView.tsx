'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface TreeNode {
  children: Record<string, TreeNode>
  isDir: boolean
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { children: {}, isDir: true }
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean)
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      if (!node.children[part]) {
        node.children[part] = { children: {}, isDir: i < parts.length - 1 }
      }
      node = node.children[part]!
    }
  }
  return root
}

interface TreeNodeViewProps {
  name: string
  node: TreeNode
  depth: number
  expandAll: boolean
}

function TreeNodeView({ name, node, depth, expandAll }: TreeNodeViewProps) {
  const [localOpen, setLocalOpen] = useState(false)

  if (!node.isDir) {
    return (
      <div
        className="flex items-center gap-1 py-0.5 leading-tight"
        style={{ paddingLeft: depth * 12 }}
      >
        <span className="text-gray-300 text-[9px] flex-shrink-0">─</span>
        <span className="text-[9px] text-gray-400 font-mono truncate">{name}</span>
      </div>
    )
  }

  const isOpen = expandAll || localOpen
  const sortedChildren = Object.entries(node.children).sort(([, a], [, b]) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return 0
  })

  return (
    <div>
      <button
        onClick={() => setLocalOpen(v => !v)}
        className="flex items-center gap-1 py-0.5 w-full text-left hover:bg-gray-100 rounded-sm transition-colors"
        style={{ paddingLeft: depth * 12 }}
      >
        {isOpen
          ? <ChevronDown className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
        }
        <span className="text-[9px] text-gray-600 font-medium font-mono">{name}/</span>
      </button>
      {isOpen && sortedChildren.map(([childName, childNode]) => (
        <TreeNodeView
          key={childName}
          name={childName}
          node={childNode}
          depth={depth + 1}
          expandAll={expandAll}
        />
      ))}
    </div>
  )
}

interface FileTreeViewProps {
  paths: string[]
}

export default function FileTreeView({ paths }: FileTreeViewProps) {
  const [expandAll, setExpandAll] = useState(false)
  const tree = useMemo(() => buildTree(paths), [paths])

  const sortedRoots = Object.entries(tree.children).sort(([, a], [, b]) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return 0
  })

  return (
    <div>
      <div className="flex justify-end mb-1">
        <button
          onClick={() => setExpandAll(v => !v)}
          className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors"
        >
          {expandAll ? 'Recolher todos' : 'Expandir todos'}
        </button>
      </div>
      <div className="font-mono">
        {sortedRoots.map(([name, node]) => (
          <TreeNodeView
            key={name}
            name={name}
            node={node}
            depth={0}
            expandAll={expandAll}
          />
        ))}
      </div>
    </div>
  )
}
