# Azure Deployment URLs - 10xdev Project

This document contains the Azure resource URLs and endpoints for the 10xdev project deployment.

## Project Overview

- **Project Name**: 10xdev
- **Environment**: Production
- **Azure Region**: East US
- **Resource Group**: rg-10xdev-prod
- **Deployment Strategy**: Container Apps with Application Gateway

## Container Applications

### Frontend Application
- **Container App Name**: ca-10xdev-frontend-prod
- **Service URL**: `https://ca-10xdev-frontend-prod.{region}.azurecontainerapps.io`
- **Port**: 3000
- **Technology**: Next.js
- **Environment Variables**:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL` (dynamically set to backend URL)

### Backend API
- **Container App Name**: ca-10xdev-backend-prod
- **Service URL**: `https://ca-10xdev-backend-prod.{region}.azurecontainerapps.io`
- **API Base URL**: `https://ca-10xdev-backend-prod.{region}.azurecontainerapps.io/api`
- **Port**: 3001
- **Technology**: Node.js/Express + TypeScript
- **Health Check**: `/api/health`

## Infrastructure Resources

### Container Registry
- **Name**: acr10xdevprod
- **Login Server**: `acr10xdevprod.azurecr.io`
- **Images**:
  - Backend: `acr10xdevprod.azurecr.io/10xdev-backend:latest`
  - Frontend: `acr10xdevprod.azurecr.io/10xdev-frontend:latest`

### Application Gateway
- **Name**: agw-10xdev-prod
- **Public FQDN**: `10xdev-prod-gateway.{region}.cloudapp.azure.com`
- **Frontend Port**: 80, 443
- **Backend Pools**:
  - Frontend: `frontend-backend-pool`
  - Backend API: `backend-api-pool`

### Key Vault
- **Name**: kv-10xdev-prod
- **URL**: `https://kv-10xdev-prod.vault.azure.net/`
- **Stored Secrets**:
  - `jwt-secret`
  - `supabase-url`
  - `supabase-anon-key`
  - `supabase-service-role-key`

### Monitoring & Logging
- **Log Analytics Workspace**: log-10xdev-prod
- **Application Insights**: ai-10xdev-prod
- **Container App Environment**: cae-10xdev-prod

### Networking
- **Virtual Network**: vnet-10xdev-prod
  - **Address Space**: 10.0.0.0/16
  - **Container Subnet**: 10.0.1.0/24
  - **Gateway Subnet**: 10.0.2.0/24
- **Public IP**: pip-10xdev-prod

## Database Configuration

### Supabase (External)
- **Database**: PostgreSQL hosted on Supabase
- **Connection**: Configured via environment variables
- **Tables**: Managed through Supabase dashboard
- **Note**: No Azure PostgreSQL instance created - using existing Supabase setup

## Deployment Configuration

### GitHub Actions Workflow
- **File**: `.github/workflows/azure-deploy.yml`
- **Triggers**: 
  - Push to main/develop branches
  - Manual workflow dispatch
- **Environment**: production
- **Secrets Required**:
  - `AZURE_CREDENTIALS`
  - `JWT_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Container Scaling
- **Backend**: 1-5 replicas (CPU/Memory based)
- **Frontend**: 1-10 replicas (HTTP requests based)
- **Auto-scaling**: Enabled based on concurrent requests

## Access URLs (Post-Deployment)

After successful deployment, the following URLs will be available:

1. **Main Application**: `https://10xdev-prod-gateway.{region}.cloudapp.azure.com`
2. **Backend API**: `https://ca-10xdev-backend-prod.{region}.azurecontainerapps.io/api`
3. **Frontend Direct**: `https://ca-10xdev-frontend-prod.{region}.azurecontainerapps.io`

## Health Checks

### Backend Health Check
```bash
curl https://ca-10xdev-backend-prod.{region}.azurecontainerapps.io/api/health
```

### Frontend Health Check
```bash
curl https://ca-10xdev-frontend-prod.{region}.azurecontainerapps.io
```

## Security Configuration

- **HTTPS**: Enforced on all endpoints
- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: 100 requests per window (configurable)
- **Secrets Management**: Azure Key Vault integration
- **Network Security**: Virtual Network with dedicated subnets

## Cost Optimization

- **Container Registry**: Basic tier for development
- **Container Apps**: Pay-per-use with auto-scaling
- **Log Analytics**: 30-day retention
- **Application Gateway**: Standard v2 (single instance)

## Monitoring & Alerts

- **Application Insights**: Performance and error tracking
- **Log Analytics**: Centralized logging
- **Health Probes**: Liveness and readiness checks
- **Auto-scaling**: Based on CPU, memory, and HTTP requests

## Troubleshooting

### Common Issues
1. **Container startup failures**: Check Application Insights logs
2. **Database connection issues**: Verify Supabase credentials in Key Vault
3. **Image pull failures**: Check Container Registry permissions
4. **Gateway routing issues**: Verify backend pool health

### Useful Azure CLI Commands
```bash
# Check container app status
az containerapp show --name ca-10xdev-backend-prod --resource-group rg-10xdev-prod

# View logs
az containerapp logs show --name ca-10xdev-backend-prod --resource-group rg-10xdev-prod

# Restart container app
az containerapp revision restart --name ca-10xdev-backend-prod --resource-group rg-10xdev-prod
```

## Support and Maintenance

- **Deployment Pipeline**: Automated via GitHub Actions
- **Updates**: Triggered by commits to main branch
- **Rollback**: Azure Container Apps revision management
- **Monitoring**: 24/7 via Application Insights and Azure Monitor

---

**Note**: Replace `{region}` with the actual Azure region (e.g., `eastus`) after deployment.
**Last Updated**: Generated during initial deployment setup