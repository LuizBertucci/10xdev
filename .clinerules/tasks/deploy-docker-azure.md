# Deploy Automatizado - Azure + Docker

## Pré-requisitos

### 1. Instalar Azure CLI
```bash
# Windows
winget install Microsoft.AzureCLI

# Mac
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLI | sudo bash
```

**Importante:** Feche todo o terminal e Cursor após a instalação.

### 2. Verificar instalação e fazer login
```bash
# Verificar se Azure CLI foi instalado
az --version

# Login no Azure
az login --use-device-code
```

## Configuração Inicial do Azure

### 3. Criar Resource Group
```bash
az group create --name resource-10xdev --location "Brazil South"
```

### 4. Registrar provedores necessários
```bash
# Registrar Container Registry
az provider register --namespace Microsoft.ContainerRegistry

# Verificar se registrou (deve retornar "Registered")
az provider show --namespace Microsoft.ContainerRegistry --query "registrationState"

# Registrar Web Apps
az provider register --namespace Microsoft.Web

# Verificar se registrou (deve retornar "Registered")
az provider show --namespace Microsoft.Web --query "registrationState"
```

## Container Registry

### 5. Criar Container Registry
```bash
az acr create --resource-group resource-10xdev --name crg10xdev --sku Basic --admin-enable true
```

**Nota:** Nome não pode ter traço "-"

### 6. Login e Build das imagens
```bash
# Login no registry
az acr login --name crg10xdev

# Build e push do backend
docker build -t crg10xdev.azurecr.io/10xdev-backend:latest ./backend
docker push crg10xdev.azurecr.io/10xdev-backend:latest

# Build e push do frontend
docker build -t crg10xdev.azurecr.io/10xdev-frontend:latest ./frontend
docker push crg10xdev.azurecr.io/10xdev-frontend:latest
```

## App Service Plan

### 7. Criar App Service Plan
```bash
az appservice plan create --name app-plan-10xdev --resource-group resource-10xdev --is-linux --sku B1
```

**Nota:** SKU B1 = primeiro plano pago básico do Azure

## Web Apps

### 8. Criar App Service para Backend
```bash
az webapp create --resource-group resource-10xdev --plan app-plan-10xdev --name web-backend-10xdev --deployment-container-image-name crg10xdev.azurecr.io/10xdev-backend:latest
```

### 9. Criar App Service para Frontend
```bash
az webapp create --resource-group resource-10xdev --plan app-plan-10xdev --name web-frontend-10xdev --deployment-container-image-name crg10xdev.azurecr.io/10xdev-frontend:latest
```

## Configuração de Variáveis de Ambiente

### 10. Backend
```bash
az webapp config appsettings set --name web-backend-10xdev --resource-group resource-10xdev --settings PORT=8000 NODE_ENV=production
```

### 11. Frontend
```bash
az webapp config appsettings set --name web-frontend-10xdev --resource-group resource-10xdev --settings NEXT_PUBLIC_API_URL=https://web-backend-10xdev.azurewebsites.net/api
```

### 12. Configurar Supabase no Backend
```bash
# Configurar URL do Supabase
az webapp config appsettings set --name web-backend-10xdev --resource-group resource-10xdev --settings SUPABASE_URL=XXXXX

# Configurar Anon Key do Supabase
az webapp config appsettings set --name web-backend-10xdev --resource-group resource-10xdev --settings SUPABASE_ANON_KEY=XXXXX

# Configurar Service Role Key do Supabase (se necessário)
az webapp config appsettings set --name web-backend-10xdev --resource-group resource-10xdev --settings SUPABASE_SERVICE_ROLE_KEY=XXXXX
```

## Script de Deploy Completo

### Atualizar aplicação
```bash
#!/bin/bash
# Script para atualizar deploy

# 1. Login no registry
az acr login --name crg10xdev

# 2. Build e push das novas versões
docker build -t crg10xdev.azurecr.io/10xdev-backend:latest ./backend
docker push crg10xdev.azurecr.io/10xdev-backend:latest

docker build -t crg10xdev.azurecr.io/10xdev-frontend:latest ./frontend
docker push crg10xdev.azurecr.io/10xdev-frontend:latest

# 3. Restart dos apps para pegar novas imagens
az webapp restart --name web-backend-10xdev --resource-group resource-10xdev
az webapp restart --name web-frontend-10xdev --resource-group resource-10xdev

echo "Deploy concluído!"
```

## URLs de Acesso

- **Frontend:** https://web-frontend-10xdev.azurewebsites.net
- **Backend:** https://web-backend-10xdev.azurewebsites.net

## Comandos Úteis

```bash
# Ver logs do app
az webapp log tail --name web-backend-10xdev --resource-group resource-10xdev

# Ver configurações do app
az webapp config appsettings list --name web-backend-10xdev --resource-group resource-10xdev

# Restart do app
az webapp restart --name web-backend-10xdev --resource-group resource-10xdev
```