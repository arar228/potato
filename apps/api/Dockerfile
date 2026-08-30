FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json eslint.config.mjs ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @night-arcade/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @night-arcade/shared build && pnpm --filter @night-arcade/api prisma:generate && pnpm --filter @night-arcade/api build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/shared ./packages/shared
COPY package.json pnpm-workspace.yaml ./
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @night-arcade/api exec prisma migrate deploy && node apps/api/dist/server.js"]
