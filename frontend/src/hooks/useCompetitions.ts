import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export interface Competition {
  id: number;
  title: string;
  description: string;
  mode: string;
  status: string;
  start_time: string;
  end_time: string;
  registration_start: string;
  registration_end: string;
  max_teams: number;
  max_team_size: number;
  is_public: boolean;
  banner_url: string;
  rules: string;
  created_by: number;
  creator_name: string;
  team_count: number;
  challenge_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamRegistration {
  id: number;
  team_id: number;
  team_name: string;
  competition_id: number;
  status: string;
  registered_at: string;
  reviewed_at?: string;
  team_role?: string;
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

export interface FlagSubmission {
  id: number;
  competition_id: number;
  challenge_id: number;
  challenge_name: string;
  team_id: number;
  team_name: string;
  user_id: number;
  username: string;
  submitted_flag: string;
  is_correct: boolean;
  points_awarded: number;
  is_first_blood: boolean;
  ip: string;
  submitted_at: string;
}

export interface CrossFlagAlert {
  submitter_team_id: number;
  submitter_team_name: string;
  victim_team_id: number;
  victim_team_name: string;
  challenge_id: number;
  challenge_name: string;
  submitted_flag: string;
  submitted_at: string;
}

export interface IPCorrelation {
  ip: string;
  team_ids: number[];
  team_names: string[];
  count: number;
}

export interface RapidSubmission {
  challenge_id: number;
  challenge_name: string;
  team_a_id: number;
  team_a_name: string;
  team_b_id: number;
  team_b_name: string;
  time_diff_secs: number;
  solved_at_a: string;
  solved_at_b: string;
}

export interface TeamSubmitStats {
  team_id: number;
  team_name: string;
  total_submits: number;
  correct_count: number;
  wrong_count: number;
  success_rate: number;
}

export interface AntiCheatReport {
  competition_id: number;
  generated_at: string;
  cross_flag_alerts: CrossFlagAlert[];
  ip_correlations: IPCorrelation[];
  rapid_submissions: RapidSubmission[];
  submission_stats: TeamSubmitStats[];
}

interface CompetitionQuery {
  page?: number;
  page_size?: number;
  search?: string;
  mode?: string;
  status?: string;
}

function invalidateCompetitionQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["competitions"] });
}

export function useCompetitions(query: CompetitionQuery, enabled = true) {
  return useQuery({
    queryKey: ["competitions", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<Competition>>("/api/v1/competitions", { params: query })
        .then((r) => r.data),
    enabled,
  });
}

export function useCompetition(id: number) {
  return useQuery({
    queryKey: ["competitions", id],
    queryFn: () =>
      api.get<Competition>(`/api/v1/competitions/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Competition>) =>
      api.post("/api/v1/competitions", payload),
    onSuccess: () => {
      invalidateCompetitionQueries(qc);
    },
  });
}

export function useUpdateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<Competition>) =>
      api.put(`/api/v1/competitions/${id}`, payload),
    onSuccess: () => {
      invalidateCompetitionQueries(qc);
    },
  });
}

export function useDeleteCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/competitions/${id}`),
    onSuccess: () => {
      invalidateCompetitionQueries(qc);
    },
  });
}

export function useUpdateCompetitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/api/v1/competitions/${id}/status`, { status }),
    onSuccess: () => {
      invalidateCompetitionQueries(qc);
    },
  });
}

export function useCompetitionRegistrations(competitionId: number) {
  return useQuery({
    queryKey: ["competitions", competitionId, "registrations"],
    queryFn: () =>
      api.get<TeamRegistration[]>(`/api/v1/competitions/${competitionId}/registrations`).then((r) => r.data),
    enabled: competitionId > 0,
  });
}

export function useReviewRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, regId, status }: { competitionId: number; regId: number; status: string }) =>
      api.put(`/api/v1/competitions/${competitionId}/registrations/${regId}`, { status }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["competitions", v.competitionId, "registrations"] });
      invalidateCompetitionQueries(qc);
    },
  });
}

export function useCompetitionSubmissions(competitionId: number) {
  return useQuery({
    queryKey: ["competitions", competitionId, "submissions"],
    queryFn: () =>
      api.get<PaginatedResponse<FlagSubmission>>(`/api/v1/competitions/${competitionId}/submissions`, {
        params: { page_size: 100 },
      }).then((r) => r.data),
    enabled: competitionId > 0,
  });
}

export function useAdminWriteups(competitionId: number) {
  return useQuery({
    queryKey: ["admin-writeups", competitionId],
    queryFn: () =>
      api.get<PaginatedResponse<Writeup>>("/api/v1/admin/writeups", {
        params: { competition_id: competitionId, page_size: 100 },
      }).then((r) => r.data),
    enabled: competitionId > 0,
  });
}

export function useReviewWriteup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { writeupId: number; competitionId: number; status: "approved" | "rejected"; comment: string }) =>
      api.put(`/api/v1/admin/writeups/${payload.writeupId}/review`, { status: payload.status, comment: payload.comment }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-writeups", v.competitionId] });
    },
  });
}

export function useAntiCheatReport(competitionId: number) {
  return useQuery({
    queryKey: ["competitions", competitionId, "anticheat"],
    queryFn: () =>
      api.get<AntiCheatReport>(`/api/v1/competitions/${competitionId}/anticheat`).then((r) => r.data),
    enabled: competitionId > 0,
  });
}
