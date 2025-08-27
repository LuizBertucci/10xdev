# Frontend Dockerfile - Next.js 15 com TypeScript
FROM node:18-alpine AS base

# Instalar dependências necessárias para compilação
RUN apk add --no-cache libc6-compat wget

WORKDIR /app

# Copiar package.json e pnpm-lock.yaml (se usar pnpm)
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Instalar dependências
RUN npm ci --only=production

# Development stage
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm ci
COPY . .

# Definir variáveis de ambiente para build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build da aplicação
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários do build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Definir permissões corretas
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]