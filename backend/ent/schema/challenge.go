package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type Challenge struct {
	ent.Schema
}

func (Challenge) Fields() []ent.Field {
	return []ent.Field{
		field.String("title").
			NotEmpty().
			MaxLen(200),
		field.Text("description").
			Optional().
			Default(""),
		field.Enum("mode").
			Values("ctf_jeopardy", "awd", "red_blue").
			Default("ctf_jeopardy"),
		field.String("category").
			NotEmpty().
			MaxLen(50),
		field.Enum("difficulty").
			Values("easy", "medium", "hard", "insane").
			Default("medium"),
		field.Int("base_score").
			Default(500),
		field.Int("min_score").
			Default(100),
		field.Float("decay_factor").
			Default(15.0),
		field.Enum("flag_type").
			Values("static", "dynamic_per_team", "dynamic_attachment", "regex").
			Default("static"),
		field.String("static_flag").
			Optional().
			Sensitive().
			Default(""),
		field.String("flag_template").
			Optional().
			Default(""),
		field.String("flag_regex").
			Optional().
			Default(""),
		field.Bool("is_dynamic").
			Default(false),
		field.String("docker_image").
			Optional().
			Default(""),
		field.Text("docker_compose").
			Optional().
			Default(""),
		field.JSON("network_topology", map[string]interface{}{}).
			Optional(),
		field.JSON("exposed_ports", []map[string]interface{}{}).
			Optional(),
		field.JSON("env_vars", map[string]string{}).
			Optional(),
		field.JSON("resource_limits", map[string]interface{}{}).
			Optional(),
		field.Int("max_container_duration").
			Default(7200),
		field.Int("hint_cost").
			Default(0),
		field.JSON("attachment_ids", []int{}).
			Optional(),
		field.Int("author_id"),
		field.Bool("is_hidden").
			Default(false),
		field.Int("solve_count").
			Default(0),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Challenge) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("author", User.Type).
			Ref("authored_challenges").
			Field("author_id").
			Unique().
			Required(),
		edge.To("hints", ChallengeHint.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("tags", ChallengeTag.Type).
			StorageKey(edge.Table("challenge_tag_links"), edge.Columns("challenge_id", "tag_id")).
			Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("competition_challenges", CompetitionChallenge.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("flag_submissions", FlagSubmission.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("challenge_instances", ChallengeInstance.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("score_records", ScoreRecord.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("check_results", CheckResult.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("writeups", Writeup.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}

func (Challenge) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("mode"),
		index.Fields("category"),
		index.Fields("difficulty"),
		index.Fields("mode", "category"),
	}
}
