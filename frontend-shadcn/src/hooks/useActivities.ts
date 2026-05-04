import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedResponse, Activity, ActivityStats } from "@/types";

interface ActivityQuery {
  page?: number;
  page_size?: number;
  resource_type?: string;
  resource_id?: number;
  user_id?: number;
  action?: string;
}

export function useActivities(query: ActivityQuery, enabled = true) {
  return useQuery({
    queryKey: ["activities", query],
    queryFn: () =>
      api
        .get<PaginatedResponse<Activity>>("/api/v1/activities", { params: query })
        .then((r) => r.data),
    enabled,
  });
}

export function useActivityStats() {
  return useQuery({
    queryKey: ["activity-stats"],
    queryFn: () =>
      api
        .get<ActivityStats>("/api/v1/activities/statistics")
        .then((r) => r.data),
  });
}
