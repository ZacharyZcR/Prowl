package database

import (
	"context"
	"errors"
	"log"

	"entgo.io/ent/dialect"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"

	"github.com/ZacharyZcR/STC/backend/ent"
)

func InitDB(ctx context.Context, dsn, migrationMode string) (*ent.Client, error) {
	client, err := ent.Open(dialect.Postgres, dsn)
	if err != nil {
		return nil, err
	}

	if err := ensureSchema(ctx, client, migrationMode); err != nil {
		client.Close()
		return nil, err
	}

	log.Printf("database connected (migration_mode=%s)", migrationMode)
	return client, nil
}

func InitRedis(addr, password string) *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("redis ping failed: %v (continuing without redis)", err)
	} else {
		log.Println("redis connected")
	}

	return rdb
}

func ensureSchema(ctx context.Context, client *ent.Client, migrationMode string) error {
	switch migrationMode {
	case "auto":
		if err := client.Schema.Create(ctx); err != nil {
			return err
		}
		return nil
	case "validate":
		if _, err := client.User.Query().Limit(1).Exist(ctx); err != nil {
			return errors.New("database schema validation failed: " + err.Error())
		}
		return nil
	default:
		return errors.New("unsupported migration mode: " + migrationMode)
	}
}
