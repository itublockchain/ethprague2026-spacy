FROM node:20-bookworm-slim AS base
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# --- deps
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* tsconfig.base.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm install -g bun@1.3.8 && bun install --frozen-lockfile

# --- build
FROM deps AS build
WORKDIR /app
COPY . .
RUN cd apps/api && npx prisma generate
RUN cd apps/api && npm run build

# --- runtime
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/package.json /app/apps/api/
COPY --from=build /app/apps/api/src/prisma /app/apps/api/src/prisma
COPY --from=build /app/packages/shared /app/packages/shared
EXPOSE 8080
CMD ["node", "/app/apps/api/dist/index.js"]
