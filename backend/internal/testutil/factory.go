package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"sync/atomic"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/enttest"
	_ "modernc.org/sqlite"
)

var dbCounter atomic.Int64

// NewTestClient creates an in-memory SQLite ent client for testing.
func NewTestClient(t *testing.T) *ent.Client {
	// Each test gets its own database to avoid shared state.
	n := dbCounter.Add(1)
	dsn := fmt.Sprintf("file:test%d?mode=memory&cache=shared&_busy_timeout=5000", n)

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		t.Fatalf("enable foreign keys: %v", err)
	}

	drv := entsql.OpenDB(dialect.SQLite, db)
	client := enttest.NewClient(t, enttest.WithOptions(ent.Driver(drv)))
	t.Cleanup(func() {
		client.Close()
		db.Close()
	})
	return client
}

// SeedTestRole creates a role with given name and permissions.
func SeedTestRole(ctx context.Context, client *ent.Client, name string, permissions []string) *ent.Role {
	role, err := client.Role.Create().
		SetName(name).
		SetDescription("test role").
		SetPermissions(permissions).
		Save(ctx)
	if err != nil {
		panic("SeedTestRole: " + err.Error())
	}
	return role
}

// SeedTestUser creates a user with bcrypt-hashed password (MinCost for speed).
func SeedTestUser(ctx context.Context, client *ent.Client, username, password string, roleID int) *ent.User {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		panic("SeedTestUser hash: " + err.Error())
	}
	user, err := client.User.Create().
		SetUsername(username).
		SetPassword(string(hashed)).
		SetEmail(username + "@test.local").
		SetRoleID(roleID).
		Save(ctx)
	if err != nil {
		panic("SeedTestUser: " + err.Error())
	}
	return user
}

// SeedTestProject creates a project owned by ownerID.
func SeedTestProject(ctx context.Context, client *ent.Client, name string, ownerID int) *ent.Project {
	project, err := client.Project.Create().
		SetName(name).
		SetDescription("test project").
		SetStatus("active").
		SetOwnerID(ownerID).
		Save(ctx)
	if err != nil {
		panic("SeedTestProject: " + err.Error())
	}
	return project
}
