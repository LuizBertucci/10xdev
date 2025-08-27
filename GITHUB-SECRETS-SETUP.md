# GitHub Secrets Configuration

## Required Secrets for Azure Deployment

Go to your GitHub repository: https://github.com/LuizBertucci/10xdev.git
Navigate to: Settings → Secrets and variables → Actions → New repository secret

### 1. AZURE_CREDENTIALS
**Value:** The complete JSON output from the service principal creation (from Step 1)
```json
{
  "clientId": "1c8457eb-ccb0-4a67-9abb-b354f1ceb0c9",
  "clientSecret": "3tz8Q~4wmr3YETMaZUYSBdxqXaNkLULRKz-Azav_",
  "subscriptionId": "573b74db-dee3-4a7d-9ee0-d903f68b9b69",
  "tenantId": "4857e041-ff9a-4079-9a4f-f84b8e90f36b"
}
```

### 2. JWT_SECRET
**Value:** `3379a427cf0cf9861c97a7f2f513f9233f04903fd88c4f869abad333e1e61832`

### 3. SUPABASE_URL
**Value:** `https://xgpzbolfhgjhrydtcvug.supabase.co`

### 4. SUPABASE_ANON_KEY  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncHpib2xmaGdqaHJ5ZHRjdnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODA4NDksImV4cCI6MjA2OTA1Njg0OX0.9MIlV9aeOQg0NGV2Q38U5o8lzPSXtUuGlqSTSDFGyh8`

### 5. SUPABASE_SERVICE_ROLE_KEY
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhncHpib2xmaGdqaHJ5ZHRjdnVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ4MDg0OSwiZXhwIjoyMDY5MDU2ODQ5fQ.5hR7b7t-TUNiaKqs4WOj4a3N5nFxOryqlajgUkOOd6c`

## How to Add Secrets

1. Go to https://github.com/LuizBertucci/10xdev/settings/secrets/actions
2. Click "New repository secret"
3. Enter the secret name exactly as shown above
4. Paste the corresponding value
5. Click "Add secret"
6. Repeat for all 5 secrets