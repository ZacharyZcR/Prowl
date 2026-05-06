package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type ChallengeInstance struct {
	ent.Schema
}

func (ChallengeInstance) Fields() []ent.Field {
	return []ent.Field{
		field.Int("challenge_id"),
		field.Int("competition_id"),
		field.Int("team_id"),
		field.String("container_id").
			Optional().
			Default(""),
		field.String("stack_id").
			Optional().
			Default(""),
		field.JSON("stack_containers", map[string]string{}).
			Optional(),
		field.JSON("stack_networks", map[string]string{}).
			Optional(),
		field.Enum("status").
			Values("pending", "starting", "running", "stopping", "stopped", "error").
			Default("pending"),
		field.String("access_url").
			Optional().
			Default(""),
		field.JSON("ports", map[string]string{}).
			Optional(),
		field.String("network_id").
			Optional().
			Default(""),
		field.String("flag").
			Optional().
			Sensitive().
			Default(""),
		field.String("ssh_user").
			Optional().
			Default(""),
		field.String("ssh_password").
			Optional().
			Sensitive().
			Default(""),
		field.String("ssh_address").
			Optional().
			Default(""),
		field.Time("expires_at"),
		field.Time("started_at").
			Optional().
			Nillable(),
		field.Time("stopped_at").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (ChallengeInstance) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("challenge", Challenge.Type).
			Ref("challenge_instances").
			Field("challenge_id").
			Unique().
			Required(),
		edge.From("competition", Competition.Type).
			Ref("challenge_instances").
			Field("competition_id").
			Unique().
			Required(),
		edge.From("team", Team.Type).
			Ref("challenge_instances").
			Field("team_id").
			Unique().
			Required(),
	}
}

func (ChallengeInstance) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("challenge_id", "competition_id", "team_id").Unique(),
		index.Fields("container_id"),
		index.Fields("status"),
		index.Fields("expires_at"),
	}
}
