# 编码规范

## Go 代码风格

### 文件命名

- snake_case: `user_service.go`, `auth_handler.go`
- 测试文件: `user_service_test.go`

### 命名

- 导出类型: PascalCase — `UserService`, `CreateUserRequest`
- 方法: PascalCase — `func (s *UserService) GetByID(ctx context.Context, id int) (*ent.User, error)`
- 变量: camelCase — `userService`, `authHandler`
- 常量: PascalCase 或 ALL_CAPS — `DefaultPageSize`
- 包名: 小写单词 — `models`, `services`, `handlers`

### 代码组织

```
internal/
  handlers/   — HTTP 层，只做请求解析和响应格式化
  services/   — 业务逻辑层，操作 Ent Client
  models/     — 请求/响应 struct，不含逻辑
  middleware/ — Gin 中间件
  server/     — WebSocket/SSE 服务
  database/   — DB 初始化和 seed
  testutil/   — 测试工具
pkg/
  config/     — 配置读取
  errors/     — 错误类型
  logger/     — 日志
  metrics/    — 指标
  response/   — 统一响应
  validator/  — 校验
```

### 错误处理

- 使用 `pkg/errors` 定义的错误类型
- Handler 层统一用 `pkg/response` 返回
- Service 层返回 error，不直接操作 HTTP 响应

### 测试

- 使用 enttest + 内存 SQLite
- 测试数据用 `testutil/factory.go`
- 命令: `go test -v -race -count=1 ./...`

## TypeScript 代码风格

### 文件命名

- 组件: PascalCase — `Users.tsx`, `ProjectDetail.tsx`
- hooks: camelCase 前缀 use — `useUsers.ts`, `usePermission.ts`
- stores: camelCase — `auth.ts`, `notification.ts`
- 类型: `index.ts` (集中定义)
- 测试: `*.test.ts(x)` — `useDebounce.test.ts`

### 命名

- 组件: PascalCase — `export default function Users() {}`
- hooks: camelCase — `export function useUsers()`
- 变量/函数: camelCase — `const isAuthenticated`, `function handleSubmit()`
- 类型/接口: PascalCase — `interface UserResponse {}`
- 常量: UPPER_SNAKE_CASE 或 camelCase

### 路径别名

`@/` 映射到 `frontend/src/`，所有内部导入用 `@/` 前缀:

```typescript
import { useAuthStore } from "@/stores/auth";
import { useUsers } from "@/hooks/useUsers";
import type { User } from "@/types";
```

### 组件结构

```tsx
// 1. 外部库导入
import { useState } from "react";
import { Button, Modal } from "@yza/ui";

// 2. 内部导入
import { PageShell } from "@/components/PageShell";
import { useUsers } from "@/hooks/useUsers";

// 3. 类型 (如需要)
interface Props { ... }

// 4. 组件
export default function Users() {
  // hooks
  // state
  // handlers
  // render
}
```

### 状态管理

- 全局状态: Zustand (stores/)
- 服务端状态: TanStack Query (hooks/)
- 局部状态: useState/useReducer

## CSS 命名

- 设计系统: `--yza-*` 变量，`yza-*` class
- 项目自定义: `stc-*` 前缀
- 不直接修改 `@yza/ui` 组件样式，通过 CSS 变量覆盖

```css
/* 正确 */
.stc-dashboard-card { ... }

/* 错误 */
.dashboard-card { ... }  /* 缺少前缀 */
.yza-button { ... }      /* 不要覆盖设计系统 class */
```

## Git 规范

### 分支策略

- `main`: 主分支，保持可发布状态
- `feat/xxx`: 功能分支
- `fix/xxx`: 修复分支
- `release/x.y.z`: 发布分支

### Commit Message

格式: `type(scope): description`

Type (必选):
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式 (不影响代码逻辑)
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具
- `revert`: 回滚
- `ci`: CI 配置

Scope (可选):
- `backend`, `frontend`, `cli`, `desktop`, `design`, `docker`, `proto`, `deps`

示例:
```
feat(backend): add tag CRUD endpoints
fix(frontend): fix login redirect loop
docs: update API documentation
refactor(backend): extract pagination logic to shared util
test(backend): add project service tests
chore(deps): upgrade tanstack query to v5
```

校验: commitlint + husky 自动检查，配置在 `commitlint.config.js`

### PR 规范

- 标题简洁，描述变更内容
- 包含变更类型、测试说明
- 模板: `.github/PULL_REQUEST_TEMPLATE.md`

## Ent Schema 规范

```go
func (Xxx) Fields() []ent.Field {
    return []ent.Field{
        // 字段按逻辑分组
        // 必填字段在前
        // 可选字段在后
        // 时间字段最后
        field.String("name").NotEmpty(),
        field.String("description").Optional(),
        field.Time("created_at").Default(time.Now).Immutable(),
        field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
    }
}
```

修改 schema 后必须运行: `cd backend && go generate ./ent`

## 请求/响应模型规范

```go
// 创建请求 — 必填字段用值类型 + binding:"required"
type CreateXxxRequest struct {
    Name string `json:"name" binding:"required,min=1,max=128"`
}

// 更新请求 — 全部可选，用指针类型
type UpdateXxxRequest struct {
    Name *string `json:"name" binding:"omitempty,min=1,max=128"`
}

// 响应 — 值类型，字段名与前端对齐
type XxxResponse struct {
    ID        int    `json:"id"`
    Name      string `json:"name"`
    CreatedAt string `json:"created_at"`
}

// 查询参数 — 用 form tag
type XxxListQuery struct {
    Page     int    `form:"page,default=1"`
    PageSize int    `form:"page_size,default=20"`
    Search   string `form:"search"`
}
```
