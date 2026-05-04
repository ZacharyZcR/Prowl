package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"sync"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Server operations",
}

var serverStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show server status",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()

		type healthData struct {
			Status    string `json:"status"`
			Version   string `json:"version"`
			BuildTime string `json:"build_time"`
		}
		type unreadData struct {
			Count int `json:"count"`
		}

		var health healthData
		var unread unreadData
		var healthErr, unreadErr error
		var wg sync.WaitGroup

		wg.Add(2)
		go func() {
			defer wg.Done()
			resp, err := c.GetAPI("/api/v1/health")
			if err != nil {
				healthErr = err
				return
			}
			json.Unmarshal(resp.Data, &health)
		}()
		go func() {
			defer wg.Done()
			resp, err := c.GetAPI("/api/v1/notifications/unread-count")
			if err != nil {
				unreadErr = err
				return
			}
			json.Unmarshal(resp.Data, &unread)
		}()
		wg.Wait()

		if getOutputFormat() == "json" {
			result := map[string]interface{}{
				"health": health,
				"unread": unread.Count,
			}
			output.PrintJSON(result)
			return
		}

		if healthErr != nil {
			output.Error(fmt.Sprintf("Health check failed: %v", healthErr))
		} else {
			output.Success(fmt.Sprintf("Server: %s", health.Status))
			output.Info(fmt.Sprintf("Version: %s, Built: %s", health.Version, health.BuildTime))
		}

		if unreadErr != nil {
			output.Warn(fmt.Sprintf("Could not fetch notifications: %v", unreadErr))
		} else {
			if unread.Count > 0 {
				output.Warn(fmt.Sprintf("Unread notifications: %d", unread.Count))
			} else {
				output.Info("No unread notifications")
			}
		}
	},
}

var serverLogsCmd = &cobra.Command{
	Use:   "logs",
	Short: "Stream server events (SSE)",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		url := c.BaseURL() + "/api/v1/sse?token=" + c.Token()

		resp, err := c.RawGet(url)
		if err != nil {
			output.Error(fmt.Sprintf("failed to connect to SSE: %v", err))
			os.Exit(1)
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			output.Error(fmt.Sprintf("SSE connection failed: status %d", resp.StatusCode))
			os.Exit(1)
		}

		output.Info("Connected to server event stream (Ctrl+C to exit)")

		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt)

		scanner := bufio.NewScanner(resp.Body)
		done := make(chan struct{})

		go func() {
			defer close(done)
			for scanner.Scan() {
				line := scanner.Text()
				if strings.HasPrefix(line, "data:") {
					data := strings.TrimPrefix(line, "data:")
					data = strings.TrimSpace(data)
					fmt.Println(data)
				}
			}
		}()

		select {
		case <-sigCh:
			fmt.Println()
			output.Info("Disconnected")
		case <-done:
			output.Warn("Server closed connection")
		}
	},
}

func init() {
	serverCmd.AddCommand(serverStatusCmd, serverLogsCmd)
}
