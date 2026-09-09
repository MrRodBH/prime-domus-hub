-- Restrict existing authenticated Storage policies; never add a permissive bypass.
BEGIN;
CREATE SCHEMA IF NOT EXISTS rm_storage_auth;
REVOKE ALL ON SCHEMA rm_storage_auth FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA rm_storage_auth TO authenticated;

CREATE OR REPLACE FUNCTION rm_storage_auth.allowed(_bucket text, _path text, _op text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  tid uuid := public.get_current_tenant_id();
  actor uuid := auth.uid();
  part text[] := string_to_array(_path, '/');
  v_domain text; v_entity uuid; v_module text := 'cms.midias';
  v_origin text := 'selection'; decision jsonb; v_action public.rbac_action;
  pending boolean := false; registered boolean := false;
BEGIN
  IF actor IS NULL OR tid IS NULL OR public.is_super_admin()
    OR _op IS NULL OR _op NOT IN ('select','insert','update','delete')
    OR _bucket IS NULL OR _bucket NOT IN ('imoveis','lancamentos','site')
    OR _path IS NULL OR length(_path)>512 OR part[1] IS DISTINCT FROM tid::text
    OR _path ~ '(^|/)\.{1,2}(/|$)' OR strpos(_path,chr(92))>0 OR _path LIKE '%//%'
    OR _path LIKE '%/' THEN RETURN false; END IF;

  -- Determine the resource from the actual namespace, never a client domain flag.
  IF _bucket='imoveis' THEN
    IF cardinality(part)<>3 OR part[2] !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
    v_entity := part[2]::uuid; v_domain := 'imoveis';
    IF NOT EXISTS(SELECT 1 FROM public.imoveis WHERE tenant_id=tid AND id=v_entity) THEN RETURN false; END IF;
    registered := EXISTS(SELECT 1 FROM public.imovel_imagens WHERE tenant_id=tid AND imovel_id=v_entity AND url=_path)
      OR EXISTS(SELECT 1 FROM public.imoveis WHERE tenant_id=tid AND id=v_entity AND imagem_capa=_path);
  ELSIF _bucket='lancamentos' THEN
    IF cardinality(part)<>4 THEN RETURN false; END IF;
    SELECT id INTO v_entity FROM public.launch_projects WHERE tenant_id=tid AND (slug=part[2] OR (NULLIF(slug,'') IS NULL AND id::text=part[2]));
    IF v_entity IS NULL THEN RETURN false; END IF;
    v_domain := CASE part[3] WHEN 'capa' THEN 'lancamento-capa' WHEN 'galeria' THEN 'lancamento-galeria'
      WHEN 'tabela_precos' THEN 'lancamento-pdf' WHEN 'manual' THEN 'lancamento-pdf' END;
    registered := EXISTS(SELECT 1 FROM public.launch_projects WHERE tenant_id=tid AND id=v_entity AND (imagem_capa=_path OR og_image=_path))
      OR EXISTS(SELECT 1 FROM public.launch_project_imagens WHERE tenant_id=tid AND project_id=v_entity AND storage_path=_path)
      OR EXISTS(SELECT 1 FROM public.launch_pdfs WHERE tenant_id=tid AND project_id=v_entity AND storage_path=_path);
  ELSIF part[2]='media' AND cardinality(part)=3 THEN
    v_domain := 'media';
    registered := EXISTS(SELECT 1 FROM public.media_library WHERE tenant_id=tid AND _path IN (arquivo,arquivo_medium,arquivo_thumbnail));
  ELSIF part[2]='corretores' AND cardinality(part)=4 THEN
    IF part[3] !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
    v_domain := 'corretor-foto'; v_module := 'access_control'; v_entity := part[3]::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.corretores WHERE tenant_id=tid AND id=v_entity) THEN RETURN false; END IF;
    registered := EXISTS(SELECT 1 FROM public.corretores WHERE tenant_id=tid AND id=v_entity AND foto_url=_path);
  ELSIF part[2]='crm' AND cardinality(part)=4 THEN
    IF part[3] !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
    v_domain := 'crm-attachment'; v_module := 'crm'; v_entity := part[3]::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.leads WHERE tenant_id=tid AND id=v_entity) THEN RETURN false; END IF;
    registered := EXISTS(SELECT 1 FROM public.crm_attachments WHERE tenant_id=tid AND lead_id=v_entity AND bucket=_bucket AND path=_path);
  ELSIF part[2]='blog' AND (cardinality(part)=3 OR (cardinality(part)=4 AND part[3]='inline')) THEN
    v_domain := CASE WHEN cardinality(part)=3 THEN 'blog-cover' ELSE 'blog-inline' END;
    v_module := 'cms.paginas';
    registered := EXISTS(SELECT 1 FROM public.blog_posts WHERE tenant_id=tid AND (imagem_capa=_path OR (v_domain='blog-inline' AND strpos(conteudo,_path)>0)));
    -- Inline and CMS assets use the consumed server ledger as retained provenance.
  ELSIF part[2] IN ('sobre','anuncie') AND cardinality(part)=3 THEN
    v_domain := 'cms-page'; v_module := 'cms.paginas';
    registered := EXISTS(SELECT 1 FROM public.cms_pages WHERE tenant_id=tid AND strpos(blocks::text,_path)>0)
      OR EXISTS(SELECT 1 FROM public.site_settings WHERE tenant_id=tid AND strpos(value::text,_path)>0);
  ELSE RETURN false;
  END IF;
  IF v_domain IS NULL THEN RETURN false; END IF;

  pending := EXISTS(SELECT 1 FROM public.tenant_upload_targets t
    WHERE t.tenant_id=tid AND t.bucket=_bucket AND t.path=_path AND t.domain=v_domain
    AND t.entity_id IS NOT DISTINCT FROM v_entity AND t.actor_user_id=actor
    AND t.status='pending' AND t.expires_at>now()
    AND t.tenant_origin IN ('selection','single-membership'));
  IF v_domain IN ('blog-inline','cms-page') THEN
    registered := registered OR EXISTS(SELECT 1 FROM public.tenant_upload_targets t
      WHERE t.tenant_id=tid AND t.bucket=_bucket AND t.path=_path AND t.domain=v_domain
      AND t.entity_id IS NULL AND t.status='consumed' AND t.consumed_at IS NOT NULL);
  END IF;
  IF NOT pending AND NOT registered THEN RETURN false; END IF;

  -- Recheck today's authority, not only the permission held when the target was issued.
  IF pending THEN
    decision := public.resolve_tenant_permission(actor,tid,v_origin,
      CASE WHEN v_domain='crm-attachment' THEN 'crm' WHEN v_domain='corretor-foto' THEN 'access_control' ELSE 'cms.midias' END,
      CASE WHEN v_domain='corretor-foto' THEN 'gerenciar'::public.rbac_action ELSE 'criar'::public.rbac_action END);
    IF decision->>'allowed' IS DISTINCT FROM 'true' THEN RETURN false; END IF;
    IF v_module='crm' THEN
      IF NOT public.crm_scope_allows_lead(tid,actor,decision->>'scope',v_entity) THEN RETURN false; END IF;
    ELSIF decision->>'scope' IS DISTINCT FROM 'global' THEN RETURN false; END IF;
    IF _op IN ('insert','select') THEN RETURN true; END IF;
  END IF;
  v_action := CASE _op WHEN 'select' THEN 'visualizar'::public.rbac_action
    WHEN 'insert' THEN 'editar'::public.rbac_action WHEN 'update' THEN 'editar'::public.rbac_action WHEN 'delete' THEN 'excluir'::public.rbac_action END;
  IF v_module='access_control' AND _op<>'select' THEN v_action := 'gerenciar'; END IF;
  decision := public.resolve_tenant_permission(actor,tid,v_origin,v_module,v_action);
  IF decision->>'allowed' IS DISTINCT FROM 'true' THEN RETURN false; END IF;
  IF v_module='crm' THEN RETURN public.crm_scope_allows_lead(tid,actor,decision->>'scope',v_entity); END IF;
  RETURN decision->>'scope' = 'global';
EXCEPTION WHEN invalid_text_representation THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION rm_storage_auth.allowed(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rm_storage_auth.allowed(text,text,text) TO authenticated;

-- Paths are immutable for client updates; replacements can update bytes at the same path.
CREATE OR REPLACE FUNCTION rm_storage_auth.immutable_path()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user='authenticated' AND (NEW.bucket_id IS DISTINCT FROM OLD.bucket_id OR NEW.name IS DISTINCT FROM OLD.name) THEN
    RAISE EXCEPTION 'storage_destination_immutable' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION rm_storage_auth.immutable_path() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS round62_storage_immutable_path ON storage.objects;
CREATE TRIGGER round62_storage_immutable_path BEFORE UPDATE OF bucket_id,name ON storage.objects
FOR EACH ROW EXECUTE FUNCTION rm_storage_auth.immutable_path();

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relname='objects' AND c.relrowsecurity) THEN RAISE EXCEPTION 'round62_storage_rls_disabled'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='round57_no_super_storage' AND permissive='RESTRICTIVE')
 THEN RAISE EXCEPTION 'round62_missing_super_restriction'; END IF;
END $$;
DROP POLICY IF EXISTS round62_storage_select ON storage.objects;
DROP POLICY IF EXISTS round62_storage_insert ON storage.objects;
DROP POLICY IF EXISTS round62_storage_update ON storage.objects;
DROP POLICY IF EXISTS round62_storage_delete ON storage.objects;
CREATE POLICY round62_storage_select ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (rm_storage_auth.allowed(bucket_id,name,'select'));
CREATE POLICY round62_storage_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (rm_storage_auth.allowed(bucket_id,name,'insert'));
CREATE POLICY round62_storage_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (rm_storage_auth.allowed(bucket_id,name,'update')) WITH CHECK (rm_storage_auth.allowed(bucket_id,name,'update'));
CREATE POLICY round62_storage_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (rm_storage_auth.allowed(bucket_id,name,'delete'));
COMMIT;
