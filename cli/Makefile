VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -ldflags "-X main.version=$(VERSION)"

.PHONY: build clean install

build:
	go build $(LDFLAGS) -o bin/stc ./cmd/stc

clean:
	rm -rf bin/

install:
	go install $(LDFLAGS) ./cmd/stc
