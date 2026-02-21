---
name: ""
overview: ""
todos: []
isProject: false
---

# Plano: OAuth GitHub em popup dentro do ProjectForm

## Contexto

Atualmente, ao clicar "Conectar GitHub" no `ProjectForm`, acontece um full-page redirect (`window.location.href`) que tira o usuário do form/dialog. O objetivo é manter o usuário no form durante todo o fluxo OAuth, usando um popup para a autorização.

## Fluxo desejado

1. Usuário clica "Conectar GitHub" no ProjectForm (modal)
2. Abre-se uma **janela popup** com a URL do GitHub OAuth
3. Usuário autoriza no GitHub → popup vai ao backend callback → popup vai para `/import-github-token`
4. `/import-github-token` detecta que está em popup → envia `postMessage` para a janela pai com os dados → fecha o popup
5. `ProjectForm` recebe a mensagem, valida o nonce (no seu próprio sessionStorage), carrega os repos
6. Usuário seleciona o repo e importa — tudo no mesmo modal

## Desafios resolvidos

- **sessionStorage isolado por aba:** O nonce está no sessionStorage do pai, não do popup. Solução: o popup envia o `state` para o pai via postMessage; o pai valida o nonce localmente.
- **Popup bloqueado:** Detectar e informar ao usuário para liberar popups para o site.
- **Popup fechado manualmente:** Polling com `setInterval` detecta popup fechado e limpa o estado.

## Arquivos a modificar

### 1. `frontend/components/ProjectForm.tsx`

**Função `handleConnectGithub` (linha 95):**

- Trocar `window.location.href = githubAuthUrl` por `window.open(githubAuthUrl, 'github_oauth_popup', 'popup,width=600,height=700,left=...,top=...')`
- Salvar referência da popup em um `useRef`
- Iniciar polling com `setInterval` para detectar se a popup foi fechada manualmente

**Remover `useEffect` que verifica `searchParams` para `installation_id` (linhas 54-76):**

- Esse efeito existia para capturar o retorno do redirect. Com popup, não é mais necessário.
- O retorno virá por `postMessage`.

**Adicionar `useEffect` para escutar `message` events:**

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    // Validar origem (mesmo origin)
    if (event.origin !== window.location.origin) return
    if (event.data?.type !== 'GITHUB_OAUTH_SUCCESS') return

    const { installationId: id, state } = event.data

    // Validar nonce no sessionStorage do pai
    const storedNonce = sessionStorage.getItem('oauth_state_nonce')
    if (!storedNonce) return
    try {
      const decoded = JSON.parse(atob(state))
      if (decoded?.nonce !== storedNonce) return
    } catch { return }
    sessionStorage.removeItem('oauth_state_nonce')

    // Salvar e continuar fluxo
    if (id) sessionStorage.setItem('gitsync_installation_id', String(id))
    setInstallationId(Number(id))
    setIsGithubConnected(true)
    loadAvailableRepos(Number(id))
  }

  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}, [])
```

### 2. `frontend/app/import-github-token/page.tsx`

**Função `handleGitSyncCallback` (linha 93):**

- Adicionar detecção de popup: `const isPopup = typeof window !== 'undefined' && window.opener !== null`
- Se popup:
  - Enviar `postMessage` para o opener com os dados brutos (sem validar nonce — o pai valida):

```typescript
    window.opener.postMessage({
      type: 'GITHUB_OAUTH_SUCCESS',
      installationId,
      state  // o pai decodifica e valida o nonce
    }, window.location.origin)
    window.close()
    return
    

```

- Mostrar tela de "Conectado! Esta janela será fechada..."
- Se NOT popup: comportamento atual mantido (redireciona para o projeto)

## Ordem de execução

1. Modificar `import-github-token/page.tsx` (lógica de popup + postMessage)
2. Modificar `ProjectForm.tsx` (popup + listener de postMessage + remover useEffect de searchParams)

## Verificação

- Abrir o ProjectForm na aba "Importar"
- Clicar "Conectar GitHub"
- Deve abrir popup (não redirecionar a página)
- Autorizar no GitHub → popup fecha automaticamente
- ProjectForm deve mostrar lista de repositórios disponíveis
- Selecionar repo e importar normalmente
- Verificar que o `ImportProgressModal` aparece normalmente após o import

