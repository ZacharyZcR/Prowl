# API 参考

Base URL: `http://localhost:38080/api/v1`

认证方式: `Authorization: Bearer <token>`

统一响应格式:
```json
// 成功
{"code": 200, "data": {...}, "message": "success"}

// 分页
{"code": 200, "data": {"items": [...], "total": 100, "page": 1, "page_size": 20, "total_pages": 5}}

// 错误
{"code": 400, "message": "error description"}
```

---

## 健康检查

### GET /health

```bash
curl http://localhost:38080/api/v1/health
```

### GET /health/deep

检查 PostgreSQL + Redis 连接。

```bash
curl http://localhost:38080/api/v1/health/deep
```

---

## 认证

### POST /auth/login

请求:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

响应:
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@stc.local",
      "nickname": "Admin",
      "role": {
        "id": 1,
        "name": "admin",
        "description": "系统管理员",
        "permissions": ["*"],
        "user_count": 1,
        "created_at": "2025-01-01T00:00:00Z"
      },
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

```bash
curl -X POST http://localhost:38080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### POST /auth/logout

```bash
curl -X POST http://localhost:38080/api/v1/auth/logout \
  -H "Authorization: Bearer <token>"
```

---

## 用户

### GET /users/me

认证: 需要。RBAC: 无。

```bash
curl http://localhost:38080/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

响应: `UserResponse`

### PUT /users/me/password

认证: 需要。RBAC: 无。

请求:
```json
{
  "old_password": "admin123",
  "new_password": "newpass123"
}
```

```bash
curl -X PUT http://localhost:38080/api/v1/users/me/password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"admin123","new_password":"newpass123"}'
```

---

## 题目网络拓扑

`POST /challenges` 和 `PUT /challenges/:id` 支持 `network_topology`。动态题启动实例时，如果该字段存在，会按拓扑创建多容器 stack；没有该字段时仍走单容器路径。

```json
{
  "network_topology": {
    "services": [
      {
        "name": "web",
        "image": "challenge-web:latest",
        "networks": ["dmz"],
        "ports": ["80"],
        "env": { "FLAG": "{{FLAG}}" },
        "expose_to_player": true
      },
      {
        "name": "jump",
        "image": "jumpbox:latest",
        "networks": ["dmz", "internal"]
      },
      {
        "name": "db",
        "image": "mysql:8",
        "networks": ["internal"]
      }
    ],
    "networks": [
      { "name": "dmz", "subnet": "10.10.1.0/24", "exposed": true },
      { "name": "internal", "subnet": "10.10.2.0/24", "internal": true }
    ],
    "entry_service": "web"
  }
}
```

校验规则: service/network 名称必须唯一；service 必须引用已声明网络；`internal` 和 `exposed` 不能同时设置；`entry_service` 必须引用已声明 service，必须设置 `expose_to_player: true`，并且至少连接一个 `exposed` 网络。只有 `entry_service` 允许 `expose_to_player`，运行时也只映射入口服务端口到宿主机；其他服务只在声明的 Docker 网络内互通。

### GET /users

认证: 需要。RBAC: `user:read`。

查询参数: `page` (默认1), `page_size` (默认20), `search`

```bash
curl "http://localhost:38080/api/v1/users?page=1&page_size=10&search=admin" \
  -H "Authorization: Bearer <token>"
```

响应: `PaginatedResponse<UserResponse>`

### GET /users/:id

认证: 需要。RBAC: `user:read`。

```bash
curl http://localhost:38080/api/v1/users/1 \
  -H "Authorization: Bearer <token>"
```

### POST /users

认证: 需要。RBAC: `user:create`。

请求:
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "nickname": "New User",
  "role_id": 2
}
```

校验: username 3-32字符, password 最少6字符, email 可选, role_id 必填

```bash
curl -X POST http://localhost:38080/api/v1/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123","email":"user@example.com","nickname":"New User","role_id":2}'
```

### PUT /users/:id

认证: 需要。RBAC: `user:update`。

请求 (全部可选):
```json
{
  "email": "new@example.com",
  "nickname": "Updated Name",
  "role_id": 3
}
```

```bash
curl -X PUT http://localhost:38080/api/v1/users/2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"Updated Name"}'
```

### DELETE /users/:id

认证: 需要。RBAC: `user:delete`。

```bash
curl -X DELETE http://localhost:38080/api/v1/users/2 \
  -H "Authorization: Bearer <token>"
```

---

## 角色

### GET /roles

认证: 需要。RBAC: `role:read`。

查询参数: `page`, `page_size`, `search`

```bash
curl "http://localhost:38080/api/v1/roles" \
  -H "Authorization: Bearer <token>"
```

响应: `PaginatedResponse<RoleResponse>`

RoleResponse:
```json
{
  "id": 1,
  "name": "admin",
  "description": "系统管理员",
  "permissions": ["*"],
  "user_count": 1,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### GET /roles/:id

认证: 需要。RBAC: `role:read`。

```bash
curl http://localhost:38080/api/v1/roles/1 \
  -H "Authorization: Bearer <token>"
```

### POST /roles

认证: 需要。RBAC: `role:create`。

请求:
```json
{
  "name": "moderator",
  "description": "版主",
  "permissions": ["user:read", "project:read", "project:update"]
}
```

校验: name 2-32字符, permissions 必填

```bash
curl -X POST http://localhost:38080/api/v1/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"moderator","description":"版主","permissions":["user:read","project:read","project:update"]}'
```

### PUT /roles/:id

认证: 需要。RBAC: `role:update`。

请求 (全部可选):
```json
{
  "name": "new-name",
  "description": "new desc",
  "permissions": ["user:read"]
}
```

```bash
curl -X PUT http://localhost:38080/api/v1/roles/2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"description":"updated description"}'
```

### DELETE /roles/:id

认证: 需要。RBAC: `role:delete`。

```bash
curl -X DELETE http://localhost:38080/api/v1/roles/3 \
  -H "Authorization: Bearer <token>"
```

---

## 项目

### GET /projects

认证: 需要。RBAC: `project:read`。

查询参数: `page`, `page_size`, `search`, `status` (active|archived|draft)

```bash
curl "http://localhost:38080/api/v1/projects?status=active&page=1" \
  -H "Authorization: Bearer <token>"
```

响应: `PaginatedResponse<ProjectResponse>`

ProjectResponse:
```json
{
  "id": 1,
  "name": "My Project",
  "description": "A project",
  "status": "active",
  "owner_id": 1,
  "owner_name": "admin",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### GET /projects/:id

认证: 需要。RBAC: `project:read`。

```bash
curl http://localhost:38080/api/v1/projects/1 \
  -H "Authorization: Bearer <token>"
```

### POST /projects

认证: 需要。RBAC: `project:create`。

请求:
```json
{
  "name": "New Project",
  "description": "Project description",
  "status": "active"
}
```

校验: name 1-128字符, status 可选 (active|archived|draft)

```bash
curl -X POST http://localhost:38080/api/v1/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Project","description":"desc","status":"active"}'
```

### PUT /projects/:id

认证: 需要。RBAC: `project:update`。

请求 (全部可选):
```json
{
  "name": "Updated Name",
  "description": "Updated desc",
  "status": "archived"
}
```

```bash
curl -X PUT http://localhost:38080/api/v1/projects/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"archived"}'
```

### DELETE /projects/:id

认证: 需要。RBAC: `project:delete`。

```bash
curl -X DELETE http://localhost:38080/api/v1/projects/1 \
  -H "Authorization: Bearer <token>"
```

---

## 活动日志

### GET /activities

认证: 需要。RBAC: `activity:read`。

查询参数: `page`, `page_size`, `resource_type`, `user_id`, `action`

```bash
curl "http://localhost:38080/api/v1/activities?resource_type=project&action=create" \
  -H "Authorization: Bearer <token>"
```

响应: `PaginatedResponse<ActivityResponse>`

ActivityResponse:
```json
{
  "id": 1,
  "action": "create",
  "resource_type": "project",
  "resource_id": 1,
  "user_id": 1,
  "username": "admin",
  "detail": "created project 'My Project'",
  "ip": "127.0.0.1",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

## 通知

### GET /notifications

认证: 需要。RBAC: 无 (返回当前用户的通知)。

查询参数: `page`, `page_size`

```bash
curl "http://localhost:38080/api/v1/notifications?page=1" \
  -H "Authorization: Bearer <token>"
```

### GET /notifications/unread-count

认证: 需要。

```bash
curl http://localhost:38080/api/v1/notifications/unread-count \
  -H "Authorization: Bearer <token>"
```

### PUT /notifications/:id/read

认证: 需要。

```bash
curl -X PUT http://localhost:38080/api/v1/notifications/1/read \
  -H "Authorization: Bearer <token>"
```

### PUT /notifications/read-all

认证: 需要。

```bash
curl -X PUT http://localhost:38080/api/v1/notifications/read-all \
  -H "Authorization: Bearer <token>"
```

### POST /notifications

认证: 需要。RBAC: `notification:create`。

请求:
```json
{
  "user_id": 2,
  "title": "系统通知",
  "content": "你的项目已被审批",
  "type": "success"
}
```

校验: user_id 必填, title 必填, type 可选 (info|success|warning|error)

```bash
curl -X POST http://localhost:38080/api/v1/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":2,"title":"系统通知","content":"你的项目已被审批","type":"success"}'
```

---

## 文件上传

### POST /upload

认证: 需要。RBAC: 无。

Content-Type: `multipart/form-data`

```bash
curl -X POST http://localhost:38080/api/v1/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/file.png"
```

上传目录: `./uploads/`，静态文件通过 `/uploads/filename` 访问。

---

## 实时通信

### WebSocket: GET /ws?token=\<jwt\>

连接后自动注册到 Hub，可接收广播和定向消息。

```javascript
const ws = new WebSocket(`ws://localhost:38080/api/v1/ws?token=${token}`);
ws.onmessage = (event) => { console.log(JSON.parse(event.data)); };
```

### SSE: GET /sse?token=\<jwt\>

```javascript
const es = new EventSource(`http://localhost:38080/api/v1/sse?token=${token}`);
es.onmessage = (event) => { console.log(JSON.parse(event.data)); };
```

### GET /ws/online

无需认证，返回当前在线用户列表。

```bash
curl http://localhost:38080/api/v1/ws/online
```

---

## Metrics

### GET /metrics

Prometheus 格式。无需认证。

```bash
curl http://localhost:38080/metrics
```

## Swagger

### GET /swagger/index.html

Swagger UI，无需认证。

```bash
# 生成 swagger 文档
cd backend && make swagger

# 访问
open http://localhost:38080/api/v1/swagger/index.html
```
