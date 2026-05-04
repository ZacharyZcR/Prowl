import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PermissionCategory, Permission } from "@/types";

export function usePermissionCategories(enabled = true) {
  return useQuery({
    queryKey: ["permission-categories"],
    queryFn: () =>
      api
        .get<PermissionCategory[]>("/api/v1/permissions/categories")
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useAllPermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () =>
      api
        .get<Permission[]>("/api/v1/permissions")
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
