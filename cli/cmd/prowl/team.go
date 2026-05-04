package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var teamCmd = &cobra.Command{
	Use:   "team",
	Short: "Manage teams",
}

var teamListCmd = &cobra.Command{
	Use:   "list",
	Short: "List teams (admin)",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		search, _ := cmd.Flags().GetString("search")
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/admin/teams?page=%d", page)
		if search != "" {
			path += "&search=" + search
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list teams: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID          int    `json:"id"`
				Name        string `json:"name"`
				CaptainName string `json:"captain_name"`
				IsActive    bool   `json:"is_active"`
				CreatedAt   string `json:"created_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Name", "Captain", "Active", "Created"}
		var rows [][]string
		for _, t := range data.Items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", t.ID), t.Name, t.CaptainName,
				fmt.Sprintf("%v", t.IsActive), t.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var teamGetCmd = &cobra.Command{
	Use:   "get <id>",
	Short: "Get team details (admin)",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/admin/teams/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to get team: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var teamDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a team (admin)",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/admin/teams/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete team: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Team %s deleted", args[0]))
	},
}

func init() {
	teamListCmd.Flags().StringP("search", "s", "", "Search by name")
	teamListCmd.Flags().IntP("page", "p", 1, "Page number")
	teamCmd.AddCommand(teamListCmd, teamGetCmd, teamDeleteCmd)
}
