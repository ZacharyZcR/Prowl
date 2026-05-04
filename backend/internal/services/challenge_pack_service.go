package services

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"

	"github.com/ZacharyZcR/STC/backend/ent"
	"github.com/ZacharyZcR/STC/backend/ent/challenge"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"
)

type ChallengePackService struct {
	client *ent.Client
}

func NewChallengePackService(client *ent.Client) *ChallengePackService {
	return &ChallengePackService{client: client}
}

type ChallengeMeta struct {
	Title                string                   `json:"title"`
	Description          string                   `json:"description"`
	Category             string                   `json:"category"`
	Difficulty           string                   `json:"difficulty"`
	BaseScore            int                      `json:"base_score"`
	MinScore             int                      `json:"min_score"`
	DecayFactor          float64                  `json:"decay_factor"`
	FlagType             string                   `json:"flag_type"`
	StaticFlag           string                   `json:"static_flag,omitempty"`
	FlagTemplate         string                   `json:"flag_template,omitempty"`
	FlagRegex            string                   `json:"flag_regex,omitempty"`
	IsDynamic            bool                     `json:"is_dynamic"`
	DockerImage          string                   `json:"docker_image,omitempty"`
	ExposedPorts         []map[string]interface{} `json:"exposed_ports,omitempty"`
	EnvVars              map[string]string        `json:"env_vars,omitempty"`
	ResourceLimits       map[string]interface{}   `json:"resource_limits,omitempty"`
	MaxContainerDuration int                      `json:"max_container_duration"`
	HintCost             int                      `json:"hint_cost"`
	Tags                 []string                 `json:"tags,omitempty"`
	Hints                []HintMeta               `json:"hints,omitempty"`
}

type HintMeta struct {
	Content  string `json:"content"`
	Cost     int    `json:"cost"`
	OrderNum int    `json:"order_num"`
}

type PackExport struct {
	Version    string          `json:"version"`
	Challenges []ChallengeMeta `json:"challenges"`
}

func (s *ChallengePackService) ExportPack(ctx context.Context, challengeIDs []int) ([]byte, error) {
	challenges, err := s.client.Challenge.Query().
		Where(challenge.IDIn(challengeIDs...)).
		WithHints().WithTags().
		All(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to query challenges: " + err.Error())
	}

	pack := PackExport{
		Version:    "1.0",
		Challenges: make([]ChallengeMeta, 0, len(challenges)),
	}

	for _, c := range challenges {
		meta := ChallengeMeta{
			Title:                c.Title,
			Description:          c.Description,
			Category:             c.Category,
			Difficulty:           string(c.Difficulty),
			BaseScore:            c.BaseScore,
			MinScore:             c.MinScore,
			DecayFactor:          c.DecayFactor,
			FlagType:             string(c.FlagType),
			StaticFlag:           c.StaticFlag,
			FlagTemplate:         c.FlagTemplate,
			FlagRegex:            c.FlagRegex,
			IsDynamic:            c.IsDynamic,
			DockerImage:          c.DockerImage,
			ExposedPorts:         c.ExposedPorts,
			EnvVars:              c.EnvVars,
			ResourceLimits:       c.ResourceLimits,
			MaxContainerDuration: c.MaxContainerDuration,
			HintCost:             c.HintCost,
		}

		if c.Edges.Tags != nil {
			meta.Tags = make([]string, 0, len(c.Edges.Tags))
			for _, t := range c.Edges.Tags {
				meta.Tags = append(meta.Tags, t.Name)
			}
		}

		if c.Edges.Hints != nil {
			meta.Hints = make([]HintMeta, 0, len(c.Edges.Hints))
			for _, h := range c.Edges.Hints {
				meta.Hints = append(meta.Hints, HintMeta{
					Content:  h.Content,
					Cost:     h.Cost,
					OrderNum: h.OrderNum,
				})
			}
		}

		pack.Challenges = append(pack.Challenges, meta)
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	metaJSON, err := json.MarshalIndent(pack, "", "  ")
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to marshal metadata: " + err.Error())
	}

	fw, err := zw.Create("metadata.json")
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create zip entry: " + err.Error())
	}
	if _, err := fw.Write(metaJSON); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to write metadata: " + err.Error())
	}

	if err := zw.Close(); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to close zip: " + err.Error())
	}

	return buf.Bytes(), nil
}

func (s *ChallengePackService) ImportPack(ctx context.Context, data []byte, authorID int) (int, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return 0, apperr.ErrBadRequest.WithMessage("invalid zip file")
	}

	var pack PackExport
	for _, f := range reader.File {
		if f.Name == "metadata.json" {
			rc, err := f.Open()
			if err != nil {
				return 0, apperr.ErrBadRequest.WithMessage("failed to open metadata.json")
			}
			content, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				return 0, apperr.ErrBadRequest.WithMessage("failed to read metadata.json")
			}
			if err := json.Unmarshal(content, &pack); err != nil {
				return 0, apperr.ErrBadRequest.WithMessage("invalid metadata.json: " + err.Error())
			}
			break
		}
	}

	if len(pack.Challenges) == 0 {
		return 0, apperr.ErrBadRequest.WithMessage("no challenges in pack")
	}

	imported := 0
	for _, meta := range pack.Challenges {
		builder := s.client.Challenge.Create().
			SetTitle(meta.Title).
			SetDescription(meta.Description).
			SetCategory(meta.Category).
			SetDifficulty(challenge.Difficulty(meta.Difficulty)).
			SetBaseScore(meta.BaseScore).
			SetMinScore(meta.MinScore).
			SetDecayFactor(meta.DecayFactor).
			SetFlagType(challenge.FlagType(meta.FlagType)).
			SetStaticFlag(meta.StaticFlag).
			SetFlagTemplate(meta.FlagTemplate).
			SetFlagRegex(meta.FlagRegex).
			SetIsDynamic(meta.IsDynamic).
			SetDockerImage(meta.DockerImage).
			SetMaxContainerDuration(meta.MaxContainerDuration).
			SetHintCost(meta.HintCost).
			SetAuthorID(authorID)

		if meta.ExposedPorts != nil {
			builder = builder.SetExposedPorts(meta.ExposedPorts)
		}
		if meta.EnvVars != nil {
			builder = builder.SetEnvVars(meta.EnvVars)
		}
		if meta.ResourceLimits != nil {
			builder = builder.SetResourceLimits(meta.ResourceLimits)
		}

		c, err := builder.Save(ctx)
		if err != nil {
			return imported, apperr.ErrInternal.WithMessage(fmt.Sprintf("failed to import challenge '%s': %v", meta.Title, err))
		}

		for _, h := range meta.Hints {
			_, _ = s.client.ChallengeHint.Create().
				SetChallengeID(c.ID).
				SetContent(h.Content).
				SetCost(h.Cost).
				SetOrderNum(h.OrderNum).
				Save(ctx)
		}

		imported++
	}

	return imported, nil
}
