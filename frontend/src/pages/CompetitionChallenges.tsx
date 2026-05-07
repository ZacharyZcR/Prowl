import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, DataTable, Input, Modal, Tag } from "@yza/ui";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { useChallenges, type Challenge } from "@/hooks/useChallenges";
import {
  useCompetitionChallenges,
  useBatchAttach,
  useDetachChallenge,
  useReleaseChallenges,
  type CompetitionChallenge,
} from "@/hooks/useCompetitionChallenges";

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";
const DIFF_TONE: Record<string, TagTone> = { easy: "success", medium: "info", hard: "warning", insane: "danger" };

interface LinkedRow extends Record<string, ReactNode> {
  title: ReactNode;
  category: ReactNode;
  difficulty: ReactNode;
  order: ReactNode;
  visible: ReactNode;
  actions: ReactNode;
}

export default function CompetitionChallengesPage() {
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: linked, isLoading, error, refetch } = useCompetitionChallenges(compId);
  const { data: allChallenges } = useChallenges({ page: 1, page_size: 200 });
  const batchAttach = useBatchAttach();
  const detach = useDetachChallenge();
  const release = useReleaseChallenges();

  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const linkedIds = new Set((linked ?? []).map((c) => c.challenge_id));
  const available = (allChallenges?.items ?? []).filter((c: Challenge) => !linkedIds.has(c.id));

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBatchAdd() {
    if (selected.size === 0) return;
    try {
      const challenges = Array.from(selected).map((cid, i) => ({
        challenge_id: cid,
        order_num: (linked?.length ?? 0) + i + 1,
        is_visible: false,
      }));
      const result = await batchAttach.mutateAsync({ competitionId: compId, challenges });
      toast.success(`已添加 ${result.attached} 道题目`);
      setAddOpen(false);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleDetach(challengeId: number) {
    try {
      await detach.mutateAsync({ competitionId: compId, challengeId });
      toast.success(t("common.delete"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleReleaseAll() {
    const hidden = (linked ?? []).filter((c) => !c.is_visible).map((c) => c.challenge_id);
    if (hidden.length === 0) {
      toast.info("所有题目已可见");
      return;
    }
    try {
      const result = await release.mutateAsync({ competitionId: compId, challengeIds: hidden });
      toast.success(`已释放 ${result.released} 道题目`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleReleaseSingle(challengeId: number) {
    try {
      await release.mutateAsync({ competitionId: compId, challengeIds: [challengeId] });
      toast.success("已释放");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const columns = [
    { key: "title" as const, header: "题目", width: "25%" },
    { key: "category" as const, header: "分类", width: "12%" },
    { key: "difficulty" as const, header: "难度", width: "12%" },
    { key: "order" as const, header: "排序", width: "8%" },
    { key: "visible" as const, header: "可见", width: "12%" },
    { key: "actions" as const, header: t("common.actions"), width: "20%", align: "right" as const },
  ];

  const rows: LinkedRow[] = (linked ?? []).map((c) => ({
    title: c.challenge_title,
    category: <Tag tone="info">{c.category}</Tag>,
    difficulty: <Tag tone={DIFF_TONE[c.difficulty] ?? "neutral"}>{c.difficulty}</Tag>,
    order: c.order_num,
    visible: c.is_visible
      ? <Tag tone="success">已释放</Tag>
      : <Tag tone="neutral">隐藏</Tag>,
    actions: (
      <div className="yza-button-row">
        {!c.is_visible && (
          <Button size="sm" tone="outline" onClick={() => handleReleaseSingle(c.challenge_id)}>释放</Button>
        )}
        <Button size="sm" tone="danger" onClick={() => handleDetach(c.challenge_id)}>移除</Button>
      </div>
    ),
  }));

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title="比赛题目管理"
      description="管理比赛关联的题目，控制可见性和释放顺序。"
      actions={
        <div className="yza-button-row">
          <Button tone="outline" onClick={() => navigate(`/competitions/${compId}`)}>返回</Button>
          <Button tone="outline" onClick={() => navigate(`/competitions/${compId}/audit`)}>审计</Button>
          <Button tone="outline" onClick={handleReleaseAll} disabled={release.isPending}>全部释放</Button>
          <Button tone="primary" onClick={() => { setSelected(new Set()); setAddOpen(true); }}>添加题目</Button>
        </div>
      }
    >
      <section className="yza-doc-card stc-table-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>加载中...</div>
          ) : error ? (
            <Alert heading={t("common.loadFailed")} description={errorMessage} tone="danger" />
          ) : rows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
              暂未关联题目，点击「添加题目」开始。
            </div>
          ) : (
            <DataTable<LinkedRow> columns={columns} rows={rows} />
          )}
        </div>
      </section>

      <Modal
        open={addOpen}
        title="添加题目到比赛"
        onClose={() => setAddOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={() => { void handleBatchAdd(); }} disabled={batchAttach.isPending || selected.size === 0}>
              添加 {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        }
      >
        <div style={{ maxHeight: 400, overflow: "auto" }}>
          {available.length === 0 ? (
            <div style={{ padding: "1rem", textAlign: "center", color: "#9ca3af" }}>没有可添加的题目</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem", width: "5%" }}></th>
                  <th style={{ padding: "0.5rem" }}>题目</th>
                  <th style={{ padding: "0.5rem", width: "15%" }}>分类</th>
                  <th style={{ padding: "0.5rem", width: "15%" }}>难度</th>
                </tr>
              </thead>
              <tbody>
                {available.map((c: Challenge) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} onClick={() => toggleSelect(c.id)}>
                    <td style={{ padding: "0.5rem" }}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td style={{ padding: "0.5rem" }}>{c.title}</td>
                    <td style={{ padding: "0.5rem" }}><Tag tone="info">{c.category}</Tag></td>
                    <td style={{ padding: "0.5rem" }}><Tag tone={DIFF_TONE[c.difficulty] ?? "neutral"}>{c.difficulty}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}
