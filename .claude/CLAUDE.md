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
