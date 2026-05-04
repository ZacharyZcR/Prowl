import { useAuthStore } from "@/stores/auth";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.role?.permissions ?? [];

  return {
    can: (perm: string) => hasPermission(permissions, perm),
    canAny: (perms: string[]) => hasAnyPermission(permissions, perms),
    isAdmin: permissions.includes("*"),
  };
}
