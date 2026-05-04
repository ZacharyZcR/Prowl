package database

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/ZacharyZcR/STC/backend/ent"
	_ "modernc.org/sqlite"
)

func newSQLiteClient(t *testing.T) *ent.Client {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory", t.Name())
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		t.Fatalf("enable foreign keys: %v", err)
	}

	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.SQLite, db)))
	t.Cleanup(func() {
		client.Close()
		db.Close()
	})
	return client
}

func TestEnsureSchemaAutoCreatesSchema(t *testing.T) {
	client := newSQLiteClient(t)

	if err := ensureSchema(context.Background(), client, "auto"); err != nil {
		t.Fatalf("expected auto migration to succeed, got %v", err)
	}
}

func TestEnsureSchemaValidateFailsWithoutSchema(t *testing.T) {
	client := newSQLiteClient(t)

	if err := ensureSchema(context.Background(), client, "validate"); err == nil {
		t.Fatal("expected validation to fail without schema")
	}
}

func TestEnsureSchemaValidateSucceedsWithSchema(t *testing.T) {
	client := newSQLiteClient(t)
	ctx := context.Background()

	if err := client.Schema.Create(ctx); err != nil {
		t.Fatalf("create schema: %v", err)
	}
	if err := ensureSchema(ctx, client, "validate"); err != nil {
		t.Fatalf("expected validation to pass, got %v", err)
	}
}
