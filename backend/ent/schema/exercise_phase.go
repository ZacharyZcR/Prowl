package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ExercisePhase struct {
	ent.Schema
}

func (ExercisePhase) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.String("name").
			NotEmpty().MaxLen(100),
		field.Text("description").
			Optional().Default(""),
		field.Int("order_num").
			Default(0),
		field.Enum("status").
			Values("pending", "active", "completed").
			Default("pending"),
		field.Int("duration_minutes").
			Default(60),
		field.Time("started_at").
			Optional().Nillable(),
		field.Time("ended_at").
			Optional().Nillable(),
		field.Time("created_at").
			Default(time.Now).Immutable(),
	}
}

func (ExercisePhase) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("phases").
			Field("competition_id").Unique().Required(),
	}
}

func (ExercisePhase) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "order_num"),
	}
}
