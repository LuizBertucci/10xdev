import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, Code2, Download, Maximize2 } from "lucide-react"

interface PlatformState {
  setActiveTab: (tab: string) => void
}

interface DashboardProps {
  platformState: PlatformState
}

export default function Dashboard({ platformState }: DashboardProps) {
  const [openModalId, setOpenModalId] = useState<string | null>(null)

  const dashboardFeatures = [
    {
      id: "overview",
      title: "Cards de Métricas",
      description: "Componentes para exibir KPIs principais",
      icon: "📊",
      active: true,
    },
    {
      id: "charts",
      title: "Gráficos Interativos",
      description: "Charts com Recharts e animações",
      icon: "📈",
      active: false,
    },
    {
      id: "tables",
      title: "Tabelas de Dados",
      description: "Tabelas responsivas com filtros",
      icon: "📋",
      active: false,
    },
    {
      id: "filters",
      title: "Filtros e Busca",
      description: "Sistema de filtros avançados",
      icon: "🔍",
      active: false,
    },
    {
      id: "export",
      title: "Exportação",
      description: "Export para PDF, CSV e Excel",
      icon: "📤",
      active: false,
    },
    {
      id: "realtime",
      title: "Tempo Real",
      description: "WebSockets e atualizações live",
      icon: "⚡",
      active: false,
    },
  ]

  const techStack = [
    { name: "Next.js 15", version: "^15.0.0" },
    { name: "TypeScript", version: "^5.0.0" },
    { name: "Tailwind CSS", version: "^3.4.0" },
    { name: "Recharts", version: "^2.8.0" },
    { name: "Shadcn/ui", version: "latest" },
    { name: "Lucide React", version: "^0.400.0" },
  ]

  const nextSteps = [
    { task: "Configurar banco de dados", done: true },
    { task: "Implementar autenticação", done: true },
    { task: "Criar API endpoints", done: false },
    { task: "Adicionar testes", done: false },
    { task: "Deploy em produção", done: false },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm">
        <button
          onClick={() => platformState.setActiveTab("home")}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Início
        </button>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900 font-medium">Dashboard Analytics</span>
      </div>

      <div className="flex gap-6">
        {/* Sidebar com Funcionalidades */}
        <div className="w-80 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funcionalidades</CardTitle>
              <CardDescription>Componentes do dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    feature.active ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{feature.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                    </div>
                    {feature.active && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stack Tecnológica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {techStack.map((tech, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{tech.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {tech.version}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {nextSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        step.done ? "bg-green-500 border-green-500" : "border-gray-300"
                      }`}
                    >
                      {step.done && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={step.done ? "line-through text-gray-500" : ""}>{step.task}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Área Principal com Código */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cards de Métricas</h1>
              <p className="text-gray-600">Componentes para exibir KPIs principais do dashboard</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Code2 className="h-4 w-4 mr-2" />
                Copiar Código
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Baixar Projeto
              </Button>
            </div>
          </div>

          {/* Preview do Componente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>Visualização do componente em funcionamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Receita Total</p>
                      <p className="text-2xl font-bold text-gray-900">R$ 45.231,89</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">↗</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">+20.1% em relação ao mês anterior</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Novos Usuários</p>
                      <p className="text-2xl font-bold text-gray-900">+2,350</p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">👥</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">+180 nas últimas 24 horas</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                      <p className="text-2xl font-bold text-gray-900">3.2%</p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-sm">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">+0.4% em relação à semana anterior</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Código do Componente */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Implementação</CardTitle>
                  <CardDescription>Código TypeScript + React para os cards de métricas</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModalId("dashboard-metrics")}
                  className="text-gray-500 hover:text-gray-900"
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Expandir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="installation" className="w-full">
                <TabsList>
                  <TabsTrigger value="installation">Instalação</TabsTrigger>
                  <TabsTrigger value="component">Componente</TabsTrigger>
                  <TabsTrigger value="types">Types</TabsTrigger>
                  <TabsTrigger value="hooks">Hooks</TabsTrigger>
                  <TabsTrigger value="api">API</TabsTrigger>
                </TabsList>
                <TabsContent value="installation" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">1. Instalar Dependências</h4>
                      <div className="bg-gray-100 rounded-md p-3 text-sm font-mono">
                        npm install @radix-ui/react-slot lucide-react class-variance-authority
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">2. Configurar Tailwind CSS</h4>
                      <div className="bg-gray-100 rounded-md p-3 text-sm">
                        Certifique-se de que o Tailwind CSS está configurado no seu projeto
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">3. Adicionar Componentes</h4>
                      <div className="bg-gray-100 rounded-md p-3 text-sm">
                        Copie os componentes Card e Button do shadcn/ui para seu projeto
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">4. Implementar API</h4>
                      <div className="bg-gray-100 rounded-md p-3 text-sm">
                        Crie o endpoint /api/dashboard conforme mostrado na aba API
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="component" className="mt-4">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100">
                      <code>{`import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Percent } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: 'revenue' | 'users' | 'conversion';
}

const iconMap = {
  revenue: TrendingUp,
  users: Users,
  conversion: Percent,
};

const colorMap = {
  positive: {
    text: 'text-green-600',
    bg: 'bg-green-100',
    icon: 'text-green-600'
  },
  negative: {
    text: 'text-red-600',
    bg: 'bg-red-100',
    icon: 'text-red-600'
  },
  neutral: {
    text: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: 'text-gray-600'
  }
};

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon 
}: MetricCardProps) {
  const IconComponent = iconMap[icon];
  const colors = colorMap[changeType];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={\`h-12 w-12 \${colors.bg} rounded-full flex items-center justify-center\`}>
            <IconComponent className={\`h-6 w-6 \${colors.icon}\`} />
          </div>
        </div>
        <p className={\`text-xs \${colors.text} mt-2\`}>{change}</p>
      </CardContent>
    </Card>
  );
}

// Uso do componente
export function DashboardMetrics() {
  const metrics = [
    {
      title: "Receita Total",
      value: "R$ 45.231,89",
      change: "+20.1% em relação ao mês anterior",
      changeType: "positive" as const,
      icon: "revenue" as const
    },
    {
      title: "Novos Usuários",
      value: "+2,350",
      change: "+180 nas últimas 24 horas",
      changeType: "positive" as const,
      icon: "users" as const
    },
    {
      title: "Taxa de Conversão",
      value: "3.2%",
      change: "+0.4% em relação à semana anterior",
      changeType: "positive" as const,
      icon: "conversion" as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}`}</code>
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="types" className="mt-4">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100">
                      <code>{`// types/dashboard.ts
export interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: 'revenue' | 'users' | 'conversion' | 'orders';
  format: 'currency' | 'number' | 'percentage';
}

export interface DashboardData {
  metrics: DashboardMetric[];
  charts: ChartData[];
  tables: TableData[];
  lastUpdated: Date;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: Array<Record<string, any>>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Utility types
export type MetricChangeType = 'positive' | 'negative' | 'neutral';
export type MetricIconType = 'revenue' | 'users' | 'conversion' | 'orders';
export type MetricFormatType = 'currency' | 'number' | 'percentage';`}</code>
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="hooks" className="mt-4">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100">
                      <code>{`import { useState, useEffect } from 'react';
import { DashboardData, DashboardMetric } from '../types/dashboard';

interface UseDashboardOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { refreshInterval = 30000, autoRefresh = false } = options;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do dashboard');
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchDashboardData
  };
}`}</code>
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="api" className="mt-4">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100">
                      <code>{`// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { DashboardData } from '@/types/dashboard';

export async function GET() {
  try {
    // Simular busca de dados do banco
    const dashboardData: DashboardData = {
      metrics: [
        {
          id: '1',
          title: 'Receita Total',
          value: 'R$ 45.231,89',
          change: 20.1,
          changeType: 'positive',
          icon: 'revenue',
          format: 'currency'
        },
        {
          id: '2',
          title: 'Novos Usuários',
          value: '+2,350',
          change: 15.3,
          changeType: 'positive',
          icon: 'users',
          format: 'number'
        },
        {
          id: '3',
          title: 'Taxa de Conversão',
          value: '3.2%',
          change: 0.4,
          changeType: 'positive',
          icon: 'conversion',
          format: 'percentage'
        }
      ],
      charts: [],
      tables: [],
      lastUpdated: new Date()
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}`}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}