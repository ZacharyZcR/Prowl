import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";

export interface TeamMember {
  id: number;
  user_id: number;
  username: string;
  role: string;
  joined_at: string;
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
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

interface TeamQuery {
  page?: number;
  page_size?: number;
  search?: string;
}

function invalidateTeamQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["teams"] });
}

export function useTeams(query: TeamQuery, enabled = true) {
  return useQuery({
    queryKey: ["teams", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<Team>>("/api/v1/admin/teams", { params: query })
        .then((r) => r.data),
    enabled,
  });
}

export function useTeam(id: number) {
  return useQuery({
    queryKey: ["teams", id],
    queryFn: () =>
      api.get<Team>(`/api/v1/admin/teams/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/teams/${id}`),
    onSuccess: () => {
      invalidateTeamQueries(qc);
    },
  });
}
