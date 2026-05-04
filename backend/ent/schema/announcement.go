package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

type Announcement struct {
	ent.Schema
}

func (Announcement) Fields() []ent.Field {
	return []ent.Field{
		field.String("title").
			NotEmpty().
			MaxLen(200),
		field.Text("content").
			Optional(),
		field.Enum("priority").
			Values("info", "warning", "critical").
			Default("info"),
		field.Bool("published").
			Default(false),
		field.Time("published_at").
			Optional().
			Nillable(),
		field.Time("expires_at").
			Optional().
			Nillable(),
		field.Int("created_by"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Announcement) Edges() []ent.Edge {
	return nil
}
