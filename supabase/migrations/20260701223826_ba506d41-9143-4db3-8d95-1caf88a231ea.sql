-- ============================================================================
-- FASE 3 — ONDA 2: FORMULÁRIOS CUSTOMIZADOS
-- ============================================================================

-- ============================================================================
-- Tabela: cms_forms
-- ============================================================================
CREATE TABLE public.cms_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant_id(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published | archived
  descricao TEXT,
  -- config: { success_message, redirect_url, notify_emails[], criar_lead (bool),
  --          lead_origem_slug, webhook_url, submit_button_label }
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_cms_forms_tenant_slug ON public.cms_forms(tenant_id, slug);
CREATE INDEX idx_cms_forms_tenant ON public.cms_forms(tenant_id);
CREATE INDEX idx_cms_forms_status ON public.cms_forms(tenant_id, status);

GRANT SELECT ON public.cms_forms TO anon;                                 -- ver formulários publicados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_forms TO authenticated;
GRANT ALL ON public.cms_forms TO service_role;

ALTER TABLE public.cms_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_forms_public_read"
  ON public.cms_forms FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "cms_forms_tenant_read"
  ON public.cms_forms FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "cms_forms_tenant_write"
  ON public.cms_forms FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "cms_forms_tenant_update"
  ON public.cms_forms FOR UPDATE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "cms_forms_tenant_delete"
  ON public.cms_forms FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

-- RESTRICTIVE — isolamento multi-tenant (não aplicar a anon; leitura pública é
-- controlada só pela permissive acima com filtro status=published)
CREATE POLICY "cms_forms_tenant_isolation"
  ON public.cms_forms AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE TRIGGER trg_cms_forms_updated_at
  BEFORE UPDATE ON public.cms_forms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================================
-- Tabela: cms_form_fields
-- ============================================================================
CREATE TABLE public.cms_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant_id(),
  form_id UUID NOT NULL REFERENCES public.cms_forms(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL, -- text|textarea|email|phone|number|date|select|radio|checkbox|file|hidden
  nome TEXT NOT NULL, -- name/key para o payload
  label TEXT NOT NULL,
  placeholder TEXT,
  ajuda TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{label,value}] para select/radio/checkbox
  validacao JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {min,max,regex,mascara,minLength,maxLength}
  valor_padrao TEXT,
  largura TEXT NOT NULL DEFAULT 'full',          -- full | half | third
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cms_form_fields_form ON public.cms_form_fields(form_id, ordem);
CREATE INDEX idx_cms_form_fields_tenant ON public.cms_form_fields(tenant_id);
CREATE UNIQUE INDEX uq_cms_form_fields_form_nome ON public.cms_form_fields(form_id, nome);

GRANT SELECT ON public.cms_form_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_form_fields TO authenticated;
GRANT ALL ON public.cms_form_fields TO service_role;

ALTER TABLE public.cms_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_form_fields_public_read"
  ON public.cms_form_fields FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.cms_forms f WHERE f.id = form_id AND f.status = 'published'));

CREATE POLICY "cms_form_fields_tenant_read"
  ON public.cms_form_fields FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "cms_form_fields_tenant_all"
  ON public.cms_form_fields FOR ALL TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "cms_form_fields_tenant_isolation"
  ON public.cms_form_fields AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

-- ============================================================================
-- Tabela: form_submissions
-- ============================================================================
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,                       -- setado pela server fn (não default aqui, pois anon submete)
  form_id UUID NOT NULL REFERENCES public.cms_forms(id) ON DELETE CASCADE,
  form_slug TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  gclid TEXT,
  fbclid TEXT,
  referrer TEXT,
  page_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_form ON public.form_submissions(form_id, created_at DESC);
CREATE INDEX idx_form_submissions_tenant ON public.form_submissions(tenant_id, created_at DESC);

-- anon precisa INSERT (submissão vem sem sessão); tenant lê
GRANT INSERT ON public.form_submissions TO anon;
GRANT SELECT, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Submissão pública só passa se o formulário estiver publicado e o tenant_id do payload bater com o do form.
CREATE POLICY "form_submissions_public_insert"
  ON public.form_submissions FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cms_forms f
      WHERE f.id = form_id
        AND f.status = 'published'
        AND f.tenant_id = form_submissions.tenant_id
    )
  );

CREATE POLICY "form_submissions_tenant_read"
  ON public.form_submissions FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "form_submissions_tenant_delete"
  ON public.form_submissions FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

-- RESTRICTIVE só p/ authenticated (anon insert já é controlado pelo WITH CHECK acima)
CREATE POLICY "form_submissions_tenant_isolation"
  ON public.form_submissions AS RESTRICTIVE FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE POLICY "form_submissions_tenant_isolation_del"
  ON public.form_submissions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());