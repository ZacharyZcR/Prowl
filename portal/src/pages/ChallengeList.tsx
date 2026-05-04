import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Tag, Select, Alert } from "@yza/ui";
import { ArrowLeft, Flag, CheckCircle, Lock, Unlock, Send } from "lucide-react";
import { useChallenges, useSubmitFlag, useUnlockHint } from "@/hooks/usePortal";
import { toast } from "sonner";
import { useSSE } from "@/hooks/useSSE";
import ContainerControls from "@/components/ContainerControls";
import { useTranslation } from "react-i18next";

const DIFF_TONE: Record<string, "success" | "info" | "warning" | "danger"> = {
  easy: "success", medium: "info", hard: "warning", insane: "danger",
};

export default function ChallengeList() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = useChallenges(compId);
  const submitMutation = useSubmitFlag();
  const unlockMutation = useUnlockHint();

  const [flagInputs, setFlagInputs] = useState<Record<number, string>>({});
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [showSolved, setShowSolved] = useState(true);

  useSSE((msg) => {
    if (msg.event === "first_blood" && msg.data?.competition_id === compId) {
      toast.success(`First Blood! ${msg.data.team_name} 解出了 ${msg.data.challenge_name}`, { duration: 8000 });
      qc.invalidateQueries({ queryKey: ["portal-challenges", compId] });
    }
  });

  if (isLoading) return <div className="portal-empty">{t("common.loading")}</div>;
  if (error) return <Alert tone="danger" heading={t("common.loadFailed")} />;

  const allChallenges = data?.items ?? [];
  const categories = [...new Set(allChallenges.map((c) => c.category))].sort();
  const difficulties = ["easy", "medium", "hard", "insane"].filter((d) => allChallenges.some((c) => c.difficulty === d));

  const challenges = allChallenges.filter((c) => {
    if (categoryFilter && c.category !== categoryFilter) return false;
    if (difficultyFilter && c.difficulty !== difficultyFilter) return false;
    if (!showSolved && c.is_solved) return false;
    return true;
  });

  async function handleSubmit(challengeId: number) {
    const flag = flagInputs[challengeId]?.trim();
    if (!flag) return;
    try {
      const result = await submitMutation.mutateAsync({ competitionId: compId, challenge_id: challengeId, flag });
      if (result.correct) {
        toast.success(`正确！+${result.points} 分${result.first_blood ? " (First Blood!)" : ""}`);
        qc.invalidateQueries({ queryKey: ["portal-challenges", compId] });
      } else {
        toast.error(result.message || t("competition.flagWrong"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.submitFailed"));
    }
  }

  async function handleUnlockHint(challengeId: number, hintId: number) {
    try {
      const result = await unlockMutation.mutateAsync({ competitionId: compId, challengeId, hintId });
      toast.success(`提示已解锁${result.cost > 0 ? `（-${result.cost} 分）` : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("competition.unlockFailed"));
    }
  }

  return (
    <div>
      <button onClick={() => navigate(`/competitions/${compId}`)} className="comp-back" type="button">
        <ArrowLeft size={16} /> {t("competition.backToComp")}
      </button>

      <div className="portal-page-header">
        <h1><Flag size={22} /> {t("competition.challenges")}</h1>
      </div>

      <div className="portal-filters">
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">全部分类</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
          <option value="">全部难度</option>
          {difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        <label className="chal-filter-check">
          <input type="checkbox" checked={showSolved} onChange={(e) => setShowSolved(e.target.checked)} />
          显示已解决
        </label>
        <Tag tone="neutral">{challenges.length} / {allChallenges.length}</Tag>
      </div>

      <div className="chal-grid">
        {challenges.map((c) => (
          <div key={c.id} className={`chal-card chal-card--${c.difficulty}${c.is_solved ? " chal-card--solved" : ""}`}>
            <div className="chal-card__header">
              <div>
                <span className="chal-card__title">{c.title}</span>
                {c.is_solved && <CheckCircle size={14} style={{ color: "var(--yza-color-success-500)", marginLeft: 6, verticalAlign: "middle" }} />}
              </div>
              <span className="chal-card__score">{c.score}</span>
            </div>

            <div className="chal-card__tags">
              <Tag tone="neutral">{c.category}</Tag>
              <Tag tone={DIFF_TONE[c.difficulty] ?? "neutral"}>{c.difficulty}</Tag>
              <span className="chal-card__solve-count">{c.solve_count} 解</span>
            </div>

            <div className="chal-card__desc">
              {c.description.slice(0, 150)}{c.description.length > 150 ? "..." : ""}
            </div>

            {c.hints && c.hints.length > 0 && (
              <div className="chal-hints">
                {c.hints.map((h) => (
                  <div key={h.id} className="chal-hint">
                    {h.unlocked ? (
                      <div className="chal-hint--unlocked"><Unlock size={12} /> {h.content}</div>
                    ) : (
                      <button onClick={() => handleUnlockHint(c.id, h.id)} disabled={unlockMutation.isPending} className="chal-hint--locked">
                        <Lock size={12} /> 解锁提示 #{h.order_num + 1}{h.cost > 0 ? ` (-${h.cost}分)` : ""}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {c.is_dynamic && <ContainerControls competitionId={compId} challengeId={c.id} />}

            {c.is_solved ? (
              <div className="chal-solved-badge"><CheckCircle size={14} /> 已解决</div>
            ) : (
              <div className="flag-row">
                <input
                  type="text"
                  placeholder="flag{...}"
                  value={flagInputs[c.id] ?? ""}
                  onChange={(e) => setFlagInputs((p) => ({ ...p, [c.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(c.id); }}
                  className="flag-input"
                />
                <Button size="sm" tone="primary" onClick={() => handleSubmit(c.id)} disabled={submitMutation.isPending}>
                  <Send size={12} /> {t("common.submit")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="portal-empty">
          {allChallenges.length === 0 ? t("common.noData") : t("competition.noFilterResult")}
        </div>
      )}
    </div>
  );
}
