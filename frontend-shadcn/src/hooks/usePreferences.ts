import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePreferences() {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () =>
      api.get<Record<string, string>>("/api/v1/preferences").then((r) => r.data),
  });
}

export function useSetPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Record<string, string>) =>
      api.put("/api/v1/preferences", prefs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferences"] });
    },
  });
}
