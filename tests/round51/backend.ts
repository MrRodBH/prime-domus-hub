const fixture = () => (window as any).__authFixture;
export const supabase = {
  auth: {
    getUser: () => fixture().getUser(),
    signInWithPassword: (data: unknown) => fixture().signIn(data),
    signOut: () => fixture().signOut(),
  },
};
export const meuAcessoSuperAdmin = () => fixture().access();
export const clearImpersonationTenantId = () => fixture().cleared.push("impersonation");
export const clearSelectedTenantId = () => fixture().cleared.push("selection");
export const setCurrentTenantId = (value: unknown) => fixture().cleared.push(["tenant", value]);

export async function listMyInitialAdminInvitations(){return fixture().initialAdminInvitations ?? [];}
