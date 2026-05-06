export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Competition {
  id: number;
  title: string;
  description: string;
  mode: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  registration_start: string | null;
  registration_end: string | null;
  max_teams: number;
  max_team_size: number;
  is_public: boolean;
  banner_url: string;
  rules: string;
  team_count: number;
  challenge_count: number;
  is_registered: boolean;
  registration_status?: "pending" | "approved" | "rejected";
  team_role: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  score: number;
  solve_count: number;
  is_dynamic: boolean;
  is_solved: boolean;
  tags: { id: number; name: string; color: string }[];
  hints: { id: number; cost: number; order_num: number; content: string; unlocked: boolean }[];
}

export interface Team {
  id: number;
  name: string;
  description: string;
  avatar_url: string;
  invite_code: string;
  captain_id: number;
  captain_name: string;
  is_active: boolean;
  members: { id: number; user_id: number; username: string; role: string; joined_at: string }[];
  created_at: string;
  updated_at: string;
}

export interface Scoreboard {
  competition_id: number;
  mode: string;
  is_frozen: boolean;
  updated_at: string;
  teams: TeamScore[];
}

export interface TeamScore {
  rank: number;
  team_id: number;
  team_name: string;
  team_role: string;
  total_score: number;
  solve_count: number;
  last_solve_at: string;
  challenges: { challenge_id: number; points: number; is_first_blood: boolean; solved_at: string }[];
  awd_attack_score?: number;
  awd_defense_score?: number;
  awd_check_score?: number;
}

export interface Writeup {
  id: number;
  competition_id: number;
  challenge_id: number;
  challenge_name: string;
  team_id: number;
  team_name: string;
  user_id: number;
  username: string;
  content: string;
  file_id?: number;
  status: "submitted" | "reviewed" | "approved" | "rejected";
  reviewer_comment?: string;
  reviewed_by?: number;
  submitted_at: string;
}
