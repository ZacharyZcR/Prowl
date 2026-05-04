package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Permission struct {
	ent.Schema
}

func (Permission) Fields() []ent.Field {
	return []ent.Field{
		field.String("code").
			Unique().
			NotEmpty().
			MaxLen(100),
		field.String("name").
			NotEmpty().
			MaxLen(100),
		field.String("resource").
			MaxLen(50),
		field.String("action").
			MaxLen(50),
		field.String("scope").
			Optional().
			Default("").
			MaxLen(20),
		field.String("description").
			Optional().
			Default("").
			MaxLen(500),
		field.String("category").
			MaxLen(50),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (Permission) Edges() []ent.Edge {
	return nil
}

func (Permission) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("resource", "action"),
		index.Fields("category"),
	}
}
