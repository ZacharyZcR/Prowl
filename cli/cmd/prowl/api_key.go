package main

import (
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var apiKeyCmd = &cobra.Command{
	Use:   "api-key",
	Short: "Manage API keys",
}

var apiKeyListCmd = &cobra.Command{
	Use:   "list",
	Short: "List API keys",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/api-keys")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list API keys: %v", err))
			os.Exit(1)
		}

		var items []struct {
			ID         int    `json:"id"`
			Name       string `json:"name"`
			KeyPrefix  string `json:"key_prefix"`
			Enabled    bool   `json:"enabled"`
			ExpiresAt  string `json:"expires_at"`
			LastUsedAt string `json:"last_used_at"`
			CreatedAt  string `json:"created_at"`
		}
		parseData(resp.Data, &items)

		if getOutputFormat() == "json" {
			output.PrintJSON(items)
			return
		}

		headers := []string{"ID", "Name", "Prefix", "Enabled", "Expires", "Last Used", "Created"}
		var rows [][]string
		for _, k := range items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", k.ID), k.Name, k.KeyPrefix,
				fmt.Sprintf("%v", k.Enabled), k.ExpiresAt, k.LastUsedAt, k.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
	},
}

var apiKeyGenerateCmd = &cobra.Command{
	Use:   "generate",
	Short: "Generate a new API key",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		name, _ := cmd.Flags().GetString("name")
		body := map[string]interface{}{"name": name}
		if cmd.Flags().Changed("expires-at") {
			v, _ := cmd.Flags().GetString("expires-at")
			body["expires_at"] = v
		}

		resp, err := c.PostAPI("/api/v1/api-keys", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to generate API key: %v", err))
			os.Exit(1)
		}

		var result struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
			Key  string `json:"key"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("API key '%s' generated (ID: %d)", result.Name, result.ID))
		fmt.Printf("\nKey: %s\n", result.Key)
		output.Warn("Save this key now — it won't be shown again")
	},
}

var apiKeyRevokeCmd = &cobra.Command{
	Use:   "revoke <id>",
	Short: "Revoke an API key",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/api-keys/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to revoke API key: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("API key %s revoked", args[0]))
	},
}

func init() {
	apiKeyGenerateCmd.Flags().String("name", "", "Key name (required)")
	apiKeyGenerateCmd.Flags().String("expires-at", "", "Expiry time (RFC3339)")
	apiKeyGenerateCmd.MarkFlagRequired("name")

	apiKeyCmd.AddCommand(apiKeyListCmd, apiKeyGenerateCmd, apiKeyRevokeCmd)
}
