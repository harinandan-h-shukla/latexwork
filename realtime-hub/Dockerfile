FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# No TeX Live / bubblewrap / prlimit here — unlike cloud-compiler, this
# service does zero LaTeX/compile work, just holds WebSocket connections and
# forwards small JSON payloads. A plain slim Node runtime is enough.
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/cli.js"]
