package main

import (
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var writeupCmd = &cobra.Command{
	Use:   "writeup",
	Short: "Manage writeups (admin)",
}

var writeupListCmd = &cobra.Command{
	Use:   "list",
	Short: "List writeups",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/admin/writeups?page=%d", page)
		if cmd.Flags().Changed("competition-id") {
			v, _ := cmd.Flags().GetInt("competition-id")
			path += fmt.Sprintf("&competition_id=%d", v)
		}
		if cmd.Flags().Changed("status") {
			v, _ := cmd.Flags().GetString("status")
			path += "&status=" + v
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list writeups: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID            int    `json:"id"`
				ChallengeName string `json:"challenge_name"`
				TeamName      string `json:"team_name"`
				Username      string `json:"username"`
				Status        string `json:"status"`
				SubmittedAt   string `json:"submitted_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Challenge", "Team", "User", "Status", "Submitted"}
		var rows [][]string
		for _, w := range data.Items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", w.ID), w.ChallengeName, w.TeamName,
				w.Username, w.Status, w.SubmittedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var writeupReviewCmd = &cobra.Command{
	Use:   "review <id> <approved|rejected>",
	Short: "Review a writeup",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		comment, _ := cmd.Flags().GetString("comment")
		body := map[string]interface{}{"status": args[1], "comment": comment}

		_, err := c.PutAPI("/api/v1/admin/writeups/"+args[0]+"/review", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to review writeup: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Writeup %s → %s", args[0], args[1]))
	},
}

func init() {
	writeupListCmd.Flags().IntP("page", "p", 1, "Page number")
	writeupListCmd.Flags().Int("competition-id", 0, "Filter by competition")
	writeupListCmd.Flags().String("status", "", "Filter: pending|approved|rejected")

	writeupReviewCmd.Flags().String("comment", "", "Review comment")

	writeupCmd.AddCommand(writeupListCmd, writeupReviewCmd)
}
