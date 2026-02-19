const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const vm = require('vm')

const repoRoot = path.resolve(__dirname, '..')

const slugify = value =>
  value
    .toString()
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()

const sanitizeModule = source =>
  source.replace(/export\s+const\s+([a-zA-Z0-9_]+)\s*=/g, 'exports.$1 =')

const loadModule = relativePath => {
  const absolutePath = path.join(repoRoot, relativePath)
  const source = fs.readFileSync(absolutePath, 'utf8')
  const sanitized = sanitizeModule(source)

  const sandbox = {
    module: { exports: {} },
    require,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  }
  sandbox.exports = sandbox.module.exports

  vm.createContext(sandbox)
  const script = new vm.Script(sanitized, { filename: relativePath })
  script.runInContext(sandbox)

  return { ...sandbox.module.exports, ...sandbox.exports }
}

const writeCard = (targetPath, card) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, JSON.stringify(card, null, 2), 'utf8')
  console.info(`[convert-dashboard] Wrote ${targetPath}`)
}

const buildJSONBlock = (name, description, data, options = {}) => ({
  name,
  description,
  route: options.route || `cards/${slugify(name)}`,
  order: options.order ?? 0,
  blocks: [
    {
      id: randomUUID(),
      type: options.type || 'code',
      title: options.blockTitle || name,
      language: options.language || 'json',
      order: 0,
      content: JSON.stringify(data, null, 2)
    }
  ]
})

const convertHome = () => {
  const exports = loadModule('frontend/mockData/home.ts')
  const card = {
    id: randomUUID(),
    title: 'Home Dashboard Widgets',
    tech: 'Dashboard',
    language: 'json',
    description: 'Conteúdos mock utilizados na Home: blocos de acesso rápido, vídeos e projetos em destaque.',
    content_type: 'data',
    card_type: 'dashboard',
    screens: [
      buildJSONBlock(
        'Quick Access Blocks',
        'Cards de acesso rápido exibidos na Home.',
        exports.quickAccessBlocks,
        { route: 'cards/home/quick-access' }
      ),
      buildJSONBlock(
        'Featured Videos',
        'Lista de vídeos em destaque com progresso.',
        exports.featuredVideos,
        { route: 'cards/home/featured-videos' }
      ),
      buildJSONBlock(
        'Featured Projects',
        'Projetos em destaque na Home.',
        exports.featuredProjects,
        { route: 'cards/home/featured-projects' }
      )
    ]
  }

  writeCard(
    path.join(repoRoot, '.clinerules', 'codes', 'home-dashboard-widgets.json'),
    card
  )
}

const main = () => {
  convertHome()
  console.log('[convert-dashboard] Conversion complete for home.')
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error('[convert-dashboard] Conversion failed', error)
    process.exitCode = 1
  }
}

