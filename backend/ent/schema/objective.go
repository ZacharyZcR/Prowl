package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Objective struct {
	ent.Schema
}

func (Objective) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.Int("scenario_id").
			Optional().
			Nillable(),
		field.String("title").
			NotEmpty().
			MaxLen(200),
		field.String("target_url").
			Optional().
			Default(""),
		field.Text("description").
			Optional().
			Default(""),
		field.Enum("team_role").
			Values("red", "blue", "all").
			Default("all"),
		field.Int("points").
			Default(100),
		field.Int("order_num").
			Default(0),
		field.Enum("status").
			Values("pending", "in_progress", "completed", "failed").
			Default("pending"),
		field.Int("completed_by_team").
			Optional().
			Default(0),
		field.Int("completed_by_user").
			Optional().
			Default(0),
		field.Time("completed_at").
			Optional().
			Nillable(),
		field.String("evidence").
			Optional().
			Default(""),
		field.String("judge_comment").
			Optional().
			Default(""),
		field.Int("judged_by").
			Optional().
			Default(0),
		field.Int("assigned_team_id").
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

func (Objective) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("objectives").
			Field("competition_id").
			Unique().
			Required(),
		edge.From("scenario", Scenario.Type).
			Ref("objectives").
			Field("scenario_id").
			Unique(),
	}
}

func (Objective) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "team_role"),
		index.Fields("competition_id", "status"),
		index.Fields("competition_id", "assigned_team_id"),
	}
}
