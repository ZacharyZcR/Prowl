package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var challengeCmd = &cobra.Command{
	Use:   "challenge",
	Short: "Manage challenges",
}

var challengeListCmd = &cobra.Command{
	Use:   "list",
	Short: "List challenges",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		search, _ := cmd.Flags().GetString("search")
		mode, _ := cmd.Flags().GetString("mode")
		category, _ := cmd.Flags().GetString("category")
		difficulty, _ := cmd.Flags().GetString("difficulty")
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/challenges?page=%d", page)
		if search != "" {
			path += "&search=" + search
		}
		if mode != "" {
			path += "&mode=" + mode
		}
		if category != "" {
			path += "&category=" + category
		}
		if difficulty != "" {
			path += "&difficulty=" + difficulty
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list challenges: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID         int    `json:"id"`
				Title      string `json:"title"`
				Mode       string `json:"mode"`
				Category   string `json:"category"`
				Difficulty string `json:"difficulty"`
				BaseScore  int    `json:"base_score"`
				SolveCount int    `json:"solve_count"`
				IsDynamic  bool   `json:"is_dynamic"`
				IsHidden   bool   `json:"is_hidden"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Title", "Mode", "Category", "Difficulty", "Score", "Solves", "Dynamic", "Hidden"}
		var rows [][]string
		for _, ch := range data.Items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", ch.ID), ch.Title, ch.Mode, ch.Category, ch.Difficulty,
				fmt.Sprintf("%d", ch.BaseScore), fmt.Sprintf("%d", ch.SolveCount),
				fmt.Sprintf("%v", ch.IsDynamic), fmt.Sprintf("%v", ch.IsHidden),
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var challengeGetCmd = &cobra.Command{
	Use:   "get <id>",
	Short: "Get challenge details",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/challenges/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to get challenge: %v", err))
			os.Exit(1)
		}
		var data json.RawMessage
		parseData(resp.Data, &data)
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var challengeCreateCmd = &cobra.Command{
	Use:   "create <title>",
	Short: "Create a challenge",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{"title": args[0]}
		setIfChanged(cmd, body, "category", "category")
		setIfChanged(cmd, body, "difficulty", "difficulty")
		setIfChanged(cmd, body, "mode", "mode")
		setIfChanged(cmd, body, "flag-type", "flag_type")
		setIfChanged(cmd, body, "static-flag", "static_flag")
		setIfChanged(cmd, body, "description", "description")
		setIfChanged(cmd, body, "docker-image", "docker_image")
		setJSONFileIfChanged(cmd, body, "network-topology", "network_topology")
		if cmd.Flags().Changed("base-score") {
			v, _ := cmd.Flags().GetInt("base-score")
			body["base_score"] = v
		}
		if cmd.Flags().Changed("dynamic") {
			v, _ := cmd.Flags().GetBool("dynamic")
			body["is_dynamic"] = v
		}
		if cmd.Flags().Changed("hidden") {
			v, _ := cmd.Flags().GetBool("hidden")
			body["is_hidden"] = v
		}

		resp, err := c.PostAPI("/api/v1/challenges", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create challenge: %v", err))
			os.Exit(1)
		}

		var result struct {
			ID    int    `json:"id"`
			Title string `json:"title"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Challenge '%s' created (ID: %d)", result.Title, result.ID))
	},
}

var challengeUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update a challenge",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{}
		setIfChanged(cmd, body, "title", "title")
		setIfChanged(cmd, body, "category", "category")
		setIfChanged(cmd, body, "difficulty", "difficulty")
		setIfChanged(cmd, body, "mode", "mode")
		setIfChanged(cmd, body, "flag-type", "flag_type")
		setIfChanged(cmd, body, "static-flag", "static_flag")
		setIfChanged(cmd, body, "description", "description")
		setIfChanged(cmd, body, "docker-image", "docker_image")
		setJSONFileIfChanged(cmd, body, "network-topology", "network_topology")
		if cmd.Flags().Changed("base-score") {
			v, _ := cmd.Flags().GetInt("base-score")
			body["base_score"] = v
		}
		if cmd.Flags().Changed("dynamic") {
			v, _ := cmd.Flags().GetBool("dynamic")
			body["is_dynamic"] = v
		}
		if cmd.Flags().Changed("hidden") {
			v, _ := cmd.Flags().GetBool("hidden")
			body["is_hidden"] = v
		}

		if len(body) == 0 {
			output.Warn("no fields to update")
			return
		}

		_, err := c.PutAPI("/api/v1/challenges/"+args[0], body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to update challenge: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Challenge %s updated", args[0]))
	},
}

var challengeDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a challenge",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/challenges/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete challenge: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Challenge %s deleted", args[0]))
	},
}

var challengeAddHintCmd = &cobra.Command{
	Use:   "add-hint <challenge-id>",
	Short: "Add a hint to a challenge",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		content, _ := cmd.Flags().GetString("content")
		cost, _ := cmd.Flags().GetInt("cost")
		order, _ := cmd.Flags().GetInt("order")

		body := map[string]interface{}{"content": content, "cost": cost, "order_num": order}
		resp, err := c.PostAPI("/api/v1/challenges/"+args[0]+"/hints", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to add hint: %v", err))
			os.Exit(1)
		}

		var result struct {
			ID int `json:"id"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Hint created (ID: %d)", result.ID))
	},
}

var challengeDeleteHintCmd = &cobra.Command{
	Use:   "delete-hint <challenge-id> <hint-id>",
	Short: "Delete a hint",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/challenges/" + args[0] + "/hints/" + args[1])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete hint: %v", err))
			os.Exit(1)
		}
		output.Success("Hint deleted")
	},
}

func setIfChanged(cmd *cobra.Command, body map[string]interface{}, flag, key string) {
	if cmd.Flags().Changed(flag) {
		v, _ := cmd.Flags().GetString(flag)
		body[key] = v
	}
}

func setJSONFileIfChanged(cmd *cobra.Command, body map[string]interface{}, flag, key string) {
	if !cmd.Flags().Changed(flag) {
		return
	}
	path, _ := cmd.Flags().GetString(flag)
	data, err := os.ReadFile(path)
	if err != nil {
		output.Error(fmt.Sprintf("failed to read %s: %v", path, err))
		os.Exit(1)
	}
	var value interface{}
	if err := json.Unmarshal(data, &value); err != nil {
		output.Error(fmt.Sprintf("failed to parse %s: %v", path, err))
		os.Exit(1)
	}
	body[key] = value
}

func setIntIfChanged(cmd *cobra.Command, body map[string]interface{}, flag, key string) {
	if cmd.Flags().Changed(flag) {
		v, _ := cmd.Flags().GetInt(flag)
		body[key] = v
	}
}

func setFloat64IfChanged(cmd *cobra.Command, body map[string]interface{}, flag, key string) {
	if cmd.Flags().Changed(flag) {
		v, _ := cmd.Flags().GetFloat64(flag)
		body[key] = v
	}
}

func setBoolIfChanged(cmd *cobra.Command, body map[string]interface{}, flag, key string) {
	if cmd.Flags().Changed(flag) {
		v, _ := cmd.Flags().GetBool(flag)
		body[key] = v
	}
}

func atoi(s string) int {
	v, _ := strconv.Atoi(s)
	return v
}

func init() {
	challengeListCmd.Flags().StringP("search", "s", "", "Search by title")
	challengeListCmd.Flags().String("mode", "", "Filter: ctf_jeopardy|awd|red_blue")
	challengeListCmd.Flags().String("category", "", "Filter by category")
	challengeListCmd.Flags().String("difficulty", "", "Filter: easy|medium|hard|insane")
	challengeListCmd.Flags().IntP("page", "p", 1, "Page number")

	challengeCreateCmd.Flags().String("category", "misc", "Category")
	challengeCreateCmd.Flags().String("difficulty", "easy", "Difficulty")
	challengeCreateCmd.Flags().String("mode", "ctf_jeopardy", "Mode")
	challengeCreateCmd.Flags().String("flag-type", "static", "Flag type: static|dynamic_per_team|regex")
	challengeCreateCmd.Flags().String("static-flag", "", "Static flag value")
	challengeCreateCmd.Flags().String("description", "", "Description")
	challengeCreateCmd.Flags().String("docker-image", "", "Docker image for dynamic challenge")
	challengeCreateCmd.Flags().String("network-topology", "", "Path to network topology JSON")
	challengeCreateCmd.Flags().Int("base-score", 100, "Base score")
	challengeCreateCmd.Flags().Bool("dynamic", false, "Is dynamic (container-based)")
	challengeCreateCmd.Flags().Bool("hidden", false, "Is hidden")

	challengeUpdateCmd.Flags().String("title", "", "Title")
	challengeUpdateCmd.Flags().String("category", "", "Category")
	challengeUpdateCmd.Flags().String("difficulty", "", "Difficulty")
	challengeUpdateCmd.Flags().String("mode", "", "Mode")
	challengeUpdateCmd.Flags().String("flag-type", "", "Flag type")
	challengeUpdateCmd.Flags().String("static-flag", "", "Static flag")
	challengeUpdateCmd.Flags().String("description", "", "Description")
	challengeUpdateCmd.Flags().String("docker-image", "", "Docker image")
	challengeUpdateCmd.Flags().String("network-topology", "", "Path to network topology JSON")
	challengeUpdateCmd.Flags().Int("base-score", 0, "Base score")
	challengeUpdateCmd.Flags().Bool("dynamic", false, "Is dynamic")
	challengeUpdateCmd.Flags().Bool("hidden", false, "Is hidden")

	challengeAddHintCmd.Flags().String("content", "", "Hint content (required)")
	challengeAddHintCmd.Flags().Int("cost", 0, "Hint cost in points")
	challengeAddHintCmd.Flags().Int("order", 0, "Hint order")
	challengeAddHintCmd.MarkFlagRequired("content")

	challengeCmd.AddCommand(challengeListCmd, challengeGetCmd, challengeCreateCmd, challengeUpdateCmd, challengeDeleteCmd, challengeAddHintCmd, challengeDeleteHintCmd)
}
