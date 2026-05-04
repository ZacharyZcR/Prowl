import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import {
  useSystemSettings,
  useUpdateSystemSettings,
  type SettingGroup,
  type SettingItem,
} from "@/hooks/useSettings"

import { PageHeader } from "@/components/shared/page-header"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

export default function SystemSettings() {
  const { t } = useTranslation()
  const { data: groups, isLoading } = useSystemSettings()
  const updateMut = useUpdateSystemSettings()

  const [edits, setEdits] = useState<Record<string, string>>({})

  function handleChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }))
  }

  function getValue(item: SettingItem) {
    return edits[item.key] ?? item.value
  }

  function handleSaveGroup(group: SettingGroup) {
    const settings: Record<string, string> = {}
    for (const item of group.settings) {
      if (edits[item.key] !== undefined) {
        settings[item.key] = edits[item.key]
      }
    }
    if (Object.keys(settings).length === 0) {
      toast.info(t("settings.noChanges", "No changes to save"))
      return
    }
    updateMut.mutate(settings, {
      onSuccess: () => {
        const cleared = { ...edits }
        for (const key of Object.keys(settings)) delete cleared[key]
        setEdits(cleared)
        toast.success(t("common.save", "Saved"))
      },
      onError: () => toast.error(t("common.operationFailed", "Operation failed")),
    })
  }

  function hasGroupChanges(group: SettingGroup) {
    return group.settings.some((s) => edits[s.key] !== undefined)
  }

  function renderSettingInput(item: SettingItem) {
    if (item.value_type === "boolean") {
      const checked = getValue(item) === "true"
      return (
        <Switch
          checked={checked}
          onCheckedChange={(v) => handleChange(item.key, v ? "true" : "false")}
        />
      )
    }

    return (
      <Input
        type={item.is_secret ? "password" : "text"}
        value={getValue(item)}
        onChange={(e) => handleChange(item.key, e.target.value)}
        placeholder={item.default_value || undefined}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t("settings.title", "System Settings")} />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("settings.title", "System Settings")}
        description={t("settings.description", "Manage system configuration")}
      />

      {groups?.map((group) => (
        <Card key={group.group_name}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{group.group_name}</CardTitle>
              <CardDescription>
                {t("settings.groupItems", "{{count}} settings", {
                  count: group.settings.length,
                })}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => handleSaveGroup(group)}
              disabled={updateMut.isPending || !hasGroupChanges(group)}
            >
              {updateMut.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Save className="mr-1 size-4" />
              )}
              {t("common.save", "Save")}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {group.settings.map((item) => (
                <div key={item.key} className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={item.key}>
                      {item.display_name || item.key}
                    </Label>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  {renderSettingInput(item)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {groups?.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          {t("common.noData", "No data")}
        </p>
      )}
    </div>
  )
}
