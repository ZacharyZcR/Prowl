import { useState, useEffect } from "react";
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
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { useConnectionStore } from "@/stores/connection";
import { useChangePassword, useUpdateProfile } from "@/hooks/useUsers";
import { useUnsavedWarning } from "@/hooks/useUnsavedWarning";
import { PageShell } from "@/components/PageShell";
import { isValidServerUrl, normalizeServerUrl } from "@/lib/server-url";

interface AppInfo {
  name: string;
  version: string;
}

export default function Settings() {
  const { t } = useTranslation();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const lang = useAppStore((state) => state.lang);
  const setLang = useAppStore((state) => state.setLang);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const setServerUrl = useConnectionStore((s) => s.setServerUrl);

  const [urlDraft, setUrlDraft] = useState(serverUrl);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const [profile, setProfile] = useState({
    nickname: user?.nickname ?? "",
    email: user?.email ?? "",
  });
  const [pw, setPw] = useState({ old_password: "", new_password: "", confirm: "" });

  const profileMutation = useUpdateProfile();
  const passwordMutation = useChangePassword();

  const isDirty = profile.nickname !== (user?.nickname ?? "") || profile.email !== (user?.email ?? "") || pw.old_password !== "" || pw.new_password !== "";
  useUnsavedWarning(isDirty);

  const passwordError = pw.confirm.length > 0 && pw.new_password !== pw.confirm;

  useEffect(() => {
    invoke<AppInfo>("get_app_info")
      .then(setAppInfo)
      .catch(() => {});
  }, []);

  async function handleProfileSave() {
    try {
      await profileMutation.mutateAsync({ email: profile.email, nickname: profile.nickname });
      if (user) {
        setUser({ ...user, email: profile.email, nickname: profile.nickname });
      }
      toast.success(t("settings.profileSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    }
  }

  async function handlePasswordChange() {
    if (passwordError) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    try {
      await passwordMutation.mutateAsync({ old_password: pw.old_password, new_password: pw.new_password });
      toast.success(t("settings.passwordChanged"));
      setPw({ old_password: "", new_password: "", confirm: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    }
  }

  function handleConnectionSave() {
    const normalized = normalizeServerUrl(urlDraft);
    if (!isValidServerUrl(normalized)) {
      toast.error("Invalid server URL");
      return;
    }
    setServerUrl(normalized);
    setUrlDraft(normalized);
    toast.success("Server URL updated");
  }

  return (
    <PageShell
      title={t("settings.title")}
      description={t("settings.description")}
    >
      <div className="yza-doc-stack">
        <SettingsSection title="Connection" description="Configure server connection.">
          <FieldGroup title="Server" description="Backend server address for this desktop client.">
            <div className="stc-settings-form stc-settings-form--narrow">
              <Input
                label="Server URL"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
              />
              <Button tone="primary" onClick={handleConnectionSave}>
                Save
              </Button>
            </div>
          </FieldGroup>
        </SettingsSection>

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
            <Button tone="primary" onClick={handlePasswordChange} disabled={passwordMutation.isPending || passwordError} aria-busy={passwordMutation.isPending}>
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

        <SettingsSection title="About" description="Application information.">
          <FieldGroup title="Version" description="Current desktop client version.">
            <div className="stc-settings-form stc-settings-form--narrow">
              <Input label="App Name" value={appInfo?.name ?? "Prowl Range"} disabled />
              <Input label="Version" value={appInfo?.version ?? "-"} disabled />
            </div>
          </FieldGroup>
        </SettingsSection>
      </div>
    </PageShell>
  );
}
