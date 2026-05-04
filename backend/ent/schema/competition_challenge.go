package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type CompetitionChallenge struct {
	ent.Schema
}

func (CompetitionChallenge) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.Int("challenge_id"),
		field.Int("order_num").
			Default(0),
		field.Bool("is_visible").
			Default(false),
		field.Time("released_at").
			Optional().
			Nillable(),
		field.Int("extra_score").
			Default(0),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (CompetitionChallenge) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("competition_challenges").
			Field("competition_id").
			Unique().
			Required(),
		edge.From("challenge", Challenge.Type).
			Ref("competition_challenges").
			Field("challenge_id").
			Unique().
			Required(),
	}
}

func (CompetitionChallenge) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "challenge_id").Unique(),
		index.Fields("competition_id", "is_visible"),
	}
}
