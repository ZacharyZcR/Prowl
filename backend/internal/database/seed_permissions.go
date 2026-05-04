package database

import (
	"context"
	"log"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/permission"
)

type PermDef struct {
	Code        string
	Name        string
	Resource    string
	Action      string
	Category    string
	Description string
}

var AllPermissions = []PermDef{
	// 用户管理
	{"user:read", "查看用户", "user", "read", "用户管理", "查看用户列表和详情"},
	{"user:create", "创建用户", "user", "create", "用户管理", "创建新用户"},
	{"user:update", "更新用户", "user", "update", "用户管理", "修改用户信息"},
	{"user:delete", "删除用户", "user", "delete", "用户管理", "删除用户"},

	// 角色管理
	{"role:read", "查看角色", "role", "read", "角色管理", "查看角色列表和权限"},
	{"role:create", "创建角色", "role", "create", "角色管理", "创建新角色"},
	{"role:update", "更新角色", "role", "update", "角色管理", "修改角色信息和权限"},
	{"role:delete", "删除角色", "role", "delete", "角色管理", "删除角色"},

	// 项目管理
	{"project:read", "查看项目", "project", "read", "项目管理", "查看项目列表和详情"},
	{"project:create", "创建项目", "project", "create", "项目管理", "创建新项目"},
	{"project:update", "更新项目", "project", "update", "项目管理", "修改项目信息"},
	{"project:delete", "删除项目", "project", "delete", "项目管理", "删除项目"},

	// 操作日志
	{"activity:read", "查看日志", "activity", "read", "系统监控", "查看操作日志"},

	// 错误日志
	{"error_log:read", "查看错误", "error_log", "read", "系统监控", "查看错误日志"},
	{"error_log:update", "管理错误", "error_log", "update", "系统监控", "解决/重开错误"},

	// 通知
	{"notification:read", "查看通知", "notification", "read", "通知管理", "查看通知列表"},
	{"notification:create", "创建通知", "notification", "create", "通知管理", "发送通知"},

	// 文件上传
	{"upload:create", "上传文件", "upload", "create", "文件管理", "上传文件"},
	{"upload:read", "查看文件", "upload", "read", "文件管理", "查看全部文件和下载非本人文件"},
	{"upload:delete", "删除文件", "upload", "delete", "文件管理", "删除任意文件"},

	// 系统设置
	{"system:settings", "系统设置", "system", "settings", "系统管理", "查看和修改系统设置"},

	// 定时任务
	{"cron:read", "查看定时任务", "cron", "read", "系统管理", "查看定时任务列表"},
	{"cron:create", "创建定时任务", "cron", "create", "系统管理", "创建定时任务"},
	{"cron:update", "更新定时任务", "cron", "update", "系统管理", "修改定时任务"},
	{"cron:delete", "删除定时任务", "cron", "delete", "系统管理", "删除定时任务"},

	// 公告管理
	{"announcement:read", "查看公告", "announcement", "read", "公告管理", "查看公告列表"},
	{"announcement:create", "创建公告", "announcement", "create", "公告管理", "创建公告"},
	{"announcement:update", "更新公告", "announcement", "update", "公告管理", "修改和发布公告"},
	{"announcement:delete", "删除公告", "announcement", "delete", "公告管理", "删除公告"},

	// 数据字典
	{"dict:read", "查看字典", "dict", "read", "数据字典", "查看数据字典"},
	{"dict:create", "创建字典", "dict", "create", "数据字典", "创建字典项"},
	{"dict:update", "更新字典", "dict", "update", "数据字典", "修改字典项"},
	{"dict:delete", "删除字典", "dict", "delete", "数据字典", "删除字典项"},

	// 题目管理
	{"challenge:read", "查看题目", "challenge", "read", "靶场管理", "查看题目列表和详情"},
	{"challenge:create", "创建题目", "challenge", "create", "靶场管理", "创建新题目"},
	{"challenge:update", "更新题目", "challenge", "update", "靶场管理", "修改题目信息"},
	{"challenge:delete", "删除题目", "challenge", "delete", "靶场管理", "删除题目"},

	// 比赛管理
	{"competition:read", "查看比赛", "competition", "read", "靶场管理", "查看比赛列表和详情"},
	{"competition:create", "创建比赛", "competition", "create", "靶场管理", "创建新比赛"},
	{"competition:update", "更新比赛", "competition", "update", "靶场管理", "修改比赛信息和状态"},
	{"competition:delete", "删除比赛", "competition", "delete", "靶场管理", "删除比赛"},

	// 战队管理
	{"team:read", "查看战队", "team", "read", "靶场管理", "查看战队列表"},
	{"team:update", "更新战队", "team", "update", "靶场管理", "修改战队信息"},
	{"team:delete", "删除战队", "team", "delete", "靶场管理", "删除战队"},

	// 容器管理
	{"container:read", "查看容器", "container", "read", "靶场管理", "查看容器实例"},
	{"container:delete", "删除容器", "container", "delete", "靶场管理", "强制停止容器"},

	// 计分管理
	{"scoreboard:read", "查看计分板", "scoreboard", "read", "靶场管理", "查看计分板"},
	{"scoreboard:manage", "管理计分", "scoreboard", "manage", "靶场管理", "冻结/解冻计分板"},

	// Flag 提交
	{"flag:submit", "提交Flag", "flag", "submit", "参赛操作", "提交Flag答案"},

	// Writeup 管理
	{"writeup:read", "查看Writeup", "writeup", "read", "靶场管理", "查看Writeup列表"},
	{"writeup:update", "审核Writeup", "writeup", "update", "靶场管理", "审核Writeup"},

	// 场景管理
	{"scenario:read", "查看场景", "scenario", "read", "靶场管理", "查看场景模板"},
	{"scenario:create", "创建场景", "scenario", "create", "靶场管理", "创建场景模板"},
	{"scenario:update", "更新场景", "scenario", "update", "靶场管理", "修改场景模板"},
	{"scenario:delete", "删除场景", "scenario", "delete", "靶场管理", "删除场景模板"},
}

func SeedPermissions(ctx context.Context, client *ent.Client) error {
	for _, p := range AllPermissions {
		exists, _ := client.Permission.Query().Where(permission.Code(p.Code)).Exist(ctx)
		if exists {
			continue
		}
		_, err := client.Permission.Create().
			SetCode(p.Code).
			SetName(p.Name).
			SetResource(p.Resource).
			SetAction(p.Action).
			SetCategory(p.Category).
			SetDescription(p.Description).
			Save(ctx)
		if err != nil {
			return err
		}
	}
	log.Printf("seed: %d permissions synced", len(AllPermissions))
	return nil
}
