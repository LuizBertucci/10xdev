import { applyBasicHighlighting } from './utils/syntaxUtils'

interface SyntaxHighlighterProps {
  code: string
  language: string
  maxLength?: number
}

// Componente de syntax highlighting usando nossa implementação interna
// (react-syntax-highlighter removido devido a conflitos de dependência)
export default function SyntaxHighlighter({ 
  code, 
  language, 
  maxLength = 200 
}: SyntaxHighlighterProps) {
  const truncatedCode = code.slice(0, maxLength)
  
  // Usar nossa implementação interna de highlighting
  const highlightedCode = applyBasicHighlighting(truncatedCode, language)
  
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
        .syntax-keyword { color: #ff79c6; font-weight: 600; }
        .syntax-string { color: #f1fa8c; }
        .syntax-number { color: #bd93f9; font-weight: 500; }
        .syntax-comment { color: #6272a4; font-style: italic; }
        .syntax-function { color: #50fa7b; font-weight: 600; }
        .syntax-operator { color: #ff79c6; font-weight: 500; }
        .syntax-tag { color: #ff79c6; }
        .syntax-selector { color: #50fa7b; font-weight: 500; }
        .syntax-property { color: #8be9fd; }
      `}</style>
      <pre className="codeblock-pre text-xs text-black leading-tight">
        <code 
          dangerouslySetInnerHTML={{ 
            __html: highlightedCode
          }}
        />
      </pre>
    </div>
  )
}