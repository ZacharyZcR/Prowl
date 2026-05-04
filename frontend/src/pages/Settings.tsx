import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  FieldGroup,
  Input,
  Select,
  SettingsSection,
} from "@yza/ui";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { useChangePassword, useUpdateProfile } from "@/hooks/useUsers";
import { useUnsavedWarning } from "@/hooks/useUnsavedWarning";
import { PageShell } from "@/components/PageShell";

export default function Settings() {
  const { t } = useTranslation();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const lang = useAppStore((state) => state.lang);
  const setLang = useAppStore((state) => state.setLang);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [profile, setProfile] = useState({
    nickname: user?.nickname ?? "",
    email: user?.email ?? "",
  });
  const [pw, setPw] = useState({ old_password: "", new_password: "", confirm: "" });

  const profileMutation = useUpdateProfile();
  const passwordMutation = useChangePassword();

  useEffect(() => {
    setProfile({
      nickname: user?.nickname ?? "",
      email: user?.email ?? "",
    });
  }, [user?.nickname, user?.email]);

  const isDirty =
    profile.nickname !== (user?.nickname ?? "") ||
    profile.email !== (user?.email ?? "") ||
    pw.old_password !== "" ||
    pw.new_password !== "" ||
    pw.confirm !== "";
  useUnsavedWarning(isDirty);

  const passwordError = pw.confirm.length > 0 && pw.new_password !== pw.confirm;
  const passwordMissing =
    !pw.old_password.trim() ||
    !pw.new_password.trim() ||
    !pw.confirm.trim();

  async function handleProfileSave() {
    try {
      await profileMutation.mutateAsync({ email: profile.email, nickname: profile.nickname });
      if (user) {
        setUser({ ...user, email: profile.email, nickname: profile.nickname });
      }
      toast.success(t("settings.profileSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handlePasswordChange() {
    if (passwordMissing) {
      toast.error(t("settings.passwordRequired"));
      return;
    }

    if (passwordError) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    try {
      await passwordMutation.mutateAsync({ old_password: pw.old_password, new_password: pw.new_password });
      toast.success(t("settings.passwordChanged"));
      setPw({ old_password: "", new_password: "", confirm: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  return (
    <PageShell
      title={t("settings.title")}
      description={t("settings.description")}
    >
      <div className="yza-doc-stack">
        <SettingsSection
          title={t("settings.profile")}
          description={t("settings.profileDesc")}
          actions={(
            <Button tone="primary" onClick={handleProfileSave} disabled={profileMutation.isPending} aria-busy={profileMutation.isPending}>
              {t("common.save")}
            </Button>
          )}
        >
          <FieldGroup
            title={t("settings.profileGroup")}
            description={t("settings.profileGroupDesc")}
          >
            <div className="stc-settings-form">
              <Input label={t("users.username")} value={user?.username ?? ""} disabled />
              <Input
                label={t("users.nickname")}
                value={profile.nickname}
                onChange={(e) => setProfile((current) => ({ ...current, nickname: e.target.value }))}
              />
              <Input
                label={t("users.email")}
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((current) => ({ ...current, email: e.target.value }))}
              />
            </div>
          </FieldGroup>
        </SettingsSection>

        <SettingsSection
          title={t("settings.password")}
          description={t("settings.passwordDesc")}
          actions={(
            <Button
              tone="primary"
              onClick={handlePasswordChange}
              disabled={passwordMutation.isPending || passwordError || passwordMissing}
              aria-busy={passwordMutation.isPending}
            >
              {t("settings.changePassword")}
            </Button>
          )}
        >
          <FieldGroup
            title={t("settings.securityGroup")}
            description={t("settings.securityGroupDesc")}
          >
            <div className="stc-settings-form">
              <Input
                label={t("settings.currentPassword")}
                type="password"
                value={pw.old_password}
                onChange={(e) => setPw((current) => ({ ...current, old_password: e.target.value }))}
              />
              <Input
                label={t("settings.newPassword")}
                type="password"
                value={pw.new_password}
                onChange={(e) => setPw((current) => ({ ...current, new_password: e.target.value }))}
              />
              <Input
                label={t("settings.confirmPassword")}
                type="password"
                value={pw.confirm}
                status={passwordError ? "error" : "default"}
                message={passwordError ? t("settings.passwordMismatch") : undefined}
                onChange={(e) => setPw((current) => ({ ...current, confirm: e.target.value }))}
              />
            </div>
          </FieldGroup>
          {passwordError ? (
            <Alert
              heading={t("settings.passwordMismatch")}
              description={t("settings.passwordMismatchDesc")}
              tone="warning"
            />
          ) : passwordMissing && (pw.old_password !== "" || pw.new_password !== "" || pw.confirm !== "") ? (
            <Alert
              heading={t("settings.passwordRequired")}
              description={t("settings.passwordRequiredDesc")}
              tone="warning"
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("settings.appearance")} description={t("settings.appearanceDesc")}>
          <FieldGroup
            title={t("settings.themeMode")}
            description={t("settings.themeModeDesc")}
          >
            <div className="stc-settings-form stc-settings-form--narrow">
              <Select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark" | "system")}>
                <option value="light">{t("theme.light")}</option>
                <option value="dark">{t("theme.dark")}</option>
                <option value="system">{t("theme.system")}</option>
              </Select>
            </div>
          </FieldGroup>
        </SettingsSection>

        <SettingsSection title={t("settings.language")} description={t("settings.languageDesc")}>
          <FieldGroup
            title={t("settings.language")}
            description={t("settings.languageHint")}
          >
            <div className="stc-settings-form stc-settings-form--narrow">
              <Select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="zh">中文</option>
                <option value="en">English</option>
              </Select>
            </div>
          </FieldGroup>
        </SettingsSection>
      </div>
    </PageShell>
  );
}
