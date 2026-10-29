FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client
COPY tsconfig.json ./
COPY src ./src
COPY client ./client
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY public ./public
COPY --from=build /app/public/admin ./public/admin
COPY uploads/images ./uploads/images
RUN mkdir -p uploads/videos uploads/media-images && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
