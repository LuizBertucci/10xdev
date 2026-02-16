---
name: "Plano: Criacao de CardFeature via JSON"
overview: ""
todos:
  - id: 43e89b24-4e45-403b-b83a-a773460e9d0c
    content: Criar componente CardFeatureFormJSON.tsx (modal simples com textarea)
    status: pending
  - id: b2e273a4-eb68-4e41-bb30-e4709fe2e796
    content: Transformar botao 'Novo CardFeature' em botao com dropdown
    status: pending
  - id: 8158f2c8-545d-424e-820f-2b8c52a6f03c
    content: Integrar novo modal JSON na pagina Codes.tsx
    status: pending
  - id: 04fbd443-8003-4cc4-8bd7-91508b1bcc46
    content: Testar criacao de card via JSON
    status: pending
isProject: false
---

# Plano: Criacao de CardFeature via JSON

## Contexto

O usuario quer criar CardFeatures colando JSON diretamente. A solucao sera um dropdown no botao "Novo CardFeature" que permite escolher entre criar via formulario normal ou via JSON, abrindo um modal separado e simplificado para a opcao JSON.

## Estrutura do JSON esperada

O JSON seguira a mesma estrutura `CreateCardFeatureData` ja existente:

```typescript
{
  title: string
  tech: string          // Ex: "React", "Node.js"
  language: string      // Ex: "typescript", "python"
  description: string
  content_type: "code" | "text" | "terminal"
  card_type: "dicas" | "codigos" | "workflows"
  screens: [
    {
      name: string
      description: string
      blocks: [
        {
          type: "code" | "text" | "terminal"
          content: string
          language?: string
          title?: string
          route?: string
          order: number
        }
      ]
    }
  ]
}
```

## Implementacao

### 1. Criar novo componente CardFeatureFormJSON

Criar `[frontend/components/CardFeatureFormJSON.tsx](frontend/components/CardFeatureFormJSON.tsx)` - um modal simples contendo:

- Header com titulo "Criar CardFeature via JSON"
- Textarea grande para colar o JSON (com placeholder de exemplo)
- Mensagem de erro se o JSON for invalido
- Botao "Criar Card" no footer

### 2. Modificar botao "Novo CardFeature" em Codes.tsx

Em `[frontend/pages/Codes.tsx](frontend/pages/Codes.tsx)`, transformar o botao "Novo CardFeature" em um botao com dropdown:

- Clique principal: comportamento atual (abre formulario)
- Clique no toggle (seta direita): abre dropdown com opcao "Criar via JSON"

### 3. Adicionar estado e handlers para o modal JSON

Em Codes.tsx:

- Adicionar estado `isCreatingJSON: boolean`
- Adicionar handler `handleCreateJSONSubmit` que usa o mesmo `cardFeatures.createCardFeature`

## Arquivos a modificar/criar

- **Criar**: `[frontend/components/CardFeatureFormJSON.tsx](frontend/components/CardFeatureFormJSON.tsx)` - Novo modal simplificado
- **Modificar**: `[frontend/pages/Codes.tsx](frontend/pages/Codes.tsx)` - Botao com dropdown + integracao do novo modal

## UI do Botao

O botao tera duas partes:

- Lado esquerdo: "Novo CardFeature" (abre formulario normal)
- Lado direito: Icone de seta/chevron (abre dropdown com "Criar via JSON")

