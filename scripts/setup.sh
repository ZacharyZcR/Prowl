#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    error "$1 未安装，请先安装后再运行此脚本"
  fi
  info "$1 已就绪 ($(command -v "$1"))"
}

info "检查依赖..."
check_cmd go
check_cmd node
check_cmd pnpm
check_cmd docker

if [ ! -f "$PROJECT_ROOT/.env" ] && [ -f "$PROJECT_ROOT/.env.example" ]; then
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
  info "已复制 .env.example -> .env"
else
  warn ".env 已存在或 .env.example 不存在，跳过"
fi

info "安装前端依赖..."
cd "$PROJECT_ROOT/frontend" && pnpm install

info "整理后端依赖..."
cd "$PROJECT_ROOT/backend" && go mod tidy

if [ -d "$PROJECT_ROOT/cli" ]; then
  info "整理 CLI 依赖..."
  cd "$PROJECT_ROOT/cli" && go mod tidy
fi

info "启动基础设施 (postgres, redis)..."
cd "$PROJECT_ROOT/docker" && docker compose up -d

info "=============================="
info "项目初始化完成"
info "  后端: cd backend && go run ."
info "  前端: cd frontend && pnpm dev"
info "=============================="
