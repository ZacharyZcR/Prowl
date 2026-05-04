package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var projectCmd = &cobra.Command{
	Use:   "project",
	Short: "Manage projects",
}

var projectListCmd = &cobra.Command{
	Use:   "list",
	Short: "List projects",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		search, _ := cmd.Flags().GetString("search")
		status, _ := cmd.Flags().GetString("status")
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/projects?page=%d", page)
		if search != "" {
			path += "&search=" + search
		}
		if status != "" {
			path += "&status=" + status
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list projects: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID          uint   `json:"id"`
				Name        string `json:"name"`
				Description string `json:"description"`
				Status      string `json:"status"`
				CreatedAt   string `json:"created_at"`
			} `json:"items"`
			Total    int `json:"total"`
			Page     int `json:"page"`
			PageSize int `json:"page_size"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Name", "Description", "Status", "Created"}
		var rows [][]string
		for _, p := range data.Items {
			desc := p.Description
			if len(desc) > 30 {
				desc = desc[:27] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", p.ID), p.Name, desc, p.Status, p.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var projectCreateCmd = &cobra.Command{
	Use:   "create <name>",
	Short: "Create a new project",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		desc, _ := cmd.Flags().GetString("description")
		status, _ := cmd.Flags().GetString("status")

		body := map[string]string{
			"name":        args[0],
			"description": desc,
			"status":      status,
		}

		resp, err := c.PostAPI("/api/v1/projects", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create project: %v", err))
			os.Exit(1)
		}

		var project struct {
			ID   uint   `json:"id"`
			Name string `json:"name"`
		}
		if err := json.Unmarshal(resp.Data, &project); err != nil {
			output.Error(fmt.Sprintf("failed to parse response: %v", err))
			os.Exit(1)
		}

		output.Success(fmt.Sprintf("Project '%s' created (ID: %d)", project.Name, project.ID))
	},
}

var projectDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a project",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/projects/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete project: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Project %s deleted", args[0]))
	},
}

func init() {
	projectListCmd.Flags().StringP("search", "s", "", "Search by name")
	projectListCmd.Flags().String("status", "", "Filter by status (active|archived|draft)")
	projectListCmd.Flags().IntP("page", "p", 1, "Page number")
	projectCreateCmd.Flags().StringP("description", "d", "", "Project description")
	projectCreateCmd.Flags().String("status", "active", "Project status")
	projectCmd.AddCommand(projectListCmd, projectCreateCmd, projectDeleteCmd)
}
