import type { ReactNode, RefObject } from "react";
import { PageHeader } from "@yza/ui";
import { usePageTitle } from "@/hooks/usePageTitle";

interface PageShellProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  headerRef?: RefObject<HTMLDivElement | null>;
  meta?: ReactNode;
  title: ReactNode;
}

export function PageShell({
  actions,
  children,
  description,
  eyebrow,
  headerRef,
  meta,
  title,
}: PageShellProps) {
  usePageTitle(typeof title === "string" ? title : "");
  return (
    <section className="yza-doc-page stc-page-animate">
      <div ref={headerRef}>
        <PageHeader
          actions={actions}
          description={description}
          eyebrow={eyebrow}
          meta={meta}
          title={title}
        />
      </div>
      {children}
    </section>
  );
}
