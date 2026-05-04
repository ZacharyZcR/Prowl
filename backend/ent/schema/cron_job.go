package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

type CronJob struct {
	ent.Schema
}

func (CronJob) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			Unique().
			NotEmpty().
			MaxLen(100),
		field.String("cron_expr").
			NotEmpty().
			MaxLen(50),
		field.String("handler").
			NotEmpty().
			MaxLen(100),
		field.Bool("enabled").
			Default(true),
		field.Time("last_run_at").
			Optional().
			Nillable(),
		field.String("last_status").
			Optional().
			Nillable(),
		field.String("last_error").
			Optional().
			Nillable(),
		field.Time("next_run_at").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (CronJob) Edges() []ent.Edge {
	return nil
}
