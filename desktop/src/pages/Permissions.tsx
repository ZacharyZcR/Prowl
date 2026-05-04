import { useTranslation } from "react-i18next";
import { DataTable, KPIGroup, Skeleton, Alert, Button, Tag } from "@yza/ui";
import type { ReactNode } from "react";
import { usePermissionCategories } from "@/hooks/usePermissions";
import { PageShell } from "@/components/PageShell";
import type { Permission } from "@/types";

interface PermRow extends Record<string, ReactNode> {
  code: ReactNode;
  name: ReactNode;
  resource: ReactNode;
  action: ReactNode;
  description: ReactNode;
}

function toRow(p: Permission): PermRow {
  return {
    code: <code style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.85em" }}>{p.code}</code>,
    name: p.name,
    resource: <Tag tone="neutral">{p.resource}</Tag>,
    action: <Tag tone="info">{p.action}</Tag>,
    description: p.description,
  };
}

export default function Permissions() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading, error, refetch } = usePermissionCategories();

  const totalPermissions = categories.reduce((sum, cat) => sum + cat.permissions.length, 0);
  const totalCategories = categories.length;

  const columns = [
    { key: "code" as const, header: t("permissionsPage.code"), width: "20%" },
    { key: "name" as const, header: t("permissionsPage.name"), width: "15%" },
    { key: "resource" as const, header: t("permissionsPage.resource"), width: "12%" },
    { key: "action" as const, header: t("permissionsPage.action"), width: "12%" },
    { key: "description" as const, header: t("permissionsPage.permDescription"), width: "41%" },
  ];

  const errorMessage = error instanceof Error ? error.message : t("common.loadFailed");

  return (
    <PageShell
      title={t("permissionsPage.title")}
      description={t("permissionsPage.description")}
    >
      <KPIGroup
        columns={2}
        items={[
          {
            label: t("permissionsPage.totalPermissions"),
            value: isLoading ? "--" : String(totalPermissions),
            tone: "info",
          },
          {
            label: t("permissionsPage.totalCategories"),
            value: isLoading ? "--" : String(totalCategories),
            tone: "default",
          },
        ]}
      />

      {isLoading ? (
        <section className="yza-doc-card">
          <div className="yza-doc-stack">
            <Skeleton variant="rect" height={44} />
            <Skeleton count={5} variant="rect" height={52} />
          </div>
        </section>
      ) : error ? (
        <section className="yza-doc-card">
          <div className="yza-doc-stack">
            <Alert heading={t("common.loadFailed")} description={errorMessage} tone="danger" />
            <div>
              <Button tone="outline" onClick={() => { void refetch(); }}>
                {t("common.retry")}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        categories.map((cat) => (
          <section key={cat.category} className="yza-doc-card">
            <div className="yza-doc-stack">
              <div>
                <h3 className="yza-doc-card__title">{cat.category}</h3>
                <p className="yza-doc-card__meta">{cat.permissions.length} {t("permissions.nPermissions", { n: cat.permissions.length }).replace(/^\d+\s*/, "")}</p>
              </div>
              <DataTable<PermRow>
                columns={columns}
                rows={cat.permissions.map(toRow)}
              />
            </div>
          </section>
        ))
      )}
    </PageShell>
  );
}
