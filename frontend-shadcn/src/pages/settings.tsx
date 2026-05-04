import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/stores/auth";
import { useUpdateProfile, useChangePassword } from "@/hooks/useUsers";

export default function Settings() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  function handleSaveProfile() {
    updateProfile.mutate(
      { nickname, email },
      {
        onSuccess: () => {
          if (user) {
            setUser({ ...user, nickname, email });
          }
          toast.success(t("settings.profileSaved"));
        },
        onError: () => {
          toast.error(t("settings.profileError"));
        },
      },
    );
  }

  function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }

    changePassword.mutate(
      { old_password: oldPassword, new_password: newPassword },
      {
        onSuccess: () => {
          toast.success(t("settings.passwordChanged"));
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: () => {
          toast.error(t("settings.passwordError"));
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.username")}</Label>
            <Input value={user?.username ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">{t("settings.nickname")}</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("settings.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending}
          >
            {t("settings.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.changePassword")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old-password">
              {t("settings.currentPassword")}
            </Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t("settings.confirmPassword")}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changePassword.isPending}
          >
            {t("settings.updatePassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
