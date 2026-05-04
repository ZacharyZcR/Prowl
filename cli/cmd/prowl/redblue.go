package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var redblueCmd = &cobra.Command{
	Use:   "redblue",
	Short: "Red-Blue exercise operations",
}

var rbAttackReportsCmd = &cobra.Command{
	Use:   "attack-reports <comp-id>",
	Short: "List attack reports",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")
		status, _ := cmd.Flags().GetString("status")

		path := fmt.Sprintf("/api/v1/competitions/%s/attack-reports?page=%d", args[0], page)
		if status != "" {
			path += "&status=" + status
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list attack reports: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID        int    `json:"id"`
				TeamName  string `json:"team_name"`
				Username  string `json:"username"`
				Title     string `json:"title"`
				Severity  string `json:"severity"`
				Status    string `json:"status"`
				Score     int    `json:"score"`
				CreatedAt string `json:"submitted_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Team", "User", "Title", "Severity", "Status", "Score", "Time"}
		var rows [][]string
		for _, r := range data.Items {
			title := r.Title
			if len(title) > 30 {
				title = title[:27] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", r.ID), r.TeamName, r.Username, title,
				r.Severity, r.Status, fmt.Sprintf("%d", r.Score), r.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var rbDefenseReportsCmd = &cobra.Command{
	Use:   "defense-reports <comp-id>",
	Short: "List defense reports",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")
		status, _ := cmd.Flags().GetString("status")

		path := fmt.Sprintf("/api/v1/competitions/%s/defense-reports?page=%d", args[0], page)
		if status != "" {
			path += "&status=" + status
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list defense reports: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID         int    `json:"id"`
				TeamName   string `json:"team_name"`
				Username   string `json:"username"`
				Title      string `json:"title"`
				ActionType string `json:"action_type"`
				Status     string `json:"status"`
				Score      int    `json:"score"`
				CreatedAt  string `json:"submitted_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Team", "User", "Title", "Action", "Status", "Score", "Time"}
		var rows [][]string
		for _, r := range data.Items {
			title := r.Title
			if len(title) > 30 {
				title = title[:27] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", r.ID), r.TeamName, r.Username, title,
				r.ActionType, r.Status, fmt.Sprintf("%d", r.Score), r.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var rbJudgeAttackCmd = &cobra.Command{
	Use:   "judge-attack <comp-id> <report-id> <accepted|rejected>",
	Short: "Judge an attack report",
	Args:  cobra.ExactArgs(3),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		score, _ := cmd.Flags().GetInt("score")
		comment, _ := cmd.Flags().GetString("comment")

		body := map[string]interface{}{"status": args[2], "score": score, "comment": comment}
		_, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/attack-reports/"+args[1]+"/judge", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to judge: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Attack report %s → %s (score: %d)", args[1], args[2], score))
	},
}

var rbJudgeDefenseCmd = &cobra.Command{
	Use:   "judge-defense <comp-id> <report-id> <accepted|rejected>",
	Short: "Judge a defense report",
	Args:  cobra.ExactArgs(3),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		score, _ := cmd.Flags().GetInt("score")
		comment, _ := cmd.Flags().GetString("comment")

		body := map[string]interface{}{"status": args[2], "score": score, "comment": comment}
		_, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/defense-reports/"+args[1]+"/judge", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to judge: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Defense report %s → %s (score: %d)", args[1], args[2], score))
	},
}

var rbPhasesCmd = &cobra.Command{
	Use:   "phases <comp-id>",
	Short: "List exercise phases",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/phases")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list phases: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var rbCreatePhaseCmd = &cobra.Command{
	Use:   "create-phase <comp-id>",
	Short: "Create a new phase",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		name, _ := cmd.Flags().GetString("name")
		desc, _ := cmd.Flags().GetString("description")
		order, _ := cmd.Flags().GetInt("order")
		duration, _ := cmd.Flags().GetInt("duration")

		body := map[string]interface{}{
			"name":             name,
			"description":      desc,
			"order_num":        order,
			"duration_minutes": duration,
		}
		resp, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/phases", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create phase: %v", err))
			os.Exit(1)
		}
		var result struct {
			ID int `json:"id"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Phase '%s' created (ID: %d)", name, result.ID))
	},
}

var rbAdvancePhaseCmd = &cobra.Command{
	Use:   "advance-phase <comp-id>",
	Short: "Advance to next phase",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/phases/advance", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to advance phase: %v", err))
			os.Exit(1)
		}
		output.Success("Phase advanced")
	},
}

var rbSummaryCmd = &cobra.Command{
	Use:   "summary <comp-id>",
	Short: "Get exercise summary",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/portal/competitions/" + args[0] + "/exercise-summary")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get summary: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

func init() {
	rbAttackReportsCmd.Flags().IntP("page", "p", 1, "Page number")
	rbAttackReportsCmd.Flags().String("status", "", "Filter: pending|accepted|rejected")

	rbDefenseReportsCmd.Flags().IntP("page", "p", 1, "Page number")
	rbDefenseReportsCmd.Flags().String("status", "", "Filter: pending|accepted|rejected")

	rbJudgeAttackCmd.Flags().Int("score", 0, "Score to award")
	rbJudgeAttackCmd.Flags().String("comment", "", "Judge comment")

	rbJudgeDefenseCmd.Flags().Int("score", 0, "Score to award")
	rbJudgeDefenseCmd.Flags().String("comment", "", "Judge comment")

	rbCreatePhaseCmd.Flags().String("name", "", "Phase name (required)")
	rbCreatePhaseCmd.Flags().String("description", "", "Description")
	rbCreatePhaseCmd.Flags().Int("order", 0, "Order number")
	rbCreatePhaseCmd.Flags().Int("duration", 60, "Duration in minutes")
	rbCreatePhaseCmd.MarkFlagRequired("name")

	redblueCmd.AddCommand(rbAttackReportsCmd, rbDefenseReportsCmd, rbJudgeAttackCmd, rbJudgeDefenseCmd,
		rbPhasesCmd, rbCreatePhaseCmd, rbAdvancePhaseCmd, rbSummaryCmd)
}
