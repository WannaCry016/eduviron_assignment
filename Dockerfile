# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY data-source.ts .
RUN npm run build

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY data-source.ts ./

EXPOSE 3000
CMD ["node", "dist/main.js"]

