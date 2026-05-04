import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ListQuery, PaginatedResponse, User } from "@/types";

export function useUsers(query: ListQuery, enabled = true) {
  return useQuery({
    queryKey: ["users", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<User>>("/api/v1/users", { params: query })
        .then((r) => r.data),
    enabled,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username: string; password: string; email: string; nickname: string; role_id?: number }) =>
      api.post("/api/v1/users", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; email?: string; nickname?: string; role_id?: number }) =>
      api.put(`/api/v1/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { old_password: string; new_password: string }) =>
      api.put("/api/v1/users/me/password", payload),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: { email?: string; nickname?: string }) =>
      api.put("/api/v1/users/me", payload),
  });
}
