package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type FlagSubmission struct {
	ent.Schema
}

func (FlagSubmission) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.Int("challenge_id"),
		field.Int("team_id"),
		field.Int("user_id"),
		field.String("submitted_flag").
			NotEmpty(),
		field.Bool("is_correct").
			Default(false),
		field.Int("points_awarded").
			Default(0),
		field.Bool("is_first_blood").
			Default(false),
		field.String("ip").
			Optional().
			Default(""),
		field.Time("submitted_at").
			Default(time.Now).
			Immutable(),
	}
}

func (FlagSubmission) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("flag_submissions").
			Field("competition_id").
			Unique().
			Required(),
		edge.From("challenge", Challenge.Type).
			Ref("flag_submissions").
			Field("challenge_id").
			Unique().
			Required(),
		edge.From("team", Team.Type).
			Ref("flag_submissions").
			Field("team_id").
			Unique().
			Required(),
		edge.From("user", User.Type).
			Ref("flag_submissions").
			Field("user_id").
			Unique().
			Required(),
	}
}

func (FlagSubmission) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "challenge_id", "team_id"),
		index.Fields("competition_id", "team_id"),
		index.Fields("competition_id", "is_correct"),
		index.Fields("submitted_at"),
	}
}
