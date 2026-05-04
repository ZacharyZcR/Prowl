package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ApiKey struct {
	ent.Schema
}

func (ApiKey) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			NotEmpty().
			MaxLen(100),
		field.String("key_hash").
			Unique(),
		field.String("key_prefix").
			MaxLen(8),
		field.Int("user_id"),
		field.Time("expires_at").
			Optional().
			Nillable(),
		field.Time("last_used_at").
			Optional().
			Nillable(),
		field.Bool("enabled").
			Default(true),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ApiKey) Edges() []ent.Edge {
	return nil
}

func (ApiKey) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("key_hash").Unique(),
	}
}
