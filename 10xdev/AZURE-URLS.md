# 🌐 10xDev Azure Production URLs

## Live Application URLs

### 🎯 **Primary Access (Recommended)**
```
https://txdev-app-prod.eastus.cloudapp.azure.com
```
**Main application URL through Azure Application Gateway with load balancing and SSL termination**

---

### 🖥️ **Frontend Application**
```
https://ca-txdev-frontend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io
```
**Next.js frontend application - Direct Container Apps access**

---

### 🔧 **Backend API**
```
https://ca-txdev-backend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io
```
**Node.js/Express API server - Direct Container Apps access**

---

## 📊 Health Check Endpoints

- **Frontend Health**: `https://ca-txdev-frontend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io/api/health`
- **Backend Health**: `https://ca-txdev-backend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io/api/health`

---

## 🏗️ Infrastructure Details

| Component | Service | Location |
|-----------|---------|----------|
| **Main Entry** | Application Gateway | `txdev-app-prod.eastus.cloudapp.azure.com` |
| **Frontend** | Container Apps | `ca-txdev-frontend-prod` |
| **Backend** | Container Apps | `ca-txdev-backend-prod` |
| **Database** | PostgreSQL Flexible Server | `psql-txdev-prod` |
| **Registry** | Container Registry | `acrtxdev.azurecr.io` |
| **Resource Group** | rg-10xdev-prod | East US |

---

## 🔗 Quick Access Links

### For Development/Testing:
- **Frontend**: [https://ca-txdev-frontend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io](https://ca-txdev-frontend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io)
- **Backend**: [https://ca-txdev-backend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io](https://ca-txdev-backend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io)

### For Production Use:
- **Main App**: [https://txdev-app-prod.eastus.cloudapp.azure.com](https://txdev-app-prod.eastus.cloudapp.azure.com)

---

## 📝 Notes

- **Primary URL** should be used for production traffic
- **Direct URLs** are useful for debugging and direct service access
- All URLs use HTTPS with automatic SSL certificates
- Load balancing and auto-scaling are configured
- Health checks are available at `/api/health` endpoints

---

**Last Updated**: Current deployment (branch: docker-test)