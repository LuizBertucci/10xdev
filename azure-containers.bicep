@description('Prefix for all resource names')
param namePrefix string = '10xdev'

@description('Environment name (prod, staging, dev)')
@allowed(['prod', 'staging', 'dev'])
param environment string = 'prod'

@description('Azure region for deployment')
param location string = resourceGroup().location

@description('Container registry login server')
param containerRegistryLoginServer string

@description('Container registry username')
@secure()
param containerRegistryUsername string

@description('Container registry password')
@secure()
param containerRegistryPassword string

@description('Backend container image tag')
param backendImageTag string = 'latest'

@description('Frontend container image tag')
param frontendImageTag string = 'latest'

@description('JWT secret for authentication')
@secure()
param jwtSecret string

@description('Supabase project URL')
@secure()
param supabaseUrl string

@description('Supabase anonymous key')
@secure()
param supabaseAnonKey string

@description('Supabase service role key')
@secure()
param supabaseServiceRoleKey string

@description('Container App Environment ID')
param containerAppEnvironmentId string

// Variables
var resourceSuffix = '${namePrefix}-${environment}'
var backendAppName = 'ca-${namePrefix}-backend-${environment}'
var frontendAppName = 'ca-${namePrefix}-frontend-${environment}'
var backendImageName = '${containerRegistryLoginServer}/${namePrefix}-backend:${backendImageTag}'
var frontendImageName = '${containerRegistryLoginServer}/${namePrefix}-frontend:${frontendImageTag}'

// Backend Container App
resource backendContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: backendAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3001
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: containerRegistryLoginServer
          username: containerRegistryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: containerRegistryPassword
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'supabase-url'
          value: supabaseUrl
        }
        {
          name: 'supabase-anon-key'
          value: supabaseAnonKey
        }
        {
          name: 'supabase-service-role-key'
          value: supabaseServiceRoleKey
        }
      ]
    }
    template: {
      revisionSuffix: backendImageTag
      containers: [
        {
          name: 'backend'
          image: backendImageName
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3001'
            }
            {
              name: 'CORS_ORIGIN'
              value: '*'
            }
            {
              name: 'RATE_LIMIT_MAX_REQUESTS'
              value: '100'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'SUPABASE_URL'
              secretRef: 'supabase-url'
            }
            {
              name: 'SUPABASE_ANON_KEY'
              secretRef: 'supabase-anon-key'
            }
            {
              name: 'SUPABASE_SERVICE_ROLE_KEY'
              secretRef: 'supabase-service-role-key'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3001
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3001
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            name: 'http-scale-rule'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// Frontend Container App
resource frontendContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: frontendAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: containerRegistryLoginServer
          username: containerRegistryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: containerRegistryPassword
        }
      ]
    }
    template: {
      revisionSuffix: frontendImageTag
      containers: [
        {
          name: 'frontend'
          image: frontendImageName
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'NEXT_PUBLIC_API_URL'
              value: 'https://${backendContainerApp.properties.configuration.ingress.fqdn}/api'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 3000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scale-rule'
            http: {
              metadata: {
                concurrentRequests: '20'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    backendContainerApp
  ]
}

// Outputs
output backendFqdn string = backendContainerApp.properties.configuration.ingress.fqdn
output frontendFqdn string = frontendContainerApp.properties.configuration.ingress.fqdn
output backendUrl string = 'https://${backendContainerApp.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${frontendContainerApp.properties.configuration.ingress.fqdn}'