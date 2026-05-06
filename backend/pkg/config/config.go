package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	env "github.com/caarlos0/env/v11"
)

type Config struct {
	DatabaseURL         string `env:"DATABASE_URL" envDefault:"postgres://postgres:postgres@localhost:5432/prowl?sslmode=disable"`
	RedisURL            string `env:"REDIS_URL" envDefault:"localhost:6379"`
	RedisPassword       string `env:"REDIS_PASSWORD" envDefault:""`
	ListenAddr          string `env:"LISTEN_ADDR" envDefault:":38080"`
	JWTSecret           string `env:"JWT_SECRET"`
	GinMode             string `env:"GIN_MODE" envDefault:"debug"`
	UploadDir           string `env:"UPLOAD_DIR" envDefault:"./uploads"`
	GRPCAddr            string `env:"GRPC_ADDR" envDefault:":39091"`
	CORSAllowedOrigins  []string
	DBMigrationMode     string
	OutboundHTTPTimeout time.Duration `env:"OUTBOUND_HTTP_TIMEOUT" envDefault:"15s"`

	OAuthEnabled      bool   `env:"OAUTH_ENABLED"`
	OAuthProvider     string `env:"OAUTH_PROVIDER"`
	OAuthClientID     string `env:"OAUTH_CLIENT_ID"`
	OAuthClientSecret string `env:"OAUTH_CLIENT_SECRET"`
	OAuthRedirectURL  string `env:"OAUTH_REDIRECT_URL"`
	OAuthAuthURL      string `env:"OAUTH_AUTH_URL"`
	OAuthTokenURL     string `env:"OAUTH_TOKEN_URL"`
	OAuthUserInfoURL  string `env:"OAUTH_USERINFO_URL"`

	DockerHost             string `env:"DOCKER_HOST" envDefault:"unix:///var/run/docker.sock"`
	MaxContainersTotal     int
	MaxContainersPerTeam   int
	ContainerNetworkPrefix string `env:"CONTAINER_NETWORK_PREFIX" envDefault:"range"`
	ChallengeBaseURL       string `env:"CHALLENGE_BASE_URL" envDefault:"http://localhost"`
	FlagSecretKey          string `env:"FLAG_SECRET_KEY" envDefault:""`
}

func Load() *Config {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		panic(err)
	}
	cfg.JWTSecret = strings.TrimSpace(cfg.JWTSecret)
	cfg.CORSAllowedOrigins = loadAllowedOrigins(cfg.GinMode)
	cfg.DBMigrationMode = loadMigrationMode(cfg.GinMode)
	cfg.MaxContainersTotal = loadIntEnv("MAX_CONTAINERS_TOTAL", 500)
	cfg.MaxContainersPerTeam = loadIntEnv("MAX_CONTAINERS_PER_TEAM", 5)
	return cfg
}

func (c *Config) Validate() error {
	if strings.TrimSpace(c.JWTSecret) == "" {
		return errors.New("JWT_SECRET is required")
	}
	if c.DBMigrationMode != "auto" && c.DBMigrationMode != "validate" {
		return errors.New("DB_MIGRATION_MODE must be auto or validate")
	}
	if c.OutboundHTTPTimeout <= 0 {
		return errors.New("OUTBOUND_HTTP_TIMEOUT must be greater than zero")
	}

	if c.OAuthEnabled {
		required := map[string]string{
			"OAUTH_PROVIDER":      c.OAuthProvider,
			"OAUTH_CLIENT_ID":     c.OAuthClientID,
			"OAUTH_CLIENT_SECRET": c.OAuthClientSecret,
			"OAUTH_REDIRECT_URL":  c.OAuthRedirectURL,
		}
		for key, value := range required {
			if strings.TrimSpace(value) == "" {
				return errors.New(key + " is required when OAUTH_ENABLED=true")
			}
		}
	}

	return nil
}

func loadAllowedOrigins(ginMode string) []string {
	raw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if raw == "" {
		if ginMode != "debug" {
			return nil
		}
		raw = strings.Join([]string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:35173",
			"http://127.0.0.1:35173",
			"http://localhost:35174",
			"http://127.0.0.1:35174",
			"http://localhost:5174",
			"http://127.0.0.1:5174",
			"http://localhost:5175",
			"http://127.0.0.1:5175",
			"http://localhost:1420",
			"http://127.0.0.1:1420",
			"tauri://localhost",
		}, ",")
	}

	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

func loadMigrationMode(ginMode string) string {
	mode := strings.TrimSpace(os.Getenv("DB_MIGRATION_MODE"))
	if mode != "" {
		return mode
	}
	if ginMode == "debug" {
		return "auto"
	}
	return "validate"
}

func loadIntEnv(key string, defaultVal int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(raw)
	if err != nil {
		return defaultVal
	}
	return val
}
