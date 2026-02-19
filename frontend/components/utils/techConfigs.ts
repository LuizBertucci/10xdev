export const getTechConfig = (tech: string) => {
  switch (tech.toLowerCase()) {
    case 'react':
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: '⚛️'
      }
    case 'node.js':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: '🟢'
      }
    case 'python':
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: '🐍'
      }
    case 'javascript':
      return {
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: '🟨'
      }
    default:
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: '💻'
      }
  }
}

export const getLanguageConfig = (language: string) => {
  switch (language.toLowerCase()) {
    case 'typescript':
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: 'TS'
      }
    case 'javascript':
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: 'JS'
      }
    case 'python':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: 'PY'
      }
    default:
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: language.substring(0, 2).toUpperCase()
      }
  }
}