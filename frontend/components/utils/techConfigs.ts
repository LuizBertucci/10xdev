/** Valores de tech aceitos na UI (badge exibido apenas para estes). */
export const ALLOWED_TECH_VALUES = ['React', 'Node.js', 'Python', 'JavaScript', 'Vue.js', 'Angular'] as const
/** Valores de language aceitos na UI (badge exibido apenas para estes). */
export const ALLOWED_LANGUAGE_VALUES = ['typescript', 'javascript', 'python', 'html', 'css'] as const

export function isAllowedTech(value: string | undefined): boolean {
  return !!value && ALLOWED_TECH_VALUES.includes(value as (typeof ALLOWED_TECH_VALUES)[number])
}

/** Retorna as techs permitidas que aparecem no texto (ex: "Node.js + React" → ["Node.js", "React"]). */
export function getAllowedTechsFromString(techString: string | undefined): (typeof ALLOWED_TECH_VALUES)[number][] {
  if (!techString?.trim()) return []
  const normalized = techString.toLowerCase()
  return ALLOWED_TECH_VALUES.filter((t) => normalized.includes(t.toLowerCase()))
}
export function isAllowedLanguage(value: string | undefined): boolean {
  return !!value && ALLOWED_LANGUAGE_VALUES.includes(value.toLowerCase() as (typeof ALLOWED_LANGUAGE_VALUES)[number])
}

export const getTechConfig = (tech: string) => {
  switch (tech.toLowerCase()) {
    case 'react':
      return {
        color: 'bg-sky-100 text-sky-700 border-sky-300',
        icon: '⚛️'
      }
    case 'node.js':
      return {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        icon: '🟢'
      }
    case 'python':
      return {
        color: 'bg-amber-100 text-amber-700 border-amber-300',
        icon: '🐍'
      }
    case 'javascript':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '🟨'
      }
    default:
      return {
        color: 'bg-slate-100 text-slate-600 border-slate-300',
        icon: '💻'
      }
  }
}

export const getLanguageConfig = (language: string) => {
  switch (language.toLowerCase()) {
    case 'typescript':
      return {
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: 'TS'
      }
    case 'javascript':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: 'JS'
      }
    case 'python':
      return {
        color: 'bg-lime-100 text-lime-700 border-lime-300',
        icon: 'PY'
      }
    default:
      return {
        color: 'bg-slate-100 text-slate-600 border-slate-300',
        icon: language.substring(0, 2).toUpperCase()
      }
  }
}