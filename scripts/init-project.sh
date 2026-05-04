#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────
# Prowl Range → Your Project  一键初始化脚本
# ──────────────────────────────────────────────
# Usage:
#   ./scripts/init-project.sh <slug> <display-name> <github-owner/repo> [bundle-id]
#
# Example:
#   ./scripts/init-project.sh myapp "My App" acme/myapp com.acme.myapp
#
# Parameters:
#   slug         — 小写项目标识，用于包名、数据库名、CLI 命令名等
#   display-name — 显示名称，用于 UI 标题、文档
#   github-path  — GitHub owner/repo，用于 Go module 路径
#   bundle-id    — (可选) 桌面应用 bundle ID，默认 com.<slug>
# ──────────────────────────────────────────────

SLUG="${1:-}"
DISPLAY="${2:-}"
GITHUB="${3:-}"
BUNDLE="${4:-com.$SLUG}"

if [ -z "$SLUG" ] || [ -z "$DISPLAY" ] || [ -z "$GITHUB" ]; then
  echo "Usage: ./scripts/init-project.sh <slug> <display-name> <github-owner/repo> [bundle-id]"
  echo ""
  echo "Example:"
  echo "  ./scripts/init-project.sh myapp \"My App\" acme/myapp com.acme.myapp"
  echo ""
  echo "  slug         → package names, db name, docker volumes, CLI command"
  echo "  display-name → UI title, docs, brand text"
  echo "  github-path  → Go module path (github.com/<github-path>)"
  echo "  bundle-id    → Tauri bundle identifier (default: com.<slug>)"
  exit 1
fi

# Derived values
OLD_MODULE="github.com/ZacharyZcR/Prowl"
NEW_MODULE="github.com/$GITHUB"
SECRET="${SLUG}_secret"

echo "╔══════════════════════════════════════════╗"
echo "║  Initializing: $DISPLAY"
echo "╠══════════════════════════════════════════╣"
echo "║  slug:      $SLUG"
echo "║  module:    $NEW_MODULE"
echo "║  bundle:    $BUNDLE"
echo "╚══════════════════════════════════════════╝"
echo ""

# ────────────────────────────────────
# 1. Go module path (backend + cli)
# ────────────────────────────────────
echo "[1/10] Go module paths..."
find backend cli -name "*.go" -exec sed -i "s|$OLD_MODULE|$NEW_MODULE|g" {} +
sed -i "s|$OLD_MODULE|$NEW_MODULE|g" backend/go.mod cli/go.mod

# ────────────────────────────────────
# 2. Root package.json + Go alias
sed -i "s/\"name\": \"stc\"/\"name\": \"$SLUG\"/" package.json 2>/dev/null || true
# Go alias: stcgrpc → <slug>grpc
# ────────────────────────────────────
echo "[2/10] Go import aliases..."
find backend cli -name "*.go" -exec sed -i "s/stcgrpc/${SLUG}grpc/g" {} +

# ────────────────────────────────────
# 3. Docker: volumes, network, DB credentials
# ────────────────────────────────────
echo "[3/10] Docker config..."
for f in docker/docker-compose.yml docker/docker-compose.dev.yml docker/docker-compose.prod.yml docker/docker-compose.monitoring.yml; do
  [ -f "$f" ] || continue
  sed -i "s/stc_postgres/${SLUG}_postgres/g" "$f"
  sed -i "s/stc_redis/${SLUG}_redis/g" "$f"
  sed -i "s/stc-network/${SLUG}-network/g" "$f"
  sed -i "s/stc_secret/${SECRET}/g" "$f"
  sed -i "s/POSTGRES_USER: stc/POSTGRES_USER: ${SLUG}/g" "$f"
  sed -i "s/POSTGRES_DB: stc/POSTGRES_DB: ${SLUG}/g" "$f"
  sed -i "s/pg_isready -U stc/pg_isready -U ${SLUG}/g" "$f"
  # DATABASE_URL: replace user and dbname
  sed -i "s|://stc:|://${SLUG}:|g" "$f"
  sed -i "s|/${SLUG}?|/${SLUG}?|g" "$f"  # dbname in URL
done

# Prometheus job name
sed -i "s/stc-backend/${SLUG}-backend/g" docker/prometheus.yml 2>/dev/null || true

# ────────────────────────────────────
# 4. Backend config defaults
# ────────────────────────────────────
echo "[4/10] Backend config defaults..."
# DATABASE_URL default in config.go
sed -i "s|/stc?|/${SLUG}?|g" backend/pkg/config/config.go
# Seed settings: default values
sed -i "s/\"STC\"/\"$DISPLAY\"/g" backend/internal/database/seed_settings.go 2>/dev/null || true
# Seed settings: test data
find backend/internal -name "*_test.go" -exec sed -i "s/\"STC\"/\"$DISPLAY\"/g" {} + 2>/dev/null || true

# ────────────────────────────────────
# 5. .env files
# ────────────────────────────────────
echo "[5/10] Environment files..."
for f in .env.example .env.development .env.staging .env.production; do
  [ -f "$f" ] || continue
  sed -i "s/stc_secret/${SECRET}/g" "$f"
  sed -i "s|://stc:|://${SLUG}:|g" "$f"
  sed -i "s|/stc?|/${SLUG}?|g" "$f"
done

# ────────────────────────────────────
# 6. Frontend
# ────────────────────────────────────
echo "[6/10] Frontend config & brand..."
# package.json
sed -i "s/\"name\": \"frontend\"/\"name\": \"${SLUG}-frontend\"/" frontend/package.json
# Brand text in TSX/TS files
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/>Prowl Range</>$DISPLAY</g; s/'STC'/'$DISPLAY'/g; s/\"STC\"/\"$DISPLAY\"/g"
# i18n
find frontend/src -name "*.json" -path "*/i18n/*" -exec sed -i "s/STC/$DISPLAY/g" {} +

# ────────────────────────────────────
# 7. Desktop / Tauri
# ────────────────────────────────────
echo "[7/10] Desktop / Tauri..."
if [ -f desktop/src-tauri/tauri.conf.json ]; then
  sed -i "s/STC Desktop/$DISPLAY/g" desktop/src-tauri/tauri.conf.json
  sed -i "s/com.stc.desktop/$BUNDLE/g" desktop/src-tauri/tauri.conf.json
fi
if [ -f desktop/src-tauri/Cargo.toml ]; then
  sed -i "s/stc-desktop/${SLUG}-desktop/g" desktop/src-tauri/Cargo.toml
fi
sed -i "s/\"name\": \"desktop\"/\"name\": \"${SLUG}-desktop\"/" desktop/package.json 2>/dev/null || true
# Desktop brand text
find desktop/src \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s/>Prowl Range</>$DISPLAY</g; s/'STC'/'$DISPLAY'/g; s/\"STC\"/\"$DISPLAY\"/g" {} + 2>/dev/null || true
find desktop/src -name "*.json" -path "*/i18n/*" -exec sed -i "s/STC/$DISPLAY/g" {} + 2>/dev/null || true

# ────────────────────────────────────
# 8. CLI
# ────────────────────────────────────
echo "[8/14] CLI..."
find cli -name "*.go" -exec sed -i "s/\"stc\"/\"$SLUG\"/g; s/STC/$DISPLAY/g" {} +
sed -i "s/\.stc/\.$SLUG/g" cli/internal/config/config.go 2>/dev/null || true

# ────────────────────────────────────
# 9. Makefile
# ────────────────────────────────────
echo "[9/14] Makefile & CI..."
sed -i "s/psql -U stc -d stc/psql -U $SLUG -d $SLUG/g" Makefile
# GitHub Actions workflows
find .github -name "*.yml" -exec sed -i "s|/stc|/${SLUG}|g; s/stc-/$SLUG-/g; s/bin\/stc/bin\/$SLUG/g" {} + 2>/dev/null || true

# ────────────────────────────────────
# 10. Backend brand strings
# ────────────────────────────────────
echo "[10/14] Backend brand strings..."
# Swagger annotations
find backend/cmd -name "*.go" -exec sed -i "s/STC API/$DISPLAY API/g; s/STC Backend/$DISPLAY Backend/g" {} +
# Regenerated swagger docs
find backend/docs -name "*.go" -o -name "*.json" -o -name "*.yaml" 2>/dev/null | xargs sed -i "s/STC API/$DISPLAY API/g; s/STC Backend/$DISPLAY Backend/g" 2>/dev/null || true
# Webhook User-Agent
find backend/internal -name "*.go" -exec sed -i "s/STC-Webhook/${DISPLAY}-Webhook/g" {} +
# JWT issuer
find backend/internal -name "*.go" -exec sed -i "s/\"stc\"/\"$SLUG\"/g" {} +
# Demo emails
find backend/internal -name "*.go" -exec sed -i "s/@stc\.local/@${SLUG}.local/g" {} +

# ────────────────────────────────────
# 11. CSS class prefix: stc- → <slug>-
# ────────────────────────────────────
echo "[11/14] CSS class prefix & custom events..."
# CSS class prefix stc-* and custom events stc:*
find frontend/src desktop/src -name "*.tsx" -o -name "*.ts" -o -name "*.css" 2>/dev/null | xargs sed -i "s/stc-/${SLUG}-/g; s/stc:/${SLUG}:/g" 2>/dev/null || true
# Design system package name
sed -i "s/@stc\//@${SLUG}\//g" design-system/package.json 2>/dev/null || true
find frontend/src desktop/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs sed -i "s/@stc\//@${SLUG}\//g" 2>/dev/null || true

# ────────────────────────────────────
# 11. docs-site VitePress config
# ────────────────────────────────────
echo "[12/14] Docs site..."
if [ -f docs-site/.vitepress/config.ts ]; then
  sed -i "s/STC Documentation/$DISPLAY Documentation/g" docs-site/.vitepress/config.ts
  sed -i "s|ZacharyZcR/Prowl|$GITHUB|g" docs-site/.vitepress/config.ts
fi

# ────────────────────────────────────
# 12. CLAUDE.md + docs
# ────────────────────────────────────
echo "[13/14] Documentation..."
sed -i "1s/# STC.*/# $DISPLAY/" CLAUDE.md
sed -i "s/STC — Standard Template Construct/$DISPLAY/g" CLAUDE.md
sed -i "s/stc-\*/\`${SLUG}-\*\`/g" CLAUDE.md 2>/dev/null || true
# Replace remaining STC brand references in docs
find docs docs-site -name "*.md" -exec sed -i "s/STC/$DISPLAY/g" {} + 2>/dev/null || true

# ────────────────────────────────────
# 14. Catch-all: remaining STC/stc in source files
# ────────────────────────────────────
echo "[14/14] Catch-all sweep..."
# Remaining uppercase STC brand text in all source
find frontend/src desktop/src backend/cmd backend/internal -name "*.go" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs sed -i "s/STC/$DISPLAY/g" 2>/dev/null || true

echo ""
echo "══════════════════════════════════════════"
echo "  Done. Project is now: $DISPLAY ($SLUG)"
echo "══════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review changes:  git diff"
echo "  2. Update .env with your database credentials"
echo "  3. Start dev:       make dev && cd backend && make run"
echo ""
