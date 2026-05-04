import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SettingItem {
  key: string;
  value: string;
  display_name: string;
  description: string;
  value_type: string;
  default_value: string;
  is_secret: boolean;
}

export interface SettingGroup {
  group_name: string;
  settings: SettingItem[];
}

export function useSystemSettings() {
  return useQuery<SettingGroup[]>({
    queryKey: ["system-settings"],
    queryFn: () => api.get("/api/v1/settings/system").then((r) => r.data),
  });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, string>) =>
      api.put("/api/v1/settings/system", { settings }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-settings"] }),
  });
}
