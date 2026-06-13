FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Bind to all interfaces (Docker sets HOSTNAME to the container id, which would
# make Next's standalone server bind only to that hostname — breaking
# localhost healthchecks and in-container requests). PORT is explicit.
ENV HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/config ./lib/config
# Writable prerender cache dir for the nextjs user (avoids runtime EACCES on
# /app/.next/cache when Next tries to persist its incremental cache).
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
