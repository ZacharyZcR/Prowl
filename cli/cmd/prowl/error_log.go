package main

import (
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var errorLogCmd = &cobra.Command{
	Use:   "error-log",
	Short: "Manage error logs",
}

var errorLogListCmd = &cobra.Command{
	Use:   "list",
	Short: "List error logs",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		source, _ := cmd.Flags().GetString("source")
		severity, _ := cmd.Flags().GetString("severity")
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/error-logs?page=%d", page)
		if source != "" {
			path += "&source=" + source
		}
		if severity != "" {
			path += "&severity=" + severity
		}
		if cmd.Flags().Changed("resolved") {
			resolved, _ := cmd.Flags().GetBool("resolved")
			path += fmt.Sprintf("&resolved=%v", resolved)
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list error logs: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID        int    `json:"id"`
				Severity  string `json:"severity"`
				Type      string `json:"type"`
				Message   string `json:"message"`
				Source    string `json:"source"`
				Count     int    `json:"count"`
				LastSeen  string `json:"last_seen"`
				Resolved  bool   `json:"resolved"`
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

		headers := []string{"ID", "Severity", "Type", "Message", "Source", "Count", "LastSeen", "Status"}
		var rows [][]string
		for _, e := range data.Items {
			msg := e.Message
			if len(msg) > 40 {
				msg = msg[:37] + "..."
			}
			status := "open"
			if e.Resolved {
				status = output.Dim("resolved")
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", e.ID),
				colorSeverity(e.Severity),
				e.Type,
				msg,
				e.Source,
				fmt.Sprintf("%d", e.Count),
				e.LastSeen,
				status,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var errorLogStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show error log statistics",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/error-logs/statistics")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get error log stats: %v", err))
			os.Exit(1)
		}

		var data struct {
			Total        int `json:"total"`
			Unresolved   int `json:"unresolved"`
			CriticalCount int `json:"critical_count"`
			HighCount    int `json:"high_count"`
			MediumCount  int `json:"medium_count"`
			LowCount     int `json:"low_count"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		fmt.Printf("%sError Log Statistics%s\n\n", output.ColorBold, output.ColorReset)
		fmt.Printf("  Total:      %d\n", data.Total)
		fmt.Printf("  Unresolved: %d\n", data.Unresolved)
		fmt.Println()
		fmt.Printf("  %sCritical:%s  %d\n", output.ColorRed, output.ColorReset, data.CriticalCount)
		fmt.Printf("  %sHigh:%s      %d\n", output.ColorYellow, output.ColorReset, data.HighCount)
		fmt.Printf("  %sMedium:%s    %d\n", output.ColorCyan, output.ColorReset, data.MediumCount)
		fmt.Printf("  %sLow:%s       %d\n", output.ColorDim, output.ColorReset, data.LowCount)
	},
}

var errorLogResolveCmd = &cobra.Command{
	Use:   "resolve <id>",
	Short: "Resolve an error",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DoAPI("PUT", "/api/v1/error-logs/"+args[0]+"/resolve", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to resolve error: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Error #%s resolved", args[0]))
	},
}

func colorSeverity(s string) string {
	switch s {
	case "critical":
		return output.ColorRed + s + output.ColorReset
	case "high":
		return output.ColorYellow + s + output.ColorReset
	case "medium":
		return output.ColorCyan + s + output.ColorReset
	case "low":
		return output.ColorDim + s + output.ColorReset
	default:
		return s
	}
}

func init() {
	errorLogListCmd.Flags().String("source", "", "Filter: backend or frontend")
	errorLogListCmd.Flags().String("severity", "", "Filter: critical, high, medium, low")
	errorLogListCmd.Flags().Bool("resolved", false, "Show resolved errors")
	errorLogListCmd.Flags().IntP("page", "p", 1, "Page number")
	errorLogCmd.AddCommand(errorLogListCmd, errorLogStatsCmd, errorLogResolveCmd)
}
