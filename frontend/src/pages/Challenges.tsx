import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
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
import { api } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/lib/datetime";
import {
  useChallenges,
  useCreateChallenge,
  useUpdateChallenge,
  useDeleteChallenge,
  type Challenge,
  type ChallengePayload,
  type NetworkTopology,
} from "@/hooks/useChallenges";

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";

const DIFFICULTY_TONE: Record<string, TagTone> = {
  easy: "success",
  medium: "info",
  hard: "warning",
  insane: "danger",
};

const CATEGORIES = ["web", "pwn", "crypto", "reverse", "misc", "forensics", "network"];
const DIFFICULTIES = ["easy", "medium", "hard", "insane"];
const FLAG_TYPES = ["static", "dynamic_per_team", "regex"];

function categoryLabel(t: (key: string, options?: Record<string, unknown>) => string, category: string) {
  const normalized = category.trim().toLowerCase();
  return t(`challenges.cat_${normalized}`, { defaultValue: category || normalized });
}

interface ChallengeRow extends Record<string, ReactNode> {
  title: ReactNode;
  category: ReactNode;
  difficulty: ReactNode;
  base_score: ReactNode;
  solve_count: ReactNode;
  author_name: ReactNode;
  is_hidden: ReactNode;
  created_at: ReactNode;
  actions: ReactNode;
}

function emptyForm() {
  return {
    title: "",
    description: "",
    mode: "ctf_jeopardy" as string,
    category: "web",
    difficulty: "easy",
    flag_type: "static" as string,
    static_flag: "",
    base_score: 100,
    is_dynamic: false,
    docker_image: "",
    network_topology_json: "",
    is_hidden: false,
  };
}

interface ChallengesProps {
  mode?: "ctf" | "awd";
}

export default function Challenges({ mode }: ChallengesProps = {}) {
  const { t } = useTranslation();
  const { can } = usePermission();
  const canCreate = can("challenge:create");
  const canEdit = can("challenge:update");
  const canDelete = can("challenge:delete");

  const table = useDataTable(10);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  const { data: dockerImages } = useQuery({
    queryKey: ["docker-images"],
    queryFn: () => api.get<{ id: string; tags: string[]; size: number }[]>("/api/v1/admin/docker/images").then((r) => r.data),
    staleTime: 60_000,
  });

  const modeFilter = mode === "ctf" ? "ctf_jeopardy" : mode === "awd" ? "awd" : undefined;
  const pageTitle = mode === "ctf" ? t("challenges.ctfTitle") : mode === "awd" ? t("challenges.awdTitle") : t("challenges.pageTitle");
  const pageDesc = mode === "ctf" ? t("challenges.ctfDescription") : mode === "awd" ? t("challenges.awdDescription") : t("challenges.pageDescription");

  const { data, error, isLoading, refetch } = useChallenges({
    page: table.page,
    page_size: table.pageSize,
    search: table.debouncedSearch || undefined,
    category: categoryFilter || undefined,
    difficulty: difficultyFilter || undefined,
    mode: modeFilter,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Challenge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);
  const [form, setForm] = useState(emptyForm());

  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge();
  const deleteMutation = useDeleteChallenge();

  function setField<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm());
    setCreateOpen(true);
  }

  function openEdit(challenge: Challenge) {
    setForm({
      title: challenge.title,
      description: challenge.description,
      mode: challenge.mode || "ctf_jeopardy",
      category: challenge.category,
      difficulty: challenge.difficulty,
      flag_type: challenge.flag_type,
      static_flag: "",
      base_score: challenge.base_score,
      is_dynamic: challenge.is_dynamic,
      docker_image: challenge.docker_image,
      network_topology_json: challenge.network_topology
        ? JSON.stringify(challenge.network_topology, null, 2)
        : "",
      is_hidden: challenge.is_hidden,
    });
    setEditTarget(challenge);
  }

  function parseNetworkTopology(): NetworkTopology | Record<string, never> | null {
    const raw = form.network_topology_json.trim();
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw) as NetworkTopology;
    } catch {
      toast.error("网络拓扑 JSON 格式无效");
      return null;
    }
  }

  function buildPayload(): ChallengePayload | null {
    const networkTopology = parseNetworkTopology();
    if (networkTopology === null) {
      return null;
    }
    const { network_topology_json, ...payload } = form;
    return { ...payload, network_topology: networkTopology };
  }

  function resetFilters() {
    setCategoryFilter("");
    setDifficultyFilter("");
    table.setSearch("");
    table.reset();
  }

  async function handleCreate() {
    const payload = buildPayload();
    if (!payload) return;
    try {
      await createMutation.mutateAsync(payload);
      toast.success(t("challenges.createTitle"));
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;
    const payload = buildPayload();
    if (!payload) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, ...payload });
      toast.success(t("challenges.editTitle"));
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t("challenges.deleteTitle"));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  const challenges = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = Boolean(table.search.trim() || categoryFilter || difficultyFilter);
  usePageBounds(table.page, totalPages, table.setPage);

  const columns = [
    { key: "title" as const, header: t("challenges.title"), width: "18%" },
    { key: "category" as const, header: t("challenges.category"), width: "10%" },
    { key: "difficulty" as const, header: t("challenges.difficulty"), width: "10%" },
    { key: "base_score" as const, header: t("challenges.baseScore"), width: "8%" },
    { key: "solve_count" as const, header: t("challenges.solveCount"), width: "8%" },
    { key: "author_name" as const, header: t("challenges.author"), width: "10%" },
    { key: "is_hidden" as const, header: t("challenges.hidden"), width: "8%" },
    { key: "created_at" as const, header: t("challenges.createdAt"), width: "12%" },
    { key: "actions" as const, header: t("common.actions"), width: "14%", align: "right" as const },
  ];

  const rows: ChallengeRow[] = challenges.map((c) => ({
    title: c.title,
    category: <Tag tone="info">{categoryLabel(t, c.category)}</Tag>,
    difficulty: <Tag tone={DIFFICULTY_TONE[c.difficulty] ?? "neutral"}>{t(`challenges.diff_${c.difficulty}`)}</Tag>,
    base_score: c.base_score,
    solve_count: c.solve_count,
    author_name: c.author_name,
    is_hidden: <Tag tone={c.is_hidden ? "warning" : "success"}>{c.is_hidden ? t("common.yes") : t("common.no")}</Tag>,
    created_at: formatDate(c.created_at),
    actions: (
      <div className="yza-button-row">
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
    categoryFilter ? <Tag key="category" tone="info">{categoryLabel(t, categoryFilter)}</Tag> : null,
    difficultyFilter ? <Tag key="difficulty" tone={DIFFICULTY_TONE[difficultyFilter] ?? "neutral"}>{t(`challenges.diff_${difficultyFilter}`)}</Tag> : null,
  ].filter(Boolean);

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  const formFields = (
    <div className="yza-doc-stack">
      <Input
        label={t("challenges.title")}
        value={form.title}
        onChange={(e) => setField("title", e.target.value)}
      />
      <div>
        <label className="yza-label">{t("challenges.description")}</label>
        <textarea
          className="yza-textarea"
          rows={4}
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
        />
      </div>
      <Select
        label="比赛模式"
        value={form.mode}
        onChange={(e) => setField("mode", e.target.value)}
      >
        <option value="ctf_jeopardy">CTF Jeopardy</option>
        <option value="awd">AWD 攻防</option>
        <option value="red_blue">红蓝演习</option>
      </Select>
      <Select
        label={t("challenges.category")}
        value={form.category}
        onChange={(e) => setField("category", e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{categoryLabel(t, c)}</option>
        ))}
      </Select>
      <Select
        label={t("challenges.difficulty")}
        value={form.difficulty}
        onChange={(e) => setField("difficulty", e.target.value)}
      >
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>{t(`challenges.diff_${d}`)}</option>
        ))}
      </Select>
      <Select
        label={t("challenges.flagType")}
        value={form.flag_type}
        onChange={(e) => setField("flag_type", e.target.value)}
      >
        {FLAG_TYPES.map((f) => (
          <option key={f} value={f}>{t(`challenges.flag_${f}`)}</option>
        ))}
      </Select>
      {form.flag_type === "static" && (
        <Input
          label={t("challenges.staticFlag")}
          value={form.static_flag}
          onChange={(e) => setField("static_flag", e.target.value)}
        />
      )}
      <Input
        label={t("challenges.baseScore")}
        type="number"
        value={String(form.base_score)}
        onChange={(e) => setField("base_score", Number(e.target.value))}
      />
      <label className="yza-checkbox">
        <input
          type="checkbox"
          checked={form.is_dynamic}
          onChange={(e) => setField("is_dynamic", e.target.checked)}
        />
        {t("challenges.isDynamic")}
      </label>
      {form.is_dynamic && (
        <>
          <Select
            label={t("challenges.dockerImage")}
            value={form.docker_image}
            onChange={(e) => setField("docker_image", e.target.value)}
          >
            <option value="">-- 选择镜像 --</option>
            {(dockerImages ?? []).flatMap((img) =>
              img.tags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))
            )}
          </Select>
          <div>
            <label className="yza-label">网络拓扑 JSON</label>
            <textarea
              className="yza-textarea"
              rows={8}
              value={form.network_topology_json}
              onChange={(e) => setField("network_topology_json", e.target.value)}
            />
          </div>
        </>
      )}
      <label className="yza-checkbox">
        <input
          type="checkbox"
          checked={form.is_hidden}
          onChange={(e) => setField("is_hidden", e.target.checked)}
        />
        {t("challenges.isHidden")}
      </label>
    </div>
  );

  return (
    <PageShell
      title={pageTitle}
      description={pageDesc}
      actions={
        canCreate ? (
          <Button tone="primary" onClick={openCreate}>{t("challenges.create")}</Button>
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
              placeholder={t("challenges.search")}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
            <Select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); table.reset(); }}
            >
              <option value="">{t("challenges.allCategory")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabel(t, c)}</option>
              ))}
            </Select>
            <Select
              value={difficultyFilter}
              onChange={(e) => { setDifficultyFilter(e.target.value); table.reset(); }}
            >
              <option value="">{t("challenges.allDifficulty")}</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{t(`challenges.diff_${d}`)}</option>
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
              action={(
                <Button tone="outline" onClick={hasFilters ? resetFilters : openCreate} disabled={!hasFilters && !canCreate}>
                  {hasFilters ? t("common.reset") : t("challenges.create")}
                </Button>
              )}
              description={hasFilters ? t("common.emptyFiltered") : t("challenges.emptyDescription")}
              headers={columns.map((col) => col.header)}
              heading={hasFilters ? t("common.noData") : t("challenges.emptyTitle")}
            />
          ) : (
            <>
              <DataTable<ChallengeRow> columns={columns} rows={rows} />
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
        open={createOpen}
        title={t("challenges.createTitle")}
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={() => { void handleCreate(); }} disabled={createMutation.isPending} aria-busy={createMutation.isPending}>
              {t("common.create")}
            </Button>
          </div>
        }
      >
        {formFields}
      </Modal>

      <Modal
        open={editTarget !== null}
        title={t("challenges.editTitle")}
        onClose={() => setEditTarget(null)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setEditTarget(null)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={() => { void handleUpdate(); }} disabled={updateMutation.isPending} aria-busy={updateMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        {formFields}
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title={t("challenges.deleteTitle")}
        description={t("challenges.deleteConfirm", { name: deleteTarget?.title })}
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
