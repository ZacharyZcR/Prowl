package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var healthCmd = &cobra.Command{
	Use:   "health",
	Short: "Check backend health status",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/health")
		if err != nil {
			output.Error(fmt.Sprintf("health check failed: %v", err))
			os.Exit(1)
		}

		var data struct {
			Status    string `json:"status"`
			Version   string `json:"version"`
			BuildTime string `json:"build_time"`
		}
		if err := json.Unmarshal(resp.Data, &data); err != nil {
			output.Error(fmt.Sprintf("failed to parse health response: %v", err))
			os.Exit(1)
		}

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		output.Success("Server is healthy")
		output.Info(fmt.Sprintf("Version: %s, Built: %s", data.Version, data.BuildTime))
	},
}
