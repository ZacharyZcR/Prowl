import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  DataTable,
  EmptyTable,
  FilterBar,
  FilterSummary,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tag,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useDataTable } from "@/hooks/useDataTable";
import { usePageBounds } from "@/hooks/usePageBounds";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/lib/datetime";
import {
  useCompetitions,
  useCreateCompetition,
  useUpdateCompetition,
  useDeleteCompetition,
  useUpdateCompetitionStatus,
  type Competition,
} from "@/hooks/useCompetitions";

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";

const STATUS_TONE: Record<string, TagTone> = {
  draft: "neutral",
  registration: "info",
  running: "success",
  paused: "warning",
  ended: "danger",
  archived: "neutral",
};

const STATUSES = ["draft", "registration", "running", "paused", "ended", "archived"];

interface CompetitionRow extends Record<string, ReactNode> {
  title: ReactNode;
  status: ReactNode;
  team_count: ReactNode;
  challenge_count: ReactNode;
  start_time: ReactNode;
  end_time: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

interface CompetitionPageProps {
  mode: "ctf_jeopardy" | "awd" | "red_blue";
}

function emptyForm(mode: string) {
  return {
    title: "",
    description: "",
    mode,
    max_teams: 0,
    max_team_size: 4,
    is_public: true,
    start_time: "",
    end_time: "",
  };
}

export default function CompetitionPage({ mode }: CompetitionPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = usePermission();
  const canCreate = can("competition:create");
  const canEdit = can("competition:update");
  const canDelete = can("competition:delete");

  const modeKey = `competitions.mode_${mode}`;
  const pageTitle = t(modeKey);
  const pageDesc = t(`competitions.modeDesc_${mode}`);

  const table = useDataTable(10);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, error, isLoading, refetch } = useCompetitions({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch || undefined,
    mode,
    status: statusFilter || undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Competition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Competition | null>(null);
  const [form, setForm] = useState(emptyForm(mode));

  const createMutation = useCreateCompetition();
  const updateMutation = useUpdateCompetition();
  const deleteMutation = useDeleteCompetition();
  const statusMutation = useUpdateCompetitionStatus();

  function setField<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm(mode));
    setCreateOpen(true);
  }

  function openEdit(competition: Competition) {
    setForm({
      title: competition.title,
      description: competition.description,
      mode,
      max_teams: competition.max_teams,
      max_team_size: competition.max_team_size,
      is_public: competition.is_public,
      start_time: competition.start_time ? competition.start_time.slice(0, 16) : "",
      end_time: competition.end_time ? competition.end_time.slice(0, 16) : "",
    });
    setEditTarget(competition);
  }

  function resetFilters() {
    setStatusFilter("");
    table.setSearch("");
    table.reset();
  }

  useEffect(() => {
    setStatusFilter("");
    table.setSearch("");
    table.reset();
  }, [mode]);

  async function handleCreate() {
    try {
      await createMutation.mutateAsync(form);
      toast.success(t("competitions.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, ...form });
      toast.success(t("competitions.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("competitions.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast.success(t("competitions.statusUpdated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  function detailPath(competition: Competition) {
    if (competition.mode === "awd") return `/competitions/${competition.id}/awd`;
    if (competition.mode === "red_blue") return `/competitions/${competition.id}/redblue`;
    return `/competitions/${competition.id}/challenges`;
  }

  const competitions = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || statusFilter);
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "title" as const, header: t("competitions.name"), width: "22%" },
    { key: "status" as const, header: t("competitions.status"), width: "14%" },
    { key: "team_count" as const, header: t("competitions.teamCount"), width: "10%" },
    { key: "challenge_count" as const, header: t("competitions.challengeCount"), width: "10%" },
    { key: "start_time" as const, header: t("competitions.startTime"), width: "14%" },
    { key: "end_time" as const, header: t("competitions.endTime"), width: "14%" },
    { key: "created_at" as const, header: t("competitions.createdAt"), width: "10%" },
    { key: "actions" as const, header: t("common.actions"), width: "12%", align: "right" as const },
  ];

  const rows: CompetitionRow[] = competitions.map((c) => ({
    title: (
      <button className="stc-link" onClick={() => navigate(detailPath(c))} type="button">
        {c.title}
      </button>
    ),
    status: (
      canEdit ? (
        <Select
          value={c.status}
          onChange={(e) => { void handleStatusChange(c.id, e.target.value); }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`competitions.status_${s}`)}</option>
          ))}
        </Select>
      ) : (
        <Tag tone={STATUS_TONE[c.status] ?? "neutral"}>{t(`competitions.status_${c.status}`)}</Tag>
      )
    ),
    team_count: c.team_count,
    challenge_count: c.challenge_count,
    start_time: c.start_time ? formatDate(c.start_time) : "—",
    end_time: c.end_time ? formatDate(c.end_time) : "—",
    created_at: formatDate(c.created_at),
    actions: (
      <div className="yza-button-row">
        <Button size="sm" tone="primary" onClick={() => navigate(detailPath(c))} aria-label={`${t("common.enter")} ${c.title}`}>{t("common.enter")}</Button>
        <Button size="sm" tone="outline" onClick={() => navigate(`/competitions/${c.id}/audit`)} aria-label={`审计 ${c.title}`}>审计</Button>
        {canEdit && (
          <Button size="sm" tone="outline" onClick={() => openEdit(c)} aria-label={`${t("common.edit")} ${c.title}`}>{t("common.edit")}</Button>
        )}
        {canDelete && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(c)} aria-label={`${t("common.delete")} ${c.title}`}>{t("common.delete")}</Button>
        )}
      </div>
    ),
  }));

  const summaryChips = [
    table.search.trim() ? <Tag key="search" tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag> : null,
    statusFilter ? <Tag key="status" tone={STATUS_TONE[statusFilter] ?? "neutral"}>{t(`competitions.status_${statusFilter}`)}</Tag> : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  const formFields = (
    <div className="yza-doc-stack">
      <Input
        label={t("competitions.name")}
        value={form.title}
        onChange={(e) => setField("title", e.target.value)}
      />
      <div>
        <label className="yza-label">{t("competitions.description")}</label>
        <textarea
          className="yza-textarea"
          rows={4}
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
        />
      </div>
      <Input
        label={t("competitions.maxTeams")}
        type="number"
        value={String(form.max_teams)}
        onChange={(e) => setField("max_teams", Number(e.target.value))}
      />
      <Input
        label={t("competitions.maxTeamSize")}
        type="number"
        value={String(form.max_team_size)}
        onChange={(e) => setField("max_team_size", Number(e.target.value))}
      />
      <label className="yza-checkbox">
        <input
          type="checkbox"
          checked={form.is_public}
          onChange={(e) => setField("is_public", e.target.checked)}
        />
        {t("competitions.isPublic")}
      </label>
      <Input
        label={t("competitions.startTime")}
        type="datetime-local"
        value={form.start_time}
        onChange={(e) => setField("start_time", e.target.value)}
      />
      <Input
        label={t("competitions.endTime")}
        type="datetime-local"
        value={form.end_time}
        onChange={(e) => setField("end_time", e.target.value)}
      />
    </div>
  );

  return (
    <PageShell
      title={pageTitle}
      description={pageDesc}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("competitions.create")}</Button>
        ) : undefined
      }
    >
      <FilterBar
        actions={
          hasFilters ? (
            <Button size="sm" tone="outline" onClick={resetFilters}>
              {t("common.reset")}
            </Button>
          ) : undefined
        }
        controls={(
          <>
            <Input
              placeholder={t("competitions.search")}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); table.reset(); }}
            >
              <option value="">{t("competitions.allStatus")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`competitions.status_${s}`)}</option>
              ))}
            </Select>
          </>
        )}
      />

      {!isLoading && !error ? (
        <div className="stc-table-summary">
          <FilterSummary
            chips={summaryChips.length > 0 ? <span className="stc-tag-list">{summaryChips}</span> : undefined}
            summary={hasFilters ? t("common.filteredCount", { count: total }) : t("common.totalCount", { count: total })}
          />
        </div>
      ) : null}

      <section className="yza-doc-card stc-table-card">
        <div className="yza-doc-stack">
          {isLoading ? (
            <>
              <Skeleton variant="rect" height={44} />
              <Skeleton count={5} variant="rect" height={52} />
            </>
          ) : error ? (
            <>
              <Alert heading={t("common.loadFailed")} description={errorMessage} tone="danger" />
              <div><Button tone="outline" onClick={() => { void refetch(); }}>{t("common.retry")}</Button></div>
            </>
          ) : rows.length === 0 ? (
            <EmptyTable
              action={<Button tone="outline" onClick={hasFilters ? resetFilters : openCreate} disabled={!hasFilters && !canCreate}>{hasFilters ? t("common.reset") : t("competitions.create")}</Button>}
              description={hasFilters ? t("common.emptyFiltered") : t("competitions.emptyDescription")}
              headers={columns.map((col) => col.header)}
              heading={hasFilters ? t("common.noData") : t("competitions.emptyTitle")}
            />
          ) : (
            <>
              <DataTable<CompetitionRow> columns={columns} rows={rows} />
              {totalPages > 1 && <Pagination page={table.page} totalPages={totalPages} onPageChange={table.setPage} />}
            </>
          )}
        </div>
      </section>

      <Modal open={createOpen} title={t("competitions.createTitle")} onClose={() => setCreateOpen(false)}
        footer={<div className="yza-button-row"><Button tone="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button><Button tone="primary" onClick={() => { void handleCreate(); }} disabled={createMutation.isPending}>{t("common.create")}</Button></div>}
      >{formFields}</Modal>

      <Modal open={editTarget !== null} title={t("competitions.editTitle")} onClose={() => setEditTarget(null)}
        footer={<div className="yza-button-row"><Button tone="outline" onClick={() => setEditTarget(null)}>{t("common.cancel")}</Button><Button tone="primary" onClick={() => { void handleUpdate(); }} disabled={updateMutation.isPending}>{t("common.save")}</Button></div>}
      >{formFields}</Modal>

      <Modal open={deleteTarget !== null} title={t("competitions.deleteTitle")} description={t("competitions.deleteConfirm", { name: deleteTarget?.title })} onClose={() => setDeleteTarget(null)}
        footer={<div className="yza-button-row"><Button tone="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button><Button tone="danger" onClick={() => { void handleDelete(); }} disabled={deleteMutation.isPending}>{t("common.delete")}</Button></div>}
      />
    </PageShell>
  );
}
