#!/bin/bash
# 用法: ./scripts/backup.sh [output_dir]
# 默认备份到 ./backups/

set -e

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMPOSE="docker compose -f docker/docker-compose.yml"

mkdir -p "$BACKUP_DIR"

echo "Backing up PostgreSQL..."
$COMPOSE exec -T postgres pg_dump -U prowl -d prowl > "$BACKUP_DIR/prowl_${TIMESTAMP}.sql"

echo "Backing up Redis..."
$COMPOSE exec -T redis redis-cli BGSAVE
sleep 2
$COMPOSE cp redis:/data/dump.rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

echo "Backup complete:"
ls -lh "$BACKUP_DIR"/*_${TIMESTAMP}*
