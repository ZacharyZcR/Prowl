export function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;

  if (permissions.includes(required)) return true;

  const [domain] = required.split(":");
  if (domain && permissions.includes(`${domain}:*`)) return true;

  return false;
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((perm) => hasPermission(permissions, perm));
}
