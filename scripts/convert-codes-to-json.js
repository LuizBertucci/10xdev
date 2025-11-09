const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const vm = require('vm')

const repoRoot = path.resolve(__dirname, '..')
const sourcePath = path.join(repoRoot, 'frontend', 'mockData', 'codes.ts')
const targetDir = path.join(repoRoot, '.clinerules', 'codes')

const slugify = value =>
  value
    .toString()
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()

const sanitizeSource = source => {
  const withoutImport = source.replace(
    /import\s+type\s+\{[^}]+\}\s+from\s+['"]\.\/types['"]\s*;?\s*/m,
    ''
  )

  return withoutImport.replace(
    /export\s+const\s+codeSnippets\s*:\s*CodeSnippet\[\]\s*=\s*/,
    'module.exports = '
  )
}

const readSnippets = () => {
  const rawSource = fs.readFileSync(sourcePath, 'utf8')
  const sanitized = sanitizeSource(rawSource)

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  }

  try {
    vm.createContext(sandbox)
    const script = new vm.Script(sanitized, { filename: 'codes.ts' })
    script.runInContext(sandbox)
  } catch (error) {
    console.error('[convert-codes] Failed to evaluate codes.ts', { message: error.message })
    throw error
  }

  if (!Array.isArray(sandbox.module.exports)) {
    throw new Error('[convert-codes] Expected module.exports to be an array of snippets')
  }

  return sandbox.module.exports
}

const buildCard = snippet => {
  const baseLanguage = snippet.language || 'typescript'
  const cardsScreens = Array.isArray(snippet.screens) ? snippet.screens : []

  return {
    id: snippet.id ?? randomUUID(),
    title: snippet.title ?? 'Untitled Snippet',
    tech: snippet.tech ?? 'General',
    language: baseLanguage,
    description: snippet.description ?? '',
    content_type: 'code',
    card_type: 'codigos',
    screens: cardsScreens.map((screen, screenIndex) => {
      const screenSlug = slugify(screen?.name ?? `screen-${screenIndex + 1}`)

      return {
        name: screen?.name ?? `Screen ${screenIndex + 1}`,
        description: screen?.description ?? '',
        route: `cards/${slugify(`${snippet.id ?? screenIndex}`)}/${screenSlug}`,
        order: screenIndex,
        blocks: [
          {
            id: randomUUID(),
            type: 'code',
            title: screen?.name ?? `Screen ${screenIndex + 1}`,
            language: baseLanguage,
            order: 0,
            content: screen?.code ?? ''
          }
        ]
      }
    })
  }
}

const main = () => {
  const snippets = readSnippets()
  fs.mkdirSync(targetDir, { recursive: true })

  let created = 0
  const warnings = []

  snippets.forEach((snippet, index) => {
    if (!snippet || typeof snippet !== 'object') {
      warnings.push(`[convert-codes] Skipped invalid snippet at index ${index}`)
      return
    }

    const slugBase = slugify(`${snippet.id ?? index}-${snippet.title ?? 'snippet'}`)
    const card = buildCard(snippet)
    const outputPath = path.join(targetDir, `${slugBase}.json`)

    fs.writeFileSync(outputPath, JSON.stringify(card, null, 2), 'utf8')
    created += 1
    console.info(`[convert-codes] Wrote ${outputPath}`)
  })

  console.log(`[convert-codes] Generated ${created} JSON card${created === 1 ? '' : 's'} in ${targetDir}`)

  if (warnings.length) {
    console.warn('[convert-codes] Warnings detected:')
    warnings.forEach(w => console.warn(`  - ${w}`))
  }
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error('[convert-codes] Conversion failed', error)
    process.exitCode = 1
  }
}

