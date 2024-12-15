FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --include=dev

FROM deps AS build
WORKDIR /app
COPY prisma ./prisma
COPY src ./src
COPY nest-cli.json tsconfig.json ./
RUN npm run build

FROM deps AS migrate
WORKDIR /app
COPY prisma ./prisma
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache openssl
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY scripts ./scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/public/uploads \
  && chown -R nestjs:nodejs /app/public /app/node_modules/@prisma /app/node_modules/.prisma

USER nestjs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "scripts/start-production.mjs"]
