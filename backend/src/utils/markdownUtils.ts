/**
 * Remove formatação Markdown de texto (negrito, itálico, links, etc)
 */
export function cleanMarkdown(text: string): string {
  if (!text) return text

  return text
    // Remove **negrito**
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove *itálico*
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove __sublinhado__
    .replace(/__([^_]+)__/g, '$1')
    // Remove ~~riscado~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove `código inline`
    .replace(/`([^`]+)`/g, '$1')
    // Remove # Headers (##, ###, etc) - apenas no início da linha
    .replace(/^#{1,6}\s+/gm, '')
    // Remove links [texto](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points (-, *, +) no início da linha
    .replace(/^\s*[-*+]\s+/gm, '')
    .trim()
}
