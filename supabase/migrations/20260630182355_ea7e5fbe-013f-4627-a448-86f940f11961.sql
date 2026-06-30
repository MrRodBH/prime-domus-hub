
-- ============================================================
-- ORIGENS DE LEADS (CRUD) + MÓDULO RBAC
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_origens TO authenticated;
GRANT SELECT ON public.lead_origens TO anon;
GRANT ALL ON public.lead_origens TO service_role;

ALTER TABLE public.lead_origens ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado com permissão visualizar em lead_origens
CREATE POLICY "lead_origens read auth" ON public.lead_origens
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_permission(auth.uid(), 'lead_origens', 'visualizar') IS NOT NULL)
  );

-- Escrita: somente admins ou usuários com permissão gerenciar/criar/editar/excluir
CREATE POLICY "lead_origens write auth" ON public.lead_origens
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_permission(auth.uid(), 'lead_origens', 'gerenciar') IS NOT NULL)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_permission(auth.uid(), 'lead_origens', 'gerenciar') IS NOT NULL)
  );

-- Leitura pública: catálogo visível para formulários no site público (não expõe nada sensível)
CREATE POLICY "lead_origens public read ativo" ON public.lead_origens
  FOR SELECT TO anon USING (ativo = true);

-- Trigger updated_at
DROP TRIGGER IF EXISTS lead_origens_set_updated_at ON public.lead_origens;
CREATE TRIGGER lead_origens_set_updated_at
  BEFORE UPDATE ON public.lead_origens
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed inicial (idempotente)
INSERT INTO public.lead_origens (nome, ordem) VALUES
  ('Site', 10),
  ('Meta Ads', 20),
  ('Google Ads', 30),
  ('Indicação', 40),
  ('WhatsApp', 50),
  ('Instagram', 60),
  ('Cadastro Manual', 70),
  ('Outros', 80)
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- MÓDULO RBAC: lead_origens
-- ============================================================
INSERT INTO public.rbac_modules (codigo, nome, ordem) VALUES
  ('lead_origens','Origens de Leads',125)
ON CONFLICT (codigo) DO NOTHING;

-- Admin já recebe todas permissões via outras políticas; garantimos seed defensivo
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, a, 'global'
  FROM public.rbac_profiles p
  CROSS JOIN public.rbac_modules m
  CROSS JOIN unnest(enum_range(NULL::public.rbac_action)) a
 WHERE p.codigo='admin' AND m.codigo='lead_origens'
ON CONFLICT DO NOTHING;
