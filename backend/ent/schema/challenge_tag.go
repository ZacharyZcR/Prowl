package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

type ChallengeTag struct {
	ent.Schema
}

func (ChallengeTag) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			Unique().
			NotEmpty().
			MaxLen(50),
		field.String("color").
			Optional().
			Default("#6366f1"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ChallengeTag) Edges() []ent.Edge {
	return nil
}
