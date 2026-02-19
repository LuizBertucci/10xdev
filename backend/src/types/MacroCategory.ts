export enum MacroCategory {
  // Core Development (maps to Códigos)
  FRONTEND = 'Frontend',
  BACKEND = 'Backend',
  FULLSTACK = 'Fullstack',
  MOBILE = 'Mobile',
  DEVOPS = 'DevOps',
  
  // Learning Content (maps to Conteúdos)  
  TUTORIALS = 'Tutoriais',
  ARTICLES = 'Artigos',
  DOCUMENTATION = 'Documentação',
  
  // Project Types (maps to Projetos)
  WEB_APPS = 'Aplicações Web',
  APIS = 'APIs',
  LIBRARIES = 'Bibliotecas',
  TOOLS = 'Ferramentas',
  TEMPLATES = 'Templates',
  
  // Specialized Areas
  AI_ML = 'IA/ML',
  DATA = 'Dados',
  SECURITY = 'Segurança',
  TESTING = 'Testes',
  
  // General
  UTILITIES = 'Utilitários',
  CONFIG = 'Configuração'
}

// Mapping from current micro-categories to macro categories
export const MICRO_TO_MACRO_MAPPING: Record<string, MacroCategory> = {
  // Frontend macro
  'ui': MacroCategory.FRONTEND,
  'components': MacroCategory.FRONTEND,
  'hooks': MacroCategory.FRONTEND,
  'pages': MacroCategory.FRONTEND,
  'stores': MacroCategory.FRONTEND,
  'styles': MacroCategory.FRONTEND,
  'card': MacroCategory.FRONTEND,
  
  // Backend macro
  'controllers': MacroCategory.BACKEND,
  'services': MacroCategory.BACKEND,
  'models': MacroCategory.BACKEND,
  'middleware': MacroCategory.BACKEND,
  'routing': MacroCategory.BACKEND,
  'api': MacroCategory.APIS,
  'database': MacroCategory.DATA,
  
  // Fullstack macro
  'auth': MacroCategory.FULLSTACK,
  'user': MacroCategory.FULLSTACK,
  'payment': MacroCategory.FULLSTACK,
  'notification': MacroCategory.FULLSTACK,
  'project': MacroCategory.WEB_APPS,
  'admin': MacroCategory.FULLSTACK,
  
  // DevOps macro
  'build': MacroCategory.DEVOPS,
  'config': MacroCategory.CONFIG,
  'storage': MacroCategory.DEVOPS,
  'jobs': MacroCategory.DEVOPS,
  
  // Content macro
  'docs': MacroCategory.DOCUMENTATION,
  'content': MacroCategory.ARTICLES,
  'skill': MacroCategory.TUTORIALS,
  'tutorial': MacroCategory.TUTORIALS,
  
  // AI macro
  'ai': MacroCategory.AI_ML,
  'n8n': MacroCategory.TOOLS,
  
  // Testing macro
  'test': MacroCategory.TESTING,
  'validation': MacroCategory.TESTING,
  
  // Tools macro
  'utils': MacroCategory.UTILITIES,
  'tools': MacroCategory.TOOLS,
  'template': MacroCategory.TEMPLATES
}

// Macro category descriptions for better UI
export const MACRO_CATEGORY_DESCRIPTIONS: Record<MacroCategory, string> = {
  [MacroCategory.FRONTEND]: 'Componentes, interfaces e experiência do usuário',
  [MacroCategory.BACKEND]: 'APIs, serviços e lógica de servidor',
  [MacroCategory.FULLSTACK]: 'Aplicações completas integrando frontend e backend',
  [MacroCategory.MOBILE]: 'Aplicações para dispositivos móveis',
  [MacroCategory.DEVOPS]: 'Infraestrutura, deployment e configuração',
  [MacroCategory.TUTORIALS]: 'Guias passo a passo e aprendizado prático',
  [MacroCategory.ARTICLES]: 'Artigos técnicos e análises conceituais',
  [MacroCategory.DOCUMENTATION]: 'Documentação oficial e referências',
  [MacroCategory.WEB_APPS]: 'Aplicações web completas e funcionais',
  [MacroCategory.APIS]: 'APIs REST, GraphQL e integrações',
  [MacroCategory.LIBRARIES]: 'Bibliotecas e pacotes reutilizáveis',
  [MacroCategory.TOOLS]: 'Ferramentas de desenvolvimento e utilitários',
  [MacroCategory.TEMPLATES]: 'Templates e estruturas de projeto',
  [MacroCategory.AI_ML]: 'Inteligência artificial e machine learning',
  [MacroCategory.DATA]: 'Processamento e análise de dados',
  [MacroCategory.SECURITY]: 'Segurança, autenticação e proteção',
  [MacroCategory.TESTING]: 'Testes automatizados e qualidade',
  [MacroCategory.UTILITIES]: 'Funções utilitárias e helpers',
  [MacroCategory.CONFIG]: 'Configuração e setup de projeto'
}