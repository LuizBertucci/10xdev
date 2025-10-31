# Task: Refatoração para Formato Simplificado (insertData Pattern)

## 🎯 Objetivo
Refatorar o CardFeatureModel para usar o padrão simplificado de retorno direto, removendo a camada `ModelResult` e delegando tratamento de erros para os Controllers.

## 📋 Plano de Execução

### Fase 1: Preparação
- [ ] Criar backup do CardFeatureModel.ts atual
- [ ] Criar backup do CardFeatureController.ts atual
- [ ] Documentar assinatura atual de cada método

### Fase 2: Refatoração do Model (CardFeatureModel.ts)

#### 2.1 Métodos de Leitura
- [ ] Refatorar `findById()`
  - Remover `Promise<ModelResult<CardFeatureResponse>>`
  - Retornar `executeQuery()` diretamente
  - Remover try/catch
  - Adicionar validação de input (id não vazio)

- [ ] Refatorar `findAll()`
  - Remover `Promise<ModelListResult<CardFeatureResponse>>`
  - Retornar `executeQuery()` diretamente
  - Manter transformação de dados
  - Remover try/catch

- [ ] Refatorar `search()`
  - Simplificar para chamar `findAll()` com params
  - Remover try/catch

- [ ] Refatorar `findByTech()`
  - Simplificar para chamar `findAll()` com params
  - Remover try/catch

#### 2.2 Método de Criação
- [ ] Refatorar `create()`
  - Adicionar validações de dados obrigatórios (title, tech, etc)
  - Mover lógica de processamento para `insertData`
  - Remover `(supabase as any)`
  - Retornar `executeQuery()` diretamente
  - Remover try/catch e ModelResult wrapper

#### 2.3 Método de Atualização
- [ ] Refatorar `update()`
  - Adicionar validação de id
  - Remover `(supabase as any)`
  - Retornar `executeQuery()` diretamente
  - Remover try/catch e ModelResult wrapper

#### 2.4 Método de Exclusão
- [ ] Refatorar `delete()`
  - Adicionar validação de id
  - Retornar `executeQuery()` diretamente
  - Remover try/catch

#### 2.5 Métodos de Estatísticas
- [ ] Refatorar `getStats()`
  - Manter lógica de agregação
  - Retornar dados diretamente
  - Remover try/catch e ModelResult wrapper

#### 2.6 Operações em Lote
- [ ] Refatorar `bulkCreate()`
  - Adicionar validação de array não vazio
  - Remover `(supabase as any)`
  - Retornar `executeQuery()` diretamente
  - Remover try/catch

- [ ] Refatorar `bulkDelete()`
  - Adicionar validação de array não vazio
  - Retornar `executeQuery()` diretamente
  - Remover try/catch

### Fase 3: Refatoração do Controller (CardFeatureController.ts)

#### 3.1 Handlers de Leitura
- [ ] Refatorar `getAll()`
  - Adicionar try/catch
  - Processar `{ data, count }` de executeQuery
  - Mapear error.statusCode para HTTP status

- [ ] Refatorar `getById()`
  - Adicionar try/catch
  - Processar `{ data }` de executeQuery
  - Tratar data null como 404

- [ ] Refatorar `searchCardFeatures()`
  - Adicionar try/catch
  - Processar resposta do Model

- [ ] Refatorar `getByTech()`
  - Adicionar try/catch
  - Processar resposta do Model

#### 3.2 Handlers de Criação
- [ ] Refatorar `create()`
  - Adicionar try/catch
  - Processar `{ data }` de executeQuery
  - Retornar 201 em sucesso
  - Mapear exceções para HTTP status codes

#### 3.3 Handlers de Atualização
- [ ] Refatorar `update()`
  - Adicionar try/catch
  - Processar `{ data }` de executeQuery
  - Tratar data null como 404

#### 3.4 Handlers de Exclusão
- [ ] Refatorar `delete()`
  - Adicionar try/catch
  - Processar resposta vazia de executeQuery
  - Retornar 204 No Content

#### 3.5 Handlers de Estatísticas
- [ ] Refatorar `getStats()`
  - Adicionar try/catch
  - Processar dados de estatísticas

#### 3.6 Handlers de Operações em Lote
- [ ] Refatorar `bulkCreate()`
  - Adicionar try/catch
  - Processar array de dados

- [ ] Refatorar `bulkDelete()`
  - Adicionar try/catch
  - Processar `{ count }` de executeQuery

### Fase 4: Atualização de Tipos

- [ ] Criar novos tipos de retorno para Models (se necessário)
- [ ] Remover ou deprecar `ModelResult` e `ModelListResult`
- [ ] Atualizar tipos de erro customizados
- [ ] Documentar novos contratos de API

### Fase 5: Testes e Validação

- [ ] Compilar TypeScript sem erros
  ```bash
  npm run build
  ```

- [ ] Verificar se não há mais `(supabase as any)` no código
  ```bash
  grep -r "supabase as any" backend/src/
  ```

- [ ] Executar testes unitários (se existirem)
  ```bash
  npm test
  ```

- [ ] Testar endpoints manualmente:
  - [ ] GET /api/card-features (listar todos)
  - [ ] GET /api/card-features/:id (buscar por ID)
  - [ ] POST /api/card-features (criar)
  - [ ] PUT /api/card-features/:id (atualizar)
  - [ ] DELETE /api/card-features/:id (deletar)
  - [ ] GET /api/card-features/search?q=termo (buscar)
  - [ ] GET /api/card-features/tech/:tech (filtrar por tech)
  - [ ] GET /api/card-features/stats (estatísticas)
  - [ ] POST /api/card-features/bulk (criar em lote)
  - [ ] DELETE /api/card-features/bulk (deletar em lote)

### Fase 6: Correções do CodeRabbit

- [ ] Corrigir log sensível em supabase.ts (linha 96)
  ```typescript
  console.error('Erro na execução da query:', {
    message: err instanceof Error ? err.message : 'Unknown error',
    code: (err as any)?.code
  })
  ```

- [ ] Adicionar validação em `paginate()` (linhas 104-107)
  ```typescript
  if (page < 1 || !Number.isInteger(page)) {
    throw new Error('Page must be a positive integer')
  }
  if (limit < 1 || !Number.isInteger(limit)) {
    throw new Error('Limit must be a positive integer')
  }
  ```

- [ ] Adicionar null guards nos métodos refatorados:
  - [ ] findById - verificar se data existe antes de transformar
  - [ ] create - verificar se result existe
  - [ ] update - verificar se result existe

### Fase 7: Documentação

- [ ] Atualizar comentários JSDoc nos métodos do Model
- [ ] Documentar novos padrões de erro no README (se existir)
- [ ] Criar exemplos de uso dos métodos refatorados
- [ ] Atualizar CLAUDE.md se necessário

### Fase 8: Code Review Final

- [ ] Executar `coderabbit review --plain` novamente
- [ ] Resolver issues pendentes
- [ ] Verificar consistência de código
- [ ] Commit das alterações

## 📝 Notas Importantes

### Padrão Antigo vs Novo

**Antigo (ModelResult):**
```typescript
static async create(data): Promise<ModelResult<CardFeatureResponse>> {
  try {
    const { data: result } = await executeQuery(...)
    return {
      success: true,
      data: this.transformToResponse(result),
      statusCode: 200
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    }
  }
}
```

**Novo (Retorno Direto):**
```typescript
static async create(postData: CreateCardFeatureRequest) {
  // Validações
  if (!postData.title) {
    throw new Error('Título é obrigatório')
  }

  const insertData: CardFeatureInsert = {
    id: randomUUID(),
    title: postData.title,
    tech: postData.tech || 'React',
    // ... outros campos
  }

  return executeQuery(
    supabase
      .from('card_features')
      .insert([insertData])
      .select()
      .single()
  )
}
```

### Controller Antigo vs Novo

**Antigo:**
```typescript
const result = await CardFeatureModel.create(req.body)
if (!result.success) {
  return res.status(result.statusCode).json({ error: result.error })
}
return res.status(result.statusCode).json(result.data)
```

**Novo:**
```typescript
try {
  const { data } = await CardFeatureModel.create(req.body)
  return res.status(201).json(data)
} catch (error: any) {
  return res.status(error.statusCode || 500).json({
    error: error.message
  })
}
```

## ✅ Benefícios

- ✅ Menos código (redução de ~30-40%)
- ✅ Mais direto e legível
- ✅ Remove duplicação de tratamento de erro
- ✅ Elimina `(supabase as any)`
- ✅ Validações no lugar certo (Model)
- ✅ TypeScript mais feliz
- ✅ Padrão mais comum na comunidade

## ⚠️ Riscos

- ⚠️ Mudança significativa de contrato
- ⚠️ Requer atualização de todos os Controllers
- ⚠️ Pode quebrar testes existentes
- ⚠️ Requer testes manuais extensivos

## 🔄 Rollback Plan

Se algo der errado:
1. Restaurar backups dos arquivos
2. Reverter commit
3. Investigar o que falhou
4. Aplicar correção pontual
