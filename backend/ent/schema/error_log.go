package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ErrorLog struct {
	ent.Schema
}

func (ErrorLog) Fields() []ent.Field {
	return []ent.Field{
		field.Enum("source").
			Values("frontend", "backend").
			Comment("错误来源"),
		field.String("err_type").
			MaxLen(50).
			NotEmpty().
			Comment("错误类型"),
		field.Text("message").
			Comment("错误信息"),
		field.Text("stack").
			Optional().
			Default("").
			Comment("堆栈跟踪"),
		field.String("url").
			MaxLen(2048).
			Optional().
			Default("").
			Comment("请求 URL"),
		field.String("method").
			Optional().
			Default("").
			Comment("HTTP 方法"),
		field.Int("status_code").
			Optional().
			Default(0).
			Comment("HTTP 状态码"),
		field.JSON("params", map[string]interface{}{}).
			Optional().
			Comment("请求参数"),
		field.String("user_agent").
			Optional().
			Default("").
			Comment("浏览器 UA"),
		field.String("request_id").
			Optional().
			Default("").
			Comment("请求追踪 ID"),
		field.Int("user_id").
			Optional().
			Default(0).
			Comment("用户 ID"),
		field.String("fingerprint").
			Unique().
			Comment("错误指纹 SHA256"),
		field.Int("occurrence_count").
			Default(1).
			Comment("发生次数"),
		field.Time("first_seen_at").
			Default(time.Now).
			Immutable().
			Comment("首次发生"),
		field.Time("last_seen_at").
			Default(time.Now).
			Comment("最后发生"),
		field.Bool("resolved").
			Default(false).
			Comment("是否已解决"),
		field.Int("resolved_by").
			Optional().
			Default(0).
			Comment("解决人 ID"),
		field.Time("resolved_at").
			Optional().
			Nillable().
			Comment("解决时间"),
		field.Enum("severity").
			Values("critical", "high", "medium", "low").
			Default("medium").
			Comment("严重程度"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (ErrorLog) Edges() []ent.Edge {
	return nil
}

func (ErrorLog) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("source"),
		index.Fields("err_type"),
		index.Fields("severity"),
		index.Fields("resolved"),
		index.Fields("last_seen_at"),
	}
}
