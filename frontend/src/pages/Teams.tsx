import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
import { useTeams, useDeleteTeam, type Team } from "@/hooks/useTeams";

interface TeamRow extends Record<string, ReactNode> {
  name: ReactNode;
  captain_name: ReactNode;
  member_count: ReactNode;
  is_active: ReactNode;
  invite_code: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

export default function Teams() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canDelete = can("team:delete");

  const table = useDataTable(10);

  const { data, error, isLoading, refetch } = useTeams({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch || undefined,
  });

  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const deleteMutation = useDeleteTeam();

  function resetFilters() {
    table.setSearch("");
    table.reset();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("teams.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const teams = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim());
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "name" as const, header: t("teams.name"), width: "18%" },
    { key: "captain_name" as const, header: t("teams.captain"), width: "14%" },
    { key: "member_count" as const, header: t("teams.memberCount"), width: "10%" },
    { key: "is_active" as const, header: t("teams.active"), width: "10%" },
    { key: "invite_code" as const, header: t("teams.inviteCode"), width: "16%" },
    { key: "created_at" as const, header: t("teams.createdAt"), width: "14%" },
    { key: "actions" as const, header: t("common.actions"), width: "10%", align: "right" as const },
  ];

  const rows: TeamRow[] = teams.map((team) => ({
    name: team.name,
    captain_name: team.captain_name,
    member_count: team.members?.length ?? 0,
    is_active: (
      <Tag tone={team.is_active ? "success" : "danger"}>
        {team.is_active ? t("teams.statusActive") : t("teams.statusInactive")}
      </Tag>
    ),
    invite_code: <code>{team.invite_code}</code>,
    created_at: formatDate(team.created_at),
    actions: (
      <div className="yza-button-row">
        {canDelete && (
          <Button size="sm" tone="danger" onClick={() => setDeleteTarget(team)} aria-label={`${t("common.delete")} ${team.name}`}>
            {t("common.delete")}
          </Button>
        )}
      </div>
    ),
  }));

  const summaryChips = [
    table.search.trim() ? <Tag key="search" tone="info">{`${t("common.search")}: ${table.search.trim()}`}</Tag> : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("teams.pageTitle")}
      description={t("teams.pageDescription")}
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
          <Input
            placeholder={t("teams.search")}
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
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
              <Alert
                heading={t("common.loadFailed")}
                description={errorMessage}
                tone="danger"
              />
              <div>
                <Button tone="outline" onClick={() => { void refetch(); }}>
                  {t("common.retry")}
                </Button>
              </div>
            </>
          ) : rows.length === 0 ? (
            <EmptyTable
              action={
                hasFilters ? (
                  <Button tone="outline" onClick={resetFilters}>
                    {t("common.reset")}
                  </Button>
                ) : undefined
              }
              description={hasFilters ? t("common.emptyFiltered") : t("teams.emptyDescription")}
              headers={columns.map((col) => col.header)}
              heading={hasFilters ? t("common.noData") : t("teams.emptyTitle")}
            />
          ) : (
            <>
              <DataTable<TeamRow> columns={columns} rows={rows} />
              {totalPages > 1 && (
                <Pagination
                  page={table.page}
                  totalPages={totalPages}
                  onPageChange={table.setPage}
                />
              )}
            </>
          )}
        </div>
      </section>

      <Modal
        open={deleteTarget !== null}
        title={t("teams.deleteTitle")}
        description={t("teams.deleteConfirm", { name: deleteTarget?.name })}
        onClose={() => setDeleteTarget(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button tone="danger" onClick={() => { void handleDelete(); }} disabled={deleteMutation.isPending} aria-busy={deleteMutation.isPending}>
              {t("common.delete")}
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}
