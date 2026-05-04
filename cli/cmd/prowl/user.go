package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var userCmd = &cobra.Command{
	Use:   "user",
	Short: "Manage users",
}

var userListCmd = &cobra.Command{
	Use:   "list",
	Short: "List users",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		search, _ := cmd.Flags().GetString("search")
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/users?page=%d", page)
		if search != "" {
			path += "&search=" + search
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list users: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID        uint   `json:"id"`
				Username  string `json:"username"`
				Email     string `json:"email"`
				Role      struct{ Name string `json:"name"` } `json:"role"`
				CreatedAt string `json:"created_at"`
			} `json:"items"`
			Total    int `json:"total"`
			Page     int `json:"page"`
			PageSize int `json:"page_size"`
		}
		parseData(resp.Data, &data)

		printResult(data, []string{"ID", "Username", "Email", "Role", "Created"}, func(v interface{}) [][]string {
			d := v.(struct {
				Items []struct {
					ID        uint   `json:"id"`
					Username  string `json:"username"`
					Email     string `json:"email"`
					Role      struct{ Name string `json:"name"` } `json:"role"`
					CreatedAt string `json:"created_at"`
				} `json:"items"`
				Total    int `json:"total"`
				Page     int `json:"page"`
				PageSize int `json:"page_size"`
			})
			var rows [][]string
			for _, u := range d.Items {
				rows = append(rows, []string{
					fmt.Sprintf("%d", u.ID), u.Username, u.Email, u.Role.Name, u.CreatedAt,
				})
			}
			return rows
		})
		if getOutputFormat() == "table" {
			output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
		}
	},
}

var userMeCmd = &cobra.Command{
	Use:   "me",
	Short: "Show current user info",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/users/me")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get user info: %v", err))
			os.Exit(1)
		}

		var data struct {
			ID       uint   `json:"id"`
			Username string `json:"username"`
			Email    string `json:"email"`
			Nickname string `json:"nickname"`
			Role     *struct {
				Name string `json:"name"`
			} `json:"role"`
			CreatedAt string `json:"created_at"`
		}
		if err := json.Unmarshal(resp.Data, &data); err != nil {
			output.Error(fmt.Sprintf("failed to parse response: %v", err))
			os.Exit(1)
		}

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		roleName := "-"
		if data.Role != nil {
			roleName = data.Role.Name
		}
		fmt.Printf("ID:       %d\n", data.ID)
		fmt.Printf("Username: %s\n", data.Username)
		fmt.Printf("Email:    %s\n", data.Email)
		fmt.Printf("Nickname: %s\n", data.Nickname)
		fmt.Printf("Role:     %s\n", roleName)
		fmt.Printf("Created:  %s\n", data.CreatedAt)
	},
}

func init() {
	userListCmd.Flags().StringP("search", "s", "", "Search by username/email")
	userListCmd.Flags().IntP("page", "p", 1, "Page number")
	userCmd.AddCommand(userListCmd, userMeCmd)
}
