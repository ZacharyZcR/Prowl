#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROTO_DIR="$PROJECT_ROOT/proto"
GO_OUT="$PROJECT_ROOT/backend/internal/proto"
TS_OUT="$PROJECT_ROOT/frontend/src/lib/proto"

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

if ! command -v protoc &> /dev/null; then
  error "protoc 未安装。请先安装 Protocol Buffers 编译器: https://grpc.io/docs/protoc-installation/"
fi

info "protoc 版本: $(protoc --version)"

mkdir -p "$GO_OUT" "$TS_OUT"

info "生成 Go 代码 -> $GO_OUT"
protoc \
  --proto_path="$PROTO_DIR" \
  --go_out="$GO_OUT" \
  --go_opt=paths=source_relative \
  "$PROTO_DIR"/*.proto

info "生成 TypeScript 代码 -> $TS_OUT"
protoc \
  --proto_path="$PROTO_DIR" \
  --plugin=protoc-gen-ts="$(pnpm bin)/protoc-gen-ts" \
  --ts_out="$TS_OUT" \
  "$PROTO_DIR"/*.proto

info "Protobuf 代码生成完成"
