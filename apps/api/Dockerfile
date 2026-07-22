FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN npm install -g pnpm && pnpm install --filter @orbit/api...
COPY apps/api ./apps/api
RUN pnpm --dir apps/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN npm install -g pnpm && pnpm install --prod --filter @orbit/api...
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/schema.sql ./apps/api/dist/
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
