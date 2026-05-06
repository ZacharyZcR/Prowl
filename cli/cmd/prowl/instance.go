package main

import (
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var instanceCmd = &cobra.Command{
	Use:   "instance",
	Short: "Manage challenge instances (admin)",
}

type instanceItem struct {
	ID            int               `json:"id"`
	ChallengeName string            `json:"challenge_name"`
	ChallengeID   int               `json:"challenge_id"`
	TeamName      string            `json:"team_name"`
	TeamID        int               `json:"team_id"`
	ContainerID   string            `json:"container_id"`
	StackID       string            `json:"stack_id"`
	Containers    map[string]string `json:"containers"`
	Networks      map[string]string `json:"networks"`
	Status        string            `json:"status"`
	AccessURL     string            `json:"access_url"`
	Ports         map[string]string `json:"ports"`
	ExpiresAt     string            `json:"expires_at"`
	StartedAt     string            `json:"started_at"`
	CreatedAt     string            `json:"created_at"`
}

var instanceListCmd = &cobra.Command{
	Use:   "list",
	Short: "List instances",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")
		status, _ := cmd.Flags().GetString("status")

		path := fmt.Sprintf("/api/v1/admin/instances?page=%d", page)
		if status != "" {
			path += "&status=" + status
		}
		if cmd.Flags().Changed("competition-id") {
			v, _ := cmd.Flags().GetInt("competition-id")
			path += fmt.Sprintf("&competition_id=%d", v)
		}
		if cmd.Flags().Changed("team-id") {
			v, _ := cmd.Flags().GetInt("team-id")
			path += fmt.Sprintf("&team_id=%d", v)
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list instances: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []instanceItem `json:"items"`
			Total int            `json:"total"`
			Page  int            `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Challenge", "Team", "Runtime", "Entry", "Status", "URL", "Expires"}
		var rows [][]string
		for _, i := range data.Items {
			cid := i.ContainerID
			if len(cid) > 12 {
				cid = cid[:12]
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", i.ID), i.ChallengeName, i.TeamName,
				instanceRuntime(i), cid, i.Status, i.AccessURL, i.ExpiresAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var instanceStatsCmd = &cobra.Command{
	Use:   "stats",
	Short: "Show instance statistics",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/admin/instances/stats")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get stats: %v", err))
			os.Exit(1)
		}

		var data struct {
			Total   int `json:"total_instances"`
			Running int `json:"running_instances"`
			Pending int `json:"pending_instances"`
			Stopped int `json:"stopped_instances"`
			Error   int `json:"error_instances"`
			Stack   int `json:"stack_instances"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		fmt.Printf("%sInstance Statistics%s\n\n", output.ColorBold, output.ColorReset)
		fmt.Printf("  Total:   %d\n", data.Total)
		fmt.Printf("  Running: %s%d%s\n", output.ColorCyan, data.Running, output.ColorReset)
		fmt.Printf("  Pending: %d\n", data.Pending)
		fmt.Printf("  Stopped: %d\n", data.Stopped)
		fmt.Printf("  Error:   %s%d%s\n", output.ColorRed, data.Error, output.ColorReset)
		fmt.Printf("  Stacks:  %d\n", data.Stack)
	},
}

var instanceInspectCmd = &cobra.Command{
	Use:   "inspect <id>",
	Short: "Inspect an instance",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/admin/instances/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to inspect instance: %v", err))
			os.Exit(1)
		}

		var inst instanceItem
		parseData(resp.Data, &inst)

		if getOutputFormat() == "json" {
			output.PrintJSON(inst)
			return
		}

		fmt.Printf("%sInstance #%d%s\n\n", output.ColorBold, inst.ID, output.ColorReset)
		fmt.Printf("  Challenge: %s\n", displayName(inst.ChallengeName, inst.ChallengeID))
		fmt.Printf("  Team:      %s\n", displayName(inst.TeamName, inst.TeamID))
		fmt.Printf("  Status:    %s\n", inst.Status)
		fmt.Printf("  Runtime:   %s\n", instanceRuntime(inst))
		fmt.Printf("  Entry:     %s\n", inst.ContainerID)
		fmt.Printf("  URL:       %s\n", emptyDash(inst.AccessURL))
		fmt.Printf("  Expires:   %s\n", inst.ExpiresAt)
		fmt.Printf("  Started:   %s\n", emptyDash(inst.StartedAt))
		if inst.StackID != "" {
			fmt.Printf("  Stack:     %s\n", inst.StackID)
			printStringMap("  Services", inst.Containers)
			printStringMap("  Networks", inst.Networks)
		}
		printStringMap("  Ports", inst.Ports)
	},
}

var instanceRemoveCmd = &cobra.Command{
	Use:   "remove <id>",
	Short: "Force remove an instance",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/admin/instances/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to remove instance: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Instance %s removed", args[0]))
	},
}

func init() {
	instanceListCmd.Flags().IntP("page", "p", 1, "Page number")
	instanceListCmd.Flags().String("status", "", "Filter by status")
	instanceListCmd.Flags().Int("competition-id", 0, "Filter by competition")
	instanceListCmd.Flags().Int("team-id", 0, "Filter by team")

	instanceCmd.AddCommand(instanceListCmd, instanceStatsCmd, instanceInspectCmd, instanceRemoveCmd)
}

func instanceRuntime(inst instanceItem) string {
	if inst.StackID == "" {
		return "single"
	}
	return fmt.Sprintf("stack(%d/%d)", len(inst.Containers), len(inst.Networks))
}

func displayName(name string, id int) string {
	if name != "" {
		return name
	}
	if id > 0 {
		return fmt.Sprintf("#%d", id)
	}
	return "-"
}

func emptyDash(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	return value
}

func printStringMap(title string, values map[string]string) {
	if len(values) == 0 {
		return
	}
	fmt.Printf("\n%s:\n", title)
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		fmt.Printf("    %s: %s\n", key, values[key])
	}
}
