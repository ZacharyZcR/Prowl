package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Competition struct {
	ent.Schema
}

func (Competition) Fields() []ent.Field {
	return []ent.Field{
		field.String("title").
			NotEmpty().
			MaxLen(200),
		field.String("description").
			Optional().
			Default(""),
		field.Enum("mode").
			Values("ctf_jeopardy", "awd", "red_blue").
			Default("ctf_jeopardy"),
		field.Enum("status").
			Values("draft", "registration", "running", "paused", "ended", "archived").
			Default("draft"),
		field.Time("start_time").
			Optional().
			Nillable(),
		field.Time("end_time").
			Optional().
			Nillable(),
		field.Time("registration_start").
			Optional().
			Nillable(),
		field.Time("registration_end").
			Optional().
			Nillable(),
		field.Int("max_teams").
			Default(0),
		field.Int("max_team_size").
			Default(5),
		field.Bool("is_public").
			Default(true),
		field.String("password").
			Optional().
			Sensitive().
			Default(""),
		field.JSON("scoring_config", map[string]interface{}{}).
			Optional(),
		field.String("banner_url").
			Optional().
			Default(""),
		field.Text("rules").
			Optional().
			Default(""),
		field.Time("scoreboard_freeze_at").
			Optional().
			Nillable(),
		field.Int("submit_interval_seconds").
			Default(10),
		field.Int("created_by"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Competition) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("creator", User.Type).
			Ref("competitions").
			Field("created_by").
			Unique().
			Required(),
		edge.To("competition_challenges", CompetitionChallenge.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("registrations", TeamRegistration.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("rounds", ScoringRound.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("flag_submissions", FlagSubmission.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("score_records", ScoreRecord.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("challenge_instances", ChallengeInstance.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("writeups", Writeup.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("objectives", Objective.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("attack_reports", AttackReport.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("defense_reports", DefenseReport.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("phases", ExercisePhase.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}

func (Competition) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("status"),
		index.Fields("mode", "status"),
		index.Fields("start_time"),
	}
}
