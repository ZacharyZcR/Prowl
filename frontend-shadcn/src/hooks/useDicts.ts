import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DictItem {
  id: number;
  group_name: string;
  key: string;
  label: string;
  value: string;
  sort_order: number;
  enabled: boolean;
  created_at: string;
}

export function useDicts() {
  return useQuery({
    queryKey: ["dicts"],
    queryFn: () =>
      api.get<DictItem[]>("/api/v1/dicts").then((r) => r.data),
  });
}

export function useCreateDict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      group_name: string;
      key: string;
      label: string;
      value: string;
      sort_order: number;
    }) => api.post("/api/v1/dicts", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dicts"] });
    },
  });
}

export function useUpdateDict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      group_name?: string;
      key?: string;
      label?: string;
      value?: string;
      sort_order?: number;
    }) => api.put(`/api/v1/dicts/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dicts"] });
    },
  });
}

export function useDeleteDict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/dicts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dicts"] });
    },
  });
}

export function useToggleDict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/api/v1/dicts/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dicts"] });
    },
  });
}
