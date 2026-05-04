package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Writeup struct {
	ent.Schema
}

func (Writeup) Fields() []ent.Field {
	return []ent.Field{
		field.Int("competition_id"),
		field.Int("challenge_id"),
		field.Int("team_id"),
		field.Int("user_id"),
		field.Text("content").
			Optional().
			Default(""),
		field.Int("file_id").
			Optional().
			Default(0),
		field.Enum("status").
			Values("submitted", "reviewed", "approved", "rejected").
			Default("submitted"),
		field.String("reviewer_comment").
			Optional().
			Default(""),
		field.Int("reviewed_by").
			Optional().
			Default(0),
		field.Time("submitted_at").
			Default(time.Now).
			Immutable(),
	}
}

func (Writeup) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("competition", Competition.Type).
			Ref("writeups").
			Field("competition_id").
			Unique().
			Required(),
		edge.From("challenge", Challenge.Type).
			Ref("writeups").
			Field("challenge_id").
			Unique().
			Required(),
		edge.From("team", Team.Type).
			Ref("writeups").
			Field("team_id").
			Unique().
			Required(),
		edge.From("user", User.Type).
			Ref("writeups").
			Field("user_id").
			Unique().
			Required(),
	}
}

func (Writeup) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("competition_id", "challenge_id", "team_id").Unique(),
	}
}
