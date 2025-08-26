import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Sparkles, 
  Workflow, 
  FileCode, 
  Server, 
  Lightbulb, 
  Bot, 
  Play, 
  Download, 
  Code2 
} from "lucide-react"

export default function AI() {
  const automationProjects = [
    {
      title: "Gerador de Conteúdo",
      description: "Automatize a criação de posts para redes sociais com IA",
      tech: ["n8n", "OpenAI", "Twitter API"],
    },
    {
      title: "Análise de Sentimento",
      description: "Monitore menções da sua marca e analise o sentimento",
      tech: ["n8n", "HuggingFace", "Slack"],
    },
    {
      title: "Resumo de Reuniões",
      description: "Transcreva e resuma automaticamente suas reuniões",
      tech: ["n8n", "Whisper", "GPT-4"],
    },
  ]

  const cursorRules = [
    {
      name: "Clean Code Expert",
      description: "Otimiza seu código seguindo princípios de Clean Code",
      language: "Todas",
      rule: "Atue como um especialista em Clean Code. Analise meu código e sugira melhorias seguindo os princípios SOLID, DRY e KISS. Identifique code smells e forneça refatorações específicas.",
    },
    {
      name: "React Component Builder",
      description: "Cria componentes React otimizados e com boas práticas",
      language: "React",
      rule: "Crie componentes React seguindo as melhores práticas. Use hooks apropriados, evite re-renderizações desnecessárias, e organize o código de forma modular. Adicione comentários explicativos e tipos TypeScript.",
    },
    {
      name: "API Documentation",
      description: "Gera documentação detalhada para APIs",
      language: "Backend",
      rule: "Gere documentação completa para esta API. Inclua descrição dos endpoints, parâmetros, respostas, códigos de status, exemplos de requisição e resposta em formato JSON, e possíveis erros.",
    },
    {
      name: "Test Generator",
      description: "Cria testes unitários e de integração",
      language: "Todas",
      rule: "Gere testes abrangentes para este código. Inclua testes unitários para funções individuais e testes de integração para fluxos completos. Use mocks quando apropriado e cubra casos de borda e exceções.",
    },
  ]

  const mcpServers = [
    {
      name: "FastGPT Server",
      models: ["GPT-4o", "Claude 3", "Llama 3"],
      latency: "Baixa",
      cost: "$$",
      url: "#",
    },
    {
      name: "DevAI Hub",
      models: ["GPT-4o", "Mixtral", "CodeLlama"],
      latency: "Média",
      cost: "$",
      url: "#",
    },
    {
      name: "CodeForge MCP",
      models: ["GPT-4o", "Claude 3 Opus", "Llama 3"],
      latency: "Muito Baixa",
      cost: "$$$",
      url: "#",
    },
    {
      name: "AIDevTools",
      models: ["GPT-3.5", "Llama 2", "Mistral"],
      latency: "Baixa",
      cost: "Gratuito",
      url: "#",
    },
  ]

  const promptTips = [
    {
      title: "Seja específico com contexto",
      description: "Forneça detalhes sobre o projeto, tecnologias e requisitos específicos.",
    },
    {
      title: "Use exemplos concretos",
      description: "Demonstre o formato de saída desejado com exemplos claros.",
    },
    {
      title: "Divida tarefas complexas",
      description: "Quebre problemas grandes em etapas menores e sequenciais.",
    },
    {
      title: "Refine iterativamente",
      description: "Use os resultados anteriores para melhorar prompts subsequentes.",
    },
  ]

  const recommendedTools = [
    {
      name: "Cursor IDE",
      description: "Editor de código com IA integrada para desenvolvimento acelerado",
      url: "https://cursor.sh",
    },
    {
      name: "GitHub Copilot",
      description: "Assistente de codificação baseado em IA da GitHub",
      url: "https://github.com/features/copilot",
    },
    {
      name: "n8n",
      description: "Plataforma de automação de fluxo de trabalho com suporte a IA",
      url: "https://n8n.io",
    },
    {
      name: "Codeium",
      description: "Alternativa gratuita ao Copilot com recursos avançados",
      url: "https://codeium.com",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Integrando com IA</h1>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="text-sm text-gray-600">Potencialize seu desenvolvimento</span>
        </div>
      </div>

      {/* AI Categories */}
      <Tabs defaultValue="automation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="automation">
            <Workflow className="h-4 w-4 mr-2" />
            Automação
          </TabsTrigger>
          <TabsTrigger value="cursor">
            <FileCode className="h-4 w-4 mr-2" />
            Cursor Rules
          </TabsTrigger>
          <TabsTrigger value="servers">
            <Server className="h-4 w-4 mr-2" />
            MCP Servers
          </TabsTrigger>
          <TabsTrigger value="tips">
            <Lightbulb className="h-4 w-4 mr-2" />
            Dicas & Truques
          </TabsTrigger>
        </TabsList>

        {/* Automation Tab Content */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2 text-purple-500" />
                  Introdução ao n8n
                </CardTitle>
                <CardDescription>Aprenda a criar fluxos de automação com IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-200 rounded-md mb-4 flex items-center justify-center">
                  <Play className="h-12 w-12 text-slate-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Duração: 45min</span>
                    <span>Nível: Iniciante</span>
                  </div>
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Assistir Aula
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Workflow className="h-5 w-5 mr-2 text-purple-500" />
                  Fluxos de Trabalho com GPT
                </CardTitle>
                <CardDescription>Integre o ChatGPT em seus fluxos de automação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-200 rounded-md mb-4 flex items-center justify-center">
                  <Play className="h-12 w-12 text-slate-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Duração: 60min</span>
                    <span>Nível: Intermediário</span>
                  </div>
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Assistir Aula
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Projetos de Automação com IA</CardTitle>
                <CardDescription>Templates prontos para acelerar sua integração</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {automationProjects.map((project, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-2">{project.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {project.tech.map((tech, techIndex) => (
                            <Badge key={techIndex} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                        <Button size="sm" className="w-full">
                          <Download className="h-3 w-3 mr-2" />
                          Importar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cursor Rules Tab Content */}
        <TabsContent value="cursor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cursor Rules para Desenvolvimento</CardTitle>
              <CardDescription>
                Regras otimizadas para aumentar sua produtividade com o Cursor AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cursorRules.map((rule, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{rule.name}</h3>
                        <p className="text-sm text-gray-600">{rule.description}</p>
                      </div>
                      <Badge>{rule.language}</Badge>
                    </div>
                    <div className="bg-gray-100 rounded-md p-3 text-sm font-mono mb-3">{rule.rule}</div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline">
                        <Code2 className="h-4 w-4 mr-2" />
                        Copiar Rule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCP Servers Tab Content */}
        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Servers Recomendados</CardTitle>
              <CardDescription>Servidores otimizados para desenvolvimento com IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-3 border">Nome</th>
                        <th className="text-left p-3 border">Modelos</th>
                        <th className="text-left p-3 border">Latência</th>
                        <th className="text-left p-3 border">Custo</th>
                        <th className="text-left p-3 border">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mcpServers.map((server, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3 border">{server.name}</td>
                          <td className="p-3 border">
                            <div className="flex flex-wrap gap-1">
                              {server.models.map((model, modelIndex) => (
                                <Badge key={modelIndex} variant="outline" className="text-xs">
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 border">{server.latency}</td>
                          <td className="p-3 border">{server.cost}</td>
                          <td className="p-3 border">
                            <Button size="sm">
                              <Server className="h-4 w-4 mr-2" />
                              Conectar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
                  <h4 className="font-medium text-blue-800 mb-1">Como conectar ao MCP Server</h4>
                  <p className="text-blue-700">
                    Configure seu editor Cursor ou VS Code para usar estes servidores MCP e aproveite modelos
                    de IA mais rápidos e personalizados para desenvolvimento.
                  </p>
                  <Button size="sm" variant="link" className="p-0 mt-2 text-blue-600">
                    Ver tutorial completo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tips & Tricks Tab Content */}
        <TabsContent value="tips" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dicas para Prompts Eficientes</CardTitle>
                <CardDescription>Otimize suas interações com IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {promptTips.map((tip, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{tip.title}</h4>
                        <p className="text-sm text-gray-600">{tip.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ferramentas Recomendadas</CardTitle>
                <CardDescription>Potencialize seu fluxo de trabalho com IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendedTools.map((tool, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{tool.name}</h4>
                          <p className="text-sm text-gray-600">{tool.description}</p>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <a href={tool.url} target="_blank" rel="noopener noreferrer">
                            Acessar
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Templates de Prompts</CardTitle>
                <CardDescription>Prompts prontos para tarefas comuns de desenvolvimento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Code Review",
                      prompt: "Analise este código e forneça feedback sobre:\n1. Qualidade e legibilidade\n2. Possíveis bugs ou problemas\n3. Sugestões de melhoria\n4. Aderência às melhores práticas",
                    },
                    {
                      title: "Documentação de API",
                      prompt: "Gere documentação completa para esta API incluindo:\n1. Descrição dos endpoints\n2. Parâmetros de entrada e saída\n3. Códigos de status HTTP\n4. Exemplos de uso",
                    },
                    {
                      title: "Otimização de Performance",
                      prompt: "Analise este código para otimização de performance:\n1. Identifique gargalos\n2. Sugira melhorias específicas\n3. Estime o impacto das mudanças\n4. Mantenha a funcionalidade",
                    },
                    {
                      title: "Testes Unitários",
                      prompt: "Crie testes unitários abrangentes para este código:\n1. Teste casos normais e de borda\n2. Use mocks apropriados\n3. Cubra cenários de erro\n4. Siga padrões do framework",
                    },
                  ].map((template, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-2">{template.title}</h3>
                        <div className="bg-gray-100 rounded p-2 text-xs font-mono mb-3 whitespace-pre-line">
                          {template.prompt}
                        </div>
                        <Button size="sm" variant="outline" className="w-full">
                          <Code2 className="h-4 w-4 mr-2" />
                          Copiar Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}