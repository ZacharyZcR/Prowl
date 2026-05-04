FROM golang:1.25-alpine AS builder

WORKDIR /build
COPY . .
RUN go mod download

ARG VERSION=dev
ARG GIT_COMMIT=unknown

RUN CGO_ENABLED=0 go build \
    -ldflags "-s -w -X main.version=${VERSION} -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ) -X main.gitCommit=${GIT_COMMIT}" \
    -o server ./cmd/server

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata docker-cli

COPY --from=builder /build/server /usr/local/bin/server

EXPOSE 38080
ENTRYPOINT ["server"]
