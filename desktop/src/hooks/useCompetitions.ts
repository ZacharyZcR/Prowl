import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AntiCheatReport,
  FlagSubmission,
  PaginatedResponse,
  Competition,
  CompetitionChallenge,
  TeamRegistration,
  Writeup,
} from "@/types";

interface CompetitionQuery {
  page?: number;
  page_size?: number;
  search?: string;
  mode?: string;
  status?: string;
}

export function useCompetitions(query: CompetitionQuery, enabled = true) {
  return useQuery({
    queryKey: ["competitions", query],
    queryFn: () =>
      api.get<PaginatedResponse<Competition>>("/api/v1/competitions", { params: query }).then((r) => r.data),
    enabled,
  });
}

export function useCompetition(id: number) {
  return useQuery({
    queryKey: ["competitions", id],
    queryFn: () => api.get<Competition>(`/api/v1/competitions/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/api/v1/competitions", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competitions"] }); },
  });
}

export function useUpdateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Record<string, unknown>) =>
      api.put(`/api/v1/competitions/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competitions"] }); },
  });
}

export function useUpdateCompetitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/api/v1/competitions/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competitions"] }); },
  });
}

export function useDeleteCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/competitions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competitions"] }); },
  });
}

export function useCompetitionChallenges(competitionId: number) {
  return useQuery({
    queryKey: ["competitions", competitionId, "challenges"],
    queryFn: () =>
      api.get<CompetitionChallenge[]>(`/api/v1/competitions/${competitionId}/challenges-list`).then((r) => r.data),
    enabled: competitionId > 0,
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

export function useAttachChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, ...payload }: { competitionId: number; challenge_id: number; order_num: number; is_visible: boolean }) =>
      api.post(`/api/v1/competitions/${competitionId}/challenges`, payload),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["competitions", v.competitionId, "challenges"] }); },
  });
}

export function useDetachChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, challengeId }: { competitionId: number; challengeId: number }) =>
      api.delete(`/api/v1/competitions/${competitionId}/challenges/${challengeId}`),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["competitions", v.competitionId, "challenges"] }); },
  });
}

export function useReviewRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, regId, status }: { competitionId: number; regId: number; status: string }) =>
      api.put(`/api/v1/competitions/${competitionId}/registrations/${regId}`, { status }),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["competitions", v.competitionId, "registrations"] }); },
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
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["admin-writeups", v.competitionId] }); },
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

// AWD 管理
export function useDeployAWDServices() {
  return useMutation({
    mutationFn: (competitionId: number) => api.post(`/api/v1/competitions/${competitionId}/awd/deploy`),
  });
}

export function useTeardownAWD() {
  return useMutation({
    mutationFn: (competitionId: number) => api.post(`/api/v1/competitions/${competitionId}/awd/teardown`),
  });
}

export function useRotateAWDFlags() {
  return useMutation({
    mutationFn: ({ competitionId, round }: { competitionId: number; round: number }) =>
      api.post(`/api/v1/competitions/${competitionId}/awd/rotate`, { round_number: round }),
  });
}
