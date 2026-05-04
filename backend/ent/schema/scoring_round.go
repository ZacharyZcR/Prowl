package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ScoringRound struct {
	ent.Schema
}

func (ScoringRound) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.Int("round_number"),
		field.Time("started_at").
			Default(time.Now),
		field.Time("ended_at").
			Optional().
			Nillable(),
		field.Enum("status").
			Values("pending", "running", "completed").
			Default("pending"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ScoringRound) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("rounds").
			Field("competition_id").
			Unique().
			Required(),
		edge.To("score_records", ScoreRecord.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("check_results", CheckResult.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}

func (ScoringRound) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "round_number").Unique(),
	}
}
