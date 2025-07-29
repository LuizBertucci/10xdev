// Tema customizado profissional para react-syntax-highlighter
// Baseado no Dracula theme otimizado para CardFeature

export const cardFeatureTheme = {
  'code[class*="language-"]': {
    color: '#f8f8f2',
    background: 'transparent',
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, Monaco, "Courier New", monospace',
    fontSize: '11px',
    lineHeight: '1.4',
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    tabSize: 2,
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: '#f8f8f2',
    background: 'transparent',
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, Monaco, "Courier New", monospace',
    fontSize: '11px',
    lineHeight: '1.4',
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    tabSize: 2,
    hyphens: 'none',
    padding: '0',
    margin: '0',
    overflow: 'visible',
  },
  'token.comment': { 
    color: '#6272a4', 
    fontStyle: 'italic',
    fontWeight: '400'
  },
  'token.prolog': { color: '#6272a4' },
  'token.doctype': { color: '#6272a4' },
  'token.cdata': { color: '#6272a4' },
  'token.punctuation': { color: '#f8f8f2' },
  'token.property': { 
    color: '#50fa7b',
    fontWeight: '500'
  },
  'token.tag': { 
    color: '#ff79c6',
    fontWeight: '500'
  },
  'token.constant': { 
    color: '#bd93f9',
    fontWeight: '500'
  },
  'token.symbol': { color: '#bd93f9' },
  'token.deleted': { color: '#ff5555' },
  'token.boolean': { 
    color: '#bd93f9',
    fontWeight: '600'
  },
  'token.number': { 
    color: '#bd93f9',
    fontWeight: '500'
  },
  'token.selector': { 
    color: '#50fa7b',
    fontWeight: '500'
  },
  'token.attr-name': { 
    color: '#50fa7b',
    fontWeight: '400'
  },
  'token.string': { 
    color: '#f1fa8c',
    fontWeight: '400'
  },
  'token.char': { color: '#f1fa8c' },
  'token.builtin': { 
    color: '#50fa7b',
    fontWeight: '500'
  },
  'token.inserted': { color: '#50fa7b' },
  'token.operator': { 
    color: '#ff79c6',
    fontWeight: '500'
  },
  'token.entity': { color: '#f1fa8c' },
  'token.url': { color: '#f1fa8c' },
  'token.atrule': { color: '#ff79c6' },
  'token.attr-value': { color: '#f1fa8c' },
  'token.keyword': { 
    color: '#ff79c6', 
    fontWeight: '600'
  },
  'token.function': { 
    color: '#50fa7b', 
    fontWeight: '600'
  },
  'token.class-name': { 
    color: '#8be9fd',
    fontWeight: '500'
  },
  'token.regex': { color: '#f1fa8c' },
  'token.important': { 
    color: '#ff79c6', 
    fontWeight: '700'
  },
  'token.variable': { color: '#f8f8f2' },
  'token.parameter': { color: '#f8f8f2' },
  'token.interpolation': { color: '#f8f8f2' },
  'token.interpolation-punctuation': { color: '#ff79c6' },
  
  // Language specific tokens
  'token.namespace': { 
    color: '#8be9fd',
    fontWeight: '500'
  },
  'token.type': { 
    color: '#8be9fd',
    fontWeight: '500'
  },
  'token.generic': { 
    color: '#8be9fd',
    fontWeight: '500'
  },
  'token.annotation': { 
    color: '#6272a4',
    fontStyle: 'italic'
  },
  'token.decorator': { 
    color: '#ff79c6',
    fontWeight: '500'
  },
}

// Mapeamento melhorado de linguagens
export const detectSyntaxLanguage = (language: string): string => {
  const langMap: Record<string, string> = {
    'typescript': 'typescript',
    'javascript': 'javascript',
    'python': 'python',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'php': 'php',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'csharp': 'csharp',
    'go': 'go',
    'rust': 'rust',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'sql': 'sql',
    'bash': 'bash',
    'shell': 'bash',
    'powershell': 'powershell',
    'yaml': 'yaml',
    'xml': 'xml',
    'markdown': 'markdown',
    'dockerfile': 'dockerfile',
  }
  
  const normalizedLang = language.toLowerCase().trim()
  return langMap[normalizedLang] || 'javascript'
}