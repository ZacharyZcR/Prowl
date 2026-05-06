#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

errors=0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

extract() {
  local file="$1" pattern="$2"
  grep -oP "$pattern" "$file" | head -1
}

read_version() {
  local label="$1" value="$2"
  printf "  %-40s %s\n" "$label" "$value"
}

root_pkg=$(extract "$ROOT/package.json" '"version":\s*"\K[^"]+')
frontend_pkg=$(extract "$ROOT/frontend/package.json" '"version":\s*"\K[^"]+')
portal_pkg=$(extract "$ROOT/portal/package.json" '"version":\s*"\K[^"]+')
desktop_pkg=$(extract "$ROOT/desktop/package.json" '"version":\s*"\K[^"]+')
tauri_conf=$(extract "$ROOT/desktop/src-tauri/tauri.conf.json" '"version":\s*"\K[^"]+')
tauri_cargo=$(extract "$ROOT/desktop/src-tauri/Cargo.toml" '^version\s*=\s*"\K[^"]+')
swagger=$(extract "$ROOT/backend/cmd/server/main.go" '@version\s+\K\S+')

echo "Version sources:"
read_version "package.json (root)" "$root_pkg"
read_version "frontend/package.json" "$frontend_pkg"
read_version "portal/package.json" "$portal_pkg"
read_version "desktop/package.json" "$desktop_pkg"
read_version "desktop/src-tauri/tauri.conf.json" "$tauri_conf"
read_version "desktop/src-tauri/Cargo.toml" "$tauri_cargo"
read_version "backend swagger annotation" "$swagger"
echo ""

canonical="$root_pkg"

check() {
  local label="$1" value="$2"
  if [ "$value" != "$canonical" ]; then
    echo -e "${RED}MISMATCH${NC}: $label is '$value', expected '$canonical'"
    errors=$((errors + 1))
  fi
}

check "frontend/package.json" "$frontend_pkg"
check "portal/package.json" "$portal_pkg"
check "desktop/package.json" "$desktop_pkg"
check "desktop/src-tauri/tauri.conf.json" "$tauri_conf"
check "desktop/src-tauri/Cargo.toml" "$tauri_cargo"
check "backend swagger annotation" "$swagger"

if [ "${1:-}" != "" ]; then
  release_tag="${1#v}"
  echo ""
  read_version "release tag" "$release_tag"
  if [ "$release_tag" != "$canonical" ]; then
    echo -e "${RED}MISMATCH${NC}: git tag '$release_tag' does not match package.json '$canonical'"
    errors=$((errors + 1))
  fi
fi

echo ""
if [ "$errors" -gt 0 ]; then
  echo -e "${RED}FAILED${NC}: $errors version mismatch(es) found."
  exit 1
fi

echo -e "${GREEN}OK${NC}: all versions are consistent ($canonical)."
