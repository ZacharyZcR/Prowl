import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export interface ChallengeTag {
  id: number;
  name: string;
  color: string;
}

export interface ChallengeHint {
  id: number;
  content: string;
  cost: number;
  order_num: number;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  mode: string;
  category: string;
  difficulty: string;
  base_score: number;
  min_score: number;
  flag_type: string;
  is_dynamic: boolean;
  docker_image: string;
  is_hidden: boolean;
  solve_count: number;
  author_name: string;
  tags: ChallengeTag[];
  hints: ChallengeHint[];
  created_at: string;
  updated_at: string;
}

interface ChallengeQuery {
  page?: number;
  page_size?: number;
  search?: string;
  mode?: string;
  category?: string;
  difficulty?: string;
  is_dynamic?: boolean;
}

function invalidateChallengeQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["challenges"] });
}

export function useChallenges(query: ChallengeQuery, enabled = true) {
  return useQuery({
    queryKey: ["challenges", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<Challenge>>("/api/v1/challenges", { params: query })
        .then((r) => r.data),
    enabled,
  });
}

export function useChallenge(id: number) {
  return useQuery({
    queryKey: ["challenges", id],
    queryFn: () =>
      api.get<Challenge>(`/api/v1/challenges/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Challenge>) =>
      api.post("/api/v1/challenges", payload),
    onSuccess: () => {
      invalidateChallengeQueries(qc);
    },
  });
}

export function useUpdateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<Challenge>) =>
      api.put(`/api/v1/challenges/${id}`, payload),
    onSuccess: () => {
      invalidateChallengeQueries(qc);
    },
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/challenges/${id}`),
    onSuccess: () => {
      invalidateChallengeQueries(qc);
    },
  });
}
