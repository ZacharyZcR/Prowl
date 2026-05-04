import { Link } from "react-router-dom";
import { Tag } from "@yza/ui";
import { Trophy, Swords, Shield, Clock, Users, BookOpen } from "lucide-react";
import { useCompetitions } from "@/hooks/usePortal";
import { useTranslation } from "react-i18next";

const MODE_TONE: Record<string, "info" | "danger" | "warning"> = {
  ctf_jeopardy: "info",
  awd: "danger",
  red_blue: "warning",
};

const MODE_ICON: Record<string, typeof Trophy> = {
  ctf_jeopardy: Trophy,
  awd: Swords,
  red_blue: Shield,
};

const STATUS_TONE: Record<string, "info" | "success" | "warning" | "neutral"> = {
  registration: "info",
  running: "success",
  ended: "neutral",
  paused: "warning",
};

function formatTimeRange(start: string | null, end: string | null, t: (key: string) => string): string {
  if (!start) return t("common.timePending");
  const s = new Date(start);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (!end) return `${fmt(s)} 开始`;
  return `${fmt(s)} — ${fmt(new Date(end))}`;
}

export default function Home() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useCompetitions({ page: 1, page_size: 50 });

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  if (error) return <div className="portal-empty" style={{ color: "var(--yza-color-danger-600)" }}>{t("common.loadFailed")}</div>;

  const competitions = data?.items ?? [];
  const running = competitions.filter((c) => c.status === "running");
  const upcoming = competitions.filter((c) => c.status === "registration");
  const past = competitions.filter((c) => c.status === "ended" || c.status === "paused");

  return (
    <div>
      <div className="portal-page-header">
        <h1>{t("competition.title")}</h1>
        <p>选择一场比赛，展示你的实力</p>
      </div>

      {running.length > 0 && (
        <Section title={t("competition.ongoing")} count={running.length}>
          <div className="comp-grid">{running.map((c) => <CompCard key={c.id} comp={c} />)}</div>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title={t("competition.upcoming")} count={upcoming.length}>
          <div className="comp-grid">{upcoming.map((c) => <CompCard key={c.id} comp={c} />)}</div>
        </Section>
      )}

      {past.length > 0 && (
        <Section title={t("competition.ended")} count={past.length}>
          <div className="comp-grid">{past.map((c) => <CompCard key={c.id} comp={c} />)}</div>
        </Section>
      )}

      {competitions.length === 0 && <div className="portal-empty">{t("competition.noCompetitions")}</div>}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="portal-section">
      <div className="portal-section__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {title}
        <Tag tone="neutral">{count}</Tag>
      </div>
      {children}
    </section>
  );
}

function CompCard({ comp }: { comp: any }) {
  const { t } = useTranslation();
  const tone = MODE_TONE[comp.mode] ?? "neutral";
  const statusTone = STATUS_TONE[comp.status] ?? "neutral";
  const ModeIcon = MODE_ICON[comp.mode] ?? Trophy;

  return (
    <Link to={`/competitions/${comp.id}`} className="comp-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ModeIcon size={18} style={{ color: `var(--yza-color-${tone}-600)` }} />
          <span className="comp-card__title">{comp.title}</span>
        </div>
        <Tag tone={statusTone}>{t(`status.${comp.status}`)}</Tag>
      </div>

      {comp.description && (
        <div className="comp-card__desc">
          {comp.description.slice(0, 100)}{comp.description.length > 100 ? "..." : ""}
        </div>
      )}

      <div className="comp-card__meta">
        <Tag tone={tone}>{t(`mode.${comp.mode}`)}</Tag>
        <span className="comp-card__stat"><Users size={12} /> {comp.team_count} {t("competition.teams")}</span>
        <span className="comp-card__stat"><BookOpen size={12} /> {comp.challenge_count} {comp.mode === "red_blue" ? t("competition.objectives") : t("competition.challenges")}</span>
        <span className="comp-card__stat"><Clock size={12} /> {formatTimeRange(comp.start_time, comp.end_time, t)}</span>
      </div>
    </Link>
  );
}
