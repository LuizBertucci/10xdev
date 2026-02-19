# Workflow para Refatoração de Projeto

Este workflow guia o processo completo de análise, planejamento e execução da refatoração de um projeto externo para uma arquitetura otimizada e escalável, preservando a boa experiência do usuário.

## Objetivo

Transformar um projeto mal otimizado mas com boa UX (geralmente vindo da plataforma V0) em uma aplicação bem estruturada, performática e escalável, mantendo todas as funcionalidades e experiência do usuário.

## Pré-requisitos

- Acesso ao código fonte do projeto V0
- Node.js instalado (se for projeto web)
- Git instalado
- Ferramentas de análise (Lighthouse, Bundle Analyzer, etc.)
- Editor de código configurado

## Fase 1: Análise e Diagnóstico (Discovery)

### Passo 1.1: Mapeamento da Estrutura Atual

1. **Listar toda a estrutura do projeto:**
   ```bash
   # Use o comando list_files recursivamente
   ```
   - Objetivo: Criar um mapa completo da arquitetura atual
   - Resultado: Documento com a árvore de arquivos e pastas

2. **Identificar padrões de organização:**
   - Verificar se existe separação de responsabilidades
   - Identificar componentes monolíticos
   - Mapear dependências entre arquivos

### Passo 1.2: Análise de Dependências

1. **Examinar package.json (ou equivalente):**
   ```bash
   # Ler arquivo de dependências
   ```
   - Identificar bibliotecas desatualizadas
   - Encontrar dependências desnecessárias
   - Verificar vulnerabilidades de segurança

### Passo 1.3: Identificação de Code Smells

1. **Analisar arquivos principais:**
   - Componentes com mais de 200 linhas
   - Funções com muitas responsabilidades
   - Código duplicado
   - Falta de tratamento de erros
   - Lógica de negócio misturada com UI

2. **Verificar performance:**
   - Renderizações desnecessárias
   - Carregamento síncrono de recursos
   - Ausência de lazy loading

## Fase 2: Planejamento e Arquitetura

### Passo 2.1: Desenho da Nova Arquitetura

1. **Propor nova estrutura de pastas:**
   ```
   src/
   ├── components/
   │   ├── ui/           # Componentes básicos reutilizáveis
   │   ├── forms/        # Componentes de formulário
   │   └── layout/       # Componentes de layout
   ├── pages/            # Páginas da aplicação
   ├── hooks/            # Custom hooks
   ├── services/         # Serviços e APIs
   ├── utils/            # Funções utilitárias
   ├── types/            # Definições de tipos (TypeScript)
   ├── constants/        # Constantes da aplicação
   └── assets/           # Recursos estáticos
   ```

2. **Definir padrões de código:**
   - Convenções de nomenclatura
   - Estrutura de componentes
   - Padrões de importação
   - Organização de estilos

### Passo 2.2: Criação do Plano de Ação

1. **Priorizar tarefas por impacto e esforço:**
   ```
   [P1] Alto Impacto, Baixo Esforço
   [P2] Alto Impacto, Alto Esforço  
   [P3] Baixo Impacto, Baixo Esforço
   [P4] Baixo Impacto, Alto Esforço
   ```

2. **Exemplo de backlog de refatoração:**
   - `[P1]` Extrair componentes reutilizáveis do arquivo principal
   - `[P1]` Criar serviço centralizado para chamadas de API
   - `[P1]` Implementar lazy loading para rotas
   - `[P2]` Migrar para TypeScript
   - `[P2]` Adicionar testes unitários para componentes críticos
   - `[P3]` Atualizar dependências
   - `[P4]` Refatorar lógica de estado global

## Fase 3: Execução (Iterativa)

### Passo 3.1: Refatoração Incremental

1. **Pegar uma tarefa do plano de ação**
2. **Criar uma nova branch:**
   ```bash
   git checkout -b refactor/nome-da-tarefa
   ```
3. **Executar a refatoração:**
   - Ler arquivos (`read_file`)
   - Criar novos arquivos (`write_to_file`)
   - Modificar arquivos existentes (`replace_in_file`)
4. **Fazer commit das alterações:**
   ```bash
   git add .
   git commit -m "refactor: descrição da refatoração"
   ```

### Passo 3.2: Validação Contínua

- Após cada mudança significativa, solicitar ao usuário para validar a funcionalidade e a UX
- Usar: "Please run the build and test feature X."

### Passo 4.1: Limpeza Final

- Remover arquivos antigos e não utilizados
- Unificar configurações
- Garantir que não há código morto

### Passo 4.2: Documentação

- Atualizar o `README.md` com a nova arquitetura
- Documentar decisões importantes de refatoração
- Criar guias de contribuição se necessário

## Conclusão

Este workflow fornece um processo estruturado para refatorar projetos legados, garantindo que a qualidade do código seja melhorada sem comprometer a experiência do usuário.
