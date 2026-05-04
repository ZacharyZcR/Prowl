package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Scenario struct {
	ent.Schema
}

func (Scenario) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			NotEmpty().
			MaxLen(200),
		field.Text("description").
			Optional().
			Default(""),
		field.Text("topology").
			Optional().
			Default(""),
		field.Text("docker_compose").
			Optional().
			Default(""),
		field.JSON("network_config", map[string]interface{}{}).
			Optional(),
		field.String("difficulty").
			Optional().
			Default("medium"),
		field.Int("estimated_duration").
			Default(3600),
		field.JSON("tags", []string{}).
			Optional(),
		field.Int("created_by"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Scenario) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("creator", User.Type).
			Ref("scenarios").
			Field("created_by").
			Unique().
			Required(),
		edge.To("objectives", Objective.Type).Annotations(entsql.OnDelete(entsql.SetNull)),
	}
}

func (Scenario) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("created_by"),
	}
}
