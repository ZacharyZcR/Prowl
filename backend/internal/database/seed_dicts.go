package database

import (
	"context"
	"log"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/dict"
)

type DictDef struct {
	GroupName string
	Key       string
	Label     string
	Value     string
	SortOrder int
}

var DefaultDicts = []DictDef{
	{"project_status", "active", "进行中", "success", 1},
	{"project_status", "draft", "草稿", "warning", 2},
	{"project_status", "archived", "已归档", "neutral", 3},
	{"priority", "low", "低", "#22c55e", 1},
	{"priority", "medium", "中", "#3b82f6", 2},
	{"priority", "high", "高", "#f59e07", 3},
	{"priority", "critical", "紧急", "#f83535", 4},
	{"notification_type", "info", "通知", "info", 1},
	{"notification_type", "success", "成功", "success", 2},
	{"notification_type", "warning", "警告", "warning", 3},
	{"notification_type", "error", "错误", "danger", 4},

	// 题目分类
	{"challenge_category", "web", "Web", "#3b82f6", 1},
	{"challenge_category", "pwn", "Pwn", "#ef4444", 2},
	{"challenge_category", "crypto", "Crypto", "#8b5cf6", 3},
	{"challenge_category", "reverse", "Reverse", "#f59e0b", 4},
	{"challenge_category", "misc", "Misc", "#6b7280", 5},
	{"challenge_category", "forensics", "Forensics", "#10b981", 6},
	{"challenge_category", "mobile", "Mobile", "#06b6d4", 7},
	{"challenge_category", "blockchain", "Blockchain", "#f97316", 8},

	// 题目难度
	{"challenge_difficulty", "easy", "简单", "#22c55e", 1},
	{"challenge_difficulty", "medium", "中等", "#3b82f6", 2},
	{"challenge_difficulty", "hard", "困难", "#f59e0b", 3},
	{"challenge_difficulty", "insane", "地狱", "#ef4444", 4},

	// 比赛模式
	{"competition_mode", "ctf_jeopardy", "CTF Jeopardy", "#3b82f6", 1},
	{"competition_mode", "awd", "AWD", "#ef4444", 2},
	{"competition_mode", "red_blue", "红蓝对抗", "#8b5cf6", 3},

	// 比赛状态
	{"competition_status", "draft", "草稿", "#6b7280", 1},
	{"competition_status", "registration", "报名中", "#3b82f6", 2},
	{"competition_status", "running", "进行中", "#22c55e", 3},
	{"competition_status", "paused", "已暂停", "#f59e0b", 4},
	{"competition_status", "ended", "已结束", "#ef4444", 5},
	{"competition_status", "archived", "已归档", "#6b7280", 6},

	// Flag 类型
	{"flag_type", "static", "静态Flag", "#6b7280", 1},
	{"flag_type", "dynamic_per_team", "动态Flag", "#3b82f6", 2},
	{"flag_type", "regex", "正则匹配", "#8b5cf6", 3},
}

func SeedDicts(ctx context.Context, client *ent.Client) error {
	for _, d := range DefaultDicts {
		exists, _ := client.Dict.Query().
			Where(dict.GroupName(d.GroupName), dict.Key(d.Key)).
			Exist(ctx)
		if exists {
			continue
		}
		_, err := client.Dict.Create().
			SetGroupName(d.GroupName).
			SetKey(d.Key).
			SetLabel(d.Label).
			SetValue(d.Value).
			SetSortOrder(d.SortOrder).
			Save(ctx)
		if err != nil {
			return err
		}
	}
	log.Printf("seed: %d dict items synced", len(DefaultDicts))
	return nil
}
