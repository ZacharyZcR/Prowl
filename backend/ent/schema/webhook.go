package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Webhook struct {
	ent.Schema
}

func (Webhook) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			NotEmpty().
			MaxLen(100),
		field.String("url").
			NotEmpty().
			MaxLen(2048),
		field.String("secret").
			Optional().
			Sensitive(),
		field.JSON("events", []string{}),
		field.JSON("headers", map[string]string{}).
			Optional(),
		field.Bool("enabled").
			Default(true),
		field.Time("last_triggered_at").
			Optional().
			Nillable(),
		field.Int("last_status_code").
			Default(0),
		field.Int("failure_count").
			Default(0),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Webhook) Edges() []ent.Edge {
	return nil
}

func (Webhook) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("enabled"),
	}
}
