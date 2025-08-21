import CardFeatureCompact from "@/components/CardFeatureCompact"

interface PlatformState {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTech: string
  setSelectedTech: (tech: string) => void
}

interface CodesV2Props {
  platformState: PlatformState
}

export default function CodesV2({ platformState }: CodesV2Props) {
  // Mock data para teste
  const mockSnippet = {
    id: "test-1",
    title: "Exemplo de Hook Personalizado",
    description: "Hook para gerenciar estado de formulários com validação",
    tech: "react",
    language: "typescript",
    screens: [
      {
        name: "hook.ts",
        description: "Hook principal",
        code: "export function useForm() { return {} }"
      }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Códigos v2 - Layout em Lista</h1>
        <p className="text-gray-600">Nova visualização de cards em desenvolvimento...</p>
        <p className="text-sm text-blue-600 mt-2">
          🚧 Esta é uma versão de teste do layout de cards em linha com toggle inline
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Próximos Passos:</h3>
        <ul className="text-blue-700 space-y-1 text-sm">
          <li>• ✅ Criar componente CardFeatureCompact</li>
          <li>• ✅ Implementar layout horizontal</li>
          <li>• Adicionar toggle para expandir código</li>
          <li>• Integrar com dados reais</li>
        </ul>
      </div>
      
      {/* Teste do CardFeatureCompact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Preview do CardFeatureCompact:</h3>
        <CardFeatureCompact 
          snippet={mockSnippet}
          onEdit={(snippet) => console.log('Edit:', snippet)}
          onDelete={(id) => console.log('Delete:', id)}
        />
      </div>
    </div>
  )
}