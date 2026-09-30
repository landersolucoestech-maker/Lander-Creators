FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lander_creators
ARG AUTH_SECRET=container-build-placeholder-secret-0123456789abcdef
ENV NODE_ENV=production DATABASE_URL=$DATABASE_URL AUTH_SECRET=$AUTH_SECRET LOG_LEVEL=info
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
