FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY portal/package.json ./portal/
COPY design-system/packages/tokens/package.json ./design-system/packages/tokens/
COPY design-system/packages/ui/package.json ./design-system/packages/ui/
COPY design-system/package.json ./design-system/

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY design-system/ ./design-system/
COPY portal/ ./portal/

RUN pnpm --filter portal build

FROM nginx:alpine
COPY --from=builder /app/portal/dist /usr/share/nginx/html
COPY portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
