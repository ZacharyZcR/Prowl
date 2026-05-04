package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Activity struct {
	ent.Schema
}

func (Activity) Fields() []ent.Field {
	return []ent.Field{
		field.String("action").
			NotEmpty(),
		field.String("resource_type"),
		field.Int("resource_id"),
		field.Int("user_id"),
		field.String("username"),
		field.String("detail").
			Optional().
			Default(""),
		field.String("ip").
			Optional().
			Default(""),
		field.String("user_agent").
			Optional().
			Default(""),
		field.JSON("details", map[string]interface{}{}).
			Optional(),
		field.Int("status_code").
			Optional().
			Default(0),
		field.String("method").
			Optional().
			Default(""),
		field.String("path").
			Optional().
			Default(""),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (Activity) Edges() []ent.Edge {
	return nil
}

func (Activity) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "created_at"),
		index.Fields("resource_type", "created_at"),
		index.Fields("action"),
		index.Fields("created_at"),
	}
}
