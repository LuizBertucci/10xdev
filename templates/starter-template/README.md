# Starter Template

Full-stack starter template with Next.js 15, Express, TypeScript, Supabase, and shadcn/ui.

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth

## Quick Start

### 1. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `database/setup.sql`
3. Copy your project URL and keys from Settings > API

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Install Dependencies

```bash
npm install
npm run install:all
```

### 4. Run Development Server

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Project Structure

```
├── frontend/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API clients
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── backend/
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Database operations
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── database/     # Database config
│   │   └── types/        # TypeScript types
│   └── dist/             # Compiled output
└── database/
    └── setup.sql         # Database schema
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/examples` | List examples |
| GET | `/api/examples/:id` | Get example |
| POST | `/api/examples` | Create example |
| PUT | `/api/examples/:id` | Update example |
| DELETE | `/api/examples/:id` | Delete example |

## Admin Home

A tela inicial já vem como um painel “Admin”, com cards de status, acesso rápido
ao fluxo de autenticação e um bloco destacando o endpoint de exemplo.

## Adding New Features

### New Entity

1. Create table in `database/setup.sql`
2. Add types in `backend/src/types/index.ts` and `frontend/types/index.ts`
3. Create model in `backend/src/models/`
4. Create controller in `backend/src/controllers/`
5. Add routes in `backend/src/routes/`
6. Create frontend components and hooks

### New shadcn/ui Component

```bash
cd frontend
npx shadcn@latest add [component-name]
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both servers |
| `npm run build` | Build for production |
| `npm run start` | Start production servers |

## License

MIT
