/** Operational population is classified in the database, never inferred from names. */
export async function operationalTenantIds(db: any): Promise<string[]> {
  const { data, error } = await db.from('tenants').select('id').eq('operational_kind', 'customer');
  if (error) throw new Error('Não foi possível confirmar as empresas operacionais.');
  // Empty scope must never become an unfiltered query.
  return data?.length ? data.map((row: { id: string }) => row.id) : ['00000000-0000-0000-0000-000000000000'];
}
