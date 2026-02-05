# GitHub Sync Integration Guide

## Overview

The gitsync feature enables bidirectional synchronization between 10xDev cards and GitHub repositories. Cards can be linked to files in a GitHub repository, and changes can be synced both ways.

## Components Available

The following components are available in `@/components/gitsync`:

### 1. GitHubConnectButton
Connects/disconnects a project to a GitHub repository.

```tsx
import { GitHubConnectButton } from '@/components/gitsync'

<GitHubConnectButton
  projectId="project-uuid"
  onConnected={(connection) => console.log('Connected:', connection)}
  onDisconnected={() => console.log('Disconnected')}
/>
```

### 2. GitHubRepoSelector
A dropdown component for selecting repositories.

```tsx
import { GitHubRepoSelector } from '@/components/gitsync'

<GitHubRepoSelector
  projectId="project-uuid"
  selectedRepoFullName="owner/repo"
  onSelect={(repo) => console.log('Selected:', repo)}
/>
```

### 3. FileMappingModal
A modal dialog for managing file-to-card mappings.

```tsx
import { FileMappingModal } from '@/components/gitsync'

<FileMappingModal
  cardId="card-uuid"
  connection={githubConnection}
  onMappingChange={() => refreshMappings()}
/>
```

### 4. SyncToGitHubButton
A button that syncs card content to GitHub, creating a Pull Request.

```tsx
import { SyncToGitHubButton } from '@/components/gitsync'

<SyncToGitHubButton
  cardId="card-uuid"
  cardTitle="Card Title"
  connection={githubConnection}
  mappings={fileMappings}
  currentContent={JSON.stringify(cardContent)}
  onSyncComplete={() => refreshData()}
/>
```

## Integration with CardFeatureForm

To add GitHub sync to the CardFeatureForm:

### Option 1: Simple Props Addition (Recommended)

Pass the `projectId` prop to CardFeatureForm:

```tsx
<CardFeatureForm
  isOpen={isOpen}
  mode="edit"
  initialData={cardData}
  isLoading={loading}
  onClose={onClose}
  onSubmit={handleSubmit}
  projectId={projectId}  // Add this prop
/>
```

The form will automatically load GitHub connection data and display the sync section.

### Option 2: Manual Component Integration

For more control, add components directly:

```tsx
import { FileMappingModal, SyncToGitHubButton } from '@/components/gitsync'
import { gitsyncService } from '@/services/gitsyncService'
import { Loader2 } from 'lucide-react'

function MyCardEditor() {
  const [connection, setConnection] = useState(null)
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadGithubData() {
      setLoading(true)
      try {
        const connections = await gitsyncService.getConnections(projectId)
        if (connections.length > 0) {
          setConnection(connections[0])
          const maps = await gitsyncService.getCardMappings(cardId)
          setMappings(maps)
        }
      } catch (error) {
        console.error('Error loading GitHub data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId && cardId) {
      loadGithubData()
    }
  }, [projectId, cardId])

  return (
    <div>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : connection ? (
        <div className="space-y-4">
          <div className="text-sm">
            Repositório: <strong>{connection.fullName}</strong>
          </div>

          <FileMappingModal
            cardId={cardId}
            connection={connection}
            onMappingChange={async () => {
              const maps = await gitsyncService.getCardMappings(cardId)
              setMappings(maps)
            }}
          />

          {mappings.length > 0 && (
            <SyncToGitHubButton
              cardId={cardId}
              cardTitle={cardTitle}
              connection={connection}
              mappings={mappings}
              currentContent={JSON.stringify(cardContent)}
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Nenhuma conexão GitHub estabelecida.
        </p>
      )}
    </div>
  )
}
```

## API Service Methods

Available in `gitsyncService`:

| Method | Description |
|--------|-------------|
| `getAuthorizationUrl(projectId)` | Generate OAuth URL |
| `disconnect()` | Disconnect GitHub account |
| `getConnections(projectId)` | List project connections |
| `createConnection(data)` | Create new connection |
| `deleteConnection(id)` | Remove connection |
| `getUserRepos()` | List user repositories |
| `linkFileToCard(cardId, data)` | Link file to card |
| `unlinkFileFromCard(cardId, mappingId)` | Remove file mapping |
| `getCardMappings(cardId)` | List card file mappings |
| `syncCardToGitHub(cardId, data)` | Sync card to GitHub (creates PR) |
| `getPullRequests(connectionId)` | List connection PRs |

## Required Environment Variables

Add to `backend/.env`:

```env
# GitHub App Configuration
GITHUB_APP_ID=your_app_id
GITHUB_APP_CLIENT_ID=your_client_id
GITHUB_APP_CLIENT_SECRET=your_client_secret
GITHUB_APP_PRIVATE_KEY_PATH=./github-app-private-key.pem
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
```

## GitHub App Setup

1. Create a GitHub App at https://github.com/settings/apps/new
2. Configure permissions:
   - `contents`: Read/Write (for file operations)
   - `pull_requests`: Read/Write (for creating PRs)
   - `webhooks`: Read/Write (for receiving events)
3. Set webhook URL to your backend's `/api/gitsync/webhooks/github`
4. Generate and download private key
5. Add environment variables to `.env`
