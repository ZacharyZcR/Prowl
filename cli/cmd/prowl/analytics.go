package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var analyticsCmd = &cobra.Command{
	Use:   "analytics <comp-id>",
	Short: "Get competition analytics",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/analytics")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get analytics: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var anticheatCmd = &cobra.Command{
	Use:   "anticheat <comp-id>",
	Short: "Get anti-cheat report",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/anticheat")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get anticheat report: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}
