package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var scenarioCmd = &cobra.Command{
	Use:   "scenario",
	Short: "Manage scenarios and objectives",
}

var scenarioListCmd = &cobra.Command{
	Use:   "list",
	Short: "List scenarios",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")
		search, _ := cmd.Flags().GetString("search")

		path := fmt.Sprintf("/api/v1/scenarios?page=%d", page)
		if search != "" {
			path += "&search=" + search
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list scenarios: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID          int    `json:"id"`
				Name        string `json:"name"`
				Description string `json:"description"`
				Difficulty  string `json:"difficulty"`
				CreatorName string `json:"creator_name"`
				CreatedAt   string `json:"created_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Name", "Description", "Difficulty", "Creator", "Created"}
		var rows [][]string
		for _, s := range data.Items {
			desc := s.Description
			if len(desc) > 30 {
				desc = desc[:27] + "..."
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", s.ID), s.Name, desc, s.Difficulty, s.CreatorName, s.CreatedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var scenarioGetCmd = &cobra.Command{
	Use:   "get <id>",
	Short: "Get scenario details",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/scenarios/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to get scenario: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var scenarioCreateCmd = &cobra.Command{
	Use:   "create <name>",
	Short: "Create a scenario",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{"name": args[0]}
		setIfChanged(cmd, body, "description", "description")
		setIfChanged(cmd, body, "difficulty", "difficulty")
		setIfChanged(cmd, body, "topology", "topology")
		setIfChanged(cmd, body, "docker-compose", "docker_compose")
		setIntIfChanged(cmd, body, "duration", "estimated_duration")

		resp, err := c.PostAPI("/api/v1/scenarios", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create scenario: %v", err))
			os.Exit(1)
		}
		var result struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Scenario '%s' created (ID: %d)", result.Name, result.ID))
	},
}

var scenarioUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update a scenario",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{}
		setIfChanged(cmd, body, "name", "name")
		setIfChanged(cmd, body, "description", "description")
		setIfChanged(cmd, body, "difficulty", "difficulty")
		setIfChanged(cmd, body, "topology", "topology")
		setIfChanged(cmd, body, "docker-compose", "docker_compose")
		setIntIfChanged(cmd, body, "duration", "estimated_duration")

		if len(body) == 0 {
			output.Warn("no fields to update")
			return
		}

		_, err := c.PutAPI("/api/v1/scenarios/"+args[0], body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to update scenario: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Scenario %s updated", args[0]))
	},
}

var scenarioDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a scenario",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/scenarios/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete scenario: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Scenario %s deleted", args[0]))
	},
}

var objectivesCmd = &cobra.Command{
	Use:   "objectives <comp-id>",
	Short: "List objectives for a competition",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/objectives")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list objectives: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var createObjectiveCmd = &cobra.Command{
	Use:   "create-objective <comp-id>",
	Short: "Create an objective",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		title, _ := cmd.Flags().GetString("title")
		teamRole, _ := cmd.Flags().GetString("team-role")
		points, _ := cmd.Flags().GetInt("points")
		desc, _ := cmd.Flags().GetString("description")
		order, _ := cmd.Flags().GetInt("order")

		url, _ := cmd.Flags().GetString("url")

		body := map[string]interface{}{
			"title":     title,
			"team_role": teamRole,
			"points":    points,
		}
		if url != "" {
			body["target_url"] = url
		}
		if desc != "" {
			body["description"] = desc
		}
		if order > 0 {
			body["order_num"] = order
		}
		if cmd.Flags().Changed("assign-to") {
			v, _ := cmd.Flags().GetInt("assign-to")
			body["assigned_team_id"] = v
		}

		resp, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/objectives", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create objective: %v", err))
			os.Exit(1)
		}
		var result struct {
			ID int `json:"id"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Objective created (ID: %d)", result.ID))
	},
}

var judgeObjectiveCmd = &cobra.Command{
	Use:   "judge-objective <comp-id> <objective-id> <completed|failed>",
	Short: "Judge an objective",
	Args:  cobra.ExactArgs(3),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{"status": args[2]}
		setIfChanged(cmd, body, "comment", "comment")
		setIntIfChanged(cmd, body, "points", "points")

		_, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/objectives/"+args[1]+"/judge", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to judge objective: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Objective %s → %s", args[1], args[2]))
	},
}

var judgeScoreCmd = &cobra.Command{
	Use:   "judge-score <comp-id>",
	Short: "Manually award score to a team",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		teamID, _ := cmd.Flags().GetInt("team-id")
		points, _ := cmd.Flags().GetInt("points")
		detail, _ := cmd.Flags().GetString("detail")

		body := map[string]interface{}{
			"team_id": teamID,
			"points":  points,
			"detail":  detail,
		}
		_, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/judge-score", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to judge score: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Awarded %d points to team %d", points, teamID))
	},
}

var batchCreateObjectivesCmd = &cobra.Command{
	Use:   "batch-objectives <comp-id> <json-file>",
	Short: "Batch import objectives from JSON file",
	Long: `Import objectives from a JSON file. File format:
[
  {"title":"...", "team_role":"red|blue|all", "points":100, "description":"...", "order_num":1, "assigned_team_id":0},
  ...
]`,
	Args: cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		data, err := os.ReadFile(args[1])
		if err != nil {
			output.Error(fmt.Sprintf("failed to read file: %v", err))
			os.Exit(1)
		}
		var objectives []map[string]interface{}
		if err := json.Unmarshal(data, &objectives); err != nil {
			output.Error(fmt.Sprintf("invalid JSON: %v", err))
			os.Exit(1)
		}
		body := map[string]interface{}{"objectives": objectives}
		resp, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/objectives/batch", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to batch create: %v", err))
			os.Exit(1)
		}
		var result struct {
			Created int `json:"created"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Imported %d objectives", result.Created))
	},
}

var assignObjectiveCmd = &cobra.Command{
	Use:   "assign-objective <comp-id> <objective-id> <team-id>",
	Short: "Assign an objective to a specific team",
	Args:  cobra.ExactArgs(3),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{"team_id": atoi(args[2])}
		_, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/objectives/"+args[1]+"/assign", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to assign: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Objective %s assigned to team %s", args[1], args[2]))
	},
}

var autoAssignCmd = &cobra.Command{
	Use:   "auto-assign <comp-id>",
	Short: "Auto-assign unassigned objectives to teams",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		role, _ := cmd.Flags().GetString("role")
		strategy, _ := cmd.Flags().GetString("strategy")
		body := map[string]interface{}{
			"team_role": role,
			"strategy":  strategy,
		}
		resp, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/objectives/auto-assign", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to auto-assign: %v", err))
			os.Exit(1)
		}
		var result struct {
			Assigned int `json:"assigned"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Auto-assigned %d objectives (role=%s, strategy=%s)", result.Assigned, role, strategy))
	},
}

func init() {
	scenarioListCmd.Flags().IntP("page", "p", 1, "Page number")
	scenarioListCmd.Flags().StringP("search", "s", "", "Search by name")

	scenarioCreateCmd.Flags().String("description", "", "Description")
	scenarioCreateCmd.Flags().String("difficulty", "", "Difficulty")
	scenarioCreateCmd.Flags().String("topology", "", "Topology description")
	scenarioCreateCmd.Flags().String("docker-compose", "", "Docker compose content")
	scenarioCreateCmd.Flags().Int("duration", 0, "Estimated duration in minutes")

	scenarioUpdateCmd.Flags().String("name", "", "Name")
	scenarioUpdateCmd.Flags().String("description", "", "Description")
	scenarioUpdateCmd.Flags().String("difficulty", "", "Difficulty")
	scenarioUpdateCmd.Flags().String("topology", "", "Topology")
	scenarioUpdateCmd.Flags().String("docker-compose", "", "Docker compose")
	scenarioUpdateCmd.Flags().Int("duration", 0, "Duration")

	createObjectiveCmd.Flags().String("title", "", "Title (required)")
	createObjectiveCmd.Flags().String("url", "", "Target URL")
	createObjectiveCmd.Flags().String("team-role", "all", "Team role: red|blue|all")
	createObjectiveCmd.Flags().Int("points", 100, "Points")
	createObjectiveCmd.Flags().String("description", "", "Description")
	createObjectiveCmd.Flags().Int("order", 0, "Order number")
	createObjectiveCmd.Flags().Int("assign-to", 0, "Assign to team ID")
	createObjectiveCmd.MarkFlagRequired("title")

	autoAssignCmd.Flags().String("role", "red", "Team role: red|blue")
	autoAssignCmd.Flags().String("strategy", "random", "Strategy: random|round_robin|duplicate")
	autoAssignCmd.MarkFlagRequired("role")

	judgeObjectiveCmd.Flags().String("comment", "", "Judge comment")
	judgeObjectiveCmd.Flags().Int("points", 0, "Override points")

	judgeScoreCmd.Flags().Int("team-id", 0, "Team ID (required)")
	judgeScoreCmd.Flags().Int("points", 0, "Points to award (required)")
	judgeScoreCmd.Flags().String("detail", "", "Detail/reason")
	judgeScoreCmd.MarkFlagRequired("team-id")
	judgeScoreCmd.MarkFlagRequired("points")

	scenarioCmd.AddCommand(scenarioListCmd, scenarioGetCmd, scenarioCreateCmd, scenarioUpdateCmd, scenarioDeleteCmd,
		objectivesCmd, createObjectiveCmd, batchCreateObjectivesCmd, assignObjectiveCmd, autoAssignCmd,
		judgeObjectiveCmd, judgeScoreCmd)
}
