import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ActivityFeed,
  Alert,
  Button,
  DetailAside,
  DetailHeader,
  EmptyState,
  KeyValueList,
  MetricStrip,
  Modal,
  PageSection,
  ResultPage,
  Select,
  SplitView,
  Tag,
  Textarea,
  Input,
  Skeleton,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { useActivities } from "@/hooks/useActivities";
import type { Project } from "@/types";

const STATUS_TONE = {
  active: "success",
  archived: "neutral",
  draft: "warning",
} as const;

export default function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const { can } = usePermission();
  const canEdit = can("project:update");
  const canDelete = can("project:delete");

  const projectId = Number(id) || 0;
  const {
    data: project,
    error,
    isLoading,
    refetch,
  } = useProject(projectId);
  const {
    data: activityData,
    error: activityError,
    isLoading: isActivityLoading,
    refetch: refetchActivity,
  } = useActivities({ resource_type: "project", resource_id: projectId, page_size: 20 }, projectId > 0);

  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "draft" });

  function openEdit(currentProject: Project) {
    setForm({ name: currentProject.name, description: currentProject.description, status: currentProject.status });
    setEditOpen(true);
  }

  async function handleUpdate() {
    try {
      await updateMutation.mutateAsync({ id: projectId, ...form });
      toast.success(t("projects.editTitle"));
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update project");
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(projectId);
      toast.success(t("projects.deleteTitle"));
      navigate("/projects", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
    }
  }

  async function handleArchive() {
    try {
      await updateMutation.mutateAsync({ id: projectId, status: "archived" });
      toast.success(t("projects.archived"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive project");
    }
  }

  if (isLoading) {
    return (
      <section className="yza-doc-page">
        <Skeleton variant="rect" height={120} />
        <Skeleton variant="rect" height={88} />
        <Skeleton count={3} variant="rect" height={160} />
      </section>
    );
  }

  if (error) {
    return (
      <ResultPage
        tone="danger"
        title={t("common.loadFailed")}
        description={error instanceof Error ? error.message : t("common.loadFailed")}
        actions={(
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => navigate("/projects")}>{t("common.back")}</Button>
            <Button tone="primary" onClick={() => { void refetch(); }}>{t("common.retry")}</Button>
          </div>
        )}
      />
    );
  }

  if (!project) {
    return (
      <ResultPage
        tone="warning"
        title={t("projects.detailMissingTitle")}
        description={t("projects.detailMissing")}
        actions={<Button tone="outline" onClick={() => navigate("/projects")}>{t("common.back")}</Button>}
      />
    );
  }

  const activities = activityData?.items ?? [];
  const activityItems = activities.map((activity) => ({
    title: `${activity.username} ${activity.action}`,
    description: activity.detail || undefined,
    meta: activity.ip,
    time: activity.created_at.slice(0, 16).replace("T", " "),
    tone: "default" as const,
  }));

  return (
    <section className="yza-doc-page">
      <DetailHeader
        title={project.name}
        status={<Tag tone={STATUS_TONE[project.status]}>{t(`projects.${project.status}`)}</Tag>}
        subtitle={project.description}
        meta={[
          { label: t("projects.owner"), value: project.owner_name },
          { label: t("projects.createdAt"), value: project.created_at.slice(0, 10) },
        ]}
        actions={
          <div className="yza-button-row">
            {canEdit && (
              <Button tone="outline" onClick={() => openEdit(project)}>{t("common.edit")}</Button>
            )}
            {canEdit && project.status !== "archived" && (
              <Button tone="neutral" onClick={handleArchive}>{t("projects.archive")}</Button>
            )}
            {canDelete && (
              <Button tone="danger" onClick={() => setDeleteOpen(true)}>{t("common.delete")}</Button>
            )}
          </div>
        }
      />

      <MetricStrip
        items={[
          {
            label: t("projects.status"),
            value: t(`projects.${project.status}`),
            meta: t("projects.currentStatus"),
            tone: STATUS_TONE[project.status] === "success" ? "success" : STATUS_TONE[project.status] === "warning" ? "warning" : "default",
          },
          {
            label: t("projects.owner"),
            value: project.owner_name,
            meta: t("projects.ownerMeta"),
            tone: "info",
          },
          {
            label: t("projects.createdAt"),
            value: project.created_at.slice(0, 10),
            meta: t("projects.lifecycleMeta"),
          },
          {
            label: t("projects.updated"),
            value: project.updated_at.slice(0, 10),
            meta: t("projects.latestUpdateMeta"),
          },
        ]}
      />

      <SplitView
        aside={(
          <DetailAside
            title={t("projects.contextTitle")}
            sections={[
              {
                title: t("projects.contextStatus"),
                items: [
                  { label: t("projects.status"), value: t(`projects.${project.status}`) },
                  { label: t("projects.owner"), value: project.owner_name },
                ],
              },
              {
                title: t("projects.contextLifecycle"),
                items: [
                  { label: t("projects.createdAt"), value: project.created_at.slice(0, 10) },
                  { label: t("projects.updated"), value: project.updated_at.slice(0, 10) },
                ],
              },
            ]}
          />
        )}
        main={(
          <div className="yza-doc-stack">
            <PageSection
              title={t("projects.overview")}
              description={t("projects.overviewDesc")}
            >
              <KeyValueList
                items={[
                  { label: t("projects.name"), value: project.name },
                  { label: t("projects.description"), value: project.description || "--" },
                  { label: t("projects.status"), value: <Tag tone={STATUS_TONE[project.status]}>{t(`projects.${project.status}`)}</Tag> },
                  { label: t("projects.owner"), value: project.owner_name },
                  { label: t("projects.createdAt"), value: project.created_at.slice(0, 10) },
                  { label: t("projects.updated"), value: project.updated_at.slice(0, 10) },
                ]}
              />
            </PageSection>

            <PageSection
              title={t("projects.activity")}
              description={t("projects.activityDesc")}
            >
              {isActivityLoading ? (
                <div className="yza-doc-stack">
                  <Skeleton count={4} variant="rect" height={72} />
                </div>
              ) : activityError ? (
                <div className="yza-doc-stack">
                  <Alert
                    heading={t("common.loadFailed")}
                    description={activityError instanceof Error ? activityError.message : t("common.loadFailed")}
                    tone="danger"
                  />
                  <div>
                    <Button tone="outline" onClick={() => { void refetchActivity(); }}>
                      {t("common.retry")}
                    </Button>
                  </div>
                </div>
              ) : activityItems.length > 0 ? (
                <ActivityFeed items={activityItems} />
              ) : (
                <EmptyState
                  heading={t("projects.noActivity")}
                  description={t("projects.activityEmptyDescription")}
                />
              )}
            </PageSection>
          </div>
        )}
        variant="main-aside"
      />

      <Modal
        open={editOpen}
        title={t("projects.editTitle")}
        onClose={() => setEditOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        }
      >
        <div className="yza-doc-stack">
          <Input label={t("projects.name")} value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          <Textarea label={t("projects.description")} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={3} />
          <Select label={t("projects.status")} value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
            <option value="draft">{t("projects.draft")}</option>
            <option value="active">{t("projects.active")}</option>
            <option value="archived">{t("projects.archived")}</option>
          </Select>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title={t("projects.deleteTitle")}
        description={t("projects.deleteConfirm", { name: project.name })}
        onClose={() => setDeleteOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </div>
        }
      />
    </section>
  );
}
