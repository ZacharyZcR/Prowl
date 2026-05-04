import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyScene } from "@/components/EmptyScene";
import { ProjectFormFields } from "@/components/projects/ProjectFormFields";
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
  SplitView,
  Tag,
  Skeleton,
} from "@yza/ui";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { useActivities } from "@/hooks/useActivities";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { PROJECT_STATUS_TONE, createEmptyProjectForm, projectFormSchema, toProjectForm, type ProjectForm } from "@/lib/projects";
import type { Project } from "@/types";

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
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: createEmptyProjectForm(),
  });

  function openEdit(currentProject: Project) {
    reset(toProjectForm(currentProject));
    setEditOpen(true);
  }

  const handleUpdate = handleSubmit(async (form) => {
    try {
      await updateMutation.mutateAsync({ id: projectId, ...form });
      toast.success(t("projects.editTitle"));
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  });

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(projectId);
      toast.success(t("projects.deleteTitle"));
      navigate("/projects", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  async function handleArchive() {
    try {
      await updateMutation.mutateAsync({ id: projectId, status: "archived" });
      toast.success(t("projects.archived"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.operationFailed"));
    }
  }

  if (isLoading) {
    return (
      <section className="yza-doc-page stc-page-animate">
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
    time: formatDateTime(activity.created_at),
    tone: "default" as const,
  }));

  const main = (
    <>
      <PageSection title={t("projects.overviewTitle")} description={t("projects.overviewDescription")}>
        <Alert tone="info" heading={t("projects.description")} description={project.description || t("projects.emptyDescription")} />
      </PageSection>

      <PageSection title={t("projects.activityTitle")} description={t("projects.activityDescription")}>
        {activityError ? (
          <EmptyState
            heading={t("common.loadFailed")}
            description={activityError instanceof Error ? activityError.message : t("common.loadFailed")}
            action={<Button tone="outline" onClick={() => { void refetchActivity(); }}>{t("common.retry")}</Button>}
          />
        ) : isActivityLoading ? (
          <Skeleton count={3} variant="rect" height={96} />
        ) : activityItems.length === 0 ? (
          <EmptyState
            icon={<EmptyScene theme="activity" />}
            heading={t("projects.noActivity")}
            description={t("projects.noActivityDescription")}
          />
        ) : (
          <ActivityFeed items={activityItems} />
        )}
      </PageSection>
    </>
  );

  const aside = (
    <DetailAside
      sections={[
        {
          title: t("projects.owner"),
          items: [
            { label: t("projects.owner"), value: project.owner_name },
            { label: t("projects.status"), value: t(`projects.${project.status}`) },
            { label: t("projects.createdAt"), value: formatDateTime(project.created_at) },
            { label: t("projects.updated"), value: formatDateTime(project.updated_at) },
          ],
        },
      ]}
    />
  );
  const { ref: _nameRef, ...nameField } = register("name");
  const { ref: _descriptionRef, ...descriptionField } = register("description");
  const { ref: _statusRef, ...statusField } = register("status");

  return (
    <section className="yza-doc-page stc-project-detail">
      <DetailHeader
        title={project.name}
        status={<Tag tone={PROJECT_STATUS_TONE[project.status]}>{t(`projects.${project.status}`)}</Tag>}
        subtitle={project.description}
        meta={[
          { label: t("projects.owner"), value: project.owner_name },
          { label: t("projects.createdAt"), value: formatDate(project.created_at) },
        ]}
        actions={
          <div className="yza-button-row stc-project-detail__header-actions">
            {canEdit && (
              <Button tone="outline" onClick={() => openEdit(project)} disabled={updateMutation.isPending}>
                {t("common.edit")}
              </Button>
            )}
            {canEdit && project.status !== "archived" && (
              <Button tone="neutral" onClick={handleArchive} disabled={updateMutation.isPending} aria-busy={updateMutation.isPending}>
                {t("projects.archive")}
              </Button>
            )}
            {canDelete && (
              <Button tone="danger" onClick={() => setDeleteOpen(true)} disabled={deleteMutation.isPending}>
                {t("common.delete")}
              </Button>
            )}
          </div>
        }
      />

      <div className="stc-project-detail__metrics">
        <MetricStrip
          items={[
            {
              label: t("projects.status"),
              value: t(`projects.${project.status}`),
              meta: t("projects.currentStatus"),
              tone: PROJECT_STATUS_TONE[project.status] === "success" ? "success" : PROJECT_STATUS_TONE[project.status] === "warning" ? "warning" : "default",
            },
            {
              label: t("projects.owner"),
              value: project.owner_name,
              meta: t("projects.ownerMeta"),
              tone: "info",
            },
            {
              label: t("projects.createdAt"),
              value: formatDate(project.created_at),
              meta: t("projects.lifecycleMeta"),
            },
            {
              label: t("projects.updated"),
              value: formatDate(project.updated_at),
              meta: t("projects.latestUpdateMeta"),
            },
          ]}
        />
      </div>

      <div className="stc-project-detail__split">
        <SplitView main={main} aside={aside} />
      </div>

      <Modal
        open={editOpen}
        title={t("projects.editTitle")}
        onClose={() => setEditOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="primary" onClick={() => { void handleUpdate(); }} disabled={updateMutation.isPending} aria-busy={updateMutation.isPending}>
              {t("common.save")}
            </Button>
          </div>
        }
      >
        <ProjectFormFields
          descriptionField={descriptionField}
          formErrors={{
            description: errors.description?.message,
            name: errors.name?.message,
            status: errors.status?.message,
          }}
          nameField={nameField}
          statusField={statusField}
          t={t}
        />
      </Modal>

      <Modal
        open={deleteOpen}
        title={t("projects.deleteTitle")}
        description={t("projects.deleteConfirm", { name: project.name })}
        onClose={() => setDeleteOpen(false)}
        footer={
          <div className="yza-button-row">
            <Button tone="outline" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</Button>
            <Button tone="danger" onClick={handleDelete} disabled={deleteMutation.isPending} aria-busy={deleteMutation.isPending}>
              {t("common.delete")}
            </Button>
          </div>
        }
      />
    </section>
  );
}
