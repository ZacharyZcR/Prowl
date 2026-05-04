#!/usr/bin/env bash
# error-watch.sh — 错误日志查询工具
# 用法:
#   ./scripts/error-watch.sh              # 查看未解决的错误列表
#   ./scripts/error-watch.sh stats        # 错误统计
#   ./scripts/error-watch.sh detail <id>  # 查看错误详情
#   ./scripts/error-watch.sh resolve <id> # 标记已解决
#   ./scripts/error-watch.sh watch        # 轮询等待新错误

set -euo pipefail

API_BASE="${PROWL_API_BASE:-http://localhost:38080/api/v1}"
USERNAME="${PROWL_ADMIN_USER:-admin}"
PASSWORD="${PROWL_ADMIN_PASS:-admin123}"

token=""

login() {
  local resp
  resp=$(curl -sf "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}" 2>/dev/null) || {
    echo "登录失败，确认后端在 ${API_BASE} 运行中" >&2
    exit 1
  }
  token=$(echo "$resp" | jq -r '.data.token')
  if [ -z "$token" ] || [ "$token" = "null" ]; then
    echo "登录失败: $resp" >&2
    exit 1
  fi
}

api_get() {
  curl -sf "${API_BASE}$1" -H "Authorization: Bearer ${token}" 2>/dev/null
}

api_put() {
  curl -sf -X PUT "${API_BASE}$1" -H "Authorization: Bearer ${token}" 2>/dev/null
}

cmd_list() {
  login
  local severity="${1:-}"
  local url="/error-logs?page_size=50&resolved=false"
  [ -n "$severity" ] && url="${url}&severity=${severity}"
  local resp
  resp=$(api_get "$url")
  echo "$resp" | jq -r '
    .data.items // [] | .[] |
    "\(.id)\t\(.severity)\t\(.source)\t\(.err_type)\t\(.occurrence_count)x\t\(.message[0:80])"
  ' | column -t -s $'\t'
  local total
  total=$(echo "$resp" | jq '.data.total // 0')
  echo "--- 未解决: ${total} 条 ---"
}

cmd_stats() {
  login
  api_get "/error-logs/statistics" | jq '.data'
}

cmd_detail() {
  local id="$1"
  login
  api_get "/error-logs/${id}" | jq '.data | {
    id, source, severity, err_type, message, stack, url, method,
    status_code, request_id, user_agent, occurrence_count,
    first_seen_at, last_seen_at, resolved
  }'
}

cmd_resolve() {
  local id="$1"
  login
  api_put "/error-logs/${id}/resolve"
  echo "已标记 #${id} 为已解决"
}

cmd_watch() {
  login
  local last_total=0
  echo "监听中... (Ctrl+C 退出)"
  while true; do
    local resp
    resp=$(api_get "/error-logs/statistics")
    local total
    total=$(echo "$resp" | jq '.data.unresolved // 0')
    if [ "$total" -gt "$last_total" ] && [ "$last_total" -gt 0 ]; then
      local diff=$((total - last_total))
      echo "[$(date '+%H:%M:%S')] 新增 ${diff} 条未解决错误"
      cmd_list
    fi
    last_total=$total
    sleep 5
  done
}

case "${1:-list}" in
  list)    cmd_list "${2:-}" ;;
  stats)   cmd_stats ;;
  detail)  cmd_detail "${2:?用法: error-watch.sh detail <id>}" ;;
  resolve) cmd_resolve "${2:?用法: error-watch.sh resolve <id>}" ;;
  watch)   cmd_watch ;;
  *)       echo "用法: error-watch.sh [list|stats|detail|resolve|watch] [args...]"; exit 1 ;;
esac
