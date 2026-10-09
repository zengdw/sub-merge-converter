FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
RUN npm install

COPY src ./src
COPY public ./public

RUN npm run build:node

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV DATA_DIR=/app/data

# 复制打包产物和静态资源
COPY --from=builder /app/dist ./dist
COPY public ./public

# 创建持久化数据目录
RUN mkdir -p /app/data

EXPOSE 8787

VOLUME ["/app/data"]

CMD ["node", "dist/node-server.cjs"]
