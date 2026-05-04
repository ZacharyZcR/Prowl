package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var awdCmd = &cobra.Command{
	Use:   "awd",
	Short: "AWD competition operations",
}

var awdDeployCmd = &cobra.Command{
	Use:   "deploy <comp-id>",
	Short: "Deploy AWD environment",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/awd/deploy", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to deploy: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var awdTeardownCmd = &cobra.Command{
	Use:   "teardown <comp-id>",
	Short: "Teardown AWD environment",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/awd/teardown", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to teardown: %v", err))
			os.Exit(1)
		}
		output.Success("AWD environment torn down")
	},
}

var awdRoundsCmd = &cobra.Command{
	Use:   "rounds <comp-id>",
	Short: "List AWD rounds",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/rounds")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list rounds: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var awdExecuteRoundCmd = &cobra.Command{
	Use:   "execute-round <comp-id>",
	Short: "Execute a new AWD round",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/rounds/execute", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to execute round: %v", err))
			os.Exit(1)
		}
		output.Success("Round executed")
	},
}

var awdCurrentRoundCmd = &cobra.Command{
	Use:   "current-round <comp-id>",
	Short: "Get current AWD round",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/rounds/current")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get current round: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var awdRoundResultsCmd = &cobra.Command{
	Use:   "round-results <comp-id> <round-id>",
	Short: "Get round results",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/rounds/" + args[1] + "/results")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get round results: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var awdConfigCmd = &cobra.Command{
	Use:   "config <comp-id>",
	Short: "Get AWD config",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/awd/config")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get config: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var awdUpdateConfigCmd = &cobra.Command{
	Use:   "update-config <comp-id>",
	Short: "Update AWD config",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{}
		setIntIfChanged(cmd, body, "round-interval", "round_interval")
		setIntIfChanged(cmd, body, "attack-score", "attack_score")
		setIntIfChanged(cmd, body, "defense-score", "defense_score")
		setIntIfChanged(cmd, body, "check-score", "check_score")

		if len(body) == 0 {
			output.Warn("no fields to update")
			return
		}

		_, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/awd/config", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to update config: %v", err))
			os.Exit(1)
		}
		output.Success("AWD config updated")
	},
}

var awdTimelineCmd = &cobra.Command{
	Use:   "timeline <comp-id>",
	Short: "Get AWD timeline",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/awd/timeline")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get timeline: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

func init() {
	awdUpdateConfigCmd.Flags().Int("round-interval", 0, "Round interval seconds")
	awdUpdateConfigCmd.Flags().Int("attack-score", 0, "Attack score per flag")
	awdUpdateConfigCmd.Flags().Int("defense-score", 0, "Defense score")
	awdUpdateConfigCmd.Flags().Int("check-score", 0, "Check score")

	awdCmd.AddCommand(awdDeployCmd, awdTeardownCmd, awdRoundsCmd, awdExecuteRoundCmd,
		awdCurrentRoundCmd, awdRoundResultsCmd, awdConfigCmd, awdUpdateConfigCmd, awdTimelineCmd)
}
