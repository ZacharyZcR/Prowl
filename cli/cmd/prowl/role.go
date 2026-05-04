package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var roleCmd = &cobra.Command{
	Use:   "role",
	Short: "Manage roles",
}

var roleListCmd = &cobra.Command{
	Use:   "list",
	Short: "List roles",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/roles")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list roles: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID          uint     `json:"id"`
				Name        string   `json:"name"`
				Description string   `json:"description"`
				Permissions []string `json:"permissions"`
				UserCount   int      `json:"user_count"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Name", "Description", "Permissions", "Users"}
		var rows [][]string
		for _, r := range data.Items {
			perms := strings.Join(r.Permissions, ", ")
			if len(perms) > 40 {
				perms = perms[:37] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", r.ID), r.Name, r.Description, perms, fmt.Sprintf("%d", r.UserCount),
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

func init() {
	roleCmd.AddCommand(roleListCmd)
}
