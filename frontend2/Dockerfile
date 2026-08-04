# Estágio 1: Dependências e Build
FROM node:22-alpine AS builder
WORKDIR /app

# Ativa o pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./

# Força o pnpm a atualizar as divergências do lockfile sem travar em CI
RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

# Estágio 2: Runner de Produção
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["pnpm", "start"]