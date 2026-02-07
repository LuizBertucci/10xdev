import type { CardFeature } from "@/types"

export const DEFAULT_CATEGORY = "Sem categoria"

/**
 * Mapa de normalizacao de tags (subset do backend).
 * Cobre os casos mais comuns de duplicatas EN/PT e nomes internos
 * que podem existir em cards antigos no banco de dados.
 */
const TAG_NORMALIZE: Record<string, string> = {
  // project
  'project': 'Gestão de Projetos',
  'projeto': 'Gestão de Projetos',
  'projetos': 'Gestão de Projetos',
  // card
  'card': 'Sistema de Cards',
  'cards': 'Sistema de Cards',
  'cardfeature': 'Sistema de Cards',
  'feature': 'Sistema de Cards',
  // auth
  'auth': 'Autenticação e Login',
  'login': 'Autenticação e Login',
  'authentication': 'Autenticação e Login',
  // user
  'user': 'Gestão de Usuários',
  'usuario': 'Gestão de Usuários',
  'usuário': 'Gestão de Usuários',
  // config
  'config': 'Configuração do Projeto',
  'configuration': 'Configuração do Projeto',
  'settings': 'Configuração do Projeto',
  // database
  'database': 'Acesso a Banco de Dados',
  'supabase': 'Acesso a Banco de Dados',
  // middleware
  'middleware': 'Middlewares e Interceptors',
  'cors': 'Middlewares e Interceptors',
  // routing
  'routing': 'Rotas e Navegação',
  'route': 'Rotas e Navegação',
  'router': 'Rotas e Navegação',
  // ui
  'ui': 'Componentes de Interface',
  // hook
  'hook': 'React Hooks',
  'hooks': 'React Hooks',
  // utils
  'utils': 'Funções Utilitárias',
  'util': 'Funções Utilitárias',
  'helper': 'Funções Utilitárias',
  'helpers': 'Funções Utilitárias',
  // test
  'test': 'Testes Automatizados',
  'tests': 'Testes Automatizados',
  'testes': 'Testes Automatizados',
  // docs
  'docs': 'Documentação',
  'documentation': 'Documentação',
  'readme': 'Documentação',
  // style
  'style': 'Estilos e Temas',
  'styles': 'Estilos e Temas',
  'css': 'Estilos e Temas',
  // build
  'build': 'Build e Ferramentas',
  // api
  'api': 'Clientes HTTP e APIs',
  'apiclient': 'Clientes HTTP e APIs',
  // notification
  'notification': 'Notificações e Emails',
  'notificação': 'Notificações e Emails',
  // storage
  'storage': 'Upload e Armazenamento',
  'upload': 'Upload e Armazenamento',
  // admin
  'admin': 'Painel Administrativo',
  'dashboard': 'Painel Administrativo',
  // content
  'content': 'Gestão de Conteúdo',
  'conteudo': 'Gestão de Conteúdo',
  'conteúdo': 'Gestão de Conteúdo',
  // template
  'template': 'Templates e Layouts',
  'templates': 'Templates e Layouts',
  // ai
  'ai': 'Inteligência Artificial',
  'openai': 'Inteligência Artificial',
  'llm': 'Inteligência Artificial',
  // n8n
  'n8n': 'Automação e Workflows',
  'workflow': 'Automação e Workflows',
  // service
  'service': 'Lógica de Negócio',
  // controller
  'controller': 'Endpoints e Controllers',
  'endpoint': 'Endpoints e Controllers',
  // validation
  'validation': 'Validação de Dados',
  'validator': 'Validação de Dados',
  // jobs
  'jobs': 'Tarefas em Background',
  'worker': 'Tarefas em Background',
  'job': 'Tarefas em Background',
  // payment
  'payment': 'Pagamentos e Cobrança',
  'pagamento': 'Pagamentos e Cobrança',
  // skill
  'skill': 'Skills e Tutoriais',
  'skills': 'Skills e Tutoriais',
}

function _normalizeTag(tag: string): string {
  const key = tag.trim().toLowerCase()
  return TAG_NORMALIZE[key] || tag.trim()
}

export function buildCategoryGroups(cards: CardFeature[]) {
  const map = new Map<string, CardFeature[]>()

  cards.forEach((card) => {
    const category = card.category?.trim()
      || (card.tags && card.tags.length > 0 ? card.tags[0]?.trim() : null)
      || DEFAULT_CATEGORY

    if (!map.has(category)) {
      map.set(category, [])
    }
    map.get(category)?.push(card)
  })

  return map
}

export function getAllCategories(groups: Map<string, CardFeature[]>) {
  return Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export function orderCategories(allCategories: string[], orderedCategories: string[] = []) {
  if (orderedCategories.length === 0) {
    return allCategories
  }

  const ordered = [...orderedCategories]
  const orderedSet = new Set(orderedCategories)

  allCategories.forEach((category) => {
    if (!orderedSet.has(category)) {
      ordered.push(category)
    }
  })

  return ordered.filter((category) => allCategories.includes(category))
}
