package database

import (
	"context"
	"log"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/setting"
)

type SettingDef struct {
	Key          string
	GroupName    string
	DisplayName  string
	Description  string
	ValueType    string
	DefaultValue string
	IsSecret     bool
	SortOrder    int
}

var DefaultSettings = []SettingDef{
	// 通用
	{"general.site_name", "general", "站点名称", "系统显示名称", "string", "Prowl Range", false, 1},
	{"general.site_url", "general", "站点 URL", "系统访问地址", "string", "http://localhost:38080", false, 2},
	{"general.logo_url", "general", "Logo URL", "站点 Logo 图片地址", "string", "", false, 3},
	{"general.timezone", "general", "时区", "系统默认时区", "string", "Asia/Shanghai", false, 4},
	{"general.language", "general", "默认语言", "系统默认语言", "string", "zh", false, 5},

	// 邮件
	{"email.enabled", "email", "启用邮件", "是否启用邮件通知", "boolean", "false", false, 1},
	{"email.smtp_host", "email", "SMTP 服务器", "邮件服务器地址", "string", "", false, 2},
	{"email.smtp_port", "email", "SMTP 端口", "邮件服务器端口", "number", "587", false, 3},
	{"email.smtp_user", "email", "SMTP 用户名", "发件人邮箱账号", "string", "", false, 4},
	{"email.smtp_password", "email", "SMTP 密码", "发件人邮箱密码", "secret", "", true, 5},
	{"email.from_name", "email", "发件人名称", "邮件显示的发件人名称", "string", "Prowl Range", false, 6},
	{"email.from_address", "email", "发件人地址", "发件人邮箱地址", "string", "", false, 7},

	// 安全
	{"security.max_login_attempts", "security", "最大登录尝试", "连续失败后锁定账户", "number", "5", false, 1},
	{"security.lockout_duration", "security", "锁定时长(分)", "账户锁定持续时间", "number", "30", false, 2},
	{"security.session_timeout", "security", "会话超时(时)", "JWT Token 有效期(小时)", "number", "24", false, 3},
	{"security.password_min_length", "security", "密码最短长度", "用户密码最少字符数", "number", "6", false, 4},
	{"security.mfa_enabled", "security", "启用两步验证", "是否启用 MFA", "boolean", "false", false, 5},

	// 存储
	{"storage.provider", "storage", "存储类型", "文件存储方式", "string", "local", false, 1},
	{"storage.local_path", "storage", "本地路径", "本地存储目录", "string", "./uploads", false, 2},
	{"storage.s3_endpoint", "storage", "S3 Endpoint", "S3 兼容存储端点", "string", "", false, 3},
	{"storage.s3_bucket", "storage", "S3 Bucket", "S3 存储桶名称", "string", "", false, 4},
	{"storage.s3_access_key", "storage", "S3 Access Key", "S3 访问密钥", "secret", "", true, 5},
	{"storage.s3_secret_key", "storage", "S3 Secret Key", "S3 私有密钥", "secret", "", true, 6},
	{"storage.s3_region", "storage", "S3 Region", "S3 区域", "string", "", false, 7},
	{"storage.max_file_size", "storage", "最大文件(MB)", "单文件上传大小限制", "number", "10", false, 8},
}

func SeedSettings(ctx context.Context, client *ent.Client) error {
	for _, def := range DefaultSettings {
		exists, err := client.Setting.Query().Where(setting.Key(def.Key)).Exist(ctx)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		_, err = client.Setting.Create().
			SetKey(def.Key).
			SetValue(def.DefaultValue).
			SetGroupName(def.GroupName).
			SetDisplayName(def.DisplayName).
			SetDescription(def.Description).
			SetValueType(def.ValueType).
			SetDefaultValue(def.DefaultValue).
			SetIsSecret(def.IsSecret).
			SetSortOrder(def.SortOrder).
			Save(ctx)
		if err != nil {
			return err
		}
	}

	log.Println("seed: system settings initialized")
	return nil
}
