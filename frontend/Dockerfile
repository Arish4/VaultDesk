# Stage 1: install and build the React app with Bun.
FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
# --frozen-lockfile: install exactly what bun.lock says, fail if it is out of date.
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: serve only the built files with nginx (no Bun or Node in the final image).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
