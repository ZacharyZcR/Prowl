# 架构文档

## 系统总览

Prowl Range 是全栈 monorepo，分为 5 个主要子系统:

```
┌─────────────┐     ┌─────────────┐     ┌────────────┐
│  Frontend    │────→│  Backend    │────→│ PostgreSQL │
│  React SPA   │     │  Go/Gin     │────→│ Redis      │
└─────────────┘     └─────────────┘     └────────────┘
       ↑                   ↑
┌─────────────┐     ┌─────────────┐
│  Desktop     │     │  CLI        │
│  Tauri v2    │     │  Cobra      │
└─────────────┘     └─────────────┘
       ↑
┌─────────────┐
│ Design System│
│ @yza/ui+tokens│
└─────────────┘
```

## 数据流

### 认证流程

```
1. POST /api/v1/auth/login {username, password}
2. AuthService.Login → bcrypt.CompareHashAndPassword → 生成 JWT (含 user_id, username, role)
3. 返回 {token, user}
4. 前端 authStore 保存 token
5. 后续请求 Authorization: Bearer <token>
6. JWTAuth middleware 解析 token → 注入 user_id/username/role 到 gin.Context
7. RequirePermission middleware 检查 role.permissions 是否匹配
```

### 请求处理流程

```
HTTP Request
  → gin.Engine
    → CORS middleware
    → Logger middleware (zap)
    → Recovery middleware
    → Metrics middleware (Prometheus counter + histogram)
    → Route match
      → [JWTAuth middleware] (认证路由)
      → [RequirePermission middleware] (RBAC 路由)
      → Handler
        → 解析请求 (ShouldBindJSON / ShouldBindQuery)
        → 调用 Service
          → Ent Client 操作数据库
          → [ActivityService 记录审计日志]
          → [NotificationService 推送通知 → Hub/SSEBroker]
        → pkg/response 统一格式返回
```

### 实时通信流程

```
WebSocket:
  1. GET /api/v1/ws?token=<jwt> → wsHandler.Handle
  2. AuthService 验证 token
  3. 升级为 WebSocket 连接
  4. 注册到 Hub
  5. Hub.broadcast / Hub.sendToUser 推送消息
  6. 前端 useWebSocket hook 接收

SSE:
  1. GET /api/v1/sse?token=<jwt> → sseHandler.Handle
  2. AuthService 验证 token
  3. 注册到 SSEBroker
  4. SSEBroker.Send 推送事件
  5. 前端 useSSE hook 接收
```

## 模块职责边界

### backend/cmd/server

- 唯一入口 `main.go`
- 职责: 初始化全部依赖 → 启动 HTTP server → 优雅关闭
- 不含业务逻辑

### backend/internal/handlers

- 一个资源一个 handler 文件
- `router.go`: 路由注册，Service 实例化，中间件配置
- 职责: HTTP 请求解析 → 调用 Service → 格式化响应
- 不含数据库操作

### backend/internal/services

- 一个资源一个 service 文件
- 职责: 业务逻辑、数据校验、Ent Client 操作
- 依赖: `*ent.Client`, 其他 Service
- `auth_service.go`: JWT 签发/验证, 密码校验
- `notification_service.go`: 依赖 Hub + SSEBroker 推送实时通知

### backend/internal/middleware

- `auth.go`: JWT 解析，从 Header 提取 token，验证后注入 context
- `rbac.go`: 从 context 获取 user role，检查 permissions 是否包含目标权限
- `cors.go`: CORS 配置
- `logger.go`: zap 请求日志

### backend/internal/models

- 纯数据 struct，无逻辑
- 请求模型 (`*Request`): 带 `binding` tag 用于 Gin 校验
- 响应模型 (`*Response`): 序列化给前端的 JSON 结构
- 查询模型 (`*Query`): 分页/搜索/过滤参数

### backend/internal/server

- `hub.go`: WebSocket Hub — 管理连接、广播、定向发送
- `sse.go`: SSE Broker — 管理 SSE 连接、推送事件

### backend/internal/database

- `init.go`/`db.go`: PostgreSQL + Redis 连接初始化
- `seed.go`: 种子数据 (admin 用户 + 三个角色)

### backend/pkg

- `config/`: 环境变量读取，Config struct
- `errors/`: 自定义错误类型
- `logger/`: zap logger 初始化
- `metrics/`: Prometheus 指标 (请求计数、延迟直方图)
- `response/`: 统一 JSON 响应格式
- `validator/`: 自定义校验规则

### frontend/src/stores

- `auth.ts`: token 存储、登录/登出、isAuthenticated 状态
- `app.ts`: 侧边栏折叠、主题切换
- `notification.ts`: 通知列表、未读数
- `online.ts`: 在线用户列表

### frontend/src/hooks

- `useUsers.ts`, `useRoles.ts`, `useProjects.ts`, `useActivities.ts`, `useNotifications.ts`: TanStack Query CRUD hooks
- `useWebSocket.ts`, `useSSE.ts`: 实时通信
- `usePermission.ts`: RBAC 权限检查 (`can("user:read")`)
- `useTheme.ts`: 主题切换
- `useDataTable.ts`, `usePagination.ts`, `useDebounce.ts`: 通用工具

### frontend/src/components

- `Layout.tsx`: 侧边栏 + 顶栏 + 内容区，菜单项在此定义
- `RealtimeProvider.tsx`: 包装 WebSocket + SSE 连接
- `NotificationCenter.tsx`: 通知中心 UI
- `OnlineIndicator.tsx`: 在线状态
- `ErrorBoundary.tsx`: 错误边界
- `PageShell.tsx`: 页面骨架
- `ui/`: 基于 @yza/ui 的项目级封装

### design-system

- `packages/tokens/`: CSS 变量定义 (`--yza-color-*`, `--yza-spacing-*`, etc.)
- `packages/ui/`: 62 个 React 组件 (Button, Input, Modal, Table, etc.)

### cli

- Cobra 命令行工具
- `cmd/`: 子命令定义
- `internal/`: CLI 业务逻辑

### desktop

- Tauri v2: Rust 后端 (`src-tauri/`) + React 前端 (`src/`)
- 复用前端组件

## 依赖关系图

```
frontend ──→ @yza/ui ──→ @yza/tokens
desktop  ──→ @yza/ui ──→ @yza/tokens
frontend ──→ backend (HTTP API + WebSocket + SSE)
cli      ──→ backend (HTTP API)
backend  ──→ PostgreSQL
backend  ──→ Redis
```

## 数据库连接

- PostgreSQL: Ent ORM auto-migration (启动时自动建表)
- Redis: go-redis v9，用于缓存/会话
- Docker network: `stc-network`，服务间通过容器名连接

## 安全模型

- 认证: JWT (HS256), 过期时间可配置
- 密码: bcrypt hash
- RBAC: 基于角色的权限控制，权限格式 `resource:action`，支持通配符
- CORS: 中间件统一处理
- 敏感字段: User.password 标记为 `sensitive`，Ent 查询默认排除
