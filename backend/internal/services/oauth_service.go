package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ZacharyZcR/STC/backend/ent"
	entRole "github.com/ZacharyZcR/STC/backend/ent/role"
	"github.com/ZacharyZcR/STC/backend/ent/user"
	apperr "github.com/ZacharyZcR/STC/backend/pkg/errors"

	"github.com/ZacharyZcR/STC/backend/pkg/config"
)

type OAuthService struct {
	config     *config.Config
	client     *ent.Client
	authSvc    *AuthService
	httpClient *http.Client
}

type OAuthUserInfo struct {
	ID       string
	Username string
	Email    string
	Avatar   string
}

func NewOAuthService(cfg *config.Config, client *ent.Client, authSvc *AuthService) *OAuthService {
	return NewOAuthServiceWithHTTPClient(cfg, client, authSvc, nil)
}

func NewOAuthServiceWithHTTPClient(cfg *config.Config, client *ent.Client, authSvc *AuthService, httpClient *http.Client) *OAuthService {
	if httpClient == nil {
		httpClient = newExternalHTTPClient(15 * time.Second)
	}
	return &OAuthService{config: cfg, client: client, authSvc: authSvc, httpClient: httpClient}
}

func GenerateOAuthState() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *OAuthService) GetAuthURL(state string) (string, error) {
	authURL, _, _ := s.resolveEndpoints()
	if authURL == "" {
		return "", apperr.ErrBadRequest.WithMessage("oauth not configured")
	}

	u, err := url.Parse(authURL)
	if err != nil {
		return "", apperr.ErrInternal.WithMessage("invalid oauth auth url: " + err.Error())
	}

	q := u.Query()
	q.Set("client_id", s.config.OAuthClientID)
	q.Set("redirect_uri", s.config.OAuthRedirectURL)
	q.Set("state", state)
	q.Set("response_type", "code")

	switch s.config.OAuthProvider {
	case "github":
		q.Set("scope", "read:user user:email")
	case "google":
		q.Set("scope", "openid email profile")
	}

	u.RawQuery = q.Encode()
	return u.String(), nil
}

func (s *OAuthService) HandleCallback(ctx context.Context, code, state string) (*LoginResult, error) {
	if code == "" {
		return nil, apperr.ErrBadRequest.WithMessage("missing code")
	}

	accessToken, err := s.exchangeToken(ctx, code)
	if err != nil {
		return nil, err
	}

	info, err := s.fetchUserInfo(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	u, err := s.findOrCreateUser(ctx, info)
	if err != nil {
		return nil, err
	}

	// 用 AuthService 生成 JWT
	roleName := ""
	if u.Edges.Role != nil {
		roleName = u.Edges.Role.Name
	}

	token, err := s.authSvc.GenerateToken(u.ID, u.Username, roleName)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to generate token: " + err.Error())
	}

	return &LoginResult{Token: token, User: u}, nil
}

func (s *OAuthService) exchangeToken(ctx context.Context, code string) (string, error) {
	_, tokenURL, _ := s.resolveEndpoints()

	data := url.Values{
		"client_id":     {s.config.OAuthClientID},
		"client_secret": {s.config.OAuthClientSecret},
		"code":          {code},
		"redirect_uri":  {s.config.OAuthRedirectURL},
		"grant_type":    {"authorization_code"},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", apperr.ErrInternal.WithMessage("failed to create token request: " + err.Error())
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", apperr.ErrInternal.WithMessage("failed to exchange token: " + err.Error())
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode != http.StatusOK {
		return "", apperr.ErrInternal.WithMessage("oauth token exchange failed: " + err.Error())
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", apperr.ErrInternal.WithMessage("failed to parse token response: " + err.Error())
	}

	token, ok := result["access_token"].(string)
	if !ok || token == "" {
		return "", apperr.ErrInternal.WithMessage("no access_token in response: " + err.Error())
	}

	return token, nil
}

func (s *OAuthService) fetchUserInfo(ctx context.Context, accessToken string) (*OAuthUserInfo, error) {
	_, _, userInfoURL := s.resolveEndpoints()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, userInfoURL, nil)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create userinfo request: " + err.Error())
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to fetch user info: " + err.Error())
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode != http.StatusOK {
		return nil, apperr.ErrInternal.WithMessage("failed to get user info from provider: " + err.Error())
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to parse user info: " + err.Error())
	}

	return s.parseUserInfo(raw), nil
}

func (s *OAuthService) parseUserInfo(raw map[string]interface{}) *OAuthUserInfo {
	info := &OAuthUserInfo{}

	switch s.config.OAuthProvider {
	case "github":
		if v, ok := raw["id"].(float64); ok {
			info.ID = fmt.Sprintf("%.0f", v)
		}
		if v, ok := raw["login"].(string); ok {
			info.Username = v
		}
		if v, ok := raw["email"].(string); ok {
			info.Email = v
		}
		if v, ok := raw["avatar_url"].(string); ok {
			info.Avatar = v
		}
	case "google":
		if v, ok := raw["sub"].(string); ok {
			info.ID = v
		}
		if v, ok := raw["name"].(string); ok {
			info.Username = v
		}
		if v, ok := raw["email"].(string); ok {
			info.Email = v
		}
		if v, ok := raw["picture"].(string); ok {
			info.Avatar = v
		}
	default:
		if v, ok := raw["id"].(string); ok {
			info.ID = v
		} else if v, ok := raw["id"].(float64); ok {
			info.ID = fmt.Sprintf("%.0f", v)
		} else if v, ok := raw["sub"].(string); ok {
			info.ID = v
		}
		if v, ok := raw["username"].(string); ok {
			info.Username = v
		} else if v, ok := raw["login"].(string); ok {
			info.Username = v
		} else if v, ok := raw["name"].(string); ok {
			info.Username = v
		}
		if v, ok := raw["email"].(string); ok {
			info.Email = v
		}
		if v, ok := raw["avatar"].(string); ok {
			info.Avatar = v
		} else if v, ok := raw["avatar_url"].(string); ok {
			info.Avatar = v
		} else if v, ok := raw["picture"].(string); ok {
			info.Avatar = v
		}
	}

	return info
}

func (s *OAuthService) findOrCreateUser(ctx context.Context, info *OAuthUserInfo) (*ent.User, error) {
	// 先按 oauth_provider + oauth_id 查找
	u, err := s.client.User.Query().
		Where(
			user.OauthProvider(s.config.OAuthProvider),
			user.OauthID(info.ID),
		).
		WithRole().
		Only(ctx)
	if err == nil {
		return u, nil
	}

	// 查找 viewer 角色
	viewerRole, err := s.client.Role.Query().Where(entRole.Name("viewer")).Only(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("default role not found: " + err.Error())
	}

	// 生成唯一用户名
	username := info.Username
	if username == "" {
		username = s.config.OAuthProvider + "_" + info.ID
	}

	exists, _ := s.client.User.Query().Where(user.Username(username)).Exist(ctx)
	if exists {
		username = username + "_" + info.ID
	}

	builder := s.client.User.Create().
		SetUsername(username).
		SetPassword(""). // OAuth 用户无密码
		SetOauthProvider(s.config.OAuthProvider).
		SetOauthID(info.ID).
		SetRole(viewerRole)

	if info.Email != "" {
		// 检查 email 是否已被占用
		emailExists, _ := s.client.User.Query().Where(user.Email(info.Email)).Exist(ctx)
		if !emailExists {
			builder = builder.SetEmail(info.Email)
		}
	}
	if info.Avatar != "" {
		builder = builder.SetAvatar(info.Avatar)
	}
	builder = builder.SetNickname(info.Username)

	u, err = builder.Save(ctx)
	if err != nil {
		return nil, apperr.ErrInternal.WithMessage("failed to create oauth user: " + err.Error())
	}

	return s.client.User.Query().Where(user.ID(u.ID)).WithRole().Only(ctx)
}

func (s *OAuthService) resolveEndpoints() (authURL, tokenURL, userInfoURL string) {
	switch s.config.OAuthProvider {
	case "github":
		authURL = "https://github.com/login/oauth/authorize"
		tokenURL = "https://github.com/login/oauth/access_token"
		userInfoURL = "https://api.github.com/user"
	case "google":
		authURL = "https://accounts.google.com/o/oauth2/v2/auth"
		tokenURL = "https://oauth2.googleapis.com/token"
		userInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo"
	default:
		authURL = s.config.OAuthAuthURL
		tokenURL = s.config.OAuthTokenURL
		userInfoURL = s.config.OAuthUserInfoURL
	}
	return
}
