# Single-stage build: install + compile inside the same image so bun's
# workspace symlinks stay valid for runtime resolution. Multi-stage with
# `COPY --from=` breaks bun's `.bun/<pkg>@<ver>` storage + per-workspace
# node_modules symlink layout, which is why we keep it monolithic.

FROM oven/bun:1.3-debian AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN bun install
RUN cd apps/api && bunx prisma generate --schema=src/prisma/schema.prisma
RUN cd apps/api && bun run build

FROM oven/bun:1.3-debian AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the whole built tree — bun's symlinks resolve relative to /app, so
# preserving the layout 1:1 keeps cookie-parser, express, prisma, etc.
# importable at runtime.
COPY --from=build /app /app

EXPOSE 8080
CMD ["bun", "/app/apps/api/dist/index.js"]
