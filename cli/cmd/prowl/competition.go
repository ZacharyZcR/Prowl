package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/ZacharyZcR/STC/cli/internal/output"
	"github.com/spf13/cobra"
)

var competitionCmd = &cobra.Command{
	Use:   "competition",
	Short: "Manage competitions",
}

var compListCmd = &cobra.Command{
	Use:   "list",
	Short: "List competitions",
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		search, _ := cmd.Flags().GetString("search")
		mode, _ := cmd.Flags().GetString("mode")
		status, _ := cmd.Flags().GetString("status")
		page, _ := cmd.Flags().GetInt("page")

		path := fmt.Sprintf("/api/v1/competitions?page=%d", page)
		if search != "" {
			path += "&search=" + search
		}
		if mode != "" {
			path += "&mode=" + mode
		}
		if status != "" {
			path += "&status=" + status
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list competitions: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID             int    `json:"id"`
				Title          string `json:"title"`
				Mode           string `json:"mode"`
				Status         string `json:"status"`
				TeamCount      int    `json:"team_count"`
				ChallengeCount int    `json:"challenge_count"`
				StartTime      string `json:"start_time"`
				EndTime        string `json:"end_time"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Title", "Mode", "Status", "Teams", "Challenges", "Start", "End"}
		var rows [][]string
		for _, co := range data.Items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", co.ID), co.Title, co.Mode, co.Status,
				fmt.Sprintf("%d", co.TeamCount), fmt.Sprintf("%d", co.ChallengeCount),
				co.StartTime, co.EndTime,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var compGetCmd = &cobra.Command{
	Use:   "get <id>",
	Short: "Get competition details",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to get competition: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var compCreateCmd = &cobra.Command{
	Use:   "create <title>",
	Short: "Create a competition",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{"title": args[0]}
		setIfChanged(cmd, body, "mode", "mode")
		setIfChanged(cmd, body, "description", "description")
		setIfChanged(cmd, body, "start-time", "start_time")
		setIfChanged(cmd, body, "end-time", "end_time")
		setIfChanged(cmd, body, "reg-start", "registration_start")
		setIfChanged(cmd, body, "reg-end", "registration_end")
		setIfChanged(cmd, body, "rules", "rules")
		setIntIfChanged(cmd, body, "max-teams", "max_teams")
		setIntIfChanged(cmd, body, "max-team-size", "max_team_size")
		setIntIfChanged(cmd, body, "submit-interval", "submit_interval_seconds")
		setBoolIfChanged(cmd, body, "public", "is_public")

		resp, err := c.PostAPI("/api/v1/competitions", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to create competition: %v", err))
			os.Exit(1)
		}

		var result struct {
			ID    int    `json:"id"`
			Title string `json:"title"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Competition '%s' created (ID: %d)", result.Title, result.ID))
	},
}

var compUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update a competition",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		body := map[string]interface{}{}
		setIfChanged(cmd, body, "title", "title")
		setIfChanged(cmd, body, "mode", "mode")
		setIfChanged(cmd, body, "description", "description")
		setIfChanged(cmd, body, "start-time", "start_time")
		setIfChanged(cmd, body, "end-time", "end_time")
		setIfChanged(cmd, body, "reg-start", "registration_start")
		setIfChanged(cmd, body, "reg-end", "registration_end")
		setIfChanged(cmd, body, "rules", "rules")
		setIntIfChanged(cmd, body, "max-teams", "max_teams")
		setIntIfChanged(cmd, body, "max-team-size", "max_team_size")
		setIntIfChanged(cmd, body, "submit-interval", "submit_interval_seconds")
		setBoolIfChanged(cmd, body, "public", "is_public")

		if len(body) == 0 {
			output.Warn("no fields to update")
			return
		}

		_, err := c.PutAPI("/api/v1/competitions/"+args[0], body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to update competition: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Competition %s updated", args[0]))
	},
}

var compDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a competition",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/competitions/" + args[0])
		if err != nil {
			output.Error(fmt.Sprintf("failed to delete competition: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Competition %s deleted", args[0]))
	},
}

var compStatusCmd = &cobra.Command{
	Use:   "status <id> <status>",
	Short: "Update competition status (draft|registration|running|paused|ended|archived)",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/status", map[string]string{"status": args[1]})
		if err != nil {
			output.Error(fmt.Sprintf("failed to update status: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Competition %s status → %s", args[0], args[1]))
	},
}

var compAttachCmd = &cobra.Command{
	Use:   "attach-challenge <comp-id> <challenge-id>",
	Short: "Attach a challenge to competition",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		order, _ := cmd.Flags().GetInt("order")
		body := map[string]interface{}{
			"challenge_id": atoi(args[1]),
			"order_num":    order,
			"is_visible":   true,
		}
		_, err := c.PostAPI("/api/v1/competitions/"+args[0]+"/challenges", body)
		if err != nil {
			output.Error(fmt.Sprintf("failed to attach challenge: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Challenge %s attached to competition %s", args[1], args[0]))
	},
}

var compDetachCmd = &cobra.Command{
	Use:   "detach-challenge <comp-id> <challenge-id>",
	Short: "Detach a challenge from competition",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.DeleteAPI("/api/v1/competitions/" + args[0] + "/challenges/" + args[1])
		if err != nil {
			output.Error(fmt.Sprintf("failed to detach challenge: %v", err))
			os.Exit(1)
		}
		output.Success("Challenge detached")
	},
}

var compChallengesCmd = &cobra.Command{
	Use:   "challenges <comp-id>",
	Short: "List challenges in a competition",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/challenges-list")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list challenges: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var compRegistrationsCmd = &cobra.Command{
	Use:   "registrations <comp-id>",
	Short: "List registrations",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/registrations")
		if err != nil {
			output.Error(fmt.Sprintf("failed to list registrations: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var compReviewRegCmd = &cobra.Command{
	Use:   "review-reg <comp-id> <reg-id> <approved|rejected>",
	Short: "Review a registration",
	Args:  cobra.ExactArgs(3),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		_, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/registrations/"+args[1], map[string]string{"status": args[2]})
		if err != nil {
			output.Error(fmt.Sprintf("failed to review registration: %v", err))
			os.Exit(1)
		}
		output.Success(fmt.Sprintf("Registration %s → %s", args[1], args[2]))
	},
}

var compSubmissionsCmd = &cobra.Command{
	Use:   "submissions <comp-id>",
	Short: "List flag submissions",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		page, _ := cmd.Flags().GetInt("page")
		path := fmt.Sprintf("/api/v1/competitions/%s/submissions?page=%d", args[0], page)
		if cmd.Flags().Changed("team-id") {
			v, _ := cmd.Flags().GetInt("team-id")
			path += fmt.Sprintf("&team_id=%d", v)
		}
		if cmd.Flags().Changed("challenge-id") {
			v, _ := cmd.Flags().GetInt("challenge-id")
			path += fmt.Sprintf("&challenge_id=%d", v)
		}

		resp, err := c.GetAPI(path)
		if err != nil {
			output.Error(fmt.Sprintf("failed to list submissions: %v", err))
			os.Exit(1)
		}

		var data struct {
			Items []struct {
				ID            int    `json:"id"`
				ChallengeName string `json:"challenge_name"`
				TeamName      string `json:"team_name"`
				Username      string `json:"username"`
				IsCorrect     bool   `json:"is_correct"`
				Points        int    `json:"points_awarded"`
				FirstBlood    bool   `json:"is_first_blood"`
				SubmittedAt   string `json:"submitted_at"`
			} `json:"items"`
			Total int `json:"total"`
			Page  int `json:"page"`
		}
		parseData(resp.Data, &data)

		if getOutputFormat() == "json" {
			output.PrintJSON(data)
			return
		}

		headers := []string{"ID", "Challenge", "Team", "User", "Correct", "Points", "FB", "Time"}
		var rows [][]string
		for _, s := range data.Items {
			rows = append(rows, []string{
				fmt.Sprintf("%d", s.ID), s.ChallengeName, s.TeamName, s.Username,
				fmt.Sprintf("%v", s.IsCorrect), fmt.Sprintf("%d", s.Points),
				fmt.Sprintf("%v", s.FirstBlood), s.SubmittedAt,
			})
		}
		output.PrintTable(headers, rows)
		output.Info(fmt.Sprintf("Total: %d, Page: %d", data.Total, data.Page))
	},
}

var compScoreboardCmd = &cobra.Command{
	Use:   "scoreboard <comp-id>",
	Short: "Get competition scoreboard",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		resp, err := c.GetAPI("/api/v1/competitions/" + args[0] + "/scoreboard")
		if err != nil {
			output.Error(fmt.Sprintf("failed to get scoreboard: %v", err))
			os.Exit(1)
		}
		output.PrintJSON(json.RawMessage(resp.Data))
	},
}

var compExportRankingCmd = &cobra.Command{
	Use:   "export-ranking <comp-id> [file]",
	Short: "Export ranking to CSV",
	Args:  cobra.RangeArgs(1, 2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		filename := fmt.Sprintf("ranking_%s_%s.csv", args[0], time.Now().Format("20060102"))
		if len(args) > 1 {
			filename = args[1]
		}
		exportToFile(c, fmt.Sprintf("/api/v1/competitions/%s/export/ranking", args[0]), filename)
	},
}

var compExportSubmissionsCmd = &cobra.Command{
	Use:   "export-submissions <comp-id> [file]",
	Short: "Export submissions to CSV",
	Args:  cobra.RangeArgs(1, 2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		filename := fmt.Sprintf("submissions_%s_%s.csv", args[0], time.Now().Format("20060102"))
		if len(args) > 1 {
			filename = args[1]
		}
		exportToFile(c, fmt.Sprintf("/api/v1/competitions/%s/export/submissions", args[0]), filename)
	},
}

var compReleaseChallengesCmd = &cobra.Command{
	Use:   "release-challenges <comp-id> <challenge-id>...",
	Short: "Release challenges to participants",
	Args:  cobra.MinimumNArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		c := newClient()
		ids := make([]int, len(args)-1)
		for i, a := range args[1:] {
			ids[i] = atoi(a)
		}
		resp, err := c.PutAPI("/api/v1/competitions/"+args[0]+"/challenges/release", map[string]interface{}{"challenge_ids": ids})
		if err != nil {
			output.Error(fmt.Sprintf("failed to release challenges: %v", err))
			os.Exit(1)
		}
		var result struct {
			Released int `json:"released"`
		}
		parseData(resp.Data, &result)
		output.Success(fmt.Sprintf("Released %d challenges", result.Released))
	},
}

func init() {
	compListCmd.Flags().StringP("search", "s", "", "Search by title")
	compListCmd.Flags().String("mode", "", "Filter: ctf_jeopardy|awd|red_blue")
	compListCmd.Flags().String("status", "", "Filter: draft|registration|running|paused|ended|archived")
	compListCmd.Flags().IntP("page", "p", 1, "Page number")

	compCreateCmd.Flags().String("mode", "ctf_jeopardy", "Mode: ctf_jeopardy|awd|red_blue")
	compCreateCmd.Flags().String("description", "", "Description")
	compCreateCmd.Flags().String("start-time", "", "Start time (RFC3339)")
	compCreateCmd.Flags().String("end-time", "", "End time (RFC3339)")
	compCreateCmd.Flags().String("reg-start", "", "Registration start (RFC3339)")
	compCreateCmd.Flags().String("reg-end", "", "Registration end (RFC3339)")
	compCreateCmd.Flags().String("rules", "", "Competition rules")
	compCreateCmd.Flags().Int("max-teams", 0, "Max teams")
	compCreateCmd.Flags().Int("max-team-size", 0, "Max team size")
	compCreateCmd.Flags().Int("submit-interval", 0, "Submit interval in seconds")
	compCreateCmd.Flags().Bool("public", true, "Is public")

	compUpdateCmd.Flags().String("title", "", "Title")
	compUpdateCmd.Flags().String("mode", "", "Mode")
	compUpdateCmd.Flags().String("description", "", "Description")
	compUpdateCmd.Flags().String("start-time", "", "Start time")
	compUpdateCmd.Flags().String("end-time", "", "End time")
	compUpdateCmd.Flags().String("reg-start", "", "Registration start")
	compUpdateCmd.Flags().String("reg-end", "", "Registration end")
	compUpdateCmd.Flags().String("rules", "", "Rules")
	compUpdateCmd.Flags().Int("max-teams", 0, "Max teams")
	compUpdateCmd.Flags().Int("max-team-size", 0, "Max team size")
	compUpdateCmd.Flags().Int("submit-interval", 0, "Submit interval")
	compUpdateCmd.Flags().Bool("public", false, "Is public")

	compAttachCmd.Flags().Int("order", 0, "Display order")

	compSubmissionsCmd.Flags().IntP("page", "p", 1, "Page number")
	compSubmissionsCmd.Flags().Int("team-id", 0, "Filter by team ID")
	compSubmissionsCmd.Flags().Int("challenge-id", 0, "Filter by challenge ID")

	competitionCmd.AddCommand(compListCmd, compGetCmd, compCreateCmd, compUpdateCmd, compDeleteCmd,
		compStatusCmd, compAttachCmd, compDetachCmd, compChallengesCmd, compReleaseChallengesCmd,
		compRegistrationsCmd, compReviewRegCmd, compSubmissionsCmd, compScoreboardCmd,
		compExportRankingCmd, compExportSubmissionsCmd)
}
