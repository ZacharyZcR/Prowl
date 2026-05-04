import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, SettingsSection, Switch, Skeleton } from "@yza/ui";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import {
  useSystemSettings,
  useUpdateSystemSettings,
} from "@/hooks/useSettings";
import type { SettingItem } from "@/hooks/useSettings";

const SECRET_PLACEHOLDER = "\u2022\u2022\u2022\u2022\u2022\u2022";

export default function SystemSettings() {
  const { t } = useTranslation();
  const { data: groups, isLoading } = useSystemSettings();
  const updateMutation = useUpdateSystemSettings();

  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (groups) {
      const initial: Record<string, string> = {};
      for (const g of groups) {
        for (const s of g.settings) {
          initial[s.key] = s.is_secret ? SECRET_PLACEHOLDER : s.value;
        }
      }
      setValues(initial);
      setDirty(false);
      setTouched(new Set());
    }
  }, [groups]);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
    setDirty(true);
  }

  async function handleSave() {
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value === SECRET_PLACEHOLDER) continue;
      payload[key] = value;
    }
    try {
      await updateMutation.mutateAsync(payload);
      toast.success(t("systemSettings.saved"));
      setDirty(false);
      setTouched(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.loadFailed"));
    }
  }

  function renderField(item: SettingItem) {
    switch (item.value_type) {
      case "boolean":
        return (
          <Switch
            id={item.key}
            label={item.display_name}
            description={item.description}
            checked={values[item.key] === "true"}
            onChange={(e) =>
              handleChange(
                item.key,
                String((e.target as HTMLInputElement).checked),
              )
            }
          />
        );
      case "number":
        return (
          <Input
            label={item.display_name}
            hint={item.description}
            type="number"
            value={values[item.key] ?? ""}
            onChange={(e) => handleChange(item.key, e.target.value)}
          />
        );
      case "secret":
        return (
          <Input
            label={item.display_name}
            hint={item.description}
            type="password"
            value={values[item.key] ?? ""}
            placeholder={SECRET_PLACEHOLDER}
            onChange={(e) => handleChange(item.key, e.target.value)}
          />
        );
      default:
        return (
          <Input
            label={item.display_name}
            hint={item.description}
            value={values[item.key] ?? ""}
            onChange={(e) => handleChange(item.key, e.target.value)}
          />
        );
    }
  }

  return (
    <PageShell
      title={t("systemSettings.title")}
      description={t("systemSettings.description")}
      actions={
        <Button
          tone="primary"
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
          aria-busy={updateMutation.isPending}
        >
          {t("common.save")}
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton count={4} height={120} />
      ) : (
        <div className="yza-doc-stack">
          {groups?.map((group) => (
            <SettingsSection
              key={group.group_name}
              title={t(`systemSettings.groups.${group.group_name}`)}
              description={t(
                `systemSettings.groupDesc.${group.group_name}`,
              )}
            >
              <div className="stc-settings-form">
                {group.settings.map((item) => (
                  <div key={item.key}>{renderField(item)}</div>
                ))}
              </div>
            </SettingsSection>
          ))}
        </div>
      )}
    </PageShell>
  );
}
