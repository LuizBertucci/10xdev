import { applyBasicHighlighting } from './utils/syntaxUtils'

interface SyntaxHighlighterProps {
  code: string
  language: string
}

// Componente de syntax highlighting usando nossa implementação interna
// (react-syntax-highlighter removido devido a conflitos de dependência)
export default function SyntaxHighlighter({ 
  code, 
  language
}: SyntaxHighlighterProps) {
  // Usar nossa implementação interna de highlighting
  const highlightedCode = applyBasicHighlighting(code, language)
  
  return (
    <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'transparent' }}>
      <style>{`
        .codeblock-pre {
          background: transparent !important;
          background-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        pre {
          background: transparent !important;
          background-color: transparent !important;
        }
        code {
          background: transparent !important;
          background-color: transparent !important;
        }
        .syntax-keyword { color: #1e40af; font-weight: 600; }
        .syntax-string { color: #059669; }
        .syntax-number { color: #7c3aed; font-weight: 500; }
        .syntax-comment { color: #6b7280; font-style: italic; }
        .syntax-function { color: #dc2626; font-weight: 600; }
        .syntax-operator { color: #1f2937; font-weight: 500; }
        .syntax-tag { color: #dc2626; }
        .syntax-selector { color: #059669; font-weight: 500; }
        .syntax-property { color: #0891b2; }
      `}</style>
      <pre className="codeblock-pre text-xs text-black leading-tight whitespace-pre-wrap break-words" style={{fontFamily: 'Consolas, Monaco, "Courier New", monospace !important', wordWrap: 'break-word', overflowWrap: 'break-word'}}>
        <code 
          style={{fontFamily: 'Consolas, Monaco, "Courier New", monospace !important'}}
          dangerouslySetInnerHTML={{ 
            __html: highlightedCode.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          }}
        />
      </pre>
    </div>
  )
}