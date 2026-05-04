package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ZacharyZcR/STC/backend/internal/services"
	"github.com/ZacharyZcR/STC/backend/pkg/config"
	"github.com/ZacharyZcR/STC/backend/pkg/response"
)

type OAuthHandler struct {
	service *services.OAuthService
	config  *config.Config
}

func NewOAuthHandler(service *services.OAuthService, cfg *config.Config) *OAuthHandler {
	return &OAuthHandler{service: service, config: cfg}
}

// Login godoc
// @Summary OAuth 登录
// @Description 重定向到 OAuth 提供商进行授权
// @Tags auth
// @Success 302
// @Router /auth/oauth/login [get]
func (h *OAuthHandler) Login(c *gin.Context) {
	state := services.GenerateOAuthState()

	c.SetCookie("oauth_state", state, 30, "/", "", false, true)

	authURL, err := h.service.GetAuthURL(state)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=oauth_config")
		return
	}

	c.Redirect(http.StatusFound, authURL)
}

// Callback godoc
// @Summary OAuth 回调
// @Description 处理 OAuth 提供商回调
// @Tags auth
// @Param code query string true "授权码"
// @Param state query string true "状态参数"
// @Success 302
// @Router /auth/oauth/callback [get]
func (h *OAuthHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	savedState, err := c.Cookie("oauth_state")
	if err != nil || savedState == "" || savedState != state {
		c.Redirect(http.StatusFound, "/login?error=oauth_state_mismatch")
		return
	}

	// 清除 state cookie
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	result, err := h.service.HandleCallback(c.Request.Context(), code, state)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=oauth_failed")
		return
	}

	c.Redirect(http.StatusFound, "/login/oauth-callback?token="+result.Token)
}

// Config godoc
// @Summary OAuth 配置
// @Description 获取 OAuth 配置信息（用于前端判断是否显示 OAuth 按钮）
// @Tags auth
// @Produce json
// @Success 200 {object} response.Response
// @Router /auth/oauth/config [get]
func (h *OAuthHandler) Config(c *gin.Context) {
	response.Success(c, gin.H{
		"enabled":  h.config.OAuthEnabled,
		"provider": h.config.OAuthProvider,
	})
}
