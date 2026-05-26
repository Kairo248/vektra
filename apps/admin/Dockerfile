# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=$BACKEND_URL

# Default targets Render-style deploy: the browser hits same-origin /spring-api/*,
# Next.js rewrites it server-side to ${BACKEND_URL}/api/*. docker-compose overrides
# this to /api so Nginx can route browser calls directly to Spring.
ARG NEXT_PUBLIC_API_URL=/spring-api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN mkdir -p public && npm run build

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./

EXPOSE 3000

CMD ["npm", "run", "start"]
