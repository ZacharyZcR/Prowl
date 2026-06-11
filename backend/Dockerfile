# syntax=docker/dockerfile:1.7
FROM golang:1.25-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
COPY third_party ./third_party
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

ARG VERSION=dev
ARG GIT_COMMIT=unknown

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath \
    -ldflags "-s -w -X main.version=${VERSION} -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ) -X main.gitCommit=${GIT_COMMIT}" \
    -o server ./cmd/server

# Development stage: source is usually mounted by docker-compose.dev.yml.
FROM golang:1.25-alpine AS dev
WORKDIR /app
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY . .
EXPOSE 38080
CMD ["go", "run", "./cmd/server"]

FROM alpine:3.24

RUN apk add --no-cache ca-certificates tzdata curl tini

COPY --from=builder /build/server /usr/local/bin/server

EXPOSE 38080

HEALTHCHECK --interval=5m --timeout=3s --start-period=15s --retries=1 \
    CMD curl -fsSL http://localhost:38080/api/v1/health/deep || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["server"]
