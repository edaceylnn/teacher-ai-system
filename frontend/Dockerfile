# ---- dev: local development with HMR (used by docker-compose.yml) ----
FROM node:22-slim AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build: compile the static production bundle ----
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines import.meta.env.* at build time, so the API URL must be known
# now, as a build arg — setting it at container-run time (like a normal env
# var) would have no effect on the already-compiled static bundle.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ---- prod: serve the static bundle (default target for `docker build`) ----
FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
# The base image's entrypoint (docker-entrypoint.d/20-envsubst-on-templates.sh)
# renders *.template files here into /etc/nginx/conf.d/ at container start,
# substituting ${API_ORIGIN} (set in docker-compose.prod.yml) into the CSP header.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_ORIGIN=""

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
