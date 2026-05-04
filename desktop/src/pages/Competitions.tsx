import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert, Button, DataTable, EmptyTable, FilterBar, FilterSummary,
  Input, Modal, Pagination, Select, Skeleton, Tag, Textarea,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useCompetitions, useCreateCompetition, useDeleteCompetition } from "@/hooks/useCompetitions";
import { useDataTable } from "@/hooks/useDataTable";
import { PageShell } from "@/components/PageShell";
import type { Competition, CompetitionMode } from "@/types";

const MODE_LABEL: Record<CompetitionMode, string> = {
  ctf_jeopardy: "CTF Jeopardy",
  awd: "AWD",
  red_blue: "红蓝演习",
};

const MODE_TONE: Record<CompetitionMode, "info" | "danger" | "warning"> = {
  ctf_jeopardy: "info",
  awd: "danger",
  red_blue: "warning",
};

const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "warning"> = {
  draft: "neutral",
  registration: "info",
  running: "success",
  paused: "warning",
  ended: "neutral",
  archived: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  registration: "报名中",
  running: "进行中",
  paused: "已暂停",
  ended: "已结束",
  archived: "已归档",
};

interface Row extends Record<string, ReactNode> {
  title: ReactNode;
  mode: ReactNode;
  status: ReactNode;
  teams: ReactNode;
  time: ReactNode;
  actions: ReactNode;
}

export default function Competitions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = usePermission();
  const table = useDataTable(10);
  const [modeFilter, setModeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, error, isLoading, refetch } = useCompetitions({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch || undefined,
    mode: modeFilter || undefined,
    status: statusFilter || undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const createMutation = useCreateCompetition();
  const deleteMutation = useDeleteCompetition();

  const [form, setForm] = useState({
    title: "", description: "", mode: "ctf_jeopardy" as CompetitionMode,
    max_teams: 0, max_team_size: 5, is_public: true, rules: "",
  });

  function resetFilters() {
    setModeFilter(""); setStatusFilter(""); table.setSearch(""); table.reset();
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error("请输入比赛标题"); return; }
    try {
      const res = await createMutation.mutateAsync(form);
      toast.success("比赛创建成功");
      setCreateOpen(false);
      const created = (res.data as Competition | undefined);
      if (created?.id) navigate(`/competitions/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("已删除");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  }

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || modeFilter || statusFilter);

  const columns = [
    { key: "title" as const, header: "比赛名称", width: "25%" },
    { key: "mode" as const, header: "模式", width: "12%" },
    { key: "status" as const, header: "状态", width: "10%" },
    { key: "teams" as const, header: "队伍/题目", width: "12%" },
    { key: "time" as const, header: "时间", width: "20%" },
    { key: "actions" as const, header: "操作", width: "15%", align: "right" as const },
  ];

  const rows: Row[] = items.map((c) => ({
    title: <button className="stc-link" onClick={() => navigate(`/competitions/${c.id}`)} type="button">{c.title}</button>,
    mode: <Tag tone={MODE_TONE[c.mode] ?? "neutral"}>{MODE_LABEL[c.mode] ?? c.mode}</Tag>,
    status: <Tag tone={STATUS_TONE[c.status] ?? "neutral"}>{STATUS_LABEL[c.status] ?? c.status}</Tag>,
    teams: `${c.team_count} / ${c.challenge_count}`,
    time: c.start_time ? `${c.start_time.slice(0, 10)} ~ ${c.end_time?.slice(0, 10) ?? ""}` : "-",
    actions: (
      <div className="yza-button-row">
        <Button size="sm" tone="outline" onClick={() => navigate(`/competitions/${c.id}`)}>管理</Button>
        {can("competition:delete") && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(c)}>删除</Button>
        )}
      </div>
    ),
  }));

  return (
    <PageShell
      title="比赛管理"
      description="管理 CTF / AWD / 红蓝演习比赛"
      actions={can("competition:create") ? <Button tone="primary" onClick={() => { setForm({ title: "", description: "", mode: "ctf_jeopardy", max_teams: 0, max_team_size: 5, is_public: true, rules: "" }); setCreateOpen(true); }}>创建比赛</Button> : undefined}
    >
      <FilterBar
        actions={hasFilters ? <Button size="sm" tone="outline" onClick={resetFilters}>重置</Button> : undefined}
        controls={
          <>
            <Input placeholder="搜索比赛..." value={table.search} onChange={(e) => table.setSearch(e.target.value)} />
            <Select value={modeFilter} onChange={(e) => { setModeFilter(e.target.value); table.reset(); }}>
              <option value="">全部模式</option>
              <option value="ctf_jeopardy">CTF Jeopardy</option>
              <option value="awd">AWD</option>
              <option value="red_blue">红蓝演习</option>
            </Select>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); table.reset(); }}>
              <option value="">全部状态</option>
              <option value="draft">草稿</option>
              <option value="registration">报名中</option>
              <option value="running">进行中</option>
              <option value="paused">已暂停</option>
              <option value="ended">已结束</option>
            </Select>
          </>
        }
      />

      {!isLoading && !error && (
        <FilterSummary
          chips={hasFilters ? <span className="stc-tag-list">{modeFilter && <Tag tone="info">{MODE_LABEL[modeFilter as CompetitionMode] ?? modeFilter}</Tag>}{statusFilter && <Tag tone="neutral">{STATUS_LABEL[statusFilter] ?? statusFilter}</Tag>}</span> : undefined}
          summary={hasFilters ? `找到 ${total} 条` : `共 ${total} 条`}
        />
      )}

      <section className="yza-doc-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <><Skeleton variant="rect" height={44} /><Skeleton count={5} variant="rect" height={52} /></>
          ) : error ? (
            <><Alert heading="加载失败" description={error instanceof Error ? error.message : "未知错误"} tone="danger" /><Button tone="outline" onClick={() => { void refetch(); }}>重试</Button></>
          ) : rows.length === 0 ? (
            <EmptyTable action={<Button tone="outline" onClick={hasFilters ? resetFilters : () => setCreateOpen(true)}>{ hasFilters ? "重置" : "创建比赛" }</Button>} description={hasFilters ? "没有匹配的比赛" : "还没有比赛"} headers={columns.map((c) => c.header)} heading="暂无数据" />
          ) : (
            <><DataTable<Row> columns={columns} rows={rows} />{totalPages > 1 && <Pagination page={table.page} totalPages={totalPages} onPageChange={table.setPage} />}</>
          )}
        </div>
      </section>

      <Modal open={createOpen} title="创建比赛" onClose={() => setCreateOpen(false)} footer={
        <div className="yza-button-row">
          <Button tone="outline" onClick={() => setCreateOpen(false)}>取消</Button>
          <Button tone="primary" onClick={handleCreate} disabled={createMutation.isPending}>创建</Button>
        </div>
      }>
        <div className="yza-doc-stack">
          <Input label="比赛名称" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="描述" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          <Select label="比赛模式" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as CompetitionMode }))}>
            <option value="ctf_jeopardy">CTF Jeopardy</option>
            <option value="awd">AWD 攻防</option>
            <option value="red_blue">红蓝演习</option>
          </Select>
          <div style={{ display: "flex", gap: "var(--yza-space-3)" }}>
            <Input label="最大队伍数 (0=不限)" type="number" value={String(form.max_teams)} onChange={(e) => setForm((f) => ({ ...f, max_teams: Number(e.target.value) }))} />
            <Input label="每队人数上限" type="number" value={String(form.max_team_size)} onChange={(e) => setForm((f) => ({ ...f, max_team_size: Number(e.target.value) }))} />
          </div>
          <Textarea label="比赛规则" value={form.rules} onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))} rows={4} />
        </div>
      </Modal>

      <Modal open={deleteTarget !== null} title="删除比赛" description={`确定删除「${deleteTarget?.title}」？此操作不可撤销。`} onClose={() => setDeleteTarget(null)} footer={
        <div className="yza-button-row">
          <Button tone="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button tone="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>删除</Button>
        </div>
      } />
    </PageShell>
  );
}
