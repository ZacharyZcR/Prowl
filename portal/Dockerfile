# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY portal/package.json portal/package.json
COPY frontend/package.json frontend/package.json
COPY frontend-shadcn/package.json frontend-shadcn/package.json
COPY desktop/package.json desktop/package.json
COPY e2e/package.json e2e/package.json
COPY design-system/package.json design-system/package.json
COPY design-system/packages/tokens/package.json design-system/packages/tokens/package.json
COPY design-system/packages/ui/package.json design-system/packages/ui/package.json

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter @yza/tokens build && pnpm --filter portal build

FROM nginx:alpine
RUN apk add --no-cache curl
COPY --from=builder /app/portal/dist /usr/share/nginx/html
COPY portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=5m --timeout=3s --start-period=5s --retries=1 \
    CMD curl -fsSL http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
