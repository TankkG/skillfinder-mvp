FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm ci --workspace=@skillfinder/api --workspace=@skillfinder/shared --include-workspace-root
RUN npm run build:shared
RUN npm run build:api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared ./packages/shared
RUN mkdir -p /app/apps/api/uploads /app/apps/api/private-uploads \
  && chown -R node:node /app/apps/api
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
