package models

type ChallengeResponse struct {
	ID                   int                      `json:"id"`
	Title                string                   `json:"title"`
	Description          string                   `json:"description"`
	Mode                 string                   `json:"mode"`
	Category             string                   `json:"category"`
	Difficulty           string                   `json:"difficulty"`
	BaseScore            int                      `json:"base_score"`
	MinScore             int                      `json:"min_score"`
	DecayFactor          float64                  `json:"decay_factor"`
	FlagType             string                   `json:"flag_type"`
	IsDynamic            bool                     `json:"is_dynamic"`
	DockerImage          string                   `json:"docker_image"`
	DockerCompose        string                   `json:"docker_compose"`
	NetworkTopology      *NetworkTopology         `json:"network_topology,omitempty"`
	ExposedPorts         []map[string]interface{} `json:"exposed_ports"`
	EnvVars              map[string]string        `json:"env_vars"`
	ResourceLimits       map[string]interface{}   `json:"resource_limits"`
	MaxContainerDuration int                      `json:"max_container_duration"`
	HintCost             int                      `json:"hint_cost"`
	AttachmentIDs        []int                    `json:"attachment_ids"`
	AuthorID             int                      `json:"author_id"`
	AuthorName           string                   `json:"author_name"`
	IsHidden             bool                     `json:"is_hidden"`
	SolveCount           int                      `json:"solve_count"`
	Tags                 []ChallengeTagResponse   `json:"tags"`
	Hints                []ChallengeHintResponse  `json:"hints,omitempty"`
	CreatedAt            string                   `json:"created_at"`
	UpdatedAt            string                   `json:"updated_at"`
}

type ChallengePortalResponse struct {
	ID          int                           `json:"id"`
	Title       string                        `json:"title"`
	Description string                        `json:"description"`
	Category    string                        `json:"category"`
	Difficulty  string                        `json:"difficulty"`
	Score       int                           `json:"score"`
	SolveCount  int                           `json:"solve_count"`
	IsDynamic   bool                          `json:"is_dynamic"`
	IsSolved    bool                          `json:"is_solved"`
	Tags        []ChallengeTagResponse        `json:"tags"`
	Hints       []ChallengeHintPortalResponse `json:"hints,omitempty"`
}

type ChallengeHintResponse struct {
	ID        int    `json:"id"`
	Content   string `json:"content"`
	Cost      int    `json:"cost"`
	OrderNum  int    `json:"order_num"`
	CreatedAt string `json:"created_at"`
}

type ChallengeHintPortalResponse struct {
	ID       int    `json:"id"`
	Cost     int    `json:"cost"`
	OrderNum int    `json:"order_num"`
	Content  string `json:"content,omitempty"`
	Unlocked bool   `json:"unlocked"`
}

type ChallengeTagResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type CreateChallengeRequest struct {
	Title                string                   `json:"title" binding:"required,min=1,max=200"`
	Description          string                   `json:"description"`
	Mode                 string                   `json:"mode" binding:"omitempty,oneof=ctf_jeopardy awd red_blue"`
	Category             string                   `json:"category" binding:"required"`
	Difficulty           string                   `json:"difficulty" binding:"required,oneof=easy medium hard insane"`
	BaseScore            int                      `json:"base_score" binding:"omitempty,min=1"`
	MinScore             int                      `json:"min_score" binding:"omitempty,min=0"`
	DecayFactor          float64                  `json:"decay_factor" binding:"omitempty,min=0"`
	FlagType             string                   `json:"flag_type" binding:"required,oneof=static dynamic_per_team regex"`
	StaticFlag           string                   `json:"static_flag"`
	FlagTemplate         string                   `json:"flag_template"`
	FlagRegex            string                   `json:"flag_regex"`
	IsDynamic            bool                     `json:"is_dynamic"`
	DockerImage          string                   `json:"docker_image"`
	DockerCompose        string                   `json:"docker_compose"`
	NetworkTopology      *NetworkTopology         `json:"network_topology"`
	ExposedPorts         []map[string]interface{} `json:"exposed_ports"`
	EnvVars              map[string]string        `json:"env_vars"`
	ResourceLimits       map[string]interface{}   `json:"resource_limits"`
	MaxContainerDuration int                      `json:"max_container_duration"`
	HintCost             int                      `json:"hint_cost"`
	AttachmentIDs        []int                    `json:"attachment_ids"`
	IsHidden             bool                     `json:"is_hidden"`
	Tags                 []string                 `json:"tags"`
}

type UpdateChallengeRequest struct {
	Title                *string                  `json:"title" binding:"omitempty,min=1,max=200"`
	Description          *string                  `json:"description"`
	Category             *string                  `json:"category"`
	Difficulty           *string                  `json:"difficulty" binding:"omitempty,oneof=easy medium hard insane"`
	BaseScore            *int                     `json:"base_score" binding:"omitempty,min=1"`
	MinScore             *int                     `json:"min_score" binding:"omitempty,min=0"`
	DecayFactor          *float64                 `json:"decay_factor" binding:"omitempty,min=0"`
	FlagType             *string                  `json:"flag_type" binding:"omitempty,oneof=static dynamic_per_team regex"`
	StaticFlag           *string                  `json:"static_flag"`
	FlagTemplate         *string                  `json:"flag_template"`
	FlagRegex            *string                  `json:"flag_regex"`
	IsDynamic            *bool                    `json:"is_dynamic"`
	DockerImage          *string                  `json:"docker_image"`
	DockerCompose        *string                  `json:"docker_compose"`
	NetworkTopology      *NetworkTopology         `json:"network_topology"`
	ExposedPorts         []map[string]interface{} `json:"exposed_ports"`
	EnvVars              map[string]string        `json:"env_vars"`
	ResourceLimits       map[string]interface{}   `json:"resource_limits"`
	MaxContainerDuration *int                     `json:"max_container_duration"`
	HintCost             *int                     `json:"hint_cost"`
	AttachmentIDs        []int                    `json:"attachment_ids"`
	IsHidden             *bool                    `json:"is_hidden"`
	Tags                 []string                 `json:"tags"`
}

type ChallengeListQuery struct {
	Page       int    `form:"page,default=1"`
	PageSize   int    `form:"page_size,default=20"`
	Search     string `form:"search"`
	Mode       string `form:"mode"`
	Category   string `form:"category"`
	Difficulty string `form:"difficulty"`
	IsHidden   *bool  `form:"is_hidden"`
	IsDynamic  *bool  `form:"is_dynamic"`
}

type CreateHintRequest struct {
	Content  string `json:"content" binding:"required"`
	Cost     int    `json:"cost"`
	OrderNum int    `json:"order_num"`
}

type UpdateHintRequest struct {
	Content  *string `json:"content"`
	Cost     *int    `json:"cost"`
	OrderNum *int    `json:"order_num"`
}
