FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# texlive/texlive ships a full TeX Live scheme (large image, broad package
# coverage — appropriate for a general-purpose editor whose users bring
# arbitrary conference/journal templates, not a fixed known set of packages).
FROM texlive/texlive:latest AS runtime
WORKDIR /app

# Node.js (the base image is TeX Live, not Node) + bubblewrap + util-linux
# (for prlimit) — the two sandboxing tools src/sandbox.ts shells out to.
# Neither needs --privileged or extra container capabilities.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates bubblewrap util-linux gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/cli.js"]
