import type { ReactNode } from "react";

export interface SettingsSectionProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function SettingsSection({
  actions,
  children,
  description,
  title
}: SettingsSectionProps) {
  return (
    <section className="yza-settings-section">
      <div className="yza-settings-section__header">
        <div className="yza-settings-section__copy">
          <h2 className="yza-settings-section__title">{title}</h2>
          {description ? (
            <div className="yza-settings-section__description">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="yza-settings-section__actions">{actions}</div> : null}
      </div>
      <div className="yza-settings-section__body">{children}</div>
    </section>
  );
}
