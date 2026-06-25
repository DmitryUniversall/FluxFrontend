# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Optional API base override. When empty (default), the build keeps the
# production default (https://api.flux.universallplus.ru); pass
# --build-arg VITE_API_BASE_URL=https://my.api to point elsewhere.
ARG VITE_API_BASE_URL=""
RUN export VITE_API_BASE_URL="$VITE_API_BASE_URL"; \
    [ -n "$VITE_API_BASE_URL" ] || unset VITE_API_BASE_URL; \
    npm run build

# --- serve stage ---
FROM nginx:1.27-alpine
# Render nginx.conf at startup so ${BACKEND_PORT} (default 7887) is substituted
# by the image's envsubst; the filter keeps nginx's own $host/$uri/... intact.
ENV BACKEND_PORT=7887 NGINX_ENVSUBST_FILTER=BACKEND_PORT
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
