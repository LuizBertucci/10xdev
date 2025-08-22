# Implementando URLs Dinâmicas no Next.js 15

## Problema Atual
- A navegação usa query parameters: `/?tab=codes-v2`
- Desejado: URLs limpas como `/codes-v2`

## Plano de Implementação

### ✅ Análise Concluída
- [x] Investigar componente da sidebar e navegação
- [x] Verificar sistema de roteamento atual  
- [x] Identificar uso de estado local no `usePlatform` hook

### 🔄 Etapas da Reestruturação

#### 1. Estrutura de Rotas Next.js
- [ ] Criar arquivo `app/[tab]/page.tsx` para rotas dinâmicas
- [ ] Validar tabs permitidos: `codes`, `codes-v2`, `lessons`, `projects`, `ai`, `dashboard`
- [ ] Implementar `notFound()` para tabs inválidos

#### 2. Atualização do Hook `usePlatform`
- [ ] Modificar para aceitar parâmetro de tab inicial
- [ ] Implementar navegação com `router.push()` usando URLs limpas
- [ ] Remover query parameters, usar rotas diretas

#### 3. Atualização do Componente AppSidebar
- [ ] Modificar clicks para navegar para URLs diretas
- [ ] Exemplo: `router.push('/codes')` em vez de `setActiveTab('codes')`

#### 4. Manter Página Home na Raiz
- [ ] Manter `app/page.tsx` para rota `/` (página inicial)
- [ ] Não alterar estrutura da página home

#### 5. URLs Resultantes
- [ ] `/` → Home (sem mudanças)
- [ ] `/codes` → Códigos
- [ ] `/codes-v2` → Códigos v2  
- [ ] `/lessons` → Aulas
- [ ] `/projects` → Projetos
- [ ] `/ai` → IA
- [ ] `/dashboard` → Dashboard

#### 6. Testes
- [ ] Verificar navegação pela sidebar
- [ ] Testar URLs diretas no navegador
- [ ] Confirmar botões voltar/avançar funcionando
- [ ] Validar reload da página mantém estado

## Observações Técnicas
- Usar Next.js 15 App Router
- Manter compatibilidade com componentes existentes
- Preservar funcionalidades do `usePlatform` hook
- Evitar quebrar navegação existente durante transição