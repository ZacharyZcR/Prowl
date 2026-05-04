package main

import (
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage CLI configuration",
}

var configSetCmd = &cobra.Command{
	Use:   "set <key> <value>",
	Short: "Set a configuration value",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		cfg := loadConfig()
		if err := cfg.Set(args[0], args[1]); err != nil {
			output.Error(fmt.Sprintf("%v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Set %s = %s", args[0], args[1]))
	},
}

var configGetCmd = &cobra.Command{
	Use:   "get <key>",
	Short: "Get a configuration value",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		cfg := loadConfig()
		val := cfg.Get(args[0])
		if val == "" {
			output.Warn(fmt.Sprintf("%s is not set", args[0]))
			return
		}
		fmt.Println(val)
	},
}

var configListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all configuration values",
	Run: func(cmd *cobra.Command, args []string) {
		cfg := loadConfig()
		items := cfg.List()

		if getOutputFormat() == "json" {
			output.PrintJSON(items)
			return
		}

		for k, v := range items {
			if v == "" {
				v = output.Dim("(not set)")
			}
			fmt.Printf("%-12s %s\n", k, v)
		}
	},
}

func init() {
	configCmd.AddCommand(configSetCmd, configGetCmd, configListCmd)
}
