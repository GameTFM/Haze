FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" PATH="$PNPM_HOME:$PATH" COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# deps first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack pnpm install --prod --frozen-lockfile

# app source (public/ is the whole frontend, vendored)
COPY server.js ./
COPY public ./public

ENV NODE_ENV=production PORT=8000 HOST=0.0.0.0
EXPOSE 8000

# wisp websocket rides the same port at /wisp/ - host must support websockets + sticky routing
CMD ["node", "server.js"]
