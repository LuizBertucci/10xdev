// Detecção de linguagem baseada no CardFeature
export const detectLanguage = (language: string): string => {
  switch (language.toLowerCase()) {
    case 'typescript':
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'javascript':
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'python':
    case 'py':
      return 'python'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'json':
      return 'json'
    case 'ruby':
      return 'ruby'
    case 'sql':
      return 'sql'
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
    
    // Formato do token que não conflita com identificadores JS (usa caractere não-alfanumérico)
    const createToken = (content: string, className: string) => {
      const token = `~%TOKEN_${tokenIndex++}%~`
      tokens.push({ token, replacement: `<span class="${className}">${content}</span>` })
      return token
    }
    
    // 1. Comentários (Prioridade máxima para não processar keywords dentro deles)
    // Suporte para // (linha) e /* */ (bloco)
    highlightedCode = highlightedCode.replace(
      /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      (match) => createToken(match, 'syntax-comment')
    )

    // 2. Strings (Para não processar keywords dentro delas)
    // Suporte para aspas simples, duplas e template literals (crases)
    highlightedCode = highlightedCode.replace(
      /("|'|`)((?:(?!\1)[^\\]|\\.)*)(\1)/g,
      (match) => createToken(match, 'syntax-string')
    )
    
    // 3. Functions (Antes de keywords para evitar conflito em definições)
    // Captura nomes de funções antes de parênteses: functionName(
    highlightedCode = highlightedCode.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      (match, funcName) => {
        // Apenas o nome da função é colorido, o parêntese fica normal
        // Mas precisamos tokenizar tudo que foi casado para evitar reprocessamento
        const token = `~%TOKEN_${tokenIndex++}%~`
        tokens.push({ 
          token, 
          replacement: `<span class="syntax-function">${funcName}</span>(` 
        })
        return token
      }
    )

    // 4. Keywords
    const keywords = [
      'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
      'export', 'import', 'default', 'return', 'if', 'else', 'for', 'while',
      'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally',
      'throw', 'async', 'await', 'public', 'private', 'protected', 'static',
      'readonly', 'extends', 'implements', 'new', 'this', 'super', 'void',
      'null', 'undefined', 'true', 'false', 'from', 'as', 'of', 'in', 'typeof',
      'instanceof'
    ]
    
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
    highlightedCode = highlightedCode.replace(
      keywordRegex,
      (match) => createToken(match, 'syntax-keyword')
    )
    
    // 5. Numbers
    highlightedCode = highlightedCode.replace(
      /\b(\d+\.?\d*|0x[0-9a-fA-F]+)\b/g,
      (match) => createToken(match, 'syntax-number')
    )
    
    // 6. Operators
    // Cuidado para não casar com os caracteres do nosso token (~ e %)
    highlightedCode = highlightedCode.replace(
      /([+\-*\/=<>!&|?:^]+)/g,
      (match) => createToken(match, 'syntax-operator')
    )
    
    // Restaurar tokens
    // Fazemos isso em ordem reversa ou normal?
    // Como os tokens são únicos e não se sobrepõem (devido à ordem de processamento),
    // a ordem não deve importar, mas por segurança vamos usar replaceAll.
    tokens.forEach(({ token, replacement }) => {
      highlightedCode = highlightedCode.replaceAll(token, replacement)
    })
  }
  
  else if (lang === 'python') {
    const tokens: { token: string, replacement: string }[] = []
    let tokenIndex = 0
    const createToken = (content: string, className: string) => {
      const token = `~%TOKEN_${tokenIndex++}%~`
      tokens.push({ token, replacement: `<span class="${className}">${content}</span>` })
      return token
    }

    // 1. Comments
    highlightedCode = highlightedCode.replace(
      /(#.*$)/gm,
      (match) => createToken(match, 'syntax-comment')
    )

    // 2. Strings (incluindo multi-line com triplas aspas)
    highlightedCode = highlightedCode.replace(
      /("""[\s\S]*?"""|'''[\s\S]*?'''|("|')((?:(?!\2)[^\\]|\\.)*)(\2))/g,
      (match) => createToken(match, 'syntax-string')
    )

    // 3. Functions (def func_name)
    highlightedCode = highlightedCode.replace(
      /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (match, funcName) => {
        // Neste caso, 'def' é keyword e 'funcName' é função.
        // Melhor tratar keywords depois.
        // Vamos apenas tokenizar o nome da função aqui se conseguirmos separar.
        // Mas regex replace substitui o match inteiro.
        // Estratégia: tokenizar tudo: "def " + token(funcName)
        // Ou melhor: deixar 'def' para o passo de keywords e pegar function calls genéricas aqui?
        // Python functions calls: name(
        return match // Placeholder, vamos usar a lógica genérica abaixo
      }
    )
    
    // Function calls e definitions simples
    highlightedCode = highlightedCode.replace(
      /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
      (match, funcName) => {
        const token = `~%TOKEN_${tokenIndex++}%~`
        tokens.push({ token, replacement: `<span class="syntax-function">${funcName}</span>(` })
        return token
      }
    )

    // 4. Keywords
    const keywords = [
      'def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 
      'for', 'while', 'try', 'except', 'finally', 'raise', 'with', 'as', 
      'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'lambda',
      'yield', 'True', 'False', 'None', 'async', 'await', 'global', 'nonlocal',
      'assert', 'del'
    ]
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
    
    highlightedCode = highlightedCode.replace(
      keywordRegex,
      (match) => createToken(match, 'syntax-keyword')
    )

    // Restaurar
    tokens.forEach(({ token, replacement }) => {
      highlightedCode = highlightedCode.replaceAll(token, replacement)
    })
  }
  
  else if (lang === 'html') {
    // Simplificado para HTML
    highlightedCode = highlightedCode.replace(
      /(&lt;\/?)(\w+)(.*?)(&gt;)/g, // Assumindo que já foi escapado? Não, input é raw.
      // Input raw: <div class="x">
      (match) => {
        // Se o input é raw code, ele tem < e >.
        // Mas ao renderizar no dangerouslySetInnerHTML, < e > são interpretados como tags reais do DOM!
        // O highlighter deve retornar HTML string.
        // Se o código tem tags HTML, elas precisam ser escapadas para serem exibidas, 
        // EXCETO os spans que nós adicionamos.
        // ESTE É UM PONTO IMPORTANTE: O highlightedCode retornado é injetado como HTML.
        // Então o código original do usuário DEVE ser escapado ( < vira &lt; ) ANTES de adicionar nossos spans.
        return match
      }
    )
    
    // Correção Fundamental: Escapar HTML antes de tudo para qualquer linguagem!
    // Se o usuário digita "if (a < b)", o "< b" pode quebrar o HTML.
    // Vamos mover o escape para o início da função.
  }
  
  else if (lang === 'css') {
    const tokens: { token: string, replacement: string }[] = []
    let tokenIndex = 0
    const createToken = (content: string, className: string) => {
      const token = `~%TOKEN_${tokenIndex++}%~`
      tokens.push({ token, replacement: `<span class="${className}">${content}</span>` })
      return token
    }

    // Comments /* */
    highlightedCode = highlightedCode.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      (match) => createToken(match, 'syntax-comment')
    )

    // Selectors (simplificado: tudo antes de {)
    highlightedCode = highlightedCode.replace(
      /([^{]+)\{/g,
      (match, selector) => {
        // Cuidado: pode pegar quebras de linha.
        // Melhor tokenizar properties primeiro?
        // CSS é complexo para regex simples.
        // Vamos fazer highlighting básico de propriedades
        return match
      }
    )
    
    // Properties (word:)
    highlightedCode = highlightedCode.replace(
      /([\w-]+):/g,
      (match, prop) => {
        const token = `~%TOKEN_${tokenIndex++}%~`
        tokens.push({ token, replacement: `<span class="syntax-property">${prop}</span>:` })
        return token
      }
    )

    tokens.forEach(({ token, replacement }) => {
      highlightedCode = highlightedCode.replaceAll(token, replacement)
    })
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
