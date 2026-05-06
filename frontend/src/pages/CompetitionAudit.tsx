import { type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, AlertTriangle, FileText, ShieldCheck, ShieldX } from "lucide-react";
import { Alert, Button, KPIGroup, Skeleton, Tag } from "@yza/ui";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { formatDateTime } from "@/lib/datetime";
import { usePermission } from "@/hooks/usePermission";
import {
  useAdminWriteups,
  useAntiCheatReport,
  useCompetition,
  useCompetitionRegistrations,
  useCompetitionSubmissions,
  useReviewRegistration,
  useReviewWriteup,
  type TeamRegistration,
} from "@/hooks/useCompetitions";

type TagTone = "info" | "success" | "warning" | "neutral" | "danger";

const STATUS_TONE: Record<string, TagTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  submitted: "warning",
  reviewed: "info",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "待审",
  approved: "已通过",
  rejected: "已禁赛",
  submitted: "待审",
  reviewed: "已审阅",
};

const TEAM_ROLE_LABEL: Record<string, string> = {
  participant: "参赛队",
  red: "红队",
  blue: "蓝队",
  white: "白队",
  judge: "裁判",
};

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "1rem",
};

const sectionStyle: CSSProperties = {
  padding: "1rem",
};

const sectionHeadStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  marginBottom: "1rem",
};

const itemStyle: CSSProperties = {
  border: "1px solid var(--yza-border-subtle)",
  borderRadius: 8,
  padding: "0.875rem",
  background: "var(--yza-surface-subtle)",
  color: "var(--yza-text-primary)",
};

const mutedStyle: CSSProperties = {
  color: "var(--yza-text-secondary)",
  fontSize: "0.85rem",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const thStyle: CSSProperties = {
  borderBottom: "1px solid var(--yza-border-subtle)",
  color: "var(--yza-text-muted)",
  fontSize: "0.8rem",
  fontWeight: 600,
  padding: "0.625rem",
  textAlign: "left",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid var(--yza-border-subtle)",
  color: "var(--yza-text-primary)",
  padding: "0.625rem",
  verticalAlign: "top",
};

const emptyStyle: CSSProperties = {
  padding: "1.25rem",
  textAlign: "center",
  color: "var(--yza-text-secondary)",
  border: "1px dashed var(--yza-border-default)",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--yza-text-primary) 3%, transparent)",
};

const codeStyle: CSSProperties = {
  color: "var(--yza-color-brand-200, var(--yza-text-primary))",
  background: "color-mix(in srgb, var(--yza-color-brand-500) 14%, transparent)",
  border: "1px solid var(--yza-border-subtle)",
  borderRadius: 6,
  padding: "0.125rem 0.375rem",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  wordBreak: "break-all",
};

export default function CompetitionAuditPage() {
  const { id } = useParams<{ id: string }>();
  const compId = Number(id);
  const navigate = useNavigate();
  const { can } = usePermission();
  const canUpdate = can("competition:update");

  const competitionQuery = useCompetition(compId);
  const reportQuery = useAntiCheatReport(compId);
  const writeupsQuery = useAdminWriteups(compId);
  const submissionsQuery = useCompetitionSubmissions(compId);
  const registrationsQuery = useCompetitionRegistrations(compId);
  const reviewWriteup = useReviewWriteup();
  const reviewRegistration = useReviewRegistration();

  const report = reportQuery.data;
  const writeups = writeupsQuery.data?.items ?? [];
  const submissions = submissionsQuery.data?.items ?? [];
  const registrations = registrationsQuery.data ?? [];
  const pendingWriteups = writeups.filter((w) => w.status === "submitted");
  const rejectedTeams = registrations.filter((r) => r.status === "rejected");
  const wrongSubmissions = submissions.filter((s) => !s.is_correct);
  const isLoading = reportQuery.isLoading || writeupsQuery.isLoading || submissionsQuery.isLoading || registrationsQuery.isLoading;
  const error = reportQuery.error || writeupsQuery.error || submissionsQuery.error || registrationsQuery.error;

  async function handleWriteupReview(writeupId: number, status: "approved" | "rejected") {
    try {
      await reviewWriteup.mutateAsync({
        writeupId,
        competitionId: compId,
        status,
        comment: status === "approved"
          ? "裁判审核通过：步骤、证据和提交记录基本一致。"
          : "裁判驳回：WriteUp 证据不足或与提交记录不一致。",
      });
      toast.success(status === "approved" ? "WriteUp 已通过" : "WriteUp 已驳回");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "审核失败");
    }
  }

  async function handleRegistrationReview(reg: TeamRegistration, status: "approved" | "rejected") {
    try {
      await reviewRegistration.mutateAsync({ competitionId: compId, regId: reg.id, status });
      toast.success(status === "approved" ? "已恢复参赛资格" : "已取消参赛资格");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "处置失败");
    }
  }

  if (!Number.isFinite(compId) || compId <= 0) {
    return (
      <PageShell title="赛事审计">
        <Alert heading="赛事不存在" description="无效的赛事编号。" tone="danger" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="赛事审计"
      description={competitionQuery.data?.title ?? "审计提交、WriteUp 与参赛队伍资格。"}
      actions={
        <div className="yza-button-row">
          <Button tone="outline" onClick={() => navigate(-1)}>返回</Button>
          <Button tone="outline" onClick={() => navigate(`/competitions/${compId}/challenges`)}>题目</Button>
        </div>
      }
    >
      <KPIGroup
        items={[
          {
            label: "跨队 Flag 告警",
            value: isLoading ? "..." : String(report?.cross_flag_alerts?.length ?? 0),
            meta: report?.generated_at ? `生成于 ${formatDateTime(report.generated_at)}` : "反作弊扫描",
            tone: (report?.cross_flag_alerts?.length ?? 0) > 0 ? "danger" : "success",
          },
          {
            label: "待审 WriteUp",
            value: isLoading ? "..." : String(pendingWriteups.length),
            meta: `${writeups.length} 份已提交`,
            tone: pendingWriteups.length > 0 ? "warning" : "success",
          },
          {
            label: "已禁赛队伍",
            value: isLoading ? "..." : String(rejectedTeams.length),
            meta: `${registrations.length} 支报名队伍`,
            tone: rejectedTeams.length > 0 ? "danger" : "info",
          },
          {
            label: "错误提交",
            value: isLoading ? "..." : String(wrongSubmissions.length),
            meta: `${submissions.length} 条提交记录`,
            tone: wrongSubmissions.length > 0 ? "warning" : "success",
          },
        ]}
      />

      {error ? (
        <Alert
          heading="审计数据加载失败"
          description={error instanceof Error ? error.message : "请稍后重试。"}
          tone="danger"
        />
      ) : null}

      {isLoading ? (
        <section className="yza-doc-card" style={sectionStyle}>
          <Skeleton count={5} variant="rect" height={48} />
        </section>
      ) : (
        <div className="yza-doc-stack">
          <AuditSection icon={<AlertTriangle size={18} />} title="反作弊告警" meta="跨队 Flag、IP 关联与快速解题关联">
            <div className="yza-doc-stack">
              {(report?.cross_flag_alerts?.length ?? 0) === 0 ? (
                <EmptyBlock text="暂无跨队 Flag 告警。" />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>提交队伍</th>
                        <th style={thStyle}>疑似来源</th>
                        <th style={thStyle}>题目</th>
                        <th style={{ ...thStyle, width: "28%" }}>Flag</th>
                        <th style={thStyle}>时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report?.cross_flag_alerts?.map((alert, index) => (
                        <tr key={`${alert.submitter_team_id}-${alert.victim_team_id}-${alert.challenge_id}-${index}`}>
                          <td style={tdStyle}>{alert.submitter_team_name}</td>
                          <td style={tdStyle}>{alert.victim_team_name}</td>
                          <td style={tdStyle}>{alert.challenge_name}</td>
                          <td style={tdStyle}><code style={codeStyle}>{alert.submitted_flag || "-"}</code></td>
                          <td style={tdStyle}>{formatDateTime(alert.submitted_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={cardGridStyle}>
                <SignalCard
                  title="IP 关联"
                  icon={<Activity size={18} />}
                  empty="暂无多队同 IP 关联。"
                  items={report?.ip_correlations?.map((item) => ({
                    key: item.ip,
                    title: item.ip,
                    meta: `${item.team_names.join(" / ")}，共 ${item.count} 次提交`,
                  })) ?? []}
                />
                <SignalCard
                  title="快速解题"
                  icon={<ShieldX size={18} />}
                  empty="暂无短时间相似解题关联。"
                  items={report?.rapid_submissions?.map((item, index) => ({
                    key: `${item.challenge_id}-${item.team_a_id}-${item.team_b_id}-${index}`,
                    title: item.challenge_name,
                    meta: `${item.team_a_name} / ${item.team_b_name}，间隔 ${item.time_diff_secs}s`,
                  })) ?? []}
                />
              </div>
            </div>
          </AuditSection>

          <AuditSection icon={<FileText size={18} />} title="WriteUp 审核" meta="闭赛材料与题解证据">
            {writeups.length === 0 ? (
              <EmptyBlock text="暂无队伍提交 WriteUp。" />
            ) : (
              <div style={cardGridStyle}>
                {writeups.map((writeup) => (
                  <div key={writeup.id} style={itemStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.625rem" }}>
                      <div>
                        <strong>{writeup.team_name}</strong>
                        <div style={mutedStyle}>{writeup.challenge_name} / {writeup.username} / {formatDateTime(writeup.submitted_at)}</div>
                      </div>
                      <Tag tone={STATUS_TONE[writeup.status] ?? "neutral"}>{STATUS_LABEL[writeup.status] ?? writeup.status}</Tag>
                    </div>
                    <div style={{ ...mutedStyle, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
                      {writeup.content || "未填写正文。"}
                    </div>
                    {writeup.reviewer_comment ? (
                      <div style={{ ...mutedStyle, marginTop: "0.625rem" }}>审核意见：{writeup.reviewer_comment}</div>
                    ) : null}
                    {canUpdate && writeup.status === "submitted" ? (
                      <div className="yza-button-row" style={{ marginTop: "0.75rem" }}>
                        <Button size="sm" tone="primary" onClick={() => { void handleWriteupReview(writeup.id, "approved"); }} disabled={reviewWriteup.isPending}>通过</Button>
                        <Button size="sm" tone="danger" onClick={() => { void handleWriteupReview(writeup.id, "rejected"); }} disabled={reviewWriteup.isPending}>驳回</Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </AuditSection>

          <AuditSection icon={<ShieldCheck size={18} />} title="队伍处置" meta="报名审核、恢复资格与禁赛">
            {registrations.length === 0 ? (
              <EmptyBlock text="暂无报名队伍。" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>队伍</th>
                      <th style={thStyle}>状态</th>
                      <th style={thStyle}>角色</th>
                      <th style={thStyle}>报名时间</th>
                      <th style={thStyle}>审核时间</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg.id}>
                        <td style={tdStyle}>{reg.team_name}</td>
                        <td style={tdStyle}><Tag tone={STATUS_TONE[reg.status] ?? "neutral"}>{STATUS_LABEL[reg.status] ?? reg.status}</Tag></td>
                        <td style={tdStyle}>{TEAM_ROLE_LABEL[reg.team_role ?? "participant"] ?? reg.team_role}</td>
                        <td style={tdStyle}>{formatDateTime(reg.registered_at)}</td>
                        <td style={tdStyle}>{formatDateTime(reg.reviewed_at)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {canUpdate ? (
                            <div className="yza-button-row" style={{ justifyContent: "flex-end" }}>
                              {reg.status !== "approved" ? (
                                <Button size="sm" tone="outline" onClick={() => { void handleRegistrationReview(reg, "approved"); }} disabled={reviewRegistration.isPending}>通过</Button>
                              ) : null}
                              {reg.status !== "rejected" ? (
                                <Button size="sm" tone="danger" onClick={() => { void handleRegistrationReview(reg, "rejected"); }} disabled={reviewRegistration.isPending}>禁赛</Button>
                              ) : null}
                            </div>
                          ) : (
                            <span style={mutedStyle}>无处置权限</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AuditSection>

          <AuditSection icon={<Activity size={18} />} title="提交流水" meta="最近 100 条 Flag 提交">
            {submissions.length === 0 ? (
              <EmptyBlock text="暂无提交记录。" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>队伍</th>
                      <th style={thStyle}>用户</th>
                      <th style={thStyle}>题目</th>
                      <th style={thStyle}>结果</th>
                      <th style={thStyle}>IP</th>
                      <th style={thStyle}>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td style={tdStyle}>{sub.team_name}</td>
                        <td style={tdStyle}>{sub.username}</td>
                        <td style={tdStyle}>{sub.challenge_name}</td>
                        <td style={tdStyle}>
                          <Tag tone={sub.is_correct ? "success" : "danger"}>{sub.is_correct ? "正确" : "错误"}</Tag>
                          {sub.is_first_blood ? <Tag tone="warning">一血</Tag> : null}
                        </td>
                        <td style={tdStyle}>{sub.ip || "-"}</td>
                        <td style={tdStyle}>{formatDateTime(sub.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AuditSection>
        </div>
      )}
    </PageShell>
  );
}

function AuditSection({ icon, title, meta, children }: { icon: ReactNode; title: string; meta: string; children: ReactNode }) {
  return (
    <section className="yza-doc-card" style={sectionStyle}>
      <div style={sectionHeadStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {icon}
          <div>
            <h2 className="yza-doc-card__title" style={{ margin: 0 }}>{title}</h2>
            <p className="yza-doc-card__meta" style={{ margin: 0 }}>{meta}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div style={emptyStyle}>
      {text}
    </div>
  );
}

function SignalCard({
  title,
  icon,
  empty,
  items,
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  items: Array<{ key: string; title: string; meta: string }>;
}) {
  return (
    <div style={itemStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
        {icon}
        <strong>{title}</strong>
      </div>
      {items.length === 0 ? (
        <div style={mutedStyle}>{empty}</div>
      ) : (
        <div className="yza-doc-stack">
          {items.map((item) => (
            <div key={item.key}>
              <div>{item.title}</div>
              <div style={mutedStyle}>{item.meta}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
