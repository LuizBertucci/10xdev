import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Loader2, FileJson, Lock, Globe, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import type { CreateCardFeatureData } from "@/types"
import { ContentType, CardType } from "@/types"

const JSON_PLACEHOLDER = `{
  "title": "Exemplo Completo de CardFeature",
  "tech": "React",
  "language": "typescript",
  "description": "Este é um exemplo completo mostrando todas as opções disponíveis",
  "content_type": "code",
  "card_type": "codigos",
  "screens": [
    {
      "name": "Main",
      "description": "Arquivo principal do componente",
      "route": "src/components/Example.tsx",
      "blocks": [
        {
          "type": "code",
          "content": "import React from 'react'\\n\\nexport default function Example() {\\n return <div>Hello World</div>\\n}",
          "language": "typescript",
          "title": "Componente React",
          "route": "src/components/Example.tsx",
          "order": 0
        },
        {
          "type": "text",
          "content": "Este bloco contém explicações em texto markdown sobre o código acima.",
          "title": "Explicação",
          "order": 1
        }
      ]
    },
    {
      "name": "Test",
      "description": "Testes do componente",
      "route": "src/components/Example.test.tsx",
      "blocks": [
        {
          "type": "code",
          "content": "import { render } from '@testing-library/react'\\nimport Example from './Example'\\n\\ntest('renders', () => {\\n render(<Example />)\\n})",
          "language": "typescript",
          "route": "src/components/Example.test.tsx",
          "order": 0
        }
      ]
    }
  ]
}`

interface CardFeatureFormJSONProps {
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: CreateCardFeatureData) => Promise<void>
}

export default function CardFeatureFormJSON({
  isOpen,
  isLoading,
  onClose,
  onSubmit
}: CardFeatureFormJSONProps) {
  const [jsonInput, setJsonInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [copied, setCopied] = useState(false)
  const resetCopiedTimeoutRef = useRef<number | null>(null)

  const handleCopyExample = async () => {
    try {
      await navigator.clipboard.writeText(JSON_PLACEHOLDER)
      setCopied(true)
      if (resetCopiedTimeoutRef.current) {
        window.clearTimeout(resetCopiedTimeoutRef.current)
      }
      resetCopiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false)
        resetCopiedTimeoutRef.current = null
      }, 2000)
      toast.success("Exemplo JSON copiado! Cole em sua IA preferida.")
    } catch {
      toast.error("Erro ao copiar exemplo")
    }
  }

  const validateAndParseJSON = (input: string): CreateCardFeatureData | null => {
    try {
      const parsed = JSON.parse(input)

      // Validar campos obrigatórios
      if (!parsed.title || typeof parsed.title !== "string") {
        throw new Error("Campo 'title' é obrigatório e deve ser uma string")
      }
      if (!parsed.tech || typeof parsed.tech !== "string") {
        throw new Error("Campo 'tech' é obrigatório e deve ser uma string")
      }
      if (!parsed.language || typeof parsed.language !== "string") {
        throw new Error("Campo 'language' é obrigatório e deve ser uma string")
      }
      if (!parsed.description || typeof parsed.description !== "string") {
        throw new Error("Campo 'description' é obrigatório e deve ser uma string")
      }
      if (!parsed.content_type || !Object.values(ContentType).includes(parsed.content_type)) {
        throw new Error("Campo 'content_type' é obrigatório e deve ser 'code', 'text', 'terminal', 'youtube' ou 'pdf'")
      }
      if (!parsed.card_type || !Object.values(CardType).includes(parsed.card_type)) {
        throw new Error("Campo 'card_type' é obrigatório e deve ser 'dicas', 'codigos' ou 'workflows'")
      }
      if (!parsed.screens || !Array.isArray(parsed.screens) || parsed.screens.length === 0) {
        throw new Error("Campo 'screens' é obrigatório e deve ser um array com pelo menos um item")
      }

      // Validar cada screen
      for (let i = 0; i < parsed.screens.length; i++) {
        const screen = parsed.screens[i]
        if (!screen.name || typeof screen.name !== "string") {
          throw new Error(`Screen ${i + 1}: campo 'name' é obrigatório`)
        }
        if (!screen.blocks || !Array.isArray(screen.blocks)) {
          throw new Error(`Screen ${i + 1}: campo 'blocks' é obrigatório e deve ser um array`)
        }

        // Validar cada block
        for (let j = 0; j < screen.blocks.length; j++) {
          const block = screen.blocks[j]
          if (!block.type || !Object.values(ContentType).includes(block.type)) {
            throw new Error(`Screen ${i + 1}, Block ${j + 1}: campo 'type' é obrigatório`)
          }
          if (typeof block.content !== "string") {
            throw new Error(`Screen ${i + 1}, Block ${j + 1}: campo 'content' é obrigatório`)
          }
          if (typeof block.order !== "number") {
            throw new Error(`Screen ${i + 1}, Block ${j + 1}: campo 'order' é obrigatório e deve ser um número`)
          }
        }
      }

      return parsed as CreateCardFeatureData
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("JSON inválido. Verifique a sintaxe.")
      } else if (err instanceof Error) {
        setError(err.message)
      }
      return null
    }
  }

  const handleSubmit = async () => {
    setError(null)

    if (!jsonInput.trim()) {
      setError("Cole o JSON do CardFeature")
      return
    }

    const parsedData = validateAndParseJSON(jsonInput)
    if (!parsedData) {
      return
    }

    // Adicionar a propriedade is_private ao objeto
    const dataWithVisibility = {
      ...parsedData,
      is_private: isPrivate
    }

    try {
      await onSubmit(dataWithVisibility)
      // Limpar o formulário após sucesso
      setJsonInput("")
      setError(null)
    } catch {
      setError("Erro ao criar CardFeature. Tente novamente.")
    }
  }

  const handleClose = () => {
    setJsonInput("")
    setError(null)
    setIsPrivate(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold">Criar CardFeature via JSON</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyExample}
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Exemplo
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="space-y-4 h-full flex flex-col">
            {/* Select de Visibilidade */}
            <div className="shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibilidade
              </label>
              <Select
                value={isPrivate ? "private" : "public"}
                onValueChange={(value) => setIsPrivate(value === "private")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-green-600" />
                      <span>Público - Todos podem ver</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-orange-600" />
                      <span>Privado - Apenas você pode ver</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cole o JSON do CardFeature
              </label>
              <Textarea
                placeholder={JSON_PLACEHOLDER}
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value)
                  setError(null)
                }}
                className="flex-1 min-h-[400px] font-mono text-sm resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t bg-gray-50 shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !jsonInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <FileJson className="h-4 w-4 mr-2" />
                Criar Card
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

