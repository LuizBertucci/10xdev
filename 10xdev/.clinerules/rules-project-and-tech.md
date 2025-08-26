# Tech Stack

Este documento descreve as principais tecnologias e ferramentas utilizadas no desenvolvimento do Alavanca Dash.

## Front-end
- **React 18:** Biblioteca principal para construção de interfaces reativas e componentes reutilizáveis.
- **Next.js:** Framework para aplicações React, otimizado para performance e SEO, com roteamento baseado em arquivos e renderização no servidor.
- **shadcn/ui:** Coleção de componentes de UI reutilizáveis e acessíveis, construídos com Radix UI e Tailwind CSS.
- **Lucide React:** Biblioteca de ícones leves e personalizáveis para React.

## Back-end
- **Node.js:** Ambiente de execução JavaScript no servidor, garantindo alta performance e escalabilidade.
- **Express:** Framework minimalista para criação de APIs RESTful, roteamento e middleware, facilitando a organização de endpoints.

## Banco de Dados
- **PostgreSQL:** Sistema de gerenciamento de banco relacional robusto, com suporte a transações, índices avançados e extensões, garantindo segurança e performance para dados de leads e métricas.

## Routing (Front-end)
- **React Router v6:** Biblioteca para navegação em aplicações React, possibilitando rotas aninhadas, lazy loading e transições de página de forma simples e declarativa.

## Autenticação
- **JWT (JSON Web Tokens):** Mecanismo de autenticação baseado em tokens, permitindo comunicação stateless entre cliente e servidor e facilitando a proteção de rotas e recursos.

## CI/CD
- **GitHub Actions:** Ferramenta de integração contínua e entrega contínua, configurando pipelines automatizados para:
  1. **Build:** Execução de testes automatizados e linting.
  2. **Deploy:** Deploy automático em ambiente de staging/prod para containers Docker.
  3. **Monitoramento:** Alertas de falhas em builds e deploys, garantindo qualidade no fluxo de desenvolvimento.

---