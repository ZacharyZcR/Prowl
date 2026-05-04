package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type User struct {
	ent.Schema
}

func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("username").
			Unique().
			NotEmpty(),
		field.String("password").
			Sensitive().
			NotEmpty(),
		field.String("email").
			Unique().
			Optional(),
		field.String("nickname").
			Optional().
			Default(""),
		field.String("avatar").
			Optional().
			Default(""),
		field.String("oauth_provider").
			Optional().
			Default(""),
		field.String("oauth_id").
			Optional().
			Default(""),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("role", Role.Type).
			Ref("users").
			Unique(),
		edge.To("projects", Project.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("notifications", Notification.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("conversations", Conversation.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("competitions", Competition.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("authored_challenges", Challenge.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("captained_teams", Team.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("team_memberships", TeamMember.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("flag_submissions", FlagSubmission.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("writeups", Writeup.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("scenarios", Scenario.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("attack_reports", AttackReport.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("defense_reports", DefenseReport.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}
