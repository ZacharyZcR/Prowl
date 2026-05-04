package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var queueCmd = &cobra.Command{
	Use:   "queue",
	Short: "Task queue management",
}

var queueStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show queue statistics",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/queue/stats")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get queue stats: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var queueTasksCmd = &cobra.Command{
	Use:   "tasks",
	Short: "List recent tasks",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		limit, _ := cmd.Flags().GetInt("limit")
		path := fmt.Sprintf("/api/v1/queue/tasks?limit=%d", limit)

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list tasks: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

func init() {
	queueTasksCmd.Flags().Int("limit", 20, "Number of tasks to show (max 100)")
	queueCmd.AddCommand(queueStatsCmd, queueTasksCmd)
}
