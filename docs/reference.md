# Prowl Range 完整参考文档

> 本文件由 CLAUDE.md 精简时迁移而来，包含完整的架构细节、API 端点、Schema 定义等。

## 后端架构

### 请求处理流程

```
请求 → Gin Engine → CORS → Logger(zap) → Recovery → ErrorCapture → Metrics
                                                                       ↓
                                                           路由匹配 (/api/v1/...)
                                                                       ↓
                                     ┌─ 公开路由 (health, auth, ws, sse, swagger, metrics, system-logs/stream)
                                     └─ 认证路由 → JWTAuth → AuditLog → RequirePermission
                                                                                ↓
                                                                          Handler (解析请求)
                                                                                ↓
                                                                          Service (业务逻辑)
                                                                                ↓
                                                                          Ent Client (ORM)
                                                                                ↓
                                                                          PostgreSQL
```

### 中间件链

全局: `CORS → Logger(zap) → Recovery → ErrorCapture(errorLogService) → Metrics`
认证组: `JWTAuth(authService, client) → AuditLog(activityService) → RequirePermission("resource:action")`

### 关键文件

| 文件 | 作用 |
|------|------|
| `backend/cmd/server/main.go` | 入口: config → logger → DB → Redis → seed → auth service → WS hub → SSE broker → router → HTTP server |
| `backend/internal/handlers/router.go` | 所有路由注册，Service 实例化 |
| `backend/internal/middleware/auth.go` | JWT 解析 |
| `backend/internal/middleware/rbac.go` | RequirePermission 权限检查 |
| `backend/internal/middleware/cors.go` | CORS 配置 |
| `backend/internal/middleware/logger.go` | zap 请求日志 |
| `backend/internal/middleware/audit.go` | AuditLog 审计日志 |
| `backend/internal/middleware/error_capture.go` | 错误捕获写入 error_logs |
| `backend/internal/server/hub.go` | WebSocket Hub |
| `backend/internal/server/sse.go` | SSE Broker |
| `backend/pkg/config/config.go` | 环境变量 Config struct |
| `backend/pkg/response/` | 统一 JSON 响应格式 |

## 完整 API 端点表

### 公开端点 (无需认证)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/health` | 健康检查 |
| GET | `/api/v1/health/deep` | 深度健康检查 (含 DB + Redis) |
| POST | `/api/v1/auth/login` | 登录，返回 JWT token |
| POST | `/api/v1/auth/logout` | 登出 |
| GET | `/api/v1/ws?token=<jwt>` | WebSocket 连接 |
| GET | `/api/v1/sse?token=<jwt>` | SSE 连接 |
| GET | `/api/v1/ws/online` | 在线用户列表 |
| GET | `/api/v1/system-logs/stream` | 系统日志实时流 |
| GET | `/api/v1/swagger/*any` | Swagger 文档 |
| GET | `/metrics` | Prometheus metrics |
| GET | `/uploads/*` | 静态文件服务 |

### 用户管理 (Users)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/users/me` | 仅认证 | 获取当前用户 |
| PUT | `/api/v1/users/me/password` | 仅认证 | 修改密码 |
| GET | `/api/v1/users` | `user:read` | 用户列表 (分页) |
| GET | `/api/v1/users/:id` | `user:read` | 用户详情 |
| POST | `/api/v1/users` | `user:create` | 创建用户 |
| PUT | `/api/v1/users/:id` | `user:update` | 更新用户 |
| DELETE | `/api/v1/users/:id` | `user:delete` | 删除用户 |

### 权限 (Permissions)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/permissions` | 仅认证 | 权限列表 |
| GET | `/api/v1/permissions/categories` | 仅认证 | 按分类分组的权限 |

### 角色管理 (Roles)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/roles` | `role:read` | 角色列表 |
| GET | `/api/v1/roles/:id` | `role:read` | 角色详情 |
| POST | `/api/v1/roles` | `role:create` | 创建角色 |
| PUT | `/api/v1/roles/:id` | `role:update` | 更新角色 |
| DELETE | `/api/v1/roles/:id` | `role:delete` | 删除角色 |

### 项目管理 (Projects)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/projects` | `project:read` | 项目列表 (分页, 支持 `?status=active|archived|draft`) |
| GET | `/api/v1/projects/:id` | `project:read` | 项目详情 |
| POST | `/api/v1/projects` | `project:create` | 创建项目 |
| PUT | `/api/v1/projects/:id` | `project:update` | 更新项目 |
| DELETE | `/api/v1/projects/:id` | `project:delete` | 删除项目 |

### 操作日志 (Activities)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/activities` | `activity:read` | 活动日志 (分页, 支持 `?resource_type=xxx&user_id=1&action=xxx`) |
| GET | `/api/v1/activities/statistics` | `activity:read` | 活动统计 |
| GET | `/api/v1/activities/export` | `activity:read` | 导出 CSV |

### 文件上传 (Upload)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/v1/upload` | 仅认证 | 文件上传 |

### 通知 (Notifications)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/notifications` | 仅认证 | 通知列表 |
| GET | `/api/v1/notifications/unread-count` | 仅认证 | 未读数 |
| PUT | `/api/v1/notifications/:id/read` | 仅认证 | 标记已读 |
| PUT | `/api/v1/notifications/read-all` | 仅认证 | 全部标记已读 |
| POST | `/api/v1/notifications` | `notification:create` | 创建通知 |

### 登录日志 (Login Logs)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/login-logs` | `activity:read` | 登录日志列表 |
| GET | `/api/v1/login-logs/statistics` | `activity:read` | 登录统计 |

### 错误日志 (Error Logs)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/error-logs` | `error_log:read` | 错误日志列表 |
| GET | `/api/v1/error-logs/statistics` | `error_log:read` | 错误统计 |
| GET | `/api/v1/error-logs/:id` | `error_log:read` | 错误详情 |
| PUT | `/api/v1/error-logs/:id/resolve` | `error_log:update` | 标记已解决 |
| PUT | `/api/v1/error-logs/:id/unresolve` | `error_log:update` | 重新打开 |
| POST | `/api/v1/error-logs/bulk-resolve` | `error_log:update` | 批量解决 |
| POST | `/api/v1/error-logs/report` | 仅认证 | 前端上报错误 |

### 系统日志 (System Logs)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/system-logs` | `system:settings` | 最近系统日志 |

### Webhook

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/webhooks` | `system:settings` | Webhook 列表 |
| GET | `/api/v1/webhooks/:id` | `system:settings` | Webhook 详情 |
| POST | `/api/v1/webhooks` | `system:settings` | 创建 Webhook |
| PUT | `/api/v1/webhooks/:id` | `system:settings` | 更新 Webhook |
| DELETE | `/api/v1/webhooks/:id` | `system:settings` | 删除 Webhook |
| PUT | `/api/v1/webhooks/:id/toggle` | `system:settings` | 切换启用/禁用 |
| POST | `/api/v1/webhooks/:id/test` | `system:settings` | 测试 Webhook |

### 健康监控 (Health Monitor)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/health/monitor` | `system:settings` | 系统健康状态 |
| GET | `/api/v1/health/metrics` | `system:settings` | 系统运行指标 |

### 系统设置 (Settings)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/settings/system` | `system:settings` | 全部设置 |
| PUT | `/api/v1/settings/system` | `system:settings` | 更新设置 |
| GET | `/api/v1/settings/system/:group` | `system:settings` | 按组获取设置 |

### AI 助手

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/v1/ai/config` | `system:settings` | 获取 AI 配置 |
| PUT | `/api/v1/ai/config` | `system:settings` | 更新 AI 配置 |
| GET | `/api/v1/ai/conversations` | 仅认证 | 对话列表 |
| POST | `/api/v1/ai/conversations` | 仅认证 | 创建对话 |
| DELETE | `/api/v1/ai/conversations/:id` | 仅认证 | 删除对话 |
| GET | `/api/v1/ai/conversations/:id/messages` | 仅认证 | 获取对话消息 |
| POST | `/api/v1/ai/conversations/:id/chat` | 仅认证 | 流式聊天 (SSE) |

### 分页参数 (通用)

```
?page=1&page_size=20&search=keyword
```

## 完整 Ent Schema 列表

### User (`backend/ent/schema/user.go`)
id, username (unique), password (sensitive), email (unique, optional), nickname, avatar, created_at, updated_at
Edge: Role (M2O)

### Role (`backend/ent/schema/role.go`)
id, name (unique), description, permissions ([]string JSON), created_at, updated_at
Edge: Users (O2M)

### Project (`backend/ent/schema/project.go`)
id, name (max 128), description, status (default "active"), owner_id, created_at, updated_at

### Activity (`backend/ent/schema/activity.go`)
id, action, resource_type, resource_id, user_id, username, detail, ip, user_agent, details (JSON), status_code, method, path, created_at
Indexes: (user_id, created_at), (resource_type, created_at), (action), (created_at)

### Notification (`backend/ent/schema/notification.go`)
id, title, content, type (info/success/warning/error), read (default false), user_id, created_at

### ErrorLog (`backend/ent/schema/error_log.go`)
id, source (frontend/backend), err_type, message, stack, url, method, status_code, params (JSON), user_agent, request_id, user_id, fingerprint (unique SHA256), occurrence_count, first_seen_at, last_seen_at, resolved, resolved_by, resolved_at, severity (critical/high/medium/low), created_at, updated_at
Indexes: (source), (err_type), (severity), (resolved), (last_seen_at)

### Permission (`backend/ent/schema/permission.go`)
id, code (unique), name, resource, action, scope, description, category, created_at
Indexes: (resource, action), (category)

### LoginLog (`backend/ent/schema/loginlog.go`)
id, user_id, username, ip, user_agent, success, failure_reason, location, created_at
Indexes: (user_id, created_at), (success, created_at), (ip)

### Webhook (`backend/ent/schema/webhook.go`)
id, name, url, secret (sensitive), events ([]string JSON), headers (JSON), enabled, last_triggered_at, last_status_code, failure_count, created_at, updated_at
Indexes: (enabled)

### Setting (`backend/ent/schema/setting.go`)
id, key (unique), value (text), group_name, display_name, description, value_type, default_value, is_secret, sort_order, updated_at
Indexes: (group_name, sort_order)

### Conversation (`backend/ent/schema/conversation.go`)
id, title (max 200, default "New Chat"), user_id, model, created_at, updated_at
Indexes: (user_id, created_at)

### Message (`backend/ent/schema/message.go`)
id, conversation_id, role (user/assistant/system), content (text), token_count, created_at
Indexes: (conversation_id, created_at)

### AiConfig (`backend/ent/schema/ai_config.go`)
id, provider (default "openai"), api_key (sensitive), api_base, model (default "gpt-4o"), max_tokens (4096), temperature (0.7), system_prompt, updated_at

### Challenge Network Topology
`Challenge.network_topology` 保存多层网络题拓扑。结构包含 `services`、`networks`、`entry_service`。动态题启动实例时会创建独立 stack，记录 `stack_id`、`stack_containers`、`stack_networks`，并只暴露入口服务端口。入口服务必须设置 `expose_to_player: true` 且连接 `exposed` 网络；`internal` 网络不能同时标记为 `exposed`。

## 前端架构

### 路由表

```
/login → Login.tsx (GuestGuard)
/ → Layout.tsx (AuthGuard)
  /dashboard, /users, /roles, /permissions, /projects, /projects/:id,
  /activities, /login-logs, /error-logs, /health-monitor, /system-logs,
  /webhooks, /system-settings, /settings
```

### Zustand Stores (5 个)

| Store | 作用 |
|-------|------|
| auth.ts | 认证状态, token, user, login/logout |
| app.ts | 侧边栏折叠, 主题, 语言 |
| notification.ts | 通知状态 |
| online.ts | 在线用户列表 |
| ai.ts | AI 助手状态 |

### Hooks (24 个)

数据查询: useUsers, useRoles, useProjects, useActivities, useNotifications, useLoginLogs, useErrorLogs, usePermissions, useWebhooks, useHealthMonitor, useSettings, useAI
工具: usePermission, useWebSocket, useSSE, useTheme, useDebounce, usePagination, useDataTable, usePageTitle, useUnsavedWarning

### 组件

Layout.tsx, ErrorBoundary.tsx, RealtimeProvider.tsx, NotificationCenter.tsx, OnlineIndicator.tsx, AICopilot.tsx, PageShell.tsx

### i18n 顶层 Key

common, login, nav, dashboard, users, roles, projects, activities, settings, systemSettings, notifications, loginLogs, errorLogs, permissions, permissionsPage, theme, online, webhooks, healthMonitor, systemLogs, ai

## 种子数据

启动时自动执行 `SeedAdmin()` (`backend/internal/database/seed.go`)，顺序:
1. 权限 (20 条) → 2. AI 配置 → 3. 系统设置 (24 条, 4 组) → 4. 角色 (3 个) → 5. 管理员账号

### 角色和权限

| 角色 | 权限 |
|------|------|
| admin | `["*"]` |
| editor | user:read, user:update, role:read, project:*, activity:read, error_log:read, upload:create, notification:read |
| viewer | user:read, role:read, project:read, activity:read, error_log:read, notification:read |

默认管理员: `admin` / `admin123`

### 所有权限 (19 条)

user:read/create/update/delete, role:read/create/update/delete, project:read/create/update/delete, activity:read, error_log:read/update, notification:read/create, upload:create, system:settings

### 系统设置组

- general (5): site_name, site_url, logo_url, timezone, language
- email (7): enabled, smtp_host, smtp_port, smtp_user, smtp_password, from_name, from_address
- security (5): max_login_attempts, lockout_duration, session_timeout, password_min_length, mfa_enabled
- storage (8): provider, local_path, s3_endpoint, s3_bucket, s3_access_key, s3_secret_key, s3_region, max_file_size

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/prowl?sslmode=disable` | PostgreSQL 连接串 |
| `REDIS_URL` | `localhost:6379` | Redis 地址 |
| `REDIS_PASSWORD` | (空) | Redis 密码 |
| `LISTEN_ADDR` | `:38080` | 后端监听地址 |
| `JWT_SECRET` | (必填) | JWT 签名密钥 |
| `GIN_MODE` | `debug` | Gin 模式 |
| `UPLOAD_DIR` | `./uploads` | 文件上传目录 |
| `VITE_API_URL` | `http://localhost:38080` | 前端 API 地址 |

## CLI 命令完整列表

二进制: `cli/bin/prowl`

| 命令 | 说明 |
|------|------|
| `prowl version` | 显示版本 |
| `prowl health` | 健康检查 |
| `prowl login` | 登录获取 token |
| `prowl config` | 配置管理 |
| `prowl user` | 用户管理 (list/get/create/update/delete) |
| `prowl role` | 角色管理 |
| `prowl project` | 项目管理 |
| `prowl activity` | 操作日志查询 |
| `prowl error-log` | 错误日志管理 |
| `prowl server` | 服务器管理 |
| `prowl completion` | Shell 自动补全 |

全局 flag: `-o, --output <json|table>`

## 设计系统使用规则

- 所有 UI 组件从 `@yza/ui` 导入
- CSS 变量用 `--yza-*` 命名空间 (来自 `@yza/tokens`)
- 项目自定义样式用 `stc-*` 前缀
- 主题切换通过 `data-theme="dark"` 属性
- 常用组件: Sidebar, TopNav, DashboardShell, Breadcrumb, Tag, Skeleton, DataTable, Dialog, Select

## Docker

| 文件 | 用途 |
|------|------|
| docker-compose.yml | PostgreSQL 16 + Redis 7 |
| docker-compose.dev.yml | 开发: 挂载源码 + debug |
| docker-compose.prod.yml | 生产: 构建镜像 + release |
| docker-compose.monitoring.yml | Prometheus + Grafana |

## 测试

| 层 | 命令 | 说明 |
|----|------|------|
| 后端 | `cd backend && make test` | `-v -race -count=1 ./...` |
| 后端覆盖率 | `cd backend && make test-cover` | 输出 coverage.html |
| 前端 | `pnpm --filter frontend test` | Vitest + jsdom |
| 全部 | `make test` | backend + frontend |

- 后端测试使用 enttest + 内存 SQLite
- 测试工厂: `backend/internal/testutil/factory.go`
