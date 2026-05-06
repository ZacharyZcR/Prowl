# 部署指南

## Docker 部署

### 生产环境

```bash
# 一键启动 (PostgreSQL + Redis + Backend + Frontend)
make docker-prod

# 等价于:
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --build
```

服务端口:
- 前端: `:80` (nginx)
- 后端: `:38080`
- PostgreSQL: `:5432`
- Redis: `:6379`

### 停止

```bash
make docker-down

# 或单独停止生产栈
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml down
```

### 查看日志

```bash
make docker-logs

# 单个服务
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs -f backend
```

## 环境变量

### 后端

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/prowl?sslmode=disable` | PostgreSQL 连接串 |
| `REDIS_URL` | `localhost:6379` | Redis 地址 |
| `REDIS_PASSWORD` | (空) | Redis 密码 |
| `LISTEN_ADDR` | `:38080` | HTTP 监听地址 |
| `JWT_SECRET` | (必填) | JWT 签名密钥，未配置时服务拒绝启动 |
| `GIN_MODE` | `debug` | 生产设为 `release` |
| `UPLOAD_DIR` | `./uploads` | 文件上传目录 |
| `CORS_ALLOWED_ORIGINS` | 开发环境默认本地地址 | 允许跨域的 Origin 列表，逗号分隔 |
| `DB_MIGRATION_MODE` | `debug` 下为 `auto`，其他为 `validate` | `auto` 自动建表，`validate` 仅校验现有 schema |
| `OUTBOUND_HTTP_TIMEOUT` | `15s` | AI / OAuth / Webhook 等外部 HTTP 请求统一超时 |

### Docker Compose 环境变量

在 `docker/docker-compose.prod.yml` 中配置:

```yaml
services:
  backend:
    environment:
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_USER: prowl
      DB_PASSWORD: prowl_secret    # 生产必改
      DB_NAME: prowl
      REDIS_URL: redis:6379
      GIN_MODE: release
      JWT_SECRET: your-secure-secret  # 生产必改
      DB_MIGRATION_MODE: validate
      CORS_ALLOWED_ORIGINS: https://app.example.com
      OUTBOUND_HTTP_TIMEOUT: 15s
```

### 前端

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_URL` | `http://localhost:38080` | 后端 API 地址 (构建时注入) |

### PostgreSQL

| 变量 | 默认值 |
|------|--------|
| `POSTGRES_USER` | `prowl` |
| `POSTGRES_PASSWORD` | `prowl_secret` |
| `POSTGRES_DB` | `prowl` |

### Grafana

| 变量 | 默认值 |
|------|--------|
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` |

## 监控栈

```bash
# 启动 Prometheus + Grafana
docker compose -f docker/docker-compose.yml -f docker/docker-compose.monitoring.yml up -d
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- 后端 metrics: http://localhost:38080/metrics

Prometheus 配置: `docker/prometheus.yml`

配置 Grafana 数据源时，Prometheus URL 填: `http://prometheus:9090`

## 数据库操作

### 连接 PostgreSQL

```bash
# 通过 Docker
make db-shell
# 等价于: docker compose exec postgres psql -U prowl -d prowl

# 直接连接
psql postgres://prowl:prowl_secret@localhost:5432/prowl
```

### 备份

```bash
# 导出
docker compose -f docker/docker-compose.yml exec postgres \
  pg_dump -U prowl -d prowl > backup_$(date +%Y%m%d_%H%M%S).sql

# 导入
docker compose -f docker/docker-compose.yml exec -T postgres \
  psql -U prowl -d prowl < backup.sql
```

### Redis

```bash
make redis-shell

# 查看所有 key
KEYS *

# 清空
FLUSHALL
```

## 手动编译部署 (不用 Docker)

### 后端

```bash
cd backend
CGO_ENABLED=0 go build -ldflags "-s -w" -o bin/server ./cmd/server

# 设置环境变量
export DATABASE_URL="postgres://user:pass@host:5432/dbname?sslmode=require"
export REDIS_URL="redis-host:6379"
export JWT_SECRET="your-secure-secret"
export GIN_MODE="release"
export LISTEN_ADDR=":8080"
export DB_MIGRATION_MODE="validate"
export CORS_ALLOWED_ORIGINS="https://app.example.com"
export OUTBOUND_HTTP_TIMEOUT="15s"

./bin/server
```

### 前端

```bash
# 设置 API 地址
VITE_API_URL=https://api.example.com pnpm --filter frontend build

# 产物在 frontend/dist/
# 用 nginx 等静态服务器托管
```

nginx 配置参考: `frontend/nginx.conf`

## 生产清单

- [ ] 修改 `JWT_SECRET` 为强随机字符串
- [ ] 修改 PostgreSQL 密码
- [ ] 修改 Redis 密码 (如需要)
- [ ] 设置 `GIN_MODE=release`
- [ ] 设置 `DB_MIGRATION_MODE=validate`
- [ ] 配置 `CORS_ALLOWED_ORIGINS`
- [ ] 配置 HTTPS (反向代理层)
- [ ] 配置数据库定期备份
- [ ] 启动监控栈
- [ ] 修改默认 admin 密码
- [ ] 配置 Grafana 密码
