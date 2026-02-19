/**
 * Mapa canonico de normalizacao de tags.
 *
 * Mapeia TODAS as variantes conhecidas (keywords do FEATURE_SEMANTIC_MAP,
 * chaves de feature, variantes EN/PT) para um nome canonico em portugues
 * (correspondente ao FEATURE_TITLES do githubService).
 *
 * Usado para eliminar duplicatas como "Project"/"Projeto", "Card"/"CardFeature".
 */
const TAG_CANONICAL_MAP: Record<string, string> = {
  // auth
  'auth': 'Autenticação e Login',
  'login': 'Autenticação e Login',
  'logout': 'Autenticação e Login',
  'register': 'Autenticação e Login',
  'signup': 'Autenticação e Login',
  'signin': 'Autenticação e Login',
  'password': 'Autenticação e Login',
  'session': 'Autenticação e Login',
  'token': 'Autenticação e Login',
  'jwt': 'Autenticação e Login',
  'oauth': 'Autenticação e Login',
  'credential': 'Autenticação e Login',
  'authentication': 'Autenticação e Login',
  'autenticação': 'Autenticação e Login',
  'autenticacao': 'Autenticação e Login',

  // user
  'user': 'Gestão de Usuários',
  'profile': 'Gestão de Usuários',
  'account': 'Gestão de Usuários',
  'avatar': 'Gestão de Usuários',
  'preferences': 'Gestão de Usuários',
  'member': 'Gestão de Usuários',
  'usuario': 'Gestão de Usuários',
  'usuário': 'Gestão de Usuários',
  'usuarios': 'Gestão de Usuários',
  'usuários': 'Gestão de Usuários',

  // payment
  'payment': 'Pagamentos e Cobrança',
  'billing': 'Pagamentos e Cobrança',
  'checkout': 'Pagamentos e Cobrança',
  'stripe': 'Pagamentos e Cobrança',
  'invoice': 'Pagamentos e Cobrança',
  'subscription': 'Pagamentos e Cobrança',
  'pricing': 'Pagamentos e Cobrança',
  'pagamento': 'Pagamentos e Cobrança',
  'pagamentos': 'Pagamentos e Cobrança',

  // database
  'database': 'Acesso a Banco de Dados',
  'supabase': 'Acesso a Banco de Dados',
  'db': 'Acesso a Banco de Dados',
  'prisma': 'Acesso a Banco de Dados',
  'drizzle': 'Acesso a Banco de Dados',
  'postgres': 'Acesso a Banco de Dados',
  'mysql': 'Acesso a Banco de Dados',
  'mongo': 'Acesso a Banco de Dados',
  'migration': 'Acesso a Banco de Dados',
  'serializers': 'Acesso a Banco de Dados',
  'orm': 'Acesso a Banco de Dados',
  'querysets': 'Acesso a Banco de Dados',
  'repository': 'Acesso a Banco de Dados',
  'entity': 'Acesso a Banco de Dados',
  'gorm': 'Acesso a Banco de Dados',
  'jpa': 'Acesso a Banco de Dados',
  'hibernate': 'Acesso a Banco de Dados',
  'activerecord': 'Acesso a Banco de Dados',

  // n8n
  'n8n': 'Automação e Workflows',
  'workflow': 'Automação e Workflows',
  'automation': 'Automação e Workflows',
  'trigger': 'Automação e Workflows',
  'webhook': 'Automação e Workflows',
  'execution': 'Automação e Workflows',

  // ai
  'ai': 'Inteligência Artificial',
  'openai': 'Inteligência Artificial',
  'gpt': 'Inteligência Artificial',
  'llm': 'Inteligência Artificial',
  'embedding': 'Inteligência Artificial',
  'vector': 'Inteligência Artificial',
  'langchain': 'Inteligência Artificial',
  'claude': 'Inteligência Artificial',
  'anthropic': 'Inteligência Artificial',

  // notification
  'notification': 'Notificações e Emails',
  'email': 'Notificações e Emails',
  'sms': 'Notificações e Emails',
  'push': 'Notificações e Emails',
  'mail': 'Notificações e Emails',
  'mailer': 'Notificações e Emails',
  'nodemailer': 'Notificações e Emails',
  'notificação': 'Notificações e Emails',
  'notificacao': 'Notificações e Emails',
  'notificações': 'Notificações e Emails',
  'notificacoes': 'Notificações e Emails',

  // card
  'card': 'Sistema de Cards',
  'cards': 'Sistema de Cards',
  'cardfeature': 'Sistema de Cards',
  'feature': 'Sistema de Cards',

  // project
  'project': 'Gestão de Projetos',
  'projeto': 'Gestão de Projetos',
  'projetos': 'Gestão de Projetos',
  'import': 'Gestão de Projetos',
  'github': 'Gestão de Projetos',
  'repo': 'Gestão de Projetos',

  // template
  'template': 'Templates e Layouts',
  'templates': 'Templates e Layouts',

  // content
  'content': 'Gestão de Conteúdo',
  'conteudo': 'Gestão de Conteúdo',
  'conteúdo': 'Gestão de Conteúdo',
  'post': 'Gestão de Conteúdo',
  'article': 'Gestão de Conteúdo',

  // admin
  'admin': 'Painel Administrativo',
  'dashboard': 'Painel Administrativo',
  'backoffice': 'Painel Administrativo',
  'administração': 'Painel Administrativo',
  'administracao': 'Painel Administrativo',

  // api
  'apiclient': 'Clientes HTTP e APIs',
  'httpclient': 'Clientes HTTP e APIs',
  'axios': 'Clientes HTTP e APIs',

  // storage
  'storage': 'Upload e Armazenamento',
  'upload': 'Upload e Armazenamento',
  's3': 'Upload e Armazenamento',
  'bucket': 'Upload e Armazenamento',
  'blob': 'Upload e Armazenamento',
  'armazenamento': 'Upload e Armazenamento',

  // middleware
  'middleware': 'Middlewares e Interceptors',
  'cors': 'Middlewares e Interceptors',
  'ratelimit': 'Middlewares e Interceptors',
  'ratelimiter': 'Middlewares e Interceptors',
  'limiter': 'Middlewares e Interceptors',
  'decorators': 'Middlewares e Interceptors',
  'beforerequest': 'Middlewares e Interceptors',
  'afterrequest': 'Middlewares e Interceptors',
  'interceptor': 'Middlewares e Interceptors',
  'aspect': 'Middlewares e Interceptors',
  'concern': 'Middlewares e Interceptors',
  'rack': 'Middlewares e Interceptors',

  // routing
  'route': 'Rotas e Navegação',
  'router': 'Rotas e Navegação',
  'routing': 'Rotas e Navegação',
  'protected': 'Rotas e Navegação',
  'protectedroute': 'Rotas e Navegação',
  'guard': 'Rotas e Navegação',

  // ui
  'button': 'Componentes de Interface',
  'dialog': 'Componentes de Interface',
  'modal': 'Componentes de Interface',
  'dropdown': 'Componentes de Interface',
  'table': 'Componentes de Interface',
  'layout': 'Componentes de Interface',
  'sidebar': 'Componentes de Interface',
  'navigation': 'Componentes de Interface',

  // docs
  'readme': 'Documentação',
  'documentation': 'Documentação',
  'docs': 'Documentação',
  'guide': 'Documentação',
  'tutorial': 'Documentação',
  'changelog': 'Documentação',
  'contributing': 'Documentação',
  'roadmap': 'Documentação',
  'architecture': 'Documentação',

  // skill
  'skill': 'Skills e Tutoriais',
  'skills': 'Skills e Tutoriais',

  // utils
  'util': 'Funções Utilitárias',
  'utils': 'Funções Utilitárias',
  'helper': 'Funções Utilitárias',
  'helpers': 'Funções Utilitárias',
  'lib': 'Funções Utilitárias',
  'libs': 'Funções Utilitárias',
  'common': 'Funções Utilitárias',
  'shared': 'Funções Utilitárias',
  'constants': 'Funções Utilitárias',

  // config
  'config': 'Configuração do Projeto',
  'configuration': 'Configuração do Projeto',
  'settings': 'Configuração do Projeto',
  'env': 'Configuração do Projeto',
  'environment': 'Configuração do Projeto',
  'setup': 'Configuração do Projeto',
  'initialize': 'Configuração do Projeto',
  'configuração': 'Configuração do Projeto',
  'configuracao': 'Configuração do Projeto',

  // test
  'test': 'Testes Automatizados',
  'tests': 'Testes Automatizados',
  'spec': 'Testes Automatizados',
  'testing': 'Testes Automatizados',
  '__tests__': 'Testes Automatizados',
  'e2e': 'Testes Automatizados',
  'integration': 'Testes Automatizados',
  'unit': 'Testes Automatizados',
  'mock': 'Testes Automatizados',
  'fixture': 'Testes Automatizados',
  'testes': 'Testes Automatizados',

  // build
  'build': 'Build e Ferramentas',
  'webpack': 'Build e Ferramentas',
  'vite': 'Build e Ferramentas',
  'rollup': 'Build e Ferramentas',
  'esbuild': 'Build e Ferramentas',
  'tsconfig': 'Build e Ferramentas',
  'babel': 'Build e Ferramentas',
  'eslint': 'Build e Ferramentas',
  'prettier': 'Build e Ferramentas',
  'lint': 'Build e Ferramentas',

  // style
  'css': 'Estilos e Temas',
  'scss': 'Estilos e Temas',
  'sass': 'Estilos e Temas',
  'less': 'Estilos e Temas',
  'style': 'Estilos e Temas',
  'styles': 'Estilos e Temas',
  'tailwind': 'Estilos e Temas',
  'theme': 'Estilos e Temas',
  'colors': 'Estilos e Temas',

  // hook
  'hook': 'React Hooks',
  'hooks': 'React Hooks',

  // controller
  'controller': 'Endpoints e Controllers',
  'endpoint': 'Endpoints e Controllers',
  'viewsets': 'Endpoints e Controllers',
  'apiview': 'Endpoints e Controllers',
  'restcontroller': 'Endpoints e Controllers',
  'requestmapping': 'Endpoints e Controllers',

  // service
  'service': 'Lógica de Negócio',
  'business': 'Lógica de Negócio',
  'usecase': 'Lógica de Negócio',
  'interactor': 'Lógica de Negócio',
  'serviceimpl': 'Lógica de Negócio',

  // validation
  'validator': 'Validação de Dados',
  'validation': 'Validação de Dados',
  'schema': 'Validação de Dados',
  'zod': 'Validação de Dados',
  'yup': 'Validação de Dados',
  'validators': 'Validação de Dados',
  'pydantic': 'Validação de Dados',
  'validate': 'Validação de Dados',
  'constraint': 'Validação de Dados',
  'formrequest': 'Validação de Dados',
  'validação': 'Validação de Dados',
  'validacao': 'Validação de Dados',

  // jobs
  'worker': 'Tarefas em Background',
  'job': 'Tarefas em Background',
  'queue': 'Tarefas em Background',
  'bull': 'Tarefas em Background',
  'agenda': 'Tarefas em Background',
  'celery': 'Tarefas em Background',
  'scheduled': 'Tarefas em Background',
  'executor': 'Tarefas em Background',
  'sidekiq': 'Tarefas em Background',
  'activejob': 'Tarefas em Background',
  'delayed': 'Tarefas em Background',

  // Macro-categorias (normalizar variantes comuns)
  'frontend': 'Frontend',
  'backend': 'Backend',
  'fullstack': 'Fullstack',
  'devops': 'DevOps',
  'ferramentas': 'Ferramentas',
}

/**
 * Normaliza uma tag para seu nome canonico em portugues.
 * Se nao encontrar no mapa, retorna a tag original com trim.
 */
export function normalizeTag(tag: string): string {
  const key = tag.trim().toLowerCase()
  return TAG_CANONICAL_MAP[key] || tag.trim()
}

/**
 * Normaliza um array de tags: aplica normalizeTag + remove duplicatas.
 */
export function normalizeTags(tags: string[]): string[] {
  const normalized = tags.map(t => normalizeTag(t))
  return [...new Set(normalized)].filter(t => t.length > 2)
}
