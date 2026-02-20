// ================================================
// FILTER CONSTANTS
// ================================================

export const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw', '.java', '.kt', '.kts',
  '.go', '.rs', '.rb', '.php',
  '.c', '.cpp', '.cc', '.h', '.hpp',
  '.cs', '.swift', '.vue', '.svelte',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.mdx', '.sql',
  '.sh', '.bash', '.zsh',
  '.dockerfile', '.env'
]

export const IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.venv', 'venv', '.idea', '.vscode', 'coverage', '.cache', '.turbo',
  'vendor', '.yarn', '.pnpm', 'out', '.output', 'target', 'bin', 'obj',
  '__tests__', '__mocks__', 'test', 'tests', 'spec', 'specs', 'e2e',
  'cypress', 'playwright', '.github', '.husky'
]

export const IGNORED_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store',
  'thumbs.db', '.gitignore', '.gitattributes', '.npmrc', '.nvmrc',
  '.prettierrc', '.prettierignore', '.eslintrc', '.eslintrc.js',
  '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs',
  'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
  'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.mjs',
  'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
  'postcss.config.mjs', '.env.example', '.env.local', '.env.development',
  '.env.production', 'LICENSE', 'LICENSE.md', 'CHANGELOG.md',
  'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.editorconfig'
]

export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.pyw': 'python',
  '.java': 'java', '.kt': 'kotlin', '.kts': 'kotlin',
  '.go': 'go', '.rs': 'rust', '.rb': 'ruby', '.php': 'php',
  '.c': 'c', '.cpp': 'cpp', '.cc': 'cpp', '.h': 'c', '.hpp': 'cpp',
  '.cs': 'csharp', '.swift': 'swift',
  '.vue': 'vue', '.svelte': 'svelte',
  '.html': 'html', '.htm': 'html',
  '.css': 'css', '.scss': 'scss', '.sass': 'sass', '.less': 'less',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.md': 'markdown', '.mdx': 'markdown',
  '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.dockerfile': 'dockerfile', '.env': 'plaintext'
}

// ================================================
// FILTER HELPERS
// ================================================

export function getFileExtension(filePath: string): string {
  const fileName = filePath.split('/').pop() || ''
  if (fileName.toLowerCase() === 'dockerfile') return '.dockerfile'
  if (fileName.startsWith('.env')) return '.env'
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1) return ''
  return fileName.substring(lastDot).toLowerCase()
}

export function getLanguageFromExtension(ext: string): string {
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext'
}

export function shouldIncludeFile(filePath: string): boolean {
  const parts = filePath.split('/')
  for (const part of parts) {
    if (IGNORED_DIRS.includes(part.toLowerCase())) return false
  }
  const fileName = parts[parts.length - 1] || ''
  if (IGNORED_FILES.includes(fileName.toLowerCase())) return false
  return CODE_EXTENSIONS.includes(getFileExtension(filePath))
}

export type FileExclusionReason = 'ignored_dir' | 'ignored_file' | 'invalid_extension'
export type FileClassification = { included: true } | { included: false; reason: FileExclusionReason }

export function classifyFile(filePath: string): FileClassification {
  const parts = filePath.split('/')
  for (const part of parts) {
    if (IGNORED_DIRS.includes(part.toLowerCase())) return { included: false, reason: 'ignored_dir' }
  }
  const fileName = parts[parts.length - 1] || ''
  if (IGNORED_FILES.includes(fileName.toLowerCase())) return { included: false, reason: 'ignored_file' }
  if (!CODE_EXTENSIONS.includes(getFileExtension(filePath))) return { included: false, reason: 'invalid_extension' }
  return { included: true }
}
