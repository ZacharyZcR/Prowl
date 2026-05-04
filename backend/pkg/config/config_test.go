package config

import (
	"os"
	"testing"
	"time"
)

// unsetEnv uses t.Setenv to save the original value for restore,
// then os.Unsetenv to truly remove the var so envDefault kicks in.
func unsetEnv(t *testing.T, keys ...string) {
	t.Helper()
	for _, k := range keys {
		if v, ok := os.LookupEnv(k); ok {
			t.Setenv(k, v) // save for restore
		}
		os.Unsetenv(k)
	}
}

func TestLoad_Defaults(t *testing.T) {
	unsetEnv(t,
		"LISTEN_ADDR", "JWT_SECRET", "GIN_MODE", "UPLOAD_DIR",
		"DATABASE_URL", "REDIS_URL", "REDIS_PASSWORD",
		"CORS_ALLOWED_ORIGINS", "DB_MIGRATION_MODE", "OUTBOUND_HTTP_TIMEOUT",
		"OAUTH_ENABLED", "OAUTH_PROVIDER", "OAUTH_CLIENT_ID",
		"OAUTH_CLIENT_SECRET", "OAUTH_REDIRECT_URL",
		"OAUTH_AUTH_URL", "OAUTH_TOKEN_URL", "OAUTH_USERINFO_URL",
		"GRPC_ADDR",
	)
	cfg := Load()

	if cfg.ListenAddr != ":38080" {
		t.Fatalf("expected default ListenAddr :38080, got %s", cfg.ListenAddr)
	}
	if cfg.JWTSecret != "" {
		t.Fatalf("expected empty JWTSecret, got %s", cfg.JWTSecret)
	}
	if cfg.GinMode != "debug" {
		t.Fatalf("expected default GinMode debug, got %s", cfg.GinMode)
	}
	if cfg.UploadDir != "./uploads" {
		t.Fatalf("expected default UploadDir ./uploads, got %s", cfg.UploadDir)
	}
	if len(cfg.CORSAllowedOrigins) == 0 {
		t.Fatal("expected debug defaults for CORS allowed origins")
	}
	if cfg.DBMigrationMode != "auto" {
		t.Fatalf("expected debug default migration mode auto, got %s", cfg.DBMigrationMode)
	}
	if cfg.OutboundHTTPTimeout != 15*time.Second {
		t.Fatalf("expected default outbound timeout 15s, got %v", cfg.OutboundHTTPTimeout)
	}
}

func TestLoad_FromEnv(t *testing.T) {
	t.Setenv("LISTEN_ADDR", ":9090")
	t.Setenv("JWT_SECRET", "my-secret")
	t.Setenv("GIN_MODE", "release")
	t.Setenv("UPLOAD_DIR", "/tmp/uploads")
	t.Setenv("DATABASE_URL", "postgres://test:test@localhost/test")
	t.Setenv("REDIS_URL", "redis:6379")
	t.Setenv("REDIS_PASSWORD", "redispass")
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://app.example.com, https://admin.example.com")
	t.Setenv("DB_MIGRATION_MODE", "validate")
	t.Setenv("OUTBOUND_HTTP_TIMEOUT", "30s")

	cfg := Load()

	if cfg.ListenAddr != ":9090" {
		t.Fatalf("expected :9090, got %s", cfg.ListenAddr)
	}
	if cfg.JWTSecret != "my-secret" {
		t.Fatalf("expected my-secret, got %s", cfg.JWTSecret)
	}
	if cfg.GinMode != "release" {
		t.Fatalf("expected release, got %s", cfg.GinMode)
	}
	if cfg.UploadDir != "/tmp/uploads" {
		t.Fatalf("expected /tmp/uploads, got %s", cfg.UploadDir)
	}
	if cfg.DatabaseURL != "postgres://test:test@localhost/test" {
		t.Fatalf("expected postgres URL, got %s", cfg.DatabaseURL)
	}
	if cfg.RedisURL != "redis:6379" {
		t.Fatalf("expected redis:6379, got %s", cfg.RedisURL)
	}
	if cfg.RedisPassword != "redispass" {
		t.Fatalf("expected redispass, got %s", cfg.RedisPassword)
	}
	if len(cfg.CORSAllowedOrigins) != 2 {
		t.Fatalf("expected 2 CORS origins, got %d", len(cfg.CORSAllowedOrigins))
	}
	if cfg.DBMigrationMode != "validate" {
		t.Fatalf("expected validate migration mode, got %s", cfg.DBMigrationMode)
	}
	if cfg.OutboundHTTPTimeout != 30*time.Second {
		t.Fatalf("expected 30s timeout, got %v", cfg.OutboundHTTPTimeout)
	}
}

func TestLoad_PartialEnv(t *testing.T) {
	unsetEnv(t,
		"JWT_SECRET", "GIN_MODE", "UPLOAD_DIR", "DATABASE_URL",
		"REDIS_URL", "REDIS_PASSWORD", "CORS_ALLOWED_ORIGINS",
		"DB_MIGRATION_MODE", "OUTBOUND_HTTP_TIMEOUT",
		"OAUTH_ENABLED", "GRPC_ADDR",
	)
	t.Setenv("LISTEN_ADDR", ":3000")

	cfg := Load()

	if cfg.ListenAddr != ":3000" {
		t.Fatalf("expected :3000, got %s", cfg.ListenAddr)
	}
	if cfg.JWTSecret != "" {
		t.Fatalf("expected empty JWTSecret for empty env, got %s", cfg.JWTSecret)
	}
	if cfg.DBMigrationMode != "auto" {
		t.Fatalf("expected debug default migration mode auto, got %s", cfg.DBMigrationMode)
	}
}

func TestValidate_RequiresJWTSecret(t *testing.T) {
	cfg := &Config{GinMode: "release"}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for missing JWT secret")
	}
}

func TestValidate_OAuthRequiresFields(t *testing.T) {
	cfg := &Config{
		JWTSecret:    "secret",
		OAuthEnabled: true,
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for incomplete oauth config")
	}
}

func TestValidate_Success(t *testing.T) {
	cfg := &Config{
		JWTSecret:           "secret",
		DBMigrationMode:     "validate",
		OutboundHTTPTimeout: 10 * time.Second,
	}

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected no validation error, got %v", err)
	}
}

func TestValidate_InvalidMigrationMode(t *testing.T) {
	cfg := &Config{
		JWTSecret:           "secret",
		DBMigrationMode:     "off",
		OutboundHTTPTimeout: 10 * time.Second,
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error for invalid migration mode")
	}
}
