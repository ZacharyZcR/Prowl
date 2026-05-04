package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/client"
	"github.com/ZacharyZcR/STC/cli/internal/config"
	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var version = "dev"
var outputFormat string

var rootCmd = &cobra.Command{
	Use:   "prowl",
	Short: "Prowl Range command line tool",
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&outputFormat, "output", "o", "", "Output format: json or table (default from config)")

	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(healthCmd)
	rootCmd.AddCommand(loginCmd)
	rootCmd.AddCommand(configCmd)
	rootCmd.AddCommand(userCmd)
	rootCmd.AddCommand(roleCmd)
	rootCmd.AddCommand(projectCmd)
	rootCmd.AddCommand(activityCmd)
	rootCmd.AddCommand(errorLogCmd)
	rootCmd.AddCommand(serverCmd)
	rootCmd.AddCommand(completionCmd)
	rootCmd.AddCommand(challengeCmd)
	rootCmd.AddCommand(competitionCmd)
	rootCmd.AddCommand(teamCmd)
	rootCmd.AddCommand(notificationCmd)
	rootCmd.AddCommand(awdCmd)
	rootCmd.AddCommand(redblueCmd)
	rootCmd.AddCommand(scenarioCmd)
	rootCmd.AddCommand(announcementCmd)
	rootCmd.AddCommand(instanceCmd)
	rootCmd.AddCommand(dockerCmd)
	rootCmd.AddCommand(writeupCmd)
	rootCmd.AddCommand(cronCmd)
	rootCmd.AddCommand(apiKeyCmd)
	rootCmd.AddCommand(dataCmd)
	rootCmd.AddCommand(dictCmd)
	rootCmd.AddCommand(loginLogCmd)
	rootCmd.AddCommand(queueCmd)
	rootCmd.AddCommand(analyticsCmd)
	rootCmd.AddCommand(anticheatCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func loadConfig() *config.Config {
	cfg, err := config.Load()
	if err != nil {
		output.Error(fmt.Sprintf("failed to load config: %v", err))
		os.Exit(1)
	}
	return cfg
}

func newClient() *client.Client {
	cfg := loadConfig()
	return client.New(cfg.ServerURL, cfg.Token)
}

func getOutputFormat() string {
	if outputFormat != "" {
		return outputFormat
	}
	cfg := loadConfig()
	if cfg.Output != "" {
		return cfg.Output
	}
	return "table"
}

func printResult(data interface{}, headers []string, toRows func(interface{}) [][]string) {
	if getOutputFormat() == "json" {
		output.PrintJSON(data)
		return
	}
	rows := toRows(data)
	output.PrintTable(headers, rows)
}

func parseData(raw json.RawMessage, v interface{}) {
	if err := json.Unmarshal(raw, v); err != nil {
		output.Error(fmt.Sprintf("failed to parse response data: %v", err))
		os.Exit(1)
	}
}
