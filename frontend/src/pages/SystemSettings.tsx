import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Input, SettingsSection, Switch, Skeleton } from "@yza/ui";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import {
  useSystemSettings,
  useUpdateSystemSettings,
} from "@/hooks/useSettings";
import type { SettingGroup, SettingItem } from "@/hooks/useSettings";

const SECRET_PLACEHOLDER = "\u2022\u2022\u2022\u2022\u2022\u2022";

function buildSettingValues(groups: SettingGroup[]) {
  const next: Record<string, string> = {};
  for (const group of groups) {
    for (const setting of group.settings) {
      next[setting.key] = setting.is_secret ? SECRET_PLACEHOLDER : setting.value;
    }
  }
  return next;
}

function maskSecretValues(groups: SettingGroup[], values: Record<string, string>) {
  const next = { ...values };
  for (const group of groups) {
    for (const setting of group.settings) {
      if (setting.is_secret) {
        next[setting.key] = SECRET_PLACEHOLDER;
      }
    }
  }
  return next;
}

function isSameValues(left: Record<string, string>, right: Record<string, string>) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([key, value]) => right[key] === value);
}

export default function SystemSettings() {
  const { t } = useTranslation();
  const { data: groups, isLoading, error, refetch } = useSystemSettings();
  const updateMutation = useUpdateSystemSettings();

  const [values, setValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const dirty = !isSameValues(values, initialValues);

  useEffect(() => {
    if (!groups || dirty) {
      return;
    }
    const nextValues = buildSettingValues(groups);
    setValues(nextValues);
    setInitialValues(nextValues);
  }, [groups, dirty]);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
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
      if (groups) {
        const nextValues = maskSecretValues(groups, values);
        setValues(nextValues);
        setInitialValues(nextValues);
      }
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
      ) : error ? (
        <div className="yza-doc-stack">
          <Alert
            heading={t("common.loadFailed")}
            description={error instanceof Error ? error.message : t("common.loadFailed")}
            tone="danger"
          />
          <div>
            <Button tone="outline" onClick={() => { void refetch(); }}>
              {t("common.retry")}
            </Button>
          </div>
        </div>
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
