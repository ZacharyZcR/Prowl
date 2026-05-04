package main

import (
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var cronCmd = &cobra.Command{
	Use:   "cron",
	Short: "Manage cron jobs",
}

var cronListCmd = &cobra.Command{
	Use:   "list",
	Short: "List cron jobs",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/cron-jobs")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list cron jobs: %v", err))
			os.Exit(1)
		}

		var items []struct {
			ID         int    `json:"id"`
			Name       string `json:"name"`
			CronExpr   string `json:"cron_expr"`
			Handler    string `json:"handler"`
			Enabled    bool   `json:"enabled"`
			LastRunAt  string `json:"last_run_at"`
			LastStatus string `json:"last_status"`
			NextRunAt  string `json:"next_run_at"`
		}
		parseData(resp.Data, &items)

		if getOutputFormat() == "json" {
			output.PrintJSON(items)
			return
		}

		headers := []string{"ID", "Name", "Cron", "Handler", "Enabled", "Last Run", "Status", "Next Run"}
		var rows [][]string
		for _, j := range items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", j.ID), j.Name, j.CronExpr, j.Handler,
				fmt.Sprintf("%v", j.Enabled), j.LastRunAt, j.LastStatus, j.NextRunAt,
			})
		}
		output.PrintTable(headers, rows)
	},
}

var cronCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a cron job",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		name, _ := cmd.Flags().GetString("name")
		expr, _ := cmd.Flags().GetString("cron")
		handler, _ := cmd.Flags().GetString("handler")

		body := map[string]interface{}{
			"name":      name,
			"cron_expr": expr,
			"handler":   handler,
		}
		if cmd.Flags().Changed("enabled") {
			v, _ := cmd.Flags().GetBool("enabled")
			body["enabled"] = v
		}

		resp, err := c.PostAPI("/api/v1/cron-jobs", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create cron job: %v", err))
			os.Exit(1)
		}
		var result struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Cron job '%s' created (ID: %d)", result.Name, result.ID))
	},
}

var cronUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update a cron job",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{}
		setIfChanged(cmd, body, "name", "name")
		setIfChanged(cmd, body, "cron", "cron_expr")
		setIfChanged(cmd, body, "handler", "handler")
		setBoolIfChanged(cmd, body, "enabled", "enabled")

		if len(body) == 0 {
			output.Warn("no fields to update")
			return
		}

		_, err := c.PutAPI("/api/v1/cron-jobs/"+args[0], body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to update cron job: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Cron job %s updated", args[0]))
	},
}

var cronDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a cron job",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/cron-jobs/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete cron job: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Cron job %s deleted", args[0]))
	},
}

var cronToggleCmd = &cobra.Command{
	Use:   "toggle <id>",
	Short: "Toggle cron job enabled/disabled",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/cron-jobs/"+args[0]+"/toggle", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to toggle cron job: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Cron job %s toggled", args[0]))
	},
}

var cronRunCmd = &cobra.Command{
	Use:   "run <id>",
	Short: "Run a cron job immediately",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PostAPI("/api/v1/cron-jobs/"+args[0]+"/run", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to run cron job: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Cron job %s triggered", args[0]))
	},
}

func init() {
	cronCreateCmd.Flags().String("name", "", "Job name (required)")
	cronCreateCmd.Flags().String("cron", "", "Cron expression (required)")
	cronCreateCmd.Flags().String("handler", "", "Handler name (required)")
	cronCreateCmd.Flags().Bool("enabled", true, "Enable on creation")
	cronCreateCmd.MarkFlagRequired("name")
	cronCreateCmd.MarkFlagRequired("cron")
	cronCreateCmd.MarkFlagRequired("handler")

	cronUpdateCmd.Flags().String("name", "", "Job name")
	cronUpdateCmd.Flags().String("cron", "", "Cron expression")
	cronUpdateCmd.Flags().String("handler", "", "Handler name")
	cronUpdateCmd.Flags().Bool("enabled", false, "Enabled")

	cronCmd.AddCommand(cronListCmd, cronCreateCmd, cronUpdateCmd, cronDeleteCmd, cronToggleCmd, cronRunCmd)
}

