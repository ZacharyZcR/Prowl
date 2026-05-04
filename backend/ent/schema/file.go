package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type File struct {
	ent.Schema
}

func (File) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			NotEmpty(),
		field.String("path").
			NotEmpty(),
		field.Int64("size"),
		field.String("mime_type").
			Optional().
			Default(""),
		field.Int("uploader_id"),
		field.String("uploader_name"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (File) Edges() []ent.Edge {
	return nil
}

func (File) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("uploader_id"),
		index.Fields("created_at"),
	}
}
