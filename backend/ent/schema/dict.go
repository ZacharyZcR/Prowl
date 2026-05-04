package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Dict struct {
	ent.Schema
}

func (Dict) Fields() []ent.Field {
	return []ent.Field{
		field.String("group_name").
			NotEmpty().
			MaxLen(50),
		field.String("key").
			NotEmpty().
			MaxLen(50),
		field.String("label").
			NotEmpty().
			MaxLen(100),
		field.String("value").
			Optional(),
		field.Int("sort_order").
			Default(0),
		field.Bool("enabled").
			Default(true),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (Dict) Edges() []ent.Edge {
	return nil
}

func (Dict) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("group_name", "key").Unique(),
		index.Fields("group_name", "sort_order"),
	}
}
