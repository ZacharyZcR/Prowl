import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Tag, Alert } from "@yza/ui";
import { useCompetition, useRegisterCompetition } from "@/hooks/usePortal";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Trophy, Swords, Shield, ArrowLeft, Clock, Users, BookOpen, Flag, Zap, FileText, Gavel } from "lucide-react";
import { useTranslation } from "react-i18next";

const MODE_TONE: Record<string, "info" | "danger" | "warning" | "neutral"> = {
  ctf_jeopardy: "info",
  awd: "danger",
  red_blue: "warning",
};

const MODE_ICON: Record<string, typeof Trophy> = {
  ctf_jeopardy: Trophy,
  awd: Swords,
  red_blue: Shield,
};

function useCountdown(target: string | null) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setRemaining(t("common.timeExpired")); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

export default function CompetitionDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: comp, isLoading, error } = useCompetition(compId);
  const registerMutation = useRegisterCompetition();

  const countdown = useCountdown(comp?.status === "running" ? (comp.end_time ?? null) : (comp?.start_time ?? null));

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  if (error || !comp) return <Alert tone="danger" heading={t("competition.notFound")} />;

  const ModeIcon = MODE_ICON[comp.mode] ?? Trophy;
  const isBanned = comp.registration_status === "rejected";
  const isApproved = comp.registration_status === "approved";

  async function handleRegister() {
    try {
      await registerMutation.mutateAsync(compId);
      toast.success(t("competition.registerSuccess"));
      qc.invalidateQueries({ queryKey: ["portal-competitions", compId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("competition.registerFailed");
      if (msg.includes("team") && !msg.includes("already")) {
        toast.error(t("competition.needTeam"), { action: { label: t("competition.goCreate"), onClick: () => navigate("/team") } });
      } else if (msg.includes("already")) {
        toast.info(t("competition.alreadyRegistered"));
        qc.invalidateQueries({ queryKey: ["portal-competitions", compId] });
      } else {
        toast.error(msg);
      }
    }
  }

  return (
    <div>
      <button onClick={() => navigate("/")} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToList")}
      </button>

      {/* Hero */}
      <div className="comp-hero">
        <div className="comp-hero__info">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <ModeIcon size={24} style={{ color: `var(--yza-color-${MODE_TONE[comp.mode] ?? "neutral"}-600)` }} />
            <Tag tone={MODE_TONE[comp.mode] ?? "neutral"}>{t(`mode.${comp.mode}`)}</Tag>
            <Tag tone={comp.status === "running" ? "success" : comp.status === "registration" ? "info" : "neutral"}>
              {t(`status.${comp.status}`)}
            </Tag>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{comp.title}</h1>
          {comp.description && (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--yza-text-secondary)", margin: 0 }}>{comp.description}</p>
          )}
        </div>

        {/* Stats Row */}
        <div className="comp-stats">
          <StatItem icon={<Users size={16} />} label={t("competition.teams")} value={String(comp.team_count)} />
          <StatItem icon={<BookOpen size={16} />} label={comp.mode === "red_blue" ? t("competition.objectives") : t("competition.challenges")} value={String(comp.challenge_count)} />
          <StatItem icon={<Clock size={16} />} label={comp.status === "running" ? t("competition.timeToEnd") : t("competition.timeToStart")} value={countdown || "—"} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="comp-action-bar">
        {(() => {
          const regOpen = comp.status === "registration" || comp.status === "running";
          const regExpired = comp.registration_end ? new Date(comp.registration_end).getTime() < Date.now() : false;
          const canRegister = !comp.is_registered && regOpen && !regExpired;

          return (
            <>
              {isBanned && <Tag tone="danger">{t("competition.banned")}</Tag>}
              {canRegister && (
                <Button tone="primary" onClick={handleRegister} disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? t("competition.registering") : t("competition.register")}
                </Button>
              )}
              {!comp.is_registered && regOpen && regExpired && (
                <Tag tone="neutral">{t("competition.regClosed")}</Tag>
              )}
              {comp.is_registered && !isBanned && <Tag tone={isApproved ? "success" : "warning"}>{isApproved ? t("competition.registered") : t("competition.registrationPending")}</Tag>}
              {comp.status === "running" && comp.is_registered && isApproved && <ModeActions compId={compId} mode={comp.mode} teamRole={comp.team_role} />}
              {comp.status === "running" && (!comp.is_registered || isBanned) && (
                <Link to={`/competitions/${compId}/scoreboard`}><Button tone="outline"><Trophy size={14} /> {t("competition.scoreboard")}</Button></Link>
              )}
              {(comp.status === "ended" || comp.status === "archived") && (
                <>
                  <Link to={`/competitions/${compId}/summary`}><Button tone="primary"><Trophy size={14} /> {t("competition.summary")}</Button></Link>
                  <Link to={`/competitions/${compId}/scoreboard`}><Button tone="outline">{t("competition.finalRanking")}</Button></Link>
                </>
              )}
            </>
          );
        })()}
      </div>

      {isBanned && (
        <Alert
          tone="danger"
          heading={t("competition.bannedTitle")}
          style={{ marginBottom: "var(--yza-space-4)" }}
        >
          {t("competition.bannedDesc")}
        </Alert>
      )}

      {/* Rules */}
      {comp.rules && (
        <section className="comp-rules">
          <h2 className="comp-rules__title"><FileText size={16} /> {t("competition.rules")}</h2>
          <pre className="comp-rules__content">{comp.rules}</pre>
        </section>
      )}
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="comp-stat-item">
      <div className="comp-stat-item__icon">{icon}</div>
      <div>
        <div className="comp-stat-item__value">{value}</div>
        <div className="comp-stat-item__label">{label}</div>
      </div>
    </div>
  );
}

function ModeActions({ compId, mode, teamRole }: { compId: number; mode: string; teamRole?: string }) {
  const { t } = useTranslation();
  const actions: { to: string; label: string; tone: "primary" | "accent" | "outline" | "danger"; icon: typeof Trophy }[] = [];

  switch (mode) {
    case "ctf_jeopardy":
      actions.push(
        { to: `/competitions/${compId}/challenges`, label: t("competition.challenges"), tone: "primary", icon: Flag },
        { to: `/competitions/${compId}/scoreboard`, label: t("competition.scoreboard"), tone: "outline", icon: Trophy },
      );
      break;
    case "awd":
      actions.push(
        { to: `/competitions/${compId}/challenges`, label: t("competition.challenges"), tone: "primary", icon: Flag },
        { to: `/competitions/${compId}/awd`, label: t("competition.awdServices"), tone: "danger", icon: Zap },
        { to: `/competitions/${compId}/awd/timeline`, label: t("competition.awdTimeline"), tone: "outline", icon: Clock },
        { to: `/competitions/${compId}/scoreboard`, label: t("competition.scoreboard"), tone: "outline", icon: Trophy },
      );
      break;
    case "red_blue":
      actions.push(
        { to: `/competitions/${compId}/redblue`, label: t("redblue.submitReport"), tone: "accent", icon: FileText },
        { to: `/competitions/${compId}/objectives`, label: t("objective.title"), tone: "outline", icon: Flag },
      );
      if (teamRole === "judge" || teamRole === "white") {
        actions.push({ to: `/competitions/${compId}/judge`, label: t("redblue.judgePanel"), tone: "danger", icon: Gavel });
      }
      actions.push(
        { to: `/competitions/${compId}/scoreboard`, label: t("competition.scoreboard"), tone: "outline", icon: Trophy },
      );
      break;
  }

  return (
    <>
      {actions.map((a) => (
        <Link key={a.to} to={a.to}>
          <Button tone={a.tone}><a.icon size={14} /> {a.label}</Button>
        </Link>
      ))}
    </>
  );
}
