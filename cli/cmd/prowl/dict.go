package main

import (
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var dictCmd = &cobra.Command{
	Use:   "dict",
	Short: "Manage dictionaries",
}

var dictListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all dictionary entries",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/dicts")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list dicts: %v", err))
			os.Exit(1)
		}

		var items []struct {
			ID        int    `json:"id"`
			GroupName string `json:"group_name"`
			Key       string `json:"key"`
			Label     string `json:"label"`
			Value     string `json:"value"`
			SortOrder int    `json:"sort_order"`
			Enabled   bool   `json:"enabled"`
		}
		parseData(resp.Data, &items)

		if getOutputFormat() == "json" {
			output.PrintJSON(items)
			return
		}

		headers := []string{"ID", "Group", "Key", "Label", "Value", "Order", "Enabled"}
		var rows [][]string
		for _, d := range items {
			val := d.Value
			if len(val) > 30 {
				val = val[:27] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", d.ID), d.GroupName, d.Key, d.Label, val,
				fmt.Sprintf("%d", d.SortOrder), fmt.Sprintf("%v", d.Enabled),
			})
		}
		output.PrintTable(headers, rows)
	},
}

var dictGroupsCmd = &cobra.Command{
	Use:   "groups",
	Short: "List dictionary groups",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/dicts/groups")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list groups: %v", err))
			os.Exit(1)
		}
		var groups []string
		parseData(resp.Data, &groups)

		if getOutputFormat() == "json" {
			output.PrintJSON(groups)
			return
		}

		for _, g := range groups {
			fmt.Println(g)
		}
	},
}

var dictGroupCmd = &cobra.Command{
	Use:   "group <name>",
	Short: "List entries in a group",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/dicts/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to list group: %v", err))
			os.Exit(1)
		}

		var items []struct {
			ID    int    `json:"id"`
			Key   string `json:"key"`
			Label string `json:"label"`
			Value string `json:"value"`
		}
		parseData(resp.Data, &items)

		if getOutputFormat() == "json" {
			output.PrintJSON(items)
			return
		}

		headers := []string{"ID", "Key", "Label", "Value"}
		var rows [][]string
		for _, d := range items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", d.ID), d.Key, d.Label, d.Value,
			})
		}
		output.PrintTable(headers, rows)
	},
}

var dictCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a dictionary entry",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		group, _ := cmd.Flags().GetString("group")
		key, _ := cmd.Flags().GetString("key")
		label, _ := cmd.Flags().GetString("label")
		value, _ := cmd.Flags().GetString("value")
		order, _ := cmd.Flags().GetInt("order")

		body := map[string]interface{}{
			"group_name": group,
			"key":        key,
			"label":      label,
			"value":      value,
			"sort_order": order,
		}
		resp, err := c.PostAPI("/api/v1/dicts", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create dict: %v", err))
			os.Exit(1)
		}
		var result struct {
			ID int `json:"id"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Dict entry created (ID: %d)", result.ID))
	},
}

var dictUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update a dictionary entry",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{}
		setIfChanged(cmd, body, "group", "group_name")
		setIfChanged(cmd, body, "key", "key")
		setIfChanged(cmd, body, "label", "label")
		setIfChanged(cmd, body, "value", "value")
		setIntIfChanged(cmd, body, "order", "sort_order")
		setBoolIfChanged(cmd, body, "enabled", "enabled")

		if len(body) == 0 {
			output.Warn("no fields to update")
			return
		}

		_, err := c.PutAPI("/api/v1/dicts/"+args[0], body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to update dict: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Dict entry %s updated", args[0]))
	},
}

var dictToggleCmd = &cobra.Command{
	Use:   "toggle <id>",
	Short: "Toggle a dictionary entry",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/dicts/"+args[0]+"/toggle", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to toggle dict: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Dict entry %s toggled", args[0]))
	},
}

var dictDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a dictionary entry",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/dicts/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete dict: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Dict entry %s deleted", args[0]))
	},
}

func init() {
	dictCreateCmd.Flags().String("group", "", "Group name (required)")
	dictCreateCmd.Flags().String("key", "", "Key (required)")
	dictCreateCmd.Flags().String("label", "", "Label (required)")
	dictCreateCmd.Flags().String("value", "", "Value")
	dictCreateCmd.Flags().Int("order", 0, "Sort order")
	dictCreateCmd.MarkFlagRequired("group")
	dictCreateCmd.MarkFlagRequired("key")
	dictCreateCmd.MarkFlagRequired("label")

	dictUpdateCmd.Flags().String("group", "", "Group name")
	dictUpdateCmd.Flags().String("key", "", "Key")
	dictUpdateCmd.Flags().String("label", "", "Label")
	dictUpdateCmd.Flags().String("value", "", "Value")
	dictUpdateCmd.Flags().Int("order", 0, "Sort order")
	dictUpdateCmd.Flags().Bool("enabled", false, "Enabled")

	dictCmd.AddCommand(dictListCmd, dictGroupsCmd, dictGroupCmd, dictCreateCmd, dictUpdateCmd, dictToggleCmd, dictDeleteCmd)
}
