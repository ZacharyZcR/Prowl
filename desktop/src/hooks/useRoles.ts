import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ListQuery, PaginatedResponse, Role } from "@/types";

export function useRoles(query: ListQuery) {
  return useQuery({
    queryKey: ["roles", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<Role>>("/api/v1/roles", { params: query })
        .then((r) => r.data),
  });
}

export function useAllRoles() {
  return useQuery({
    queryKey: ["roles", "all"],
    queryFn: () =>
      api
        .get<PaginatedResponse<Role>>("/api/v1/roles", { params: { page_size: 100 } })
        .then((r) => r.data),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string; permissions: string[] }) =>
      api.post("/api/v1/roles", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; description?: string; permissions?: string[] }) =>
      api.put(`/api/v1/roles/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
