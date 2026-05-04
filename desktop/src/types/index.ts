export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  role?: Role;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ListQuery {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: "active" | "archived" | "draft";
  owner_id: number;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  action: string;
  resource_type: string;
  resource_id: number;
  user_id: number;
  username: string;
  detail: string;
  details: Record<string, unknown> | null;
  ip: string;
  user_agent: string;
  method: string;
  path: string;
  status_code: number;
  created_at: string;
}

export interface ActivityStats {
  total: number;
  today_count: number;
  by_action: Record<string, number>;
  by_resource_type: Record<string, number>;
  by_user: { user_id: number; username: string; count: number }[];
}

export interface ErrorLog {
  id: number;
  source: "frontend" | "backend";
  err_type: string;
  message: string;
  stack: string;
  url: string;
  method: string;
  status_code: number;
  params: Record<string, unknown> | null;
  user_agent: string;
  request_id: string;
  user_id: number;
  fingerprint: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved: boolean;
  resolved_by: number;
  resolved_at: string;
  severity: "critical" | "high" | "medium" | "low";
  created_at: string;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  resource: string;
  action: string;
  scope: string;
  description: string;
  category: string;
}

export interface PermissionCategory {
  category: string;
  permissions: Permission[];
}

export interface ErrorLogStats {
  total: number;
  unresolved: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
  by_type: Record<string, number>;
}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  has_secret: boolean;
  events: string[];
  headers: Record<string, string>;
  enabled: boolean;
  last_triggered_at?: string;
  last_status_code: number;
  failure_count: number;
  created_at: string;
}

export interface WebhookTestResult {
  status_code: number;
  response_body: string;
  duration: string;
}

export type CompetitionMode = "ctf_jeopardy" | "awd" | "red_blue";
export type CompetitionStatus = "draft" | "registration" | "running" | "paused" | "ended" | "archived";

export interface Competition {
  id: number;
  title: string;
  description: string;
  mode: CompetitionMode;
  status: CompetitionStatus;
  start_time: string | null;
  end_time: string | null;
  registration_start: string | null;
  registration_end: string | null;
  max_teams: number;
  max_team_size: number;
  is_public: boolean;
  banner_url: string;
  rules: string;
  scoring_config: Record<string, unknown> | null;
  scoreboard_freeze_at: string | null;
  submit_interval_seconds: number;
  created_by: number;
  creator_name: string;
  team_count: number;
  challenge_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompetitionChallenge {
  id: number;
  competition_id: number;
  challenge_id: number;
  challenge_title: string;
  category: string;
  difficulty: string;
  order_num: number;
  is_visible: boolean;
  extra_score: number;
  released_at: string | null;
  created_at: string;
}

export interface TeamRegistration {
  id: number;
  team_id: number;
  team_name: string;
  competition_id: number;
  status: string;
  registered_at: string;
  reviewed_at: string;
}
