import React from 'react'
import { Highlight, themes } from 'prism-react-renderer'

interface SyntaxHighlighterProps {
  code: string
  language: string
  showLineNumbers?: boolean // Opcional, padrão true
}

export default function SyntaxHighlighter({ 
  code, 
  language,
  showLineNumbers = true 
}: SyntaxHighlighterProps) {
  // Normalizar o nome da linguagem para o Prism
  const getPrismLanguage = (lang: string) => {
    const normalized = lang.toLowerCase()
    if (normalized === 'typescript' || normalized === 'ts') return 'typescript'
    if (normalized === 'javascript' || normalized === 'js') return 'javascript'
    if (normalized === 'python' || normalized === 'py') return 'python'
    if (normalized === 'html') return 'markup' // Prism usa 'markup' para HTML
    if (normalized === 'css') return 'css'
    if (normalized === 'json') return 'json'
    if (normalized === 'sql') return 'sql'
    if (normalized === 'bash' || normalized === 'sh') return 'bash'
    return 'javascript' // Fallback seguro
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-auto">
      <Highlight
        theme={themes.vsLight}
        code={code || ''}
        language={getPrismLanguage(language)}
      >
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre 
              className="text-xs leading-tight whitespace-pre" 
              style={{
                  ...style, 
                  backgroundColor: 'transparent', 
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  margin: 0,
                  padding: 0,
                  display: 'table',
                  width: 'max-content',
                  minWidth: '100%'
              }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} style={{ display: 'table-row' }}>
                {showLineNumbers && (
                  <span 
                    className="select-none text-right pr-4 text-gray-400 border-r border-gray-200"
                    style={{ display: 'table-cell', width: '3em', minWidth: '3em', paddingRight: '1rem' }}
                  >
                    {i + 1}
                  </span>
                )}
                <span style={{ display: 'table-cell', paddingLeft: '1rem' }}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
