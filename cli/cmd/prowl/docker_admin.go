package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var dockerCmd = &cobra.Command{
	Use:   "docker",
	Short: "Docker management (admin)",
}

var dockerImagesCmd = &cobra.Command{
	Use:   "images",
	Short: "List Docker images",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/admin/docker/images")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list images: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var dockerPullCmd = &cobra.Command{
	Use:   "pull <image>",
	Short: "Pull a Docker image",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PostAPI("/api/v1/admin/docker/images/pull", map[string]string{"image": args[0]})
		if err != nil {
			output.Error(fmt.Sprintf("failed to pull image: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Image %s pulled", args[0]))
	},
}

var dockerRemoveImageCmd = &cobra.Command{
	Use:   "remove-image <image-id>",
	Short: "Remove a Docker image",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/admin/docker/images/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to remove image: %v", err))
			os.Exit(1)
		}
		output.Success("Image removed")
	},
}

var dockerRenewCmd = &cobra.Command{
	Use:   "renew <instance-id>",
	Short: "Renew an instance's expiry",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		seconds, _ := cmd.Flags().GetInt("seconds")
		path := fmt.Sprintf("/api/v1/admin/docker/instances/%s/renew?seconds=%d", args[0], seconds)
		resp, err := c.PutAPI(path, nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to renew: %v", err))
			os.Exit(1)
		}
		var result struct {
			Renewed int `json:"renewed_seconds"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Instance renewed by %d seconds", result.Renewed))
	},
}

var dockerCleanupCmd = &cobra.Command{
	Use:   "cleanup",
	Short: "Batch cleanup expired instances",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.PostAPI("/api/v1/admin/docker/instances/cleanup", nil)
		if err != nil {
			output.Error(fmt.Sprintf("failed to cleanup: %v", err))
			os.Exit(1)
		}
		var result struct {
			Cleaned int `json:"cleaned"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Cleaned up %d instances", result.Cleaned))
	},
}

func init() {
	dockerRenewCmd.Flags().Int("seconds", 3600, "Renewal duration in seconds")
	dockerCmd.AddCommand(dockerImagesCmd, dockerPullCmd, dockerRemoveImageCmd, dockerRenewCmd, dockerCleanupCmd)
}
