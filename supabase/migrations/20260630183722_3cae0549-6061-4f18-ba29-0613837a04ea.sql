
DROP POLICY IF EXISTS "teams read auth" ON public.teams;
DROP POLICY IF EXISTS "team_members read auth" ON public.team_members;

CREATE POLICY "teams read members or admin" ON public.teams
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR id IN (SELECT public.user_team_ids(auth.uid()))
  );

CREATE POLICY "team_members read self team or admin" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR user_id = auth.uid()
    OR team_id IN (SELECT public.user_team_ids(auth.uid()))
  );
