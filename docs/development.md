# 开发指南

## 环境要求

- Go 1.25+
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- (可选) golangci-lint
- (可选) Rust + Cargo (桌面端开发)

## 环境搭建

```bash
# 1. 克隆仓库
git clone https://github.com/anthropic/stc.git
cd stc

# 2. 安装前端依赖
pnpm install

# 3. 安装后端依赖
cd backend && go mod download && cd ..
cd cli && go mod download && cd ..

# 4. 启动基础设施 (PostgreSQL + Redis)
make dev

# 5. 启动后端 (编译 + 运行)
cd backend && make run
# 后端启动在 :8080, 自动建表 + seed 数据

# 6. 启动前端 (另一个终端)
pnpm --filter frontend dev
# 前端启动在 :5173

# 7. 访问
# 前端: http://localhost:35173
# 后端 API: http://localhost:38080/api/v1
# 登录: admin / admin123
```

## 常用命令速查

### 根目录

| 命令 | 说明 |
|------|------|
| `make dev` | 启动 PostgreSQL + Redis |
| `make stop` | 停止基础设施 |
| `make build` | 编译全部 (backend + cli + frontend) |
| `make test` | 运行全部测试 |
| `make lint` | 运行全部 lint |
| `make clean` | 清理构建产物 |
| `make docker-dev` | 完整 Docker 开发栈 |
| `make docker-prod` | 生产 Docker 栈 |
| `make db-shell` | PostgreSQL 交互终端 |
| `make redis-shell` | Redis CLI |

### 后端 (backend/)

| 命令 | 说明 |
|------|------|
| `make run` | 编译并运行 |
| `make build` | 编译到 bin/server |
| `make test` | 运行测试 (-race) |
| `make test-cover` | 测试覆盖率报告 |
| `make lint` | golangci-lint |
| `make fmt` | go fmt |
| `make swagger` | 生成 Swagger 文档 |
| `make ent-generate` | 重新生成 Ent 代码 |
| `make deps` | go mod tidy + download |

### 前端

| 命令 | 说明 |
|------|------|
| `pnpm --filter frontend dev` | 开发服务器 :5173 |
| `pnpm --filter frontend build` | 生产构建 |
| `pnpm --filter frontend test` | 运行测试 |
| `pnpm --filter frontend lint` | ESLint |

### CLI (cli/)

| 命令 | 说明 |
|------|------|
| `make build` | 编译到 bin/ |

### 桌面端

| 命令 | 说明 |
|------|------|
| `pnpm --filter desktop dev` | 开发模式 |
| `pnpm --filter desktop build` | 打包 |

## 调试

### 后端调试

```bash
# 设置 debug 模式 (默认)
export GIN_MODE=debug

# 查看详细日志 (zap logger)
cd backend && make run

# 使用 dlv 调试
cd backend && dlv debug ./cmd/server
```

### 前端调试

```bash
# Vite 开发服务器自带 HMR
pnpm --filter frontend dev

# 指定后端地址
VITE_API_URL=http://other-host:8080 pnpm --filter frontend dev
```

### 数据库调试

```bash
# 进入 psql
make db-shell
# 等价于: docker compose exec postgres psql -U stc -d stc

# 查看表
\dt

# 查看用户
SELECT * FROM users;

# Redis
make redis-shell
KEYS *
```

## 如何添加新 API 端点

以添加 "标签 (Tag)" 模块为例:

### 1. 定义 Ent Schema

创建 `backend/ent/schema/tag.go`:
```go
package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema/field"
)

type Tag struct {
    ent.Schema
}

func (Tag) Fields() []ent.Field {
    return []ent.Field{
        field.String("name").Unique().NotEmpty(),
        field.String("color").Optional(),
        field.Time("created_at").Default(time.Now),
    }
}
```

### 2. 生成 ORM 代码

```bash
cd backend && go generate ./ent
```

### 3. 定义请求/响应模型

创建 `backend/internal/models/tag.go`:
```go
package models

type TagResponse struct {
    ID        int    `json:"id"`
    Name      string `json:"name"`
    Color     string `json:"color"`
    CreatedAt string `json:"created_at"`
}

type CreateTagRequest struct {
    Name  string `json:"name" binding:"required,min=1,max=32"`
    Color string `json:"color"`
}

type UpdateTagRequest struct {
    Name  *string `json:"name" binding:"omitempty,min=1,max=32"`
    Color *string `json:"color"`
}
```

### 4. 实现 Service

创建 `backend/internal/services/tag_service.go`:
```go
package services

type TagService struct {
    client *ent.Client
}

func NewTagService(client *ent.Client) *TagService {
    return &TagService{client: client}
}

// 实现 List, GetByID, Create, Update, Delete 方法
```

### 5. 实现 Handler

创建 `backend/internal/handlers/tag_handler.go`:
```go
package handlers

type TagHandler struct {
    service *services.TagService
}

func NewTagHandler(service *services.TagService) *TagHandler {
    return &TagHandler{service: service}
}

// 实现 List, GetByID, Create, Update, Delete 方法
```

### 6. 注册路由

编辑 `backend/internal/handlers/router.go`:
```go
tagService := services.NewTagService(client)
tagHandler := NewTagHandler(tagService)

tags := authed.Group("/tags")
{
    tags.GET("", middleware.RequirePermission("tag:read"), tagHandler.List)
    tags.GET("/:id", middleware.RequirePermission("tag:read"), tagHandler.GetByID)
    tags.POST("", middleware.RequirePermission("tag:create"), tagHandler.Create)
    tags.PUT("/:id", middleware.RequirePermission("tag:update"), tagHandler.Update)
    tags.DELETE("/:id", middleware.RequirePermission("tag:delete"), tagHandler.Delete)
}
```

### 7. 前端类型

编辑 `frontend/src/types/index.ts`:
```typescript
export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}
```

### 8. TanStack Query Hook

创建 `frontend/src/hooks/useTags.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// 实现 useTags, useTag, useCreateTag, useUpdateTag, useDeleteTag
```

### 9. 页面组件

创建 `frontend/src/pages/Tags.tsx`

### 10. 添加前端路由

编辑 `frontend/src/router/index.tsx`:
```tsx
const Tags = lazy(() => import("@/pages/Tags"));
// 在 children 数组中添加
{
  path: "tags",
  element: (
    <SuspenseWrapper>
      <PermissionGuard permission="tag:read">
        <Tags />
      </PermissionGuard>
    </SuspenseWrapper>
  ),
},
```

### 11. 添加菜单项

编辑 `frontend/src/components/Layout.tsx`，在菜单配置中添加 Tags 项。

## 如何添加新前端页面

不涉及后端的纯前端页面:

1. `frontend/src/pages/NewPage.tsx` — 创建页面组件
2. `frontend/src/router/index.tsx` — 添加路由 (lazy import + Guard)
3. `frontend/src/components/Layout.tsx` — 添加菜单项 (如需要)

页面模板:
```tsx
import { PageShell } from "@/components/PageShell";

export default function NewPage() {
  return (
    <PageShell title="页面标题">
      {/* 内容 */}
    </PageShell>
  );
}
```
