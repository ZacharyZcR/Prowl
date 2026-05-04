package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type UserPreference struct {
	ent.Schema
}

func (UserPreference) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id"),
		field.String("key").
			MaxLen(100),
		field.Text("value"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (UserPreference) Edges() []ent.Edge {
	return nil
}

func (UserPreference) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "key").Unique(),
	}
}
