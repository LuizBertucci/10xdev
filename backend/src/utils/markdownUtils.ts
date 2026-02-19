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
    // Remove __negrito__ (variante com underline duplo)
    .replace(/__([^_]+)__/g, '$1')
    // Remove _itálico_ (variante com underline simples)
    .replace(/_([^_]+)_/g, '$1')
    // Remove ~~riscado~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove `código inline`
    .replace(/`([^`]+)`/g, '$1')
    // Remove # Headers (##, ###, etc) - apenas no início da linha
    .replace(/^#{1,6}\s+/gm, '')
    // Remove imagens ![alt](url) antes dos links simples
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove links [texto](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points (-, *, +) no início da linha
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove listas ordenadas (1. 2. etc) no início da linha
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove blockquotes (> ) no início da linha
    .replace(/^\s*>\s*/gm, '')
    .trim()
}
