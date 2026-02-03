# AGENTS.md - Development Guide for AI Agents

## Project Overview

Full-stack developer platform (10xDev) with Next.js frontend and Express.js backend, both using TypeScript. Monorepo structure with npm workspaces.

- **Frontend**: Next.js 15 + React + TailwindCSS + Radix UI
- **Backend**: Express.js + Supabase PostgreSQL
- **Node**: >= 18.0.0

## Build Commands

### Root Level (runs both)
```bash
npm run dev        # Start both frontend and backend in dev mode
npm run build      # Build both workspaces
npm run lint       # Lint both workspaces
npm run test       # Run backend tests only (Jest)
```

### Backend Only
```bash
cd backend
npm run dev        # Start with ts-node-dev
npm run build      # tsc && tsc-alias
npm run start      # node dist/server.js
npm run lint       # eslint src/**/*.ts
npm run lint:fix   # eslint with --fix
npm run test       # jest (runs all tests)
```

### Frontend Only
```bash
cd frontend
npm run dev        # Next.js dev server
npm run build      # next build
npm run lint       # eslint . --ext .js,.jsx,.ts,.tsx
npm run start      # next start
```

## Running Tests

Backend uses Jest with ts-jest:
```bash
# Run all tests
npm run test --workspace=backend

# Run specific test file
cd backend && npx jest src/path/to/test.test.ts

# Run tests matching pattern
cd backend && npx jest --testNamePattern="pattern"
```

Note: Frontend has no test configuration currently.

## Code Style Guidelines

### TypeScript Configuration
- **Backend**: Strict mode enabled, ES2022 target, CommonJS modules
- **Frontend**: Strict mode, ES6 target, ESNext modules, JSX preserve
- Always use explicit types for function parameters and returns
- Enable `strict: true`, `noImplicitAny: true`, `noImplicitReturns: true`

### Imports
```typescript
// 1. External libraries first
import express from 'express'
import { randomUUID } from 'crypto'

// 2. Internal absolute imports (using path aliases)
import { CardFeatureModel } from '@/models/CardFeatureModel'
import type { CardFeatureResponse } from '@/types/cardfeature'

// 3. Relative imports (only when necessary)
import { helper } from '../utils/helper'
```

### Naming Conventions
- **Classes/Components**: PascalCase (e.g., `CardFeatureController`, `CardFeature`)
- **Functions/Variables**: camelCase (e.g., `findById`, `userData`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Files**: camelCase for utilities, PascalCase for classes/components
- **Types/Interfaces**: PascalCase with descriptive names

### String Quotes & Formatting
- Use **single quotes** for strings
- **No semicolons** at line endings
- 2-space indentation
- Max line length: 100 characters (soft limit)

### Error Handling
Use standardized API responses:
```typescript
try {
  // operation
} catch (error) {
  console.error('Contextual error message:', error)
  res.status(500).json({
    success: false,
    error: 'User-friendly error message in Portuguese'
  })
}
```

### Type Definitions
```typescript
// Use type for object shapes
type UserResponse = {
  id: string
  name: string
  email: string
}

// Use enums for fixed values
enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted'
}

// Export types from @/types/ directory
```

### Path Aliases
- Backend: `@/*` maps to `src/*`
- Frontend: `@/*` maps to project root
- Always prefer aliases over relative imports (`../`)

### UI Components (Frontend)
- Use Radix UI primitives from `@/components/ui/`
- Style with Tailwind CSS utility classes
- Use `class-variance-authority` for component variants
- Icons from `lucide-react`

### Language Guidelines
- **Code**: English (variables, functions, types)
- **User-facing messages**: Portuguese (Brazilian)
- **Comments**: Portuguese for business logic, English for technical explanations

## Linting & Type Checking

Always run after making changes:
```bash
npm run lint       # Check both workspaces
```

ESLint rules (both workspaces):
- `@typescript-eslint/no-explicit-any: off` (allowed for flexibility)
- `@typescript-eslint/no-unused-vars: off` (development convenience)
- `prefer-const: off`

## Database & Models

- Use Supabase PostgreSQL
- Models in `backend/src/models/` (static classes)
- Use `supabaseAdmin` for server-side operations
- Always use transactions for multi-table operations
- Return standardized `ModelResult<T>` or `ModelListResult<T>`

## Git Workflow

From `.cursor/commands/fix-merge-conflicts.md`:
- Resolve conflicts non-interactively when possible
- Prefer minimal, correct changes that preserve intent
- For lockfiles (package-lock.json): regenerate via package manager
- For config files: preserve union of safe settings
- For binary files: prefer current branch (ours)
- Run build/tests after conflict resolution
- Commit message: `chore: resolve merge conflicts`

## Project Structure

```
/root/10xdev/
├── backend/              # Express API
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── models/       # Database operations
│   │   ├── routes/       # Route definitions
│   │   ├── middleware/   # Express middleware
│   │   ├── types/        # TypeScript types
│   │   └── database/     # Supabase client
│   └── dist/             # Compiled output
├── frontend/             # Next.js app
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   │   └── ui/           # Radix UI components
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
└── templates/            # Starter templates
```

## Common Tasks

### Adding a new API endpoint
1. Define types in `backend/src/types/`
2. Create/update model in `backend/src/models/`
3. Add controller method in `backend/src/controllers/`
4. Register route in `backend/src/routes/`

### Adding a new UI component
1. Check if Radix UI primitive exists
2. Create in `frontend/components/ui/` if needed
3. Use in page/component with Tailwind styling

### Database migrations
- Managed via Supabase Dashboard
- Update models to reflect schema changes
