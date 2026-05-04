MODULE := github.com/ZacharyZcR/STC/backend
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME := $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS := -s -w \
	-X main.version=$(VERSION) \
	-X main.buildTime=$(BUILD_TIME) \
	-X main.gitCommit=$(GIT_COMMIT)

.PHONY: fmt lint test test-cover test-unit build run clean deps swagger ent-generate

fmt:
	go fmt ./...

lint:
	golangci-lint run ./...

test:
	go test -v -race -count=1 ./...

test-cover:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

test-unit:
	go test -v -race -short ./...

build:
	CGO_ENABLED=0 go build -ldflags "$(LDFLAGS)" -o bin/server ./cmd/server

run: build
	./bin/server

clean:
	rm -rf bin/

deps:
	go mod tidy
	go mod download

swagger:
	swag init -g cmd/server/main.go -o docs

ent-generate:
	go generate ./ent
