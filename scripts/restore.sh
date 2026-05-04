#!/bin/bash
# 用法: ./scripts/restore.sh <backup.sql>
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup.sql>"
    exit 1
fi

COMPOSE="docker compose -f docker/docker-compose.yml"

echo "Restoring PostgreSQL from $1..."
cat "$1" | $COMPOSE exec -T postgres psql -U stc -d stc

echo "Restore complete."
