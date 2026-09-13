/** Filter privileged service-role reads BEFORE Auth identity lookup/serialization. */
export async function operationalRows<T extends { user_id: string }>(admin: any, rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map(row => row.user_id))];
  if (!ids.length) return [];
  const { data, error } = await admin.from('user_roles').select('user_id').in('user_id', ids).eq('role', 'super_admin');
  if (error) throw Error('Não foi possível confirmar as identidades operacionais.');
  const platform = new Set((data ?? []).map((row: {user_id:string}) => row.user_id));
  return rows.filter(row => !platform.has(row.user_id));
}

export async function requireOperationalIdentity(admin: any, userId: string) {
  if (!(await operationalRows(admin, [{user_id:userId}])).length)
    throw Error('Esta identidade não está disponível para a equipe da empresa.');
}
