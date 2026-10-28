# --- Étape build : compile le PWA ------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Étape runtime : Caddy sert le build statique --------------------------
# Caddy du host (hors conteneur) termine le TLS ; ce Caddy interne sert le SPA
# sur le port 80, avec fallback SPA et bons en-têtes de cache.
FROM caddy:2-alpine AS runtime
COPY infra/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
