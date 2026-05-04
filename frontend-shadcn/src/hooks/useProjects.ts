import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse, Project } from "@/types";

interface ProjectQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

function invalidateProjectQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["projects"] });
}

export function useProjects(query: ProjectQuery, enabled = true) {
  return useQuery({
    queryKey: ["projects", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<Project>>("/api/v1/projects", { params: query })
        .then((r) => r.data),
    enabled,
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () =>
      api.get<Project>(`/api/v1/projects/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string; status: string }) =>
      api.post("/api/v1/projects", payload),
    onSuccess: () => {
      invalidateProjectQueries(qc);
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; description?: string; status?: string }) =>
      api.put(`/api/v1/projects/${id}`, payload),
    onSuccess: () => {
      invalidateProjectQueries(qc);
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/projects/${id}`),
    onSuccess: () => {
      invalidateProjectQueries(qc);
    },
  });
}

export function useBulkDeleteProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      api.post<{ deleted: number; errors?: string[] }>("/api/v1/projects/batch-delete", { ids }).then((r) => r.data),
    onSuccess: () => {
      invalidateProjectQueries(qc);
    },
  });
}
