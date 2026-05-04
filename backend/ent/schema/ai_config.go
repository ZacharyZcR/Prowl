package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

type AiConfig struct {
	ent.Schema
}

func (AiConfig) Fields() []ent.Field {
	return []ent.Field{
		field.String("provider").
			Default("openai"),
		field.String("api_key").
			Optional().
			Sensitive(),
		field.String("api_base").
			Optional().
			Default("https://api.openai.com/v1"),
		field.String("model").
			Default("gpt-4o"),
		field.Int("max_tokens").
			Default(4096),
		field.Float("temperature").
			Default(0.7),
		field.Text("system_prompt").
			Optional().
			Default("You are a helpful assistant."),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (AiConfig) Edges() []ent.Edge {
	return nil
}
