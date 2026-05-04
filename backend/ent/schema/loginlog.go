package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type LoginLog struct {
	ent.Schema
}

func (LoginLog) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id").
			Optional().
			Default(0),
		field.String("username").
			NotEmpty(),
		field.String("ip").
			Optional().
			Default(""),
		field.String("user_agent").
			Optional().
			Default(""),
		field.Bool("success").
			Default(false),
		field.String("failure_reason").
			Optional().
			Default(""),
		field.String("location").
			Optional().
			Default(""),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (LoginLog) Edges() []ent.Edge {
	return nil
}

func (LoginLog) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "created_at"),
		index.Fields("success", "created_at"),
		index.Fields("ip"),
	}
}
