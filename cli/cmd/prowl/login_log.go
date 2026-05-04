package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var loginLogCmd = &cobra.Command{
	Use:   "login-log",
	Short: "View login logs",
}

var loginLogListCmd = &cobra.Command{
	Use:   "list",
	Short: "List login logs",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/login-logs?page=%d", page)
		if cmd.Flags().Changed("username") {
			v, _ := cmd.Flags().GetString("username")
			path += "&username=" + v
		}
		if cmd.Flags().Changed("ip") {
			v, _ := cmd.Flags().GetString("ip")
			path += "&ip=" + v
		}
		if cmd.Flags().Changed("success") {
			v, _ := cmd.Flags().GetString("success")
			path += "&success=" + v
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list login logs: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID            int    `json:"id"`
				Username      string `json:"username"`
				IP            string `json:"ip"`
				Success       bool   `json:"success"`
				FailureReason string `json:"failure_reason"`
				CreatedAt     string `json:"created_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Username", "IP", "Success", "Failure Reason", "Time"}
		var rows [][]string
		for _, l := range data.Items {
			reason := l.FailureReason
			if len(reason) > 30 {
				reason = reason[:27] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", l.ID), l.Username, l.IP,
				fmt.Sprintf("%v", l.Success), reason, l.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var loginLogStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show login log statistics",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/login-logs/statistics")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get login log stats: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

func init() {
	loginLogListCmd.Flags().IntP("page", "p", 1, "Page number")
	loginLogListCmd.Flags().String("username", "", "Filter by username")
	loginLogListCmd.Flags().String("ip", "", "Filter by IP")
	loginLogListCmd.Flags().String("success", "", "Filter: true|false")

	loginLogCmd.AddCommand(loginLogListCmd, loginLogStatsCmd)
}
