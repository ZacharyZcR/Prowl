package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Setting struct {
	ent.Schema
}

func (Setting) Fields() []ent.Field {
	return []ent.Field{
		field.String("key").
			Unique().
			NotEmpty().
			MaxLen(100),
		field.Text("value").
			Optional(),
		field.String("group_name").
			MaxLen(50),
		field.String("display_name").
			MaxLen(100),
		field.String("description").
			Optional().
			MaxLen(500),
		field.String("value_type").
			MaxLen(20).
			Default("string"),
		field.String("default_value").
			Optional(),
		field.Bool("is_secret").
			Default(false),
		field.Int("sort_order").
			Default(0),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Setting) Edges() []ent.Edge {
	return nil
}

func (Setting) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("group_name", "sort_order"),
	}
}
