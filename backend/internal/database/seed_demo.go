package database

import (
	"context"
	"log"

	"golang.org/x/crypto/bcrypt"

	"github.com/ZacharyZcR/STC/backend/ent"
	entRole "github.com/ZacharyZcR/STC/backend/ent/role"
	"github.com/ZacharyZcR/STC/backend/ent/user"
)

func SeedDemo(ctx context.Context, client *ent.Client) error {
	count, err := client.User.Query().Count(ctx)
	if err != nil {
		return err
	}
	if count > 1 {
		return nil
	}

	// 获取角色
	editorRole, err := client.Role.Query().Where(entRole.Name("editor")).Only(ctx)
	if err != nil {
		return err
	}
	viewerRole, err := client.Role.Query().Where(entRole.Name("viewer")).Only(ctx)
	if err != nil {
		return err
	}

	// 获取 admin 用户
	admin, err := client.User.Query().Where(user.Username("admin")).Only(ctx)
	if err != nil {
		return err
	}

	// 创建 demo 用户
	editorPwd, err := bcrypt.GenerateFromPassword([]byte("editor123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	viewerPwd, err := bcrypt.GenerateFromPassword([]byte("viewer123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = client.User.Create().
		SetUsername("editor").
		SetPassword(string(editorPwd)).
		SetEmail("editor@stc.local").
		SetNickname("Editor").
		SetRole(editorRole).
		Save(ctx)
	if err != nil {
		return err
	}

	_, err = client.User.Create().
		SetUsername("viewer").
		SetPassword(string(viewerPwd)).
		SetEmail("viewer@stc.local").
		SetNickname("Viewer").
		SetRole(viewerRole).
		Save(ctx)
	if err != nil {
		return err
	}

	// 创建 demo 项目
	projects := []struct {
		name, desc, status string
	}{
		{"Website Redesign", "公司官网重构项目", "active"},
		{"API Gateway", "微服务 API 网关", "active"},
		{"Design System", "统一设计系统建设", "draft"},
		{"Legacy Migration", "旧系统迁移", "archived"},
	}
	for _, p := range projects {
		_, err = client.Project.Create().
			SetName(p.name).
			SetDescription(p.desc).
			SetStatus(p.status).
			SetOwnerID(admin.ID).
			Save(ctx)
		if err != nil {
			return err
		}
	}

	// 创建 demo 通知
	notifications := []struct {
		title, content, typ string
	}{
		{"欢迎使用 Prowl Range", "这是您的第一条通知", "info"},
		{"系统更新", "Prowl Range v0.1.0 已发布", "success"},
		{"安全提醒", "请及时修改默认密码", "warning"},
	}
	for _, n := range notifications {
		_, err = client.Notification.Create().
			SetTitle(n.title).
			SetContent(n.content).
			SetType(n.typ).
			SetUserID(admin.ID).
			Save(ctx)
		if err != nil {
			return err
		}
	}

	// 记录 activity
	_, err = client.Activity.Create().
		SetAction("system.seed").
		SetResourceType("system").
		SetResourceID(0).
		SetUserID(admin.ID).
		SetUsername("admin").
		SetDetail("Demo data seeded").
		Save(ctx)
	if err != nil {
		return err
	}

	log.Println("seed: demo data created")
	return nil
}
