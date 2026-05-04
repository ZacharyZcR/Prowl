package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Team struct {
	ent.Schema
}

func (Team) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			Unique().
			NotEmpty().
			MaxLen(100),
		field.String("description").
			Optional().
			Default(""),
		field.String("avatar_url").
			Optional().
			Default(""),
		field.String("invite_code").
			Unique().
			NotEmpty(),
		field.Int("captain_id"),
		field.Bool("is_active").
			Default(true),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Team) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("captain", User.Type).
			Ref("captained_teams").
			Field("captain_id").
			Unique().
			Required(),
		edge.To("members", TeamMember.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("registrations", TeamRegistration.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("flag_submissions", FlagSubmission.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("challenge_instances", ChallengeInstance.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("score_records", ScoreRecord.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("check_results", CheckResult.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("writeups", Writeup.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("attack_reports", AttackReport.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("defense_reports", DefenseReport.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}

func (Team) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("invite_code"),
		index.Fields("captain_id"),
	}
}
