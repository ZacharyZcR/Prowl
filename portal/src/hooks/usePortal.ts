import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse, Competition, Challenge, Team, Scoreboard } from "@/types";

export function useCompetitions(query: { page?: number; page_size?: number; search?: string }) {
  return useQuery({
    queryKey: ["portal-competitions", query],
    queryFn: () =>
      api.get<PaginatedResponse<Competition>>("/api/v1/portal/competitions", { params: query }).then((r) => r.data),
  });
}

export function useCompetition(id: number) {
  return useQuery({
    queryKey: ["portal-competitions", id],
    queryFn: () => api.get<Competition>(`/api/v1/portal/competitions/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useChallenges(competitionId: number) {
  return useQuery({
    queryKey: ["portal-challenges", competitionId],
    queryFn: () =>
      api.get<Challenge[]>(`/api/v1/portal/competitions/${competitionId}/challenges`).then((r) => {
        const d = r.data;
        const items = Array.isArray(d) ? d : [];
        return { items, total: items.length, page: 1, page_size: items.length, total_pages: 1 };
      }),
    enabled: competitionId > 0,
  });
}

export function useScoreboard(competitionId: number) {
  return useQuery({
    queryKey: ["portal-scoreboard", competitionId],
    queryFn: () =>
      api.get<Scoreboard>(`/api/v1/portal/competitions/${competitionId}/scoreboard`).then((r) => r.data),
    enabled: competitionId > 0,
    refetchInterval: 10_000,
  });
}

export function useMyTeam() {
  return useQuery({
    queryKey: ["portal-my-team"],
    queryFn: () => api.get<Team>("/api/v1/portal/teams/my").then((r) => r.data),
    retry: false,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      api.post("/api/v1/portal/teams", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-my-team"] }),
  });
}

export function useJoinTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite_code: string) =>
      api.post("/api/v1/portal/teams/join", { invite_code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-my-team"] }),
  });
}

export function useLeaveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/api/v1/portal/teams/my/leave"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-my-team"] }),
  });
}

export function useRegisterCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (competitionId: number) =>
      api.post(`/api/v1/portal/competitions/${competitionId}/register`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-competitions"] }),
  });
}

export function useSubmitFlag() {
  return useMutation({
    mutationFn: ({ competitionId, challenge_id, flag }: { competitionId: number; challenge_id: number; flag: string }) =>
      api.post<{ correct: boolean; points: number; first_blood: boolean; message: string }>(
        `/api/v1/portal/competitions/${competitionId}/flags`,
        { challenge_id, flag },
      ).then((r) => r.data),
  });
}

export interface ContainerInstance {
  id: number;
  challenge_id: number;
  competition_id: number;
  team_id: number;
  container_id: string;
  status: string;
  access_url: string;
  ports: Record<string, string>;
  expires_at: string;
  started_at: string;
  stopped_at: string;
  created_at: string;
}

export function useContainerInstance(competitionId: number, challengeId: number) {
  return useQuery({
    queryKey: ["portal-instance", competitionId, challengeId],
    queryFn: () =>
      api.get<ContainerInstance>(`/api/v1/portal/competitions/${competitionId}/challenges/${challengeId}/instance`).then((r) => r.data),
    enabled: competitionId > 0 && challengeId > 0,
    retry: false,
    refetchInterval: 10_000,
  });
}

export function useStartContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, challengeId }: { competitionId: number; challengeId: number }) =>
      api.post<ContainerInstance>(`/api/v1/portal/competitions/${competitionId}/challenges/${challengeId}/instance`).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["portal-instance", variables.competitionId, variables.challengeId] });
    },
  });
}

export interface ObjectiveItem {
  id: number;
  competition_id: number;
  title: string;
  target_url: string;
  description: string;
  team_role: string;
  points: number;
  order_num: number;
  status: string;
  assigned_team_id: number;
  report_count: number;
  completed_by_team: number;
  evidence: string;
  judge_comment: string;
}

export function useObjectives(competitionId: number, teamRole?: string, teamId?: number) {
  return useQuery({
    queryKey: ["portal-objectives", competitionId, teamRole, teamId],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (teamRole) params.team_role = teamRole;
      if (teamId) params.team_id = String(teamId);
      return api.get<ObjectiveItem[]>(`/api/v1/portal/competitions/${competitionId}/objectives`, { params }).then((r) => r.data);
    },
    enabled: competitionId > 0,
  });
}

export function useSubmitEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, objectiveId, teamId, evidence }: { competitionId: number; objectiveId: number; teamId: number; evidence: string }) =>
      api.post(`/api/v1/portal/competitions/${competitionId}/objectives/${objectiveId}/evidence`, { team_id: teamId, evidence }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-objectives"] }),
  });
}

export function useUnlockHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, challengeId, hintId }: { competitionId: number; challengeId: number; hintId: number }) =>
      api.post<{ hint_id: number; content: string; cost: number }>(
        `/api/v1/portal/competitions/${competitionId}/challenges/${challengeId}/hints/${hintId}/unlock`,
      ).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-challenges"] }),
  });
}

export function useStopContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, challengeId }: { competitionId: number; challengeId: number }) =>
      api.delete(`/api/v1/portal/competitions/${competitionId}/challenges/${challengeId}/instance`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["portal-instance", variables.competitionId, variables.challengeId] });
    },
  });
}
