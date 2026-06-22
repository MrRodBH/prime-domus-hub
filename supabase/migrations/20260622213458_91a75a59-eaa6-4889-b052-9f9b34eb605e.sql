
-- Vincular corretores a usuários do Auth
ALTER TABLE public.corretores
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS corretores_user_id_uniq
  ON public.corretores(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- imoveis
DROP POLICY IF EXISTS "imoveis admin all" ON public.imoveis;
DROP POLICY IF EXISTS "imoveis public read" ON public.imoveis;

CREATE POLICY "imoveis public read" ON public.imoveis
  FOR SELECT TO anon, authenticated
  USING (status = 'ativo');

CREATE POLICY "imoveis admin all" ON public.imoveis
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "imoveis corretor own" ON public.imoveis
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'corretor') AND created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'corretor') AND created_by = auth.uid());

CREATE POLICY "imoveis secretaria read" ON public.imoveis
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'secretaria'));

-- imovel_imagens
DROP POLICY IF EXISTS "imovel_imagens admin all" ON public.imovel_imagens;
DROP POLICY IF EXISTS "imovel_imagens public read" ON public.imovel_imagens;

CREATE POLICY "imovel_imagens public read" ON public.imovel_imagens
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "imovel_imagens admin all" ON public.imovel_imagens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "imovel_imagens corretor own" ON public.imovel_imagens
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'corretor')
    AND EXISTS (SELECT 1 FROM public.imoveis i WHERE i.id = imovel_id AND i.created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'corretor')
    AND EXISTS (SELECT 1 FROM public.imoveis i WHERE i.id = imovel_id AND i.created_by = auth.uid())
  );

-- leads (Secretaria sem acesso)
DROP POLICY IF EXISTS "leads admin delete" ON public.leads;
DROP POLICY IF EXISTS "leads admin read" ON public.leads;
DROP POLICY IF EXISTS "leads admin update" ON public.leads;
DROP POLICY IF EXISTS "leads anyone create" ON public.leads;

CREATE POLICY "leads anyone create" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "leads admin all" ON public.leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "leads corretor own" ON public.leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'corretor') AND assigned_to = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'corretor') AND assigned_to = auth.uid());

-- corretores (Usuários)
DROP POLICY IF EXISTS "corretores admin all" ON public.corretores;
DROP POLICY IF EXISTS "corretores public read" ON public.corretores;

CREATE POLICY "corretores public read" ON public.corretores
  FOR SELECT TO anon, authenticated
  USING (ativo = true);

CREATE POLICY "corretores admin all" ON public.corretores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "corretores self update" ON public.corretores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "corretores secretaria read" ON public.corretores
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'secretaria'));
