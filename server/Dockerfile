FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
RUN npm ci --workspace server --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY server ./server
WORKDIR /app/server
RUN npx prisma generate --schema prisma.postgres/schema.prisma
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma.postgres ./server/prisma.postgres
COPY server/package.json ./server/package.json
WORKDIR /app/server
EXPOSE 4000
CMD ["node", "dist/src/index.js"]
