import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CompetitionChallenge {
  id: number;
  competition_id: number;
  challenge_id: number;
  challenge_title: string;
  category: string;
  difficulty: string;
  order_num: number;
  is_visible: boolean;
  released_at: string | null;
  extra_score: number;
  created_at: string;
}

export function useCompetitionChallenges(competitionId: number) {
  return useQuery({
    queryKey: ["competition-challenges", competitionId],
    queryFn: () =>
      api.get<CompetitionChallenge[]>(`/api/v1/competitions/${competitionId}/challenges-list`).then((r) => r.data),
    enabled: competitionId > 0,
  });
}

export function useBatchAttach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, challenges }: { competitionId: number; challenges: { challenge_id: number; order_num: number; is_visible: boolean }[] }) =>
      api.post(`/api/v1/competitions/${competitionId}/challenges/batch`, { challenges }).then((r) => r.data as { attached: number }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["competition-challenges", v.competitionId] }),
  });
}

export function useDetachChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, challengeId }: { competitionId: number; challengeId: number }) =>
      api.delete(`/api/v1/competitions/${competitionId}/challenges/${challengeId}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["competition-challenges", v.competitionId] }),
  });
}

export function useReleaseChallenges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ competitionId, challengeIds }: { competitionId: number; challengeIds: number[] }) =>
      api.put(`/api/v1/competitions/${competitionId}/challenges/release`, { challenge_ids: challengeIds }).then((r) => r.data as { released: number }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["competition-challenges", v.competitionId] }),
  });
}
