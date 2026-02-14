/**
 * Mapeamento semântico compartilhado: feature → keywords e títulos em português.
 * Usado pelo prompt da IA, cardQualitySupervisor e referência de categorias.
 */

/** Mapeamento semântico: feature → keywords que pertencem a ela. */
export const FEATURE_SEMANTIC_MAP: Record<string, string[]> = {
  auth: ['auth', 'login', 'logout', 'register', 'signup', 'signin', 'password', 'session', 'token', 'jwt', 'oauth', 'credential', 'authentication'],
  user: ['user', 'profile', 'account', 'avatar', 'preferences', 'member'],
  payment: ['payment', 'billing', 'checkout', 'stripe', 'invoice', 'subscription', 'pricing'],
  database: ['supabase', 'database', 'db', 'prisma', 'drizzle', 'postgres', 'mysql', 'mongo', 'migration', 'serializers', 'orm', 'querysets', 'repository', 'entity', 'gorm', 'jpa', 'hibernate', 'activerecord'],
  n8n: ['n8n', 'workflow', 'automation', 'node', 'trigger', 'webhook', 'execution'],
  ai: ['ai', 'openai', 'gpt', 'llm', 'embedding', 'vector', 'langchain', 'claude', 'anthropic'],
  notification: ['notification', 'alert', 'toast', 'email', 'sms', 'push', 'mail', 'mailer', 'nodemailer'],
  card: ['card', 'cardfeature', 'feature'],
  project: ['project', 'projeto', 'repo', 'repository'],
  github_import: ['github', 'githubimport', 'repo-import', 'zipball'],
  grouping: ['group', 'cluster', 'grouping', 'cardgroup', 'agrupamento'],
  template: ['template'],
  content: ['content', 'conteudo', 'post', 'article'],
  admin: ['admin', 'dashboard', 'backoffice'],
  api: ['apiclient', 'httpclient', 'axios', 'fetch'],
  storage: ['storage', 'upload', 'file', 's3', 'bucket', 'blob'],
  middleware: ['middleware', 'cors', 'error', 'ratelimit', 'ratelimiter', 'limiter', 'decorators', 'beforerequest', 'afterrequest', 'interceptor', 'filter', 'aspect', 'concern', 'rack'],
  routing: ['route', 'router', 'routing', 'protected', 'protectedroute', 'guard'],
  ui: ['button', 'input', 'dialog', 'modal', 'dropdown', 'form', 'table', 'layout', 'sidebar', 'navigation', 'toast', 'alert'],
  docs: ['readme', 'documentation', 'docs', 'guide', 'tutorial', 'changelog', 'contributing', 'license', 'roadmap', 'architecture', 'design'],
  skill: ['skill', 'skills'],
  utils: ['util', 'utils', 'helper', 'helpers', 'lib', 'libs', 'common', 'shared', 'constants', 'types'],
  config: ['config', 'configuration', 'settings', 'env', 'environment', 'setup', 'initialize', 'server'],
  test: ['test', 'tests', 'spec', 'testing', '__tests__', 'e2e', 'integration', 'unit', 'mock', 'fixture'],
  build: ['build', 'webpack', 'vite', 'rollup', 'esbuild', 'tsconfig', 'babel', 'eslint', 'prettier', 'lint', 'format'],
  style: ['css', 'scss', 'sass', 'less', 'style', 'styles', 'tailwind', 'theme', 'colors'],
  hook: ['hook', 'hooks'],
  controller: ['controller', 'endpoint', 'viewsets', 'apiview', 'restcontroller', 'requestmapping', 'action'],
  service: ['service', 'business', 'logic', 'usecase', 'interactor', 'serviceimpl', 'component'],
  validation: ['validator', 'validation', 'schema', 'zod', 'yup', 'validators', 'forms', 'pydantic', 'validate', 'constraint', 'request', 'formrequest'],
  jobs: ['worker', 'job', 'queue', 'bull', 'agenda', 'celery', 'tasks', 'scheduled', 'async', 'executor', 'sidekiq', 'activejob', 'delayed']
}

/** Títulos descritivos em português para cada feature semântica. */
export const FEATURE_TITLES: Record<string, string> = {
  auth: 'Autenticação e Login',
  user: 'Gestão de Usuários',
  payment: 'Pagamentos e Cobrança',
  database: 'Acesso a Banco de Dados',
  n8n: 'Automação e Workflows',
  ai: 'Inteligência Artificial',
  notification: 'Notificações e Emails',
  card: 'Sistema de Cards',
  project: 'Gestão de Projetos',
  github_import: 'Importação GitHub',
  grouping: 'Agrupamento de Cards',
  template: 'Templates e Layouts',
  content: 'Gestão de Conteúdo',
  admin: 'Painel Administrativo',
  api: 'Clientes HTTP e APIs',
  storage: 'Upload e Armazenamento',
  middleware: 'Middlewares e Interceptors',
  routing: 'Rotas e Navegação',
  ui: 'Componentes de Interface',
  docs: 'Documentação',
  skill: 'Skills e Tutoriais',
  utils: 'Funções Utilitárias',
  config: 'Configuração do Projeto',
  test: 'Testes Automatizados',
  build: 'Build e Ferramentas',
  style: 'Estilos e Temas',
  hook: 'React Hooks',
  controller: 'Endpoints e Controllers',
  service: 'Lógica de Negócio',
  validation: 'Validação de Dados',
  jobs: 'Tarefas em Background'
}
