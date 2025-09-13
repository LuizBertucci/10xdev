// Detecção de linguagem baseada no CardFeature
export const detectLanguage = (language: string): string => {
  switch (language.toLowerCase()) {
    case 'typescript':
      return 'typescript'
    case 'javascript':
      return 'javascript'
    case 'python':
      return 'python'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'json':
      return 'json'
    case 'ruby':
      return 'ruby'
    default:
      return 'javascript'
  }
}

// Aplicar highlighting básico usando regex (versão com tokens)
export const applyBasicHighlighting = (code: string, language: string): string => {
  // Verificar se code não é undefined ou null
  if (!code || typeof code !== 'string') {
    return ''
  }

  const lang = detectLanguage(language)
  
  // Não fazer escape HTML - mostrar código exatamente como foi digitado
  let highlightedCode = code
  
  if (lang === 'typescript' || lang === 'javascript') {
    const tokens: { token: string, replacement: string }[] = []
    let tokenIndex = 0
    
    // Keywords com tokens únicos
    highlightedCode = highlightedCode.replace(
      /\b(const|let|var|function|class|interface|type|export|import|default|return|if|else|for|while|try|catch|async|await|public|private|protected|static|extends|implements)\b/g,
      (match, keyword) => {
        const token = `__TOKEN_${tokenIndex++}__`
        tokens.push({ token, replacement: `<span class="syntax-keyword">${keyword}</span>` })
        return token
      }
    )
    
    // Strings com tokens únicos
    highlightedCode = highlightedCode.replace(
      /([\"'`])([^\"'`]*?)\1/g,
      (match, quote1, content) => {
        const token = `__TOKEN_${tokenIndex++}__`
        tokens.push({ token, replacement: `<span class="syntax-string">${quote1}${content}${quote1}</span>` })
        return token
      }
    )
    
    // Function names com tokens únicos
    highlightedCode = highlightedCode.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      (match, funcName) => {
        const token = `__TOKEN_${tokenIndex++}__`
        tokens.push({ token, replacement: `<span class="syntax-function">${funcName}</span>(` })
        return token
      }
    )
    
    // Numbers com tokens únicos
    highlightedCode = highlightedCode.replace(
      /\b(\d+\.?\d*)\b/g,
      (match, number) => {
        const token = `__TOKEN_${tokenIndex++}__`
        tokens.push({ token, replacement: `<span class="syntax-number">${number}</span>` })
        return token
      }
    )
    
    // Comments com tokens únicos
    highlightedCode = highlightedCode.replace(
      /(\/\/.*$)/gm,
      (match, comment) => {
        const token = `__TOKEN_${tokenIndex++}__`
        tokens.push({ token, replacement: `<span class="syntax-comment">${comment}</span>` })
        return token
      }
    )
    
    // Operators com tokens únicos
    highlightedCode = highlightedCode.replace(
      /([+\-*\/=<>!&|?:]+)/g,
      (match, operator) => {
        const token = `__TOKEN_${tokenIndex++}__`
        tokens.push({ token, replacement: `<span class="syntax-operator">${operator}</span>` })
        return token
      }
    )
    
    // Substituir tokens de volta por HTML
    tokens.forEach(({ token, replacement }) => {
      highlightedCode = highlightedCode.replaceAll(token, replacement)
    })
  }
  
  if (lang === 'python') {
    // Python keywords
    highlightedCode = highlightedCode.replace(
      /\b(def|class|import|from|return|if|else|elif|for|while|try|except|with|as|pass|break|continue|and|or|not|in|is)\b/g,
      '<span class="syntax-keyword">$1</span>'
    )
    
    // Strings
    highlightedCode = highlightedCode.replace(
      /([\"'])((?:(?!\1)[^\\]|\\.)*)(\\1)/g,
      '<span class="syntax-string">$1$2$3</span>'
    )
    
    // Comments
    highlightedCode = highlightedCode.replace(
      /(#.*$)/gm,
      '<span class="syntax-comment">$1</span>'
    )
  }
  
  if (lang === 'html') {
    // HTML tags
    highlightedCode = highlightedCode.replace(
      /(<\/?[\w\s=\"/.':;#-\/\?]+>)/g,
      '<span class="syntax-tag">$1</span>'
    )
  }
  
  if (lang === 'css') {
    // CSS selectors and properties
    highlightedCode = highlightedCode.replace(
      /([.#]?[\w-]+)\s*{/g,
      '<span class="syntax-selector">$1</span>{'
    )
    
    highlightedCode = highlightedCode.replace(
      /([\w-]+):/g,
      '<span class="syntax-property">$1</span>:'
    )
  }
  
  return highlightedCode
}

// Estilos CSS para syntax highlighting (otimizados para fundo cinza claro)
export const syntaxHighlightStyles = `
  .syntax-keyword {
    color: #1e40af;
    font-weight: 600;
  }
  
  .syntax-string {
    color: #059669;
  }
  
  .syntax-number {
    color: #7c3aed;
    font-weight: 500;
  }
  
  .syntax-comment {
    color: #6b7280;
    font-style: italic;
  }
  
  .syntax-tag {
    color: #dc2626;
  }
  
  .syntax-selector {
    color: #059669;
    font-weight: 500;
  }
  
  .syntax-property {
    color: #0891b2;
  }
  
  .syntax-function {
    color: #dc2626;
    font-weight: 600;
  }
  
  .syntax-operator {
    color: #1f2937;
    font-weight: 500;
  }
  
  /* Garantir que o highlighting seja visível mesmo com o gradiente overlay */
  .syntax-keyword,
  .syntax-string,
  .syntax-number,
  .syntax-function {
    position: relative;
    z-index: 1;
  }
`