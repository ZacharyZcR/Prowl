package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type DefenseReport struct {
	ent.Schema
}

func (DefenseReport) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.Int("team_id"),
		field.Int("user_id"),
		field.Int("phase_id").
			Optional().Default(0),
		field.Int("objective_id").
			Optional().Default(0),
		field.String("title").
			NotEmpty().MaxLen(200),
		field.Text("content").
			Default(""),
		field.Enum("action_type").
			Values("detection", "response", "hardening", "other").
			Default("detection"),
		field.String("threat_description").
			Optional().Default(""),
		field.String("mitigation").
			Optional().Default(""),
		field.JSON("detected_techniques", []string{}).
			Optional(),
		field.Int("related_attack_id").
			Optional().Default(0),
		field.JSON("attachment_ids", []int{}).
			Optional(),
		field.Enum("status").
			Values("submitted", "reviewing", "accepted", "rejected").
			Default("submitted"),
		field.Int("score").
			Default(0),
		field.String("judge_comment").
			Optional().Default(""),
		field.Int("judged_by").
			Optional().Default(0),
		field.Time("submitted_at").
			Default(time.Now).Immutable(),
		field.Time("reviewed_at").
			Optional().Nillable(),
	}
}

func (DefenseReport) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("defense_reports").
			Field("competition_id").Unique().Required(),
		edge.From("team", Team.Type).
			Ref("defense_reports").
			Field("team_id").Unique().Required(),
		edge.From("user", User.Type).
			Ref("defense_reports").
			Field("user_id").Unique().Required(),
	}
}

func (DefenseReport) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "team_id"),
		index.Fields("competition_id", "status"),
	}
}
