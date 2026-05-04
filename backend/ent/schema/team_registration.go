package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type TeamRegistration struct {
	ent.Schema
}

func (TeamRegistration) Fields() []ent.Field {
	return []ent.Field{
		field.Int("team_id"),
		field.Int("competition_id"),
		field.Enum("status").
			Values("pending", "approved", "rejected").
			Default("pending"),
		field.Enum("team_role").
			Values("red", "blue", "white", "judge", "participant").
			Default("participant"),
		field.Time("registered_at").
			Default(time.Now).
			Immutable(),
		field.Time("reviewed_at").
			Optional().
			Nillable(),
	}
}

func (TeamRegistration) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("team", Team.Type).
			Ref("registrations").
			Field("team_id").
			Unique().
			Required(),
		edge.From("competition", Competition.Type).
			Ref("registrations").
			Field("competition_id").
			Unique().
			Required(),
	}
}

func (TeamRegistration) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("team_id", "competition_id").Unique(),
		index.Fields("competition_id", "status"),
	}
}
