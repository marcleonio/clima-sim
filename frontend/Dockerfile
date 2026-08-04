# Estágio 1: Dependências e Build
FROM node:22-alpine AS builder
WORKDIR /app

# Ativa o pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./

# Instala as dependências
RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY . .

# Executa o build do TanStack Start / Vite
RUN pnpm build

# Estágio 2: Runner de Produção
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia os artefatos compilados pelo Vite/Nitro e dependências
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

# Inicializa o servidor standalone do Nitro (TanStack Start)
CMD ["node", ".output/server/index.mjs"]