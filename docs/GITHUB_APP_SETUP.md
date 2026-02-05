# Configuração do GitHub App para gitsync

## Passo 1: Criar o GitHub App

1. Acesse: https://github.com/settings/apps/new

2. Preencha os campos:

### Basic Information
```
GitHub App name: 10xDev Sync
Description: Sincronização bidirecional entre projetos 10xDev e repositórios GitHub
Homepage URL: http://localhost:3001
```

### Callback URL
```
Authorization callback URL: http://localhost:3001/api/gitsync/oauth/callback
```

### Webhook (opcional - pode ser configurado depois)
```
Active: unchecked (iremos configurar depois)
Webhook URL: http://localhost:3001/api/gitsync/webhooks/github
Webhook secret: (gere uma string aleatória segura)
```

### Permissions
Configure as seguintes permissões:

| Permission | Access |
|-----------|--------|
| Contents | Read and write |
| Pull requests | Read and write |
| Metadata | Read-only |
| Workflows | Read-only (opcional) |

### Subscribe to events
- [x] Push
- [x] Pull request

### Where can this GitHub App be installed?
- [x] Any account

---

## Passo 2: Gerar Client ID e Client Secret

Após criar o GitHub App, você será redirecionado para a página de configuração.

Anote os seguintes valores:

```
Client ID: _______________________
Client Secret: (clique em "Generate a new client secret") _______________________
```

---

## Passo 3: Configurar Variáveis de Ambiente

Edite o arquivo `backend/.env`:

```bash
# GitHub App Configuration
GITHUB_CLIENT_ID=seu_client_id_aqui
GITHUB_CLIENT_SECRET=seu_client_secret_aqui
GITHUB_WEBHOOK_SECRET=string_aleatoria_segura_aqui
GITHUB_REDIRECT_URI=http://localhost:3001/api/gitsync/oauth/callback
```

**Para gerar uma string aleatória segura:**
```bash
# No Linux/Mac:
openssl rand -hex 32

# Ou usando Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Passo 4: Configurar Webhook (opcional)

Para receber eventos do GitHub em tempo real:

1. Na página do GitHub App, clique em "Edit" ao lado de "Webhook"
2. Configure:
   ```
   Webhook URL: https://seu-dominio.com/api/gitsync/webhooks/github
   Webhook secret: (mesma string do GITHUB_WEBHOOK_SECRET)
   ```
3. Marque "Active"
4. Subscribe aos eventos: Push, Pull request

**Nota:** Para webhooks funcionarem em produção, você precisa de um domínio acessível publicamente. Para desenvolvimento local, use ngrok.

---

## Passo 5: Testar com ngrok (desenvolvimento local)

Para testar webhooks localmente:

1. Instale o ngrok: https://ngrok.com/

2. Inicie o túnel:
```bash
ngrok http 3001
```

3. Configure o webhook do GitHub App com a URL do ngrok:
```
https://abc123.ngrok.io/api/gitsync/webhooks/github
```

---

## Passo 6: Instalar o GitHub App

1. Na página do GitHub App, clique em "Public page"
2. Ou acesse diretamente: `https://github.com/apps/seu-app-name`

3. Clique em "Install"

4. Selecione os repositórios que deseja conectar

---

## Variáveis de Ambiente Resumidas

```bash
# backend/.env

# GitHub OAuth App
GITHUB_CLIENT_ID= Iv1.1234567890abcdef
GITHUB_CLIENT_SECRET=1234567890abcdef1234567890abcdef12345678
GITHUB_WEBHOOK_SECRET=uma_string_aleatoria_muito_segura_aqui
GITHUB_REDIRECT_URI=http://localhost:3001/api/gitsync/oauth/callback
```

---

## Troubleshooting

### "Client not found"
- Verifique se o Client ID está correto
- O GitHub App deve estar instalado na sua conta

### "Bad credentials"
- Regener o Client Secret
- Atualize a variável GITHUB_CLIENT_SECRET

### Webhook não funciona
- Verifique se a URL é acessível publicamente
- Confirme que o webhook secret está correto
- Check os logs do servidor

### OAuth loop infinito
- Verifique se o redirect_uri está correto
- Confirme que o state está sendo passado corretamente

---

##Links Úteis

- Documentação do GitHub Apps: https://docs.github.com/pt/apps
- OAuth Apps: https://docs.github.com/pt/apps/oauth-apps
- Webhooks: https://docs.github.com/pt/webhooks
