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
