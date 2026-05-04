package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type CheckResult struct {
	ent.Schema
}

func (CheckResult) Fields() []ent.Field {
	return []ent.Field{
		field.Int("round_id"),
		field.Int("team_id"),
		field.Int("challenge_id"),
		field.Enum("status").
			Values("up", "down", "error", "timeout"),
		field.String("detail").
			Optional().
			Default(""),
		field.Time("checked_at").
			Default(time.Now).
			Immutable(),
	}
}

func (CheckResult) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("round", ScoringRound.Type).
			Ref("check_results").
			Field("round_id").
			Unique().
			Required(),
		edge.From("team", Team.Type).
			Ref("check_results").
			Field("team_id").
			Unique().
			Required(),
		edge.From("challenge", Challenge.Type).
			Ref("check_results").
			Field("challenge_id").
			Unique().
			Required(),
	}
}

func (CheckResult) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("round_id", "team_id", "challenge_id").Unique(),
	}
}
