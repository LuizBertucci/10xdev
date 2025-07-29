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
    default:
      return 'javascript'
  }
}

// Aplicar highlighting básico usando regex (versão simplificada)
export const applyBasicHighlighting = (code: string, language: string): string => {
  const lang = detectLanguage(language)
  
  // Aplicar classes CSS baseadas na linguagem
  let highlightedCode = code
  
  if (lang === 'typescript' || lang === 'javascript') {
    // Keywords (em ordem para evitar conflitos)
    highlightedCode = highlightedCode.replace(
      /\b(const|let|var|function|class|interface|type|export|import|default|return|if|else|for|while|try|catch|async|await|public|private|protected|static|extends|implements)\b/g,
      '<span class="syntax-keyword">$1</span>'
    )
    
    // Function names (depois de function ou antes de ()
    highlightedCode = highlightedCode.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      '<span class="syntax-function">$1</span>('
    )
    
    // Strings (aspas simples, duplas e template literals)
    highlightedCode = highlightedCode.replace(
      /(["'`])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
      '<span class="syntax-string">$1$2$3</span>'
    )
    
    // Numbers
    highlightedCode = highlightedCode.replace(
      /\b(\d+\.?\d*)\b/g,
      '<span class="syntax-number">$1</span>'
    )
    
    // Comments (linha única)
    highlightedCode = highlightedCode.replace(
      /(\/\/.*$)/gm,
      '<span class="syntax-comment">$1</span>'
    )
    
    // Operators
    highlightedCode = highlightedCode.replace(
      /([+\-*\/=<>!&|?:]+)/g,
      '<span class="syntax-operator">$1</span>'
    )
  }
  
  if (lang === 'python') {
    // Python keywords
    highlightedCode = highlightedCode.replace(
      /\b(def|class|import|from|return|if|else|elif|for|while|try|except|with|as|pass|break|continue|and|or|not|in|is)\b/g,
      '<span class="syntax-keyword">$1</span>'
    )
    
    // Strings
    highlightedCode = highlightedCode.replace(
      /(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
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
      /(<\/?[\w\s="/.':;#-\/\?]+>)/g,
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

// Estilos CSS para syntax highlighting (otimizados para fundo escuro)
export const syntaxHighlightStyles = `
  .syntax-keyword {
    color: #ff79c6;
    font-weight: 600;
  }
  
  .syntax-string {
    color: #f1fa8c;
  }
  
  .syntax-number {
    color: #bd93f9;
    font-weight: 500;
  }
  
  .syntax-comment {
    color: #6272a4;
    font-style: italic;
  }
  
  .syntax-tag {
    color: #ff79c6;
  }
  
  .syntax-selector {
    color: #50fa7b;
    font-weight: 500;
  }
  
  .syntax-property {
    color: #8be9fd;
  }
  
  .syntax-function {
    color: #50fa7b;
    font-weight: 500;
  }
  
  .syntax-operator {
    color: #ff79c6;
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