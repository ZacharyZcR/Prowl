import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  enabled: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
}

export interface GeneratedApiKey {
  key: string;
  id: number;
  name: string;
  key_prefix: string;
  created_at: string;
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: () =>
      api.get<ApiKey[]>("/api/v1/api-keys").then((r) => r.data),
  });
}

export function useGenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; expires_at?: string }) =>
      api.post<GeneratedApiKey>("/api/v1/api-keys", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/api-keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}
