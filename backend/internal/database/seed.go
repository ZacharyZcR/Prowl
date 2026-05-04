package database

import (
	"context"
	"log"
	"slices"
	"sort"

	"golang.org/x/crypto/bcrypt"

	"github.com/ZacharyZcR/STC/backend/ent"
	entRole "github.com/ZacharyZcR/STC/backend/ent/role"
	"github.com/ZacharyZcR/STC/backend/ent/user"
)

func SeedAdmin(ctx context.Context, client *ent.Client) error {
	// Seed permissions first
	if err := SeedPermissions(ctx, client); err != nil {
		return err
	}

	// Seed default AI config
	if err := seedAIConfig(ctx, client); err != nil {
		return err
	}

	// Seed system settings
	if err := SeedSettings(ctx, client); err != nil {
		return err
	}

	// Seed dicts
	if err := SeedDicts(ctx, client); err != nil {
		return err
	}

	// Seed roles
	adminRole, err := seedRole(ctx, client, "admin", "系统管理员", []string{"*"})
	if err != nil {
		return err
	}

	_, err = seedRole(ctx, client, "editor", "编辑者", []string{
		"user:read", "user:update", "role:read",
		"project:read", "project:create", "project:update", "project:delete",
		"activity:read", "error_log:read", "upload:create", "upload:read", "upload:delete",
		"notification:read",
	})
	if err != nil {
		return err
	}

	_, err = seedRole(ctx, client, "viewer", "查看者", []string{
		"user:read", "role:read", "project:read",
		"activity:read", "error_log:read", "notification:read",
	})
	if err != nil {
		return err
	}

	_, err = seedRole(ctx, client, "participant", "参赛者", []string{
		"flag:submit", "scoreboard:read", "notification:read",
	})
	if err != nil {
		return err
	}

	_, err = seedRole(ctx, client, "judge", "裁判", []string{
		"competition:read", "challenge:read", "team:read",
		"scoreboard:read", "scoreboard:manage",
		"writeup:read", "writeup:update",
		"container:read", "notification:read",
	})
	if err != nil {
		return err
	}

	// Seed admin user
	exists, err := client.User.Query().Where(user.Username("admin")).Exist(ctx)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = client.User.Create().
		SetUsername("admin").
		SetPassword(string(hashed)).
		SetEmail("admin@prowl.local").
		SetNickname("Admin").
		SetRole(adminRole).
		Save(ctx)
	if err != nil {
		return err
	}

	log.Println("seed: admin user created (admin / admin123)")

	if err := SeedDemo(ctx, client); err != nil {
		log.Printf("seed demo failed: %v (continuing)", err)
	}

	return nil
}

func seedRole(ctx context.Context, client *ent.Client, name, description string, permissions []string) (*ent.Role, error) {
	r, err := client.Role.Query().Where(entRole.Name(name)).Only(ctx)
	if err == nil {
		if r.Description == description && samePermissions(r.Permissions, permissions) {
			return r, nil
		}

		r, err = client.Role.UpdateOne(r).
			SetDescription(description).
			SetPermissions(permissions).
			Save(ctx)
		if err != nil {
			return nil, err
		}
		log.Printf("seed: role '%s' synced", name)
		return r, nil
	}

	r, err = client.Role.Create().
		SetName(name).
		SetDescription(description).
		SetPermissions(permissions).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	log.Printf("seed: role '%s' created", name)
	return r, nil
}

func samePermissions(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}

	leftCopy := slices.Clone(left)
	rightCopy := slices.Clone(right)
	sort.Strings(leftCopy)
	sort.Strings(rightCopy)
	return slices.Equal(leftCopy, rightCopy)
}

func seedAIConfig(ctx context.Context, client *ent.Client) error {
	count, err := client.AiConfig.Query().Count(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	_, err = client.AiConfig.Create().
		SetProvider("openai").
		SetAPIBase("https://api.openai.com/v1").
		SetModel("gpt-4o").
		SetMaxTokens(4096).
		SetTemperature(0.7).
		SetSystemPrompt("You are a helpful assistant.").
		Save(ctx)
	if err != nil {
		return err
	}
	log.Println("seed: default AI config created")
	return nil
}
