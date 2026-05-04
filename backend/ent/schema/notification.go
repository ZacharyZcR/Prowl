package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Notification struct {
	ent.Schema
}

func (Notification) Fields() []ent.Field {
	return []ent.Field{
		field.String("title").
			NotEmpty(),
		field.String("content").
			Default(""),
		field.String("type").
			Default("info"),
		field.Bool("read").
			Default(false),
		field.Int("user_id"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (Notification) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("notifications").
			Field("user_id").
			Unique().
			Required(),
	}
}
