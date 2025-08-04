import { Prism as SyntaxHighlighterLib } from 'react-syntax-highlighter'
import { coldarkCold } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface SyntaxHighlighterProps {
  code: string
  language: string
}

// Map language names to supported Prism languages
const mapLanguage = (language: string): string => {
  const langMap: Record<string, string> = {
    'typescript': 'typescript',
    'javascript': 'javascript',
    'python': 'python',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'jsx': 'jsx',
    'tsx': 'tsx'
  }
  return langMap[language.toLowerCase()] || 'javascript'
}

export default function SyntaxHighlighter({ 
  code, 
  language
}: SyntaxHighlighterProps) {
  const mappedLanguage = mapLanguage(language)
  
  return (
    <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'transparent' }}>
      <SyntaxHighlighterLib
        language={mappedLanguage}
        style={coldarkCold}
        customStyle={{
          background: 'transparent',
          backgroundColor: 'transparent',
          margin: 0,
          padding: 0,
          border: 'none',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '12px',
          lineHeight: 1.4,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          overflowX: 'hidden',
          wordBreak: 'normal'
        }}
        codeTagProps={{
          style: {
            fontFamily: 'Consolas, Monaco, "Courier New", monospace'
          }
        }}
        wrapLongLines={true}
        showLineNumbers={true}
        lineNumberStyle={{
          minWidth: '3em',
          paddingRight: '1em',
          textAlign: 'left',
          userSelect: 'none',
          opacity: 0.7,
          fontSize: '11px',
          color: '#6b7280'
        }}
      >
        {code}
      </SyntaxHighlighterLib>
    </div>
  )
}