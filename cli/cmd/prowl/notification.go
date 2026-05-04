package main

import (
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var notificationCmd = &cobra.Command{
	Use:   "notification",
	Short: "Manage notifications",
}

var notifListCmd = &cobra.Command{
	Use:   "list",
	Short: "List notifications",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")
		unreadOnly, _ := cmd.Flags().GetBool("unread")

		path := fmt.Sprintf("/api/v1/notifications?page=%d", page)
		if unreadOnly {
			path += "&unread_only=true"
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list notifications: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID        int    `json:"id"`
				Title     string `json:"title"`
				Content   string `json:"content"`
				Type      string `json:"type"`
				Read      bool   `json:"read"`
				CreatedAt string `json:"created_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Title", "Type", "Read", "Created"}
		var rows [][]string
		for _, n := range data.Items {
			title := n.Title
			if len(title) > 40 {
				title = title[:37] + "..."
			}
			readStr := "no"
			if n.Read {
				readStr = output.Dim("yes")
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", n.ID), title, n.Type, readStr, n.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var notifUnreadCmd = &cobra.Command{
	Use:   "unread-count",
	Short: "Show unread notification count",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/notifications/unread-count")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get unread count: %v", err))
			os.Exit(1)
		}
		var data struct {
			Count int `json:"count"`
		}
		parseData(resp.Data, &data)
		fmt.Printf("Unread: %d\n", data.Count)
	},
}

var notifReadCmd = &cobra.Command{
	Use:   "read <id>",
	Short: "Mark notification as read",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/notifications/"+args[0]+"/read", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to mark read: %v", err))
			os.Exit(1)
		}
		output.Success("Marked as read")
	},
}

var notifReadAllCmd = &cobra.Command{
	Use:   "read-all",
	Short: "Mark all notifications as read",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/notifications/read-all", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to mark all read: %v", err))
			os.Exit(1)
		}
		output.Success("All notifications marked as read")
	},
}

var notifCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Send a notification",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		userID, _ := cmd.Flags().GetInt("user-id")
		title, _ := cmd.Flags().GetString("title")
		content, _ := cmd.Flags().GetString("content")
		nType, _ := cmd.Flags().GetString("type")

		body := map[string]interface{}{
			"user_id": userID,
			"title":   title,
			"content": content,
			"type":    nType,
		}
		_, err := c.PostAPI("/api/v1/notifications", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create notification: %v", err))
			os.Exit(1)
		}
		output.Success("Notification sent")
	},
}

func init() {
	notifListCmd.Flags().IntP("page", "p", 1, "Page number")
	notifListCmd.Flags().Bool("unread", false, "Only show unread")

	notifCreateCmd.Flags().Int("user-id", 0, "Target user ID (required)")
	notifCreateCmd.Flags().String("title", "", "Title (required)")
	notifCreateCmd.Flags().String("content", "", "Content")
	notifCreateCmd.Flags().String("type", "info", "Type: info|success|warning|error")
	notifCreateCmd.MarkFlagRequired("user-id")
	notifCreateCmd.MarkFlagRequired("title")

	notificationCmd.AddCommand(notifListCmd, notifUnreadCmd, notifReadCmd, notifReadAllCmd, notifCreateCmd)
}
