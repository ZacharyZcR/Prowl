package services

import (
	"context"
	"fmt"
	"net/smtp"
)

// EmailNotifier 通过 SMTP 发送邮件通知
type EmailNotifier struct {
	SettingService *SettingService
}

func (n *EmailNotifier) Name() string { return "email" }

func (n *EmailNotifier) Send(ctx context.Context, to, title, content string) error {
	enabled, _ := n.SettingService.Get(ctx, "email.enabled")
	if enabled != "true" {
		return nil
	}

	host, _ := n.SettingService.Get(ctx, "email.smtp_host")
	port, _ := n.SettingService.Get(ctx, "email.smtp_port")
	user, _ := n.SettingService.Get(ctx, "email.smtp_user")
	pass, _ := n.SettingService.Get(ctx, "email.smtp_password")
	fromName, _ := n.SettingService.Get(ctx, "email.from_name")
	fromAddr, _ := n.SettingService.Get(ctx, "email.from_address")

	auth := smtp.PlainAuth("", user, pass, host)
	msg := fmt.Sprintf("From: %s <%s>\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		fromName, fromAddr, to, title, content)

	return smtp.SendMail(host+":"+port, auth, fromAddr, []string{to}, []byte(msg))
}
