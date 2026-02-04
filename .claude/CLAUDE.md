# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**10xDev** is a full-stack developer platform featuring a CardFeatures system for managing code snippets, examples, and technical resources. The project consists of a Next.js frontend and Node.js/Express backend with PostgreSQL via Supabase.

### Architecture
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js with Express, TypeScript, comprehensive middleware stack
- **Database**: PostgreSQL via Supabase (both public and admin clients)
- **State Management**: Custom hooks with API integration
- **UI Framework**: Radix UI components with Tailwind styling

## Development Commands

### Frontend (from /frontend)
```bash
npm run dev          # Start development server (Next.js)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint checks
```

### Backend (from /backend)
```bash
npm run dev          # Start development server with nodemon
npm run build        # TypeScript compilation to /dist
npm run start        # Start production server from dist/
npm test             # Run Jest tests
npm run lint         # ESLint checks
npm run lint:fix     # Auto-fix ESLint issues
```

## Key Architecture Patterns

### CardFeature System
The core feature is a comprehensive CRUD system for managing code snippets with multi-tab support:

**Data Structure**:
- `CardFeature`: Main entity with title, tech, language, description
- `CardFeatureScreen[]`: Array of tabs/files within each CardFeature
- Each screen has: name, description, code content

**API Endpoints** (`/api/card-features`):
- `GET /` - List all with pagination, filtering, sorting
- `GET /:id` - Get single CardFeature
- `GET /search?q=term` - Search functionality
- `GET /tech/:tech` - Filter by technology
- `GET /stats` - System statistics
- `POST /` - Create new CardFeature
- `PUT /:id` - Update existing
- `DELETE /:id` - Delete CardFeature
- `POST /bulk` - Bulk create
- `DELETE /bulk` - Bulk delete

### Frontend Component Architecture
- **Pages as Components**: Located in `/pages/` (not Next.js pages - custom component structure)
- **Reusable UI**: shadcn/ui components in `/components/ui/`
- **Business Components**: CardFeature, CardFeatureForm, CardFeatureModal
- **Custom Hooks**: `useCardFeatures` for state management, `useApi` for HTTP client
- **Services Layer**: Dedicated API clients in `/services/`

### Backend Architecture
**Controller → Model → Database** pattern:
- **Controllers**: Request handling, validation, response formatting
- **Models**: Business logic and database operations
- **Database**: Supabase client with typed interfaces
- **Middleware**: CORS, rate limiting, security headers, error handling
- **Routes**: RESTful API organization

### Type Safety
Shared TypeScript interfaces between frontend and backend:
- `CardFeature`, `CardFeatureScreen` interfaces
- `CreateCardFeatureData`, `UpdateCardFeatureData` for mutations
- `CardFeatureQueryParams` for filtering/pagination
- Database types generated from Supabase schema

### Syntax Highlighting System
Custom implementation with:
- `SyntaxHighlighter` component with theme support
- Language-specific highlighting for TypeScript, JavaScript, Python, etc.
- Tech badge system with icons and colors
- Configurable syntax themes in `/components/utils/`

## Development Environment Setup

1. **Environment Variables**:
   - Backend: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - CORS origin configuration
   - Rate limiting settings

2. **Database**: 
   - Supabase PostgreSQL with `card_features` table
   - JSONB field for screens array
   - Indexes on tech, language, created_at

3. **Development Flow**:
   - Frontend runs on port 3000
   - Backend runs on port 3001
   - API proxy configuration in Next.js for development

## Code Conventions

### Frontend
- React functional components with hooks
- TypeScript strict mode enabled
- Tailwind classes for styling
- Custom hooks for business logic
- Props interfaces for all components

### Backend
- Express router patterns
- Async/await for database operations
- Comprehensive error handling
- Input validation on all endpoints
- Rate limiting per operation type
- Structured logging with Morgan

### Naming Conventions
- **Components**: PascalCase (CardFeature.tsx)
- **Files**: camelCase for utilities, PascalCase for components
- **Database**: snake_case (card_features table)
- **API**: kebab-case endpoints (/card-features)
- **Types**: PascalCase interfaces, camelCase for properties

## Testing Strategy
- **Backend**: Jest configuration ready
- **Frontend**: Next.js testing setup available
- **API Testing**: Endpoints return consistent response format
- **Type Safety**: Shared interfaces prevent runtime errors

## Key Files to Understand
- `frontend/types/cardfeature.ts` - Complete type system
- `backend/src/controllers/CardFeatureController.ts` - Main API logic
- `frontend/components/CardFeature.tsx` - Core display component
- `frontend/hooks/useCardFeatures.ts` - Main state management
- `backend/src/database/supabase.ts` - Database configuration

## Common Tasks

### Adding New CardFeature Fields
1. Update interfaces in both `frontend/types/` and `backend/src/types/`
2. Modify database schema in Supabase
3. Update validation in CardFeatureController
4. Update form components and display components

### Adding New Technology Support
1. Update `SupportedTech` enum in type definitions
2. Add tech configuration in `frontend/components/utils/techConfigs.ts`
3. Update badges and icons system

### API Rate Limiting
Different limits for different operations:
- General: 100 req/15min
- Write operations: 50 req/15min  
- Bulk operations: 10 req/15min
- Search: 200 req/15min