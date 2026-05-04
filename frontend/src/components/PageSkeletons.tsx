import { Skeleton } from "@yza/ui";

/** CRUD table page: header + filter bar + table rows */
export function TablePageSkeleton() {
  return (
    <div className="yza-doc-page stc-page-animate">
      <div className="stc-skeleton-header">
        <Skeleton variant="rect" height={28} />
        <Skeleton variant="text" />
      </div>
      <Skeleton variant="rect" height={48} />
      <div className="yza-doc-card">
        <div className="yza-doc-stack">
          <Skeleton variant="rect" height={44} />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} variant="rect" height={52} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** CRUD table with KPI stats on top */
export function TableWithKPISkeleton() {
  return (
    <div className="yza-doc-page stc-page-animate">
      <div className="stc-skeleton-header">
        <Skeleton variant="rect" height={28} />
        <Skeleton variant="text" />
      </div>
      <div className="stc-skeleton-kpi-row">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} variant="rect" height={88} />
        ))}
      </div>
      <Skeleton variant="rect" height={48} />
      <div className="yza-doc-card">
        <div className="yza-doc-stack">
          <Skeleton variant="rect" height={44} />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} variant="rect" height={52} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Settings page: stacked sections with form fields */
export function SettingsPageSkeleton() {
  return (
    <div className="yza-doc-page stc-page-animate">
      <div className="stc-skeleton-header">
        <Skeleton variant="rect" height={28} />
        <Skeleton variant="text" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="stc-skeleton-section">
          <Skeleton variant="rect" height={20} />
          <Skeleton variant="text" />
          <div className="stc-skeleton-fields">
            <Skeleton variant="rect" height={40} />
            <Skeleton variant="rect" height={40} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Info/monitor page: KPI cards + info sections */
export function InfoPageSkeleton() {
  return (
    <div className="yza-doc-page stc-page-animate">
      <div className="stc-skeleton-header">
        <Skeleton variant="rect" height={28} />
        <Skeleton variant="text" />
      </div>
      <div className="stc-skeleton-kpi-row">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} variant="rect" height={88} />
        ))}
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="stc-skeleton-section">
          <Skeleton variant="rect" height={20} />
          <div className="stc-skeleton-fields">
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} variant="rect" height={32} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Detail page: header banner + split view */
export function DetailPageSkeleton() {
  return (
    <div className="yza-doc-page stc-page-animate">
      <Skeleton variant="rect" height={120} />
      <Skeleton variant="rect" height={88} />
      <div className="stc-skeleton-split">
        <Skeleton variant="rect" height={300} />
        <Skeleton variant="rect" height={200} />
      </div>
    </div>
  );
}
