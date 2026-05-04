import type { ReactNode } from "react";
import { PageHeader } from "@yza/ui";
import { usePageTitle } from "@/hooks/usePageTitle";

interface PageShellProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}

export function PageShell({
  actions,
  children,
  description,
  eyebrow,
  meta,
  title,
}: PageShellProps) {
  usePageTitle(typeof title === "string" ? title : "");
  return (
    <section className="yza-doc-page">
      <PageHeader
        actions={actions}
        description={description}
        eyebrow={eyebrow}
        meta={meta}
        title={title}
      />
      {children}
    </section>
  );
}
