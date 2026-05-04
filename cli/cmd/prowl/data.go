package main

import (
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var dataCmd = &cobra.Command{
	Use:   "data",
	Short: "Data import/export",
}

var dataExportUsersCmd = &cobra.Command{
	Use:   "export-users [file]",
	Short: "Export users to CSV",
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		filename := "users_export.csv"
		if len(args) > 0 {
			filename = args[0]
		}
		exportToFile(c, "/api/v1/data/export/users", filename)
	},
}

var dataExportProjectsCmd = &cobra.Command{
	Use:   "export-projects [file]",
	Short: "Export projects to CSV",
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		filename := "projects_export.csv"
		if len(args) > 0 {
			filename = args[0]
		}
		exportToFile(c, "/api/v1/data/export/projects", filename)
	},
}

var dataExportRolesCmd = &cobra.Command{
	Use:   "export-roles [file]",
	Short: "Export roles to CSV",
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		filename := "roles_export.csv"
		if len(args) > 0 {
			filename = args[0]
		}
		exportToFile(c, "/api/v1/data/export/roles", filename)
	},
}

var dataImportUsersCmd = &cobra.Command{
	Use:   "import-users <file>",
	Short: "Import users from CSV",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		output.Error("file import via CLI not yet implemented — use the web UI or curl")
		os.Exit(1)
	},
}

var dataImportProjectsCmd = &cobra.Command{
	Use:   "import-projects <file>",
	Short: "Import projects from CSV",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		output.Error("file import via CLI not yet implemented — use the web UI or curl")
		os.Exit(1)
	},
}

func init() {
	dataCmd.AddCommand(dataExportUsersCmd, dataExportProjectsCmd, dataExportRolesCmd,
		dataImportUsersCmd, dataImportProjectsCmd)
}
