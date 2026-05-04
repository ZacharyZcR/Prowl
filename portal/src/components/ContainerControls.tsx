import { useState } from "react";
import { useContainerInstance, useStartContainer, useStopContainer } from "@/hooks/usePortal";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface Props {
  competitionId: number;
  challengeId: number;
}

const STATUS_COLOR: Record<string, string> = {
  running: "#22c55e",
  starting: "#f59e0b",
  pending: "#6b7280",
  stopped: "#6b7280",
  error: "#ef4444",
};

export default function ContainerControls({ competitionId, challengeId }: Props) {
  const { t } = useTranslation();
  const { data: instance } = useContainerInstance(competitionId, challengeId);
  const startMutation = useStartContainer();
  const stopMutation = useStopContainer();
  const [localAction, setLocalAction] = useState<"starting" | "stopping" | null>(null);

  const isActive = instance && ["running", "starting", "pending"].includes(instance.status);

  async function handleStart() {
    setLocalAction("starting");
    try {
      const inst = await startMutation.mutateAsync({ competitionId, challengeId });
      toast.success(`${t("status.running")}: ${inst.access_url || t("common.loading")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.operationFailed"));
    } finally {
      setLocalAction(null);
    }
  }

  async function handleStop() {
    setLocalAction("stopping");
    try {
      await stopMutation.mutateAsync({ competitionId, challengeId });
      toast.success(t("status.completed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.operationFailed"));
    } finally {
      setLocalAction(null);
    }
  }

  return (
    <div style={{
      padding: "0.5rem", background: "var(--yza-surface-raised)", borderRadius: "var(--yza-radius-md)",
      fontSize: "0.8rem", marginBottom: "0.25rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 500 }}>{t("competition.challenges")}</span>
        {instance ? (
          <span style={{
            fontSize: "0.7rem", padding: "0.0625rem 0.375rem", borderRadius: "9999px",
            background: `${STATUS_COLOR[instance.status] ?? "#6b7280"}20`,
            color: STATUS_COLOR[instance.status] ?? "#6b7280",
          }}>
            {t(`status.${instance.status}`, instance.status)}
          </span>
        ) : (
          <span style={{ color: "var(--yza-text-muted)", fontSize: "0.75rem" }}>{t("status.pending")}</span>
        )}
      </div>

      {instance?.status === "running" && instance.access_url && (
        <div style={{ marginTop: "0.25rem" }}>
          <a
            href={instance.access_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--yza-color-brand-500)", fontSize: "0.75rem", wordBreak: "break-all" }}
          >
            {instance.access_url}
          </a>
          {instance.expires_at && (
            <div style={{ fontSize: "0.7rem", color: "var(--yza-text-muted)", marginTop: "0.125rem" }}>
              {new Date(instance.expires_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem" }}>
        {!isActive ? (
          <button
            onClick={handleStart}
            disabled={localAction === "starting"}
            style={{
              padding: "0.25rem 0.75rem", background: "#10b981", color: "#fff",
              border: "none", borderRadius: "0.25rem", cursor: "pointer", fontSize: "0.75rem",
            }}
          >
            {localAction === "starting" ? t("common.loading") : t("common.submit")}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={localAction === "stopping"}
            style={{
              padding: "0.25rem 0.75rem", background: "#ef4444", color: "#fff",
              border: "none", borderRadius: "0.25rem", cursor: "pointer", fontSize: "0.75rem",
            }}
          >
            {localAction === "stopping" ? t("common.loading") : t("common.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
