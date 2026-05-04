package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ScoreRecord struct {
	ent.Schema
}

func (ScoreRecord) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.Int("team_id"),
		field.Int("challenge_id").
			Optional().
			Nillable(),
		field.Int("round_id").
			Optional().
			Nillable(),
		field.Enum("score_type").
			Values("flag_solve", "first_blood", "second_blood", "third_blood", "awd_attack", "awd_defense", "awd_check", "penalty", "hint", "bonus"),
		field.Int("points"),
		field.String("detail").
			Optional().
			Default(""),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ScoreRecord) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("score_records").
			Field("competition_id").
			Unique().
			Required(),
		edge.From("team", Team.Type).
			Ref("score_records").
			Field("team_id").
			Unique().
			Required(),
		edge.From("challenge", Challenge.Type).
			Ref("score_records").
			Field("challenge_id").
			Unique(),
		edge.From("round", ScoringRound.Type).
			Ref("score_records").
			Field("round_id").
			Unique(),
	}
}

func (ScoreRecord) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "team_id"),
		index.Fields("competition_id", "created_at"),
	}
}
