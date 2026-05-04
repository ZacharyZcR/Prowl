package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type ChallengeHint struct {
	ent.Schema
}

func (ChallengeHint) Fields() []ent.Field {
	return []ent.Field{
		field.Int("challenge_id"),
		field.Text("content").
			NotEmpty(),
		field.Int("cost").
			Default(0),
		field.Int("order_num").
			Default(0),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ChallengeHint) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("challenge", Challenge.Type).
			Ref("hints").
			Field("challenge_id").
			Unique().
			Required(),
	}
}
