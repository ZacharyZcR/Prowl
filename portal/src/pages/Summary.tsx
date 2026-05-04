import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tag, Alert } from "@yza/ui";
import { ArrowLeft, Trophy, Flag, Users, Zap, Target } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface SummaryData {
  competition_id: number;
  title: string;
  mode: string;
  status: string;
  start_time: string;
  end_time: string;
  duration: string;
  team_count: number;
  challenge_count: number;
  total_submissions: number;
  correct_submissions: number;
  rankings: { rank: number; team_id: number; team_name: string; total_score: number; solve_count: number; attack_score?: number; defense_score?: number }[];
  challenge_stats: { challenge_id: number; title: string; category: string; solve_count: number; attempt_count: number; first_blood_team: string; first_blood_at: string }[];
  first_bloods: { challenge_id: number; challenge_name: string; team_name: string; solved_at: string }[];
  generated_at: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function Summary() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-summary", compId],
    queryFn: () => api.get<SummaryData>(`/api/v1/portal/competitions/${compId}/summary`).then((r) => r.data),
    enabled: compId > 0,
  });

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  if (error || !data) return <Alert tone="danger" heading={t("common.loadFailed")} />;

  const isAWD = data.mode === "awd";
  const accuracy = data.total_submissions > 0 ? ((data.correct_submissions / data.total_submissions) * 100).toFixed(1) : "0";

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      {/* Header */}
      <div className="comp-hero">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Trophy size={24} style={{ color: "var(--yza-color-warning-500)" }} />
          <Tag tone="neutral">{t(`mode.${data.mode}`)}</Tag>
          <Tag tone={data.status === "ended" ? "neutral" : "success"}>{t(`status.${data.status}`)}</Tag>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{data.title} — {t("competition.summary")}</h1>
        <p style={{ fontSize: 14, color: "var(--yza-text-secondary)", margin: 0 }}>
          {data.duration && `持续 ${data.duration} · `}{data.team_count} 支队伍 · {data.challenge_count} 道题目 · {data.total_submissions} 次提交
        </p>

        <div className="comp-stats" style={{ marginTop: 16 }}>
          <StatItem icon={<Users size={16} />} label={t("competition.teams")} value={String(data.team_count)} />
          <StatItem icon={<Target size={16} />} label={t("competition.challenges")} value={String(data.challenge_count)} />
          <StatItem icon={<Flag size={16} />} label={t("summary.submissions")} value={String(data.total_submissions)} />
          <StatItem icon={<Zap size={16} />} label={t("summary.accuracy")} value={`${accuracy}%`} />
        </div>
      </div>

      {/* 最终排名 */}
      <section className="portal-section">
        <div className="portal-section__title"><Trophy size={18} /> {t("competition.finalRanking")}</div>
        <div className="scoreboard">
          <table>
            <thead>
              <tr>
                <th className="rank">{t("scoreboard.rank")}</th>
                <th>{t("scoreboard.teamName")}</th>
                <th className="score">{t("scoreboard.totalScore")}</th>
                {isAWD ? (
                  <>
                    <th className="score" style={{ color: "var(--yza-color-success-600)" }}>{t("scoreboard.attack")}</th>
                    <th className="score" style={{ color: "var(--yza-color-danger-600)" }}>{t("scoreboard.defense")}</th>
                  </>
                ) : (
                  <th className="score">{t("scoreboard.solveCount")}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.rankings.map((r) => (
                <tr key={r.team_id} className={r.rank <= 3 ? "scoreboard-top3" : ""}>
                  <td className="rank">{r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}</td>
                  <td className="team-name">{r.team_name}</td>
                  <td className="score">{r.total_score}</td>
                  {isAWD ? (
                    <>
                      <td className="score" style={{ color: "var(--yza-color-success-600)" }}>+{r.attack_score ?? 0}</td>
                      <td className="score" style={{ color: "var(--yza-color-danger-600)" }}>{r.defense_score ?? 0}</td>
                    </>
                  ) : (
                    <td className="score">{r.solve_count}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 一血榜 */}
      {data.first_bloods.length > 0 && (
        <section className="portal-section">
          <div className="portal-section__title"><Zap size={18} /> 一血记录</div>
          <div className="yza-doc-card" style={{ padding: "var(--yza-space-5)" }}>
            {data.first_bloods.map((fb, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < data.first_bloods.length - 1 ? "1px solid var(--yza-border-subtle)" : "none", fontSize: 14 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{fb.challenge_name}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Tag tone="danger">{fb.team_name}</Tag>
                  <span style={{ fontSize: 12, color: "var(--yza-text-muted)" }}>{fb.solved_at.replace("T", " ").slice(0, 19)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 题目统计 */}
      <section className="portal-section">
        <div className="portal-section__title"><Flag size={18} /> 题目统计</div>
        <div className="scoreboard">
          <table>
            <thead>
              <tr>
                <th>题目</th>
                <th>分类</th>
                <th className="score">解出</th>
                <th className="score">尝试</th>
                <th>一血</th>
              </tr>
            </thead>
            <tbody>
              {data.challenge_stats.map((cs) => (
                <tr key={cs.challenge_id}>
                  <td style={{ fontWeight: 600 }}>{cs.title}</td>
                  <td><Tag tone="neutral">{cs.category}</Tag></td>
                  <td className="score">{cs.solve_count}</td>
                  <td className="score">{cs.attempt_count}</td>
                  <td style={{ fontSize: 13 }}>{cs.first_blood_team || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--yza-text-muted)", padding: "var(--yza-space-8) 0" }}>
        生成于 {data.generated_at.replace("T", " ").slice(0, 19)}
      </div>
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
