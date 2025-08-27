# Azure Service Principal Setup for GitHub Actions
# Run these commands in order

# 1. Login to Azure
Write-Host "Step 1: Login to Azure" -ForegroundColor Green
az login

# 2. Set subscription (if you have multiple)
Write-Host "Step 2: List subscriptions and set active one" -ForegroundColor Green
az account list --output table
# Uncomment and run the next line with your subscription ID
# az account set --subscription "your-subscription-id"

# 3. Create Service Principal with Contributor role
Write-Host "Step 3: Creating Service Principal" -ForegroundColor Green
$subscriptionId = az account show --query id --output tsv
$spOutput = az ad sp create-for-rbac --name "github-10xdev-deployment" --role contributor --scopes "/subscriptions/$subscriptionId" --sdk-auth

Write-Host "Step 4: Service Principal created successfully!" -ForegroundColor Green
Write-Host "Copy the JSON output below and save it as AZURE_CREDENTIALS secret in GitHub:" -ForegroundColor Yellow
Write-Host $spOutput -ForegroundColor Cyan

# 5. Verify the service principal
Write-Host "Step 5: Verifying service principal" -ForegroundColor Green
$appId = ($spOutput | ConvertFrom-Json).clientId
az ad sp show --id $appId --query appDisplayName --output tsv