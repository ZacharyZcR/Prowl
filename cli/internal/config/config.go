package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	ServerURL string `json:"server_url"`
	Token     string `json:"token"`
	Profile   string `json:"profile"`
	Output    string `json:"output"`
}

func configPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".prowl", "config.json"), nil
}

func Load() (*Config, error) {
	path, err := configPath()
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		ServerURL: "http://localhost:38080",
		Output:    "table",
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return nil, err
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func Save(cfg *Config) error {
	path, err := configPath()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (c *Config) Set(key, value string) error {
	switch key {
	case "server_url":
		c.ServerURL = value
	case "output":
		if value != "table" && value != "json" {
			return fmt.Errorf("output must be 'table' or 'json'")
		}
		c.Output = value
	case "profile":
		c.Profile = value
	case "token":
		c.Token = value
	default:
		return fmt.Errorf("unknown config key: %s", key)
	}
	return Save(c)
}

func (c *Config) Get(key string) string {
	switch key {
	case "server_url":
		return c.ServerURL
	case "token":
		return c.Token
	case "output":
		return c.Output
	case "profile":
		return c.Profile
	default:
		return ""
	}
}

func (c *Config) List() map[string]string {
	return map[string]string{
		"server_url": c.ServerURL,
		"token":      c.Token,
		"profile":    c.Profile,
		"output":     c.Output,
	}
}
