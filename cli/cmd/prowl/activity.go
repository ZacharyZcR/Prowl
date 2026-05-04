package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var activityCmd = &cobra.Command{
	Use:   "activity",
	Short: "View activity log",
}

var activityListCmd = &cobra.Command{
	Use:   "list",
	Short: "List activities",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resourceType, _ := cmd.Flags().GetString("resource")
		action, _ := cmd.Flags().GetString("action")
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/activities?page=%d", page)
		if resourceType != "" {
			path += "&resource_type=" + resourceType
		}
		if action != "" {
			path += "&action=" + action
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list activities: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID           int    `json:"id"`
				Action       string `json:"action"`
				ResourceType string `json:"resource_type"`
				Username     string `json:"username"`
				Detail       string `json:"detail"`
				IP           string `json:"ip"`
				Method       string `json:"method"`
				Path         string `json:"path"`
				StatusCode   int    `json:"status_code"`
				CreatedAt    string `json:"created_at"`
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

		headers := []string{"ID", "Action", "Resource", "User", "Detail", "IP", "Time"}
		var rows [][]string
		for _, a := range data.Items {
			detail := a.Detail
			if len(detail) > 40 {
				detail = detail[:37] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", a.ID), a.Action, a.ResourceType, a.Username, detail, a.IP, a.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var activityStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show activity statistics",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/activities/statistics")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get activity stats: %v", err))
			os.Exit(1)
		}

		var data struct {
			Total      int `json:"total"`
			TodayCount int `json:"today_count"`
			TopUsers   []struct {
				Username string `json:"username"`
				Count    int    `json:"count"`
			} `json:"top_users"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		fmt.Printf("%sActivity Statistics%s\n\n", output.ColorBold, output.ColorReset)
		fmt.Printf("  Total:   %d\n", data.Total)
		fmt.Printf("  Today:   %s%d%s\n", output.ColorCyan, data.TodayCount, output.ColorReset)

		if len(data.TopUsers) > 0 {
			fmt.Printf("\n  %sTop Users:%s\n", output.ColorBold, output.ColorReset)
			for i, u := range data.TopUsers {
				fmt.Printf("    %d. %-20s %d\n", i+1, u.Username, u.Count)
			}
		}
	},
}

var activityExportCmd = &cobra.Command{
	Use:   "export [file]",
	Short: "Export activities to CSV",
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()

		filename := fmt.Sprintf("activities_%s.csv", time.Now().Format("2006-01-02"))
		if len(args) > 0 {
			filename = args[0]
		}

		resp, err := c.Get("/api/v1/activities/export")
		if err != nil {
			output.Error(fmt.Sprintf("failed to export activities: %v", err))
			os.Exit(1)
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			output.Error(fmt.Sprintf("export failed with status %d", resp.StatusCode))
			os.Exit(1)
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to read response: %v", err))
			os.Exit(1)
		}

		// Check if response is a JSON error
		var apiErr struct {
			Code    int             `json:"code"`
			Message string          `json:"message"`
			Data    json.RawMessage `json:"data"`
		}
		if json.Unmarshal(body, &apiErr) == nil && apiErr.Code != 0 {
			output.Error(fmt.Sprintf("export failed: %s", apiErr.Message))
			os.Exit(1)
		}

		if err := os.WriteFile(filename, body, 0644); err != nil {
			output.Error(fmt.Sprintf("failed to write file: %v", err))
			os.Exit(1)
		}

		output.Success(fmt.Sprintf("Exported to %s", filename))
	},
}

func init() {
	activityListCmd.Flags().StringP("resource", "r", "", "Filter by resource type")
	activityListCmd.Flags().StringP("action", "a", "", "Filter by action")
	activityListCmd.Flags().IntP("page", "p", 1, "Page number")
	activityCmd.AddCommand(activityListCmd, activityStatsCmd, activityExportCmd)
}
