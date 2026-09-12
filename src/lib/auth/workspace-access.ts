export function workspaceAccess(path: string, isSuperAdmin: boolean) {
  const tenantRoute = /^\/(?:admin(?:\/|$)|[^/]+\/admin(?:\/|$))/.test(path);
  const platformRoute = /^\/super(?:\/|$)/.test(path);
  if (isSuperAdmin && tenantRoute) return 'platform_account_on_tenant' as const;
  if (!isSuperAdmin && platformRoute) return 'tenant_account_on_platform' as const;
  return 'allowed' as const;
}
