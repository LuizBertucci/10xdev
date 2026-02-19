/**
 * Resolve a API key para o LLM.
 * Prioriza GROK_API_KEY; fallback para OPENAI_API_KEY.
 */
export function resolveApiKey(): string | undefined {
  const key = process.env.GROK_API_KEY || process.env.OPENAI_API_KEY

  if (process.env.NODE_ENV === 'development') {
    try {
      const apiKeyPresent = Boolean(key)
      const keyLength = key?.length || 0
      const cappedLength = keyLength > 0 ? `${keyLength > 20 ? '20+' : keyLength} chars` : '0'
      console.debug('[llmClient] API key status:', {
        apiKeyPresent,
        keyLength: cappedLength,
        source: process.env.GROK_API_KEY ? 'GROK_API_KEY' : (process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : 'none')
      })
    } catch (err) {
      console.error('[llmClient] Error logging API key status:', err)
    }
  }

  return key
}

/**
 * Resolve a URL do endpoint de chat completions.
 */
export function resolveChatCompletionsUrl(): string {
  const raw = (process.env.OPENAI_BASE_URL || 'https://api.x.ai/v1/chat/completions').trim()
  if (raw.endsWith('/chat/completions')) return raw
  if (raw.endsWith('/v1')) return `${raw}/chat/completions`
  if (raw.endsWith('/')) {
    const noSlash = raw.slice(0, -1)
    if (noSlash.endsWith('/v1')) return `${noSlash}/chat/completions`
  }
  return raw
}

/**
 * Faz uma chamada ao endpoint de chat completions e retorna o conteúdo da resposta.
 */
export async function callChatCompletions(args: {
  endpoint: string
  apiKey: string
  body: Record<string, unknown>
}): Promise<{ content: string }> {
  const res = await fetch(args.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.apiKey}` },
    body: JSON.stringify(args.body)
  })
  const text = await res.text().catch((e) => {
    console.error('[llmClient] Erro ao ler body da resposta:', e?.message)
    return ''
  })
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${text || res.statusText}`)
  let json: unknown
  try { json = JSON.parse(text) } catch { throw new Error('LLM retornou resposta não-JSON') }

  if (!json || typeof json !== 'object') throw new Error('LLM retornou resposta inválida')
  const obj = json as Record<string, unknown>
  if (!obj.choices || !Array.isArray(obj.choices)) throw new Error('LLM retornou resposta inválida')
  if (!obj.choices[0] || typeof obj.choices[0] !== 'object') throw new Error('LLM retornou resposta inválida')
  const choice = obj.choices[0] as Record<string, unknown>
  if (!choice.message || typeof choice.message !== 'object') throw new Error('LLM retornou resposta inválida')
  const message = choice.message as Record<string, unknown>
  const content = message.content
  if (!content || typeof content !== 'string') throw new Error('LLM retornou resposta inválida')
  return { content }
}
