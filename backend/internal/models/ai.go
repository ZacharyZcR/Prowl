package models

type AIConfigResponse struct {
	Provider     string  `json:"provider"`
	APIBase      string  `json:"api_base"`
	Model        string  `json:"model"`
	MaxTokens    int     `json:"max_tokens"`
	Temperature  float64 `json:"temperature"`
	SystemPrompt string  `json:"system_prompt"`
	HasAPIKey    bool    `json:"has_api_key"`
}

type UpdateAIConfigRequest struct {
	Provider     *string  `json:"provider"`
	APIKey       *string  `json:"api_key"`
	APIBase      *string  `json:"api_base"`
	Model        *string  `json:"model"`
	MaxTokens    *int     `json:"max_tokens"`
	Temperature  *float64 `json:"temperature"`
	SystemPrompt *string  `json:"system_prompt"`
}

type ConversationResponse struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Model     string `json:"model"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type CreateConversationRequest struct {
	Title string `json:"title" binding:"omitempty,max=200"`
}

type MessageResponse struct {
	ID             int    `json:"id"`
	ConversationID int    `json:"conversation_id"`
	Role           string `json:"role"`
	Content        string `json:"content"`
	CreatedAt      string `json:"created_at"`
}

type ChatRequest struct {
	Message string `json:"message" binding:"required"`
}
