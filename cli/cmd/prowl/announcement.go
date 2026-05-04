package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var announcementCmd = &cobra.Command{
	Use:   "announcement",
	Short: "Manage announcements",
}

var annoListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all announcements",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/announcements")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list announcements: %v", err))
			os.Exit(1)
		}

		var items []struct {
			ID          int    `json:"id"`
			Title       string `json:"title"`
			Priority    string `json:"priority"`
			Published   bool   `json:"published"`
			PublishedAt string `json:"published_at"`
			CreatedAt   string `json:"created_at"`
		}
		parseData(resp.Data, &items)

		if getOutputFormat() == "json" {
			output.PrintJSON(items)
			return
		}

		headers := []string{"ID", "Title", "Priority", "Published", "Published At", "Created"}
		var rows [][]string
		for _, a := range items {
			title := a.Title
			if len(title) > 40 {
				title = title[:37] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", a.ID), title, a.Priority,
				fmt.Sprintf("%v", a.Published), a.PublishedAt, a.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
	},
}

var annoActiveCmd = &cobra.Command{
	Use:   "active",
	Short: "List active announcements",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/announcements/active")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list active announcements: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var annoGetCmd = &cobra.Command{
	Use:   "get <id>",
	Short: "Get announcement details",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/announcements/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to get announcement: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var annoCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create an announcement",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		title, _ := cmd.Flags().GetString("title")
		content, _ := cmd.Flags().GetString("content")
		priority, _ := cmd.Flags().GetString("priority")

		body := map[string]interface{}{
			"title":    title,
			"content":  content,
			"priority": priority,
		}
		if cmd.Flags().Changed("expires-at") {
			v, _ := cmd.Flags().GetString("expires-at")
			body["expires_at"] = v
		}

		resp, err := c.PostAPI("/api/v1/announcements", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create announcement: %v", err))
			os.Exit(1)
		}
		var result struct {
			ID    int    `json:"id"`
			Title string `json:"title"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Announcement '%s' created (ID: %d)", result.Title, result.ID))
	},
}

var annoUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update an announcement",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{}
		setIfChanged(cmd, body, "title", "title")
		setIfChanged(cmd, body, "content", "content")
		setIfChanged(cmd, body, "priority", "priority")
		setIfChanged(cmd, body, "expires-at", "expires_at")

		if len(body) == 0 {
			output.Warn("no fields to update")
			return
		}

		_, err := c.PutAPI("/api/v1/announcements/"+args[0], body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to update announcement: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Announcement %s updated", args[0]))
	},
}

var annoDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete an announcement",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/announcements/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete announcement: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Announcement %s deleted", args[0]))
	},
}

var annoPublishCmd = &cobra.Command{
	Use:   "publish <id>",
	Short: "Publish an announcement",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/announcements/"+args[0]+"/publish", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to publish: %v", err))
			os.Exit(1)
		}
		output.Success("Announcement published")
	},
}

var annoUnpublishCmd = &cobra.Command{
	Use:   "unpublish <id>",
	Short: "Unpublish an announcement",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/announcements/"+args[0]+"/unpublish", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to unpublish: %v", err))
			os.Exit(1)
		}
		output.Success("Announcement unpublished")
	},
}

func init() {
	annoCreateCmd.Flags().String("title", "", "Title (required)")
	annoCreateCmd.Flags().String("content", "", "Content")
	annoCreateCmd.Flags().String("priority", "info", "Priority: info|warning|critical")
	annoCreateCmd.Flags().String("expires-at", "", "Expiry time (RFC3339)")
	annoCreateCmd.MarkFlagRequired("title")

	annoUpdateCmd.Flags().String("title", "", "Title")
	annoUpdateCmd.Flags().String("content", "", "Content")
	annoUpdateCmd.Flags().String("priority", "", "Priority")
	annoUpdateCmd.Flags().String("expires-at", "", "Expiry time")

	announcementCmd.AddCommand(annoListCmd, annoActiveCmd, annoGetCmd, annoCreateCmd, annoUpdateCmd,
		annoDeleteCmd, annoPublishCmd, annoUnpublishCmd)
}
