package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/client"
	"github.com/ZacharyZcR/STC/cli/internal/config"
	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Login to Prowl Range server",
	Run: func(cmd *cobra.Command, args []string) {
		cfg, err := config.Load()
		if err != nil {
			output.Error(fmt.Sprintf("failed to load config: %v", err))
			os.Exit(1)
		}

		var username, password string
		fmt.Print("Username: ")
		fmt.Scan(&username)
		fmt.Print("Password: ")
		fmt.Scan(&password)

		c := client.New(cfg.ServerURL, "")
		resp, err := c.PostAPI("/api/v1/auth/login", map[string]string{
			"username": username,
			"password": password,
		})
		if err != nil {
			output.Error(fmt.Sprintf("login failed: %v", err))
			os.Exit(1)
		}

		var loginData struct {
			Token string `json:"token"`
			User  struct {
				Username string `json:"username"`
				Role     struct {
					Name string `json:"name"`
				} `json:"role"`
			} `json:"user"`
		}
		if err := json.Unmarshal(resp.Data, &loginData); err != nil {
			output.Error(fmt.Sprintf("failed to parse login response: %v", err))
			os.Exit(1)
		}

		cfg.Token = loginData.Token
		if err := config.Save(cfg); err != nil {
			output.Error(fmt.Sprintf("failed to save config: %v", err))
			os.Exit(1)
		}

		output.Success(fmt.Sprintf("Logged in as %s (%s)", loginData.User.Username, loginData.User.Role.Name))
	},
}
